import { Storage, signal } from "nsh";
import { OAuth, Vault } from "stoatmd/native";
import { loadSyncConfig } from "./config";
import { DropboxProvider } from "./dropbox";
import { effectiveLocalHash, planSync, probeCandidates, resolveConflict as resolveActions } from "./engine";
import { GoogleDriveProvider } from "./google";
import { activeStorage, readActiveStorage, writeActiveStorage, storageBusy, type Cleanup } from "../storage/state";
import { sha256Hex, sha256Bytes } from "./hash";
import { uniqueConflictCopyPath } from "./naming";
import { eachLimit } from "./pool";
import { dirName, isMarkdownName, libraryPath, normalizeSyncPath } from "./paths";
import {
  RemoteConflictError,
  SyncError,
  fetchWithTimeout,
  isRecoverableNetworkError,
  type FetchLike,
  type RemoteDir,
  type SkippedRemote,
  type SyncErrorKind,
  type SyncProvider,
  underPath,
} from "./provider";
import { KeychainTokenStore } from "./tokenStore";
import { TokenSession } from "./tokens";
import {
  emptyBase,
  type BaseEntry,
  type BaseState,
  type ConflictChoice,
  type ConflictItem,
  type LocalFile,
  type ProviderId,
  type RemoteFile,
} from "./types";

const CONNECTION_KEY = "sync.connection";
const BASE_KEY = "sync.base";
const LAST_KEY = "sync.lastAt";
/** 长同步中途落锚点的间隔，单位：完成动作数。 */
const BASE_SAVE_EVERY = 10;
/** 每个路径最多记几份未确认的上传正文。 */
const PENDING_PER_PATH = 4;
/** 下载 / 正文比对的并发数：首次同步几百篇时不再一篇一篇排队。 */
const TRANSFER_CONCURRENCY = 4;

/** 存储迁移要求停下：当前文件做完就退出这一轮，不算失败。 */
class SyncCancelled extends Error {}

export type SyncPhase =
  | "off"
  | "authorizing"
  | "syncing"
  | "paused"
  | "synced"
  | "conflict"
  | "offline"
  | "error";

/** 绑定关系：本地库根 ↔ 网盘远程文件夹。 */
export type SyncConnection = {
  provider: ProviderId;
  account: string | null;
  remoteId: string;
  remotePath: string;
  remoteName: string;
  localRoot: string;
  connectedAt: number;
};

export type SyncRunResult = {
  ok: boolean;
  uploaded: number;
  downloaded: number;
  deletedLocal: number;
  deletedRemote: number;
  conflicts: ConflictItem[];
  /** 本轮被云端内容改写的本地路径（界面据此刷新打开的笔记）。 */
  changedLocal: string[];
  error: { kind: SyncErrorKind; message: string } | null;
  /** 单文件推送无法安全完成，调用方应改跑一次全量同步。 */
  needsFullSync?: boolean;
  /** 本轮绕开的云端项。 */
  skipped?: SkippedRemote[];
};

const EMPTY: Omit<SyncRunResult, "conflicts" | "changedLocal" | "error"> = {
  ok: true,
  uploaded: 0,
  downloaded: 0,
  deletedLocal: 0,
  deletedRemote: 0,
};

/** 云端根：Google 用 `root` 别名，Dropbox 用空串代表应用根。 */
export function remoteRoot(provider: ProviderId): RemoteDir {
  return { id: provider === "google" ? "root" : "", path: "", name: "" };
}

export function providerLabelKey(provider: ProviderId): string {
  return provider === "google" ? "sync.provider.google" : "sync.provider.dropbox";
}

/**
 * 一次同步会话的全部可变状态与动作。
 * 纯 UI 读信号；网络 / 磁盘动作都在这里串行化，避免并发同步。
 */
export class SyncRuntime {
  readonly phase = signal<SyncPhase>("off");
  readonly connection = signal<SyncConnection | null>(null);
  readonly lastSyncAt = signal(0);
  readonly error = signal<{ kind: SyncErrorKind; message: string } | null>(null);
  readonly conflicts = signal<ConflictItem[]>([]);
  /** 上一轮全量同步绕开的云端项（重名 / 名字不可用）；这些路径本机也不上传、不删除。 */
  readonly skipped = signal<SkippedRemote[]>([]);
  readonly progress = signal<{ done: number; total: number }>({ done: 0, total: 0 });

  /** 用户在全量同步中按下暂停；动作之间检查，恢复后从原位置继续。 */
  private readonly paused = signal(false);
  private resumeWaiters: (() => void)[] = [];
  /** 迁移等待队列清空期间：进行中的全量同步在下一个动作之间退出。 */
  private draining = false;

  private vault: Vault | null = null;
  private stored: SyncConnection | null = null;
  private base: BaseState = emptyBase();
  private loaded = false;
  private loading: Promise<void> | null = null;
  private running: Promise<SyncRunResult | null> | null = null;
  /**
   * 所有云端写操作（全量同步、单文件推送、删除推送、冲突处理）排成一条队列。
   * 两轮交错时，一轮会看到另一轮刚写进云端、还没记进锚点的 rev，误判成别处改过。
   */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly fetchImpl: FetchLike;
  private sessions = new Map<ProviderId, TokenSession>();
  private pending: { provider: ProviderId; session: TokenSession } | null = null;

  constructor(fetchImpl: FetchLike = (input, init) => fetch(input, init)) {
    this.fetchImpl = (input, init) => fetchWithTimeout(fetchImpl, input, init);
  }

  attach(vault: Vault | null): void {
    this.vault = vault;
    void this.load().then(() => this.applyForVault());
  }

  /** 读一次本地偏好；之后 UI 直接读信号。 */
  async load(): Promise<void> {
    if (this.loading) return this.loading;
    if (this.loaded) return;
    this.loading = (async () => {
      const active = await readActiveStorage();
      this.stored = active ? active.connection : await readJson<SyncConnection>(CONNECTION_KEY);
      this.base = (await readJson<BaseState>(this.baseKey())) ?? emptyBase();
      if (!this.base.entries) this.base = emptyBase();
      const last = await Storage.getItem(this.lastKey());
      this.lastSyncAt.set(last ? Number(last) || 0 : 0);
      this.loaded = true;
      this.applyForVault();
    })().finally(() => { this.loading = null; });
    return this.loading;
  }

  /**
   * Drain a running sync before taking the migration snapshot.
   * 被用户暂停的同步会停在 checkpoint 永远等下去，所以先唤醒它，让它在动作之间退出。
   */
  async pause(): Promise<void> {
    this.draining = true;
    this.resumeSync();
    try {
      await this.queue.catch(() => {});
    } finally {
      this.draining = false;
    }
  }

  /** 全量同步中暂停：当前文件处理完后停在动作之间，库仍可浏览与编辑。 */
  pauseSync(): void {
    if (this.phase() !== "syncing" || this.paused()) return;
    this.paused.set(true);
    this.phase.set("paused");
  }

  /** 继续被用户暂停的同步。 */
  resumeSync(): void {
    if (!this.paused()) return;
    this.paused.set(false);
    if (this.phase() === "paused") this.phase.set("syncing");
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    for (const waiter of waiters) waiter();
  }

  private async checkpoint(): Promise<void> {
    if (this.paused()) await new Promise<void>(resolve => { this.resumeWaiters.push(resolve); });
    if (this.draining) throw new SyncCancelled();
  }

  /** 一轮结束后的状态：还有没处理的冲突就继续显示冲突。 */
  private settle(): void {
    this.phase.set(this.conflicts().length > 0 ? "conflict" : "synced");
  }

  private conflictPaths(): Set<string> {
    return new Set(this.conflicts().map((item) => item.path));
  }

  /** 这条路径是否要绕开：有待处理的冲突，或落在云端被跳过的项（及其子树）里。 */
  private isHeld(path: string, held: Set<string> = this.conflictPaths()): boolean {
    return held.has(path) || this.skipped().some((item) => underPath(path, item.path));
  }

  async providerFor(provider: ProviderId, expectedAccount?: string | null): Promise<SyncProvider> {
    const session = this.activeSession(provider);
    const bundle = await session.restore();
    if (!bundle) throw new SyncError("auth", "authorization expired");
    if (expectedAccount && bundle.account !== expectedAccount) throw new SyncError("auth", "storage.error.account");
    return this.makeProvider(provider, session);
  }

  /** One durable record is the commit point for root + cloud binding + cleanup journal. */
  async activate(root: string, conn: SyncConnection | null, cleanup: Cleanup | null): Promise<void> {
    const vault = Vault.open(root);
    await writeActiveStorage({ version: 1, root, connection: conn, cleanup });
    this.stored = conn;
    this.vault = vault;
    this.base = emptyBase();
    this.pending = null;
    this.connection.set(conn);
    this.lastSyncAt.set(0);
    this.conflicts.set([]);
    this.skipped.set([]);
    this.error.set(null);
    this.phase.set(conn ? "synced" : "off");
  }

  private lastKey(): string {
    return activeStorage() ? `storage.lastAt.${this.stored?.connectedAt ?? "local"}` : LAST_KEY;
  }

  private baseKey(): string {
    return activeStorage() ? `storage.base.${this.stored?.connectedAt ?? "local"}` : BASE_KEY;
  }

  /** 当前库根是否就是已绑定同步的库。 */
  isAttached(): boolean {
    const conn = this.connection();
    return !!conn && !!this.vault && conn.localRoot === this.vault.root;
  }

  connectionFor(provider: ProviderId): SyncConnection | null {
    const conn = this.stored;
    return conn && conn.provider === provider ? conn : null;
  }

  /** 开始 OAuth（未付费时直接 config 错误，不打开浏览器）。 */
  async beginConnect(provider: ProviderId): Promise<string | null> {
    const config = loadSyncConfig(true);
    if (config.purchaseRequired) {
      throw new SyncError("config", "purchase required");
    }
    this.phase.set("authorizing");
    this.error.set(null);
    try {
      const session = this.sessionFor(provider, config);
      const bundle = await session.restore() ?? await session.connect();
      this.pending = { provider, session };
      this.phase.set("off");
      return bundle.account;
    } catch (err) {
      this.phase.set("off");
      throw err;
    }
  }

  /** 取消授权 / 选文件夹流程；保留当前库和清理重试所需的授权。 */
  async cancelConnect(): Promise<void> {
    OAuth.cancel();
    this.pending = null;
    // Persisted sessions also belong to the current/previous storage location.
    // Cancelling the folder picker preserves them for sync and cleanup retries.
    this.phase.set(this.connection() ? "synced" : "off");
  }

  /** 授权后浏览远端目录（S4）。 */
  async listFolders(provider: ProviderId, parent?: RemoteDir): Promise<RemoteDir[]> {
    const session = this.activeSession(provider);
    const remote = this.makeProvider(provider, session);
    const root = remoteRoot(provider);
    return remote.listFolders(root, parent ?? root);
  }

  async createFolder(
    provider: ProviderId,
    parent: RemoteDir,
    name: string,
  ): Promise<RemoteDir> {
    const session = this.activeSession(provider);
    const remote = this.makeProvider(provider, session);
    return remote.createFolder(remoteRoot(provider), parent, name);
  }

  /** 授权失效后重新走一次 OAuth，保留现有绑定与锚点。 */
  async reconnect(provider: ProviderId, forExport = false): Promise<string | null> {
    if (storageBusy()) throw new SyncError("config", "storage migration in progress");
    const config = loadSyncConfig(true);
    const conn = this.stored;
    if (config.purchaseRequired && !(forExport && conn?.provider === provider)) {
      throw new SyncError("config", "purchase required");
    }
    const session = this.sessionFor(provider, config);
    const bundle = await session.connect(conn?.provider === provider ? conn.account : undefined);
    if (storageBusy()) throw new SyncError("config", "storage migration in progress");
    if (conn && conn.provider === provider) {
      const next: SyncConnection = { ...conn, account: bundle.account };
      this.stored = next;
      this.connection.set(next);
      const active = activeStorage();
      if (active) await writeActiveStorage({ ...active, connection: next });
      else await Storage.setItem(CONNECTION_KEY, JSON.stringify(next));
      this.error.set(null);
      this.conflicts.set([]);
    this.skipped.set([]);
      this.phase.set("synced");
    }
    return bundle.account;
  }

  /** 手动 / 自动同步；并发调用返回同一轮。 */
  async syncNow(): Promise<SyncRunResult | null> {
    await this.load();
    if (storageBusy() || !this.isAttached()) return null;
    if (loadSyncConfig(true).purchaseRequired) return this.finishError(new SyncError("config", "purchase required"));
    // 已有一轮全量同步在排队或在跑：并发调用共用那一轮。
    if (this.running) return this.running;
    const round = this.enqueue(async () => {
      // 排队期间库可能已切走 / 进入迁移，轮到时再确认一次。
      if (storageBusy() || !this.isAttached()) return null;
      if (loadSyncConfig(true).purchaseRequired) return this.finishError(new SyncError("config", "purchase required"));
      // 暂停只对这一轮有效：推送途中或最后一个动作之后才按下的暂停不能留到下一轮，否则下一轮第一步就卡住。
      this.paused.set(false);
      try {
        return await this.run();
      } finally {
        this.paused.set(false);
      }
    });
    this.running = round;
    try {
      return await round;
    } finally {
      if (this.running === round) this.running = null;
    }
  }

  /** 把一次云端写操作排到队尾；前一个失败不影响后一个。 */
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => {}).then(work);
    this.queue = next;
    return next;
  }

  /** 保存后只推变化的文件，不列远端目录。`quiet` 用于后台自动推送：失败不打断界面。 */
  async pushPaths(paths: string[], quiet = false): Promise<SyncRunResult | null> {
    await this.load();
    if (storageBusy() || !this.isAttached()) return null;
    if (loadSyncConfig(true).purchaseRequired) {
      return this.finishError(new SyncError("config", "purchase required"));
    }
    return this.enqueue(async () => {
      if (storageBusy() || !this.isAttached()) return null;
      return this.push(paths, quiet);
    });
  }

  /** 本地删除 / 移动后只删对应的远端文件；云端版本变了就交回全量同步。 */
  async pushDeletions(paths: string[], quiet = false): Promise<SyncRunResult | null> {
    await this.load();
    if (storageBusy() || !this.isAttached()) return null;
    if (loadSyncConfig(true).purchaseRequired) {
      return this.finishError(new SyncError("config", "purchase required"));
    }
    return this.enqueue(async () => {
      if (storageBusy() || !this.isAttached()) return null;
      return this.removeRemote(paths, quiet);
    });
  }

  private async push(paths: string[], quiet = false): Promise<SyncRunResult | null> {
    const conn = this.connection();
    if (!conn) return null;
    const vault = this.requireVault();
    const result: SyncRunResult = { ...EMPTY, conflicts: [], changedLocal: [], error: null };
    const previous = this.phase();
    if (!quiet) {
      this.phase.set("syncing");
      this.error.set(null);
    }
    try {
      const remote = await this.providerFor(conn.provider);
      const root = this.rootDir(conn);
      // 冲突里的路径等用户选；其余文件照常推，一个冲突不该卡住整库。
      const held = this.conflictPaths();
      for (const raw of paths) {
        const path = normalizeSyncPath(raw);
        if (this.isHeld(path, held)) continue;
        if (!path || !localExists(vault, path)) {
          result.needsFullSync = true;
          continue;
        }
        const anchor = this.base.entries[path] ?? null;
        const existing: RemoteFile | null = anchor ? {
          path,
          id: anchor.remoteId,
          rev: anchor.remoteRev,
          mtimeMs: 0,
          size: anchor.localSize,
        } : null;
        try {
          if (await this.uploadTracked(vault, remote, root, path, existing)) result.uploaded += 1;
        } catch (err) {
          // 云端版本已变 / 路径被占用：不在这里做冲突裁决，交回全量同步。
          if (err instanceof RemoteConflictError) {
            result.needsFullSync = true;
            continue;
          }
          throw err;
        }
      }
      await this.persistBase();
      if (result.needsFullSync) {
        this.phase.set(previous);
        return result;
      }
      this.settle();
      // 后台推送成功说明云端可达，顺手清掉上一轮全量同步留下的错误。
      this.error.set(null);
      const now = Date.now();
      this.lastSyncAt.set(now);
      await Storage.setItem(this.lastKey(), String(now));
      return result;
    } catch (err) {
      // 失败前把已完成动作的锚点保存下来，下次同步只补剩余文件。
      await this.persistBase().catch(() => {});
      const error: { kind: SyncErrorKind; message: string } =
        err instanceof SyncError
          ? { kind: err.kind, message: err.message }
          : { kind: "unknown", message: err instanceof Error ? err.message : String(err) };
      if (!quiet) {
        this.error.set(error);
        this.phase.set(
          error.kind === "network" && isRecoverableNetworkError(err) ? "offline" : "error",
        );
      }
      result.ok = false;
      result.error = error;
      if (!quiet) result.conflicts = this.conflicts();
      return result;
    }
  }

  private async removeRemote(paths: string[], quiet = false): Promise<SyncRunResult | null> {
    const conn = this.connection();
    if (!conn) return null;
    const result: SyncRunResult = { ...EMPTY, conflicts: [], changedLocal: [], error: null };
    if (!quiet) {
      this.phase.set("syncing");
      this.error.set(null);
    }
    try {
      const remote = await this.providerFor(conn.provider);
      const held = this.conflictPaths();
      for (const raw of paths) {
        const path = normalizeSyncPath(raw);
        if (!path || this.isHeld(path, held)) continue;
        // 没有锚点说明远端本来就没有这份文件（或从没同步过），不必请求。
        const anchor = this.base.entries[path];
        if (!anchor) continue;
        const file: RemoteFile = {
          path,
          id: anchor.remoteId,
          rev: anchor.remoteRev,
          mtimeMs: 0,
          size: anchor.localSize,
        };
        try {
          await remote.remove(file);
          this.dropBase(path);
          result.deletedRemote += 1;
        } catch (err) {
          // 云端也被改过：不在删除路径上裁决，交回全量同步让用户选。
          if (err instanceof RemoteConflictError) {
            result.needsFullSync = true;
            continue;
          }
          throw err;
        }
      }
      await this.persistBase();
      if (result.needsFullSync) return result;
      this.settle();
      this.error.set(null);
      const now = Date.now();
      this.lastSyncAt.set(now);
      await Storage.setItem(this.lastKey(), String(now));
      return result;
    } catch (err) {
      await this.persistBase().catch(() => {});
      const error: { kind: SyncErrorKind; message: string } =
        err instanceof SyncError
          ? { kind: err.kind, message: err.message }
          : { kind: "unknown", message: err instanceof Error ? err.message : String(err) };
      if (!quiet) {
        this.error.set(error);
        this.phase.set(
          error.kind === "network" && isRecoverableNetworkError(err) ? "offline" : "error",
        );
      }
      result.ok = false;
      result.error = error;
      return result;
    }
  }

  /** 对单个冲突应用用户选择；调用方在所有冲突处理完后重新同步。 */
  async resolveConflict(item: ConflictItem, choice: ConflictChoice): Promise<void> {
    if (storageBusy() || loadSyncConfig(true).purchaseRequired) throw new SyncError("config", "cloud writes paused");
    await this.enqueue(async () => {
      if (storageBusy()) throw new SyncError("config", "cloud writes paused");
      await this.applyConflict(item, choice);
    });
  }

  private async applyConflict(item: ConflictItem, choice: ConflictChoice): Promise<void> {
    const vault = this.requireVault();
    const conn = this.connection();
    if (!conn) throw new SyncError("config", "no connection");
    const remote = await this.providerFor(conn.provider);
    const root = this.rootDir(conn);

    const actions = resolveActions(item, choice);
    if (!actions) return;

    for (const action of actions) {
      if (action.type === "upload") {
        await this.uploadTracked(vault, remote, root, item.path, item.remote ?? null);
      } else if (action.type === "download") {
        const source = item.remote;
        if (!source) continue;
        const content = await remote.downloadBytes(source);
        let path = item.path;
        if (action.copyRemote) {
          path = uniqueConflictCopyPath(item.path, Date.now(), (candidate) =>
            localExists(vault, candidate),
          );
        }
        writeLocal(vault, path, content);
        if (!action.copyRemote) {
          this.setBase(item.path, {
            remoteId: source.id,
            remoteRev: source.rev,
            localMtimeMs: vault.mtime(path),
            localSize: content.length,
            hash: sha256Bytes(content),
          });
        }
      } else if (action.type === "localDelete") {
        vault.delete(item.path);
        this.dropBase(item.path);
      } else if (action.type === "remoteDelete") {
        // 这类冲突本来就是云端改过：按冲突时看到的云端版本删，锚点里的旧 rev 必然被拒。
        const target = item.remote ?? (item.base && {
          path: item.path,
          id: item.base.remoteId,
          rev: item.base.remoteRev,
          mtimeMs: 0,
          size: 0,
        });
        if (!target) continue;
        await remote.remove(target);
        this.dropBase(item.path);
      }
    }

    this.conflicts.update((list) => list.filter((c) => c.path !== item.path));
    await this.persistBase();
    if (this.conflicts().length === 0) this.phase.set("synced");
  }

  /** 应用启动 / 切换库时调用：只保留与当前库根匹配的绑定。 */
  private applyForVault(): void {
    const conn = this.stored;
    const vault = this.vault;
    if (conn && vault && conn.localRoot === vault.root) {
      this.connection.set(conn);
      if (this.phase() === "off") this.phase.set("synced");
      return;
    }
    this.connection.set(vault ? null : conn);
    if (vault) this.phase.set("off");
  }

  private async run(): Promise<SyncRunResult> {
    const vault = this.requireVault();
    const conn = this.connection();
    if (!conn) return this.finishError(new SyncError("config", "no connection"));
    this.phase.set("syncing");
    this.error.set(null);
    this.progress.set({ done: 0, total: 0 });

    const result: SyncRunResult = {
      ...EMPTY,
      conflicts: [],
      changedLocal: [],
      error: null,
    };

    try {
      const remote = await this.providerFor(conn.provider);
      const root = this.rootDir(conn);

      const inventory = await remote.inventory(root);
      this.skipped.set(inventory.skipped);
      result.skipped = inventory.skipped;
      // 被跳过的云端项不在清单里，但不能因此被当成「云端已删除」而删掉本机副本：
      // 本机文件和锚点里落在这些路径下的也一并挡在规划之外。
      const heldPath = (path: string) => inventory.skipped.some((item) => underPath(path, item.path));
      const local = buildLocalFiles(vault, this.base, true).filter((file) => !heldPath(file.path));
      const base: BaseState = inventory.skipped.length === 0 ? this.base : {
        ...this.base,
        entries: Object.fromEntries(Object.entries(this.base.entries).filter(([path]) => !heldPath(path))),
      };
      const remoteFiles = inventory.files;
      const remoteByPath = new Map(remoteFiles.map((file) => [file.path, file] as const));
      const remoteDirs = new Set(inventory.directories);
      for (const dir of remoteDirs) {
        if (libraryPath(dir)) vault.ensureDir(dir);
      }
      // 只建云端还没有的目录：Dropbox 每建一次（已存在时）要两次请求。
      for (const entry of vault.inventory()) {
        const dir = normalizeSyncPath(entry.path);
        if (entry.isDir && libraryPath(dir) && !remoteDirs.has(dir) && !heldPath(dir)) await remote.ensureDirectory(root, dir);
      }

      const remoteHashes: Record<string, string> = {};
      const candidates = probeCandidates({ base, local, remote: remoteFiles });
      await eachLimit(candidates, TRANSFER_CONCURRENCY, async (candidate) => {
        const file = remoteByPath.get(candidate.path);
        if (!file) return;
        remoteHashes[candidate.path] = sha256Bytes(await remote.downloadBytes(file));
      });

      const plan = planSync({ base, local, remote: remoteFiles, remoteHashes });
      const total =
        plan.uploads.length +
        plan.downloads.length +
        plan.localDeletes.length +
        plan.remoteDeletes.length +
        plan.adopts.length +
        plan.forgets.length;
      this.progress.set({ done: 0, total });
      let done = 0;
      // 长同步每完成 10 个动作落一次锚点：中断或被杀后重试不用从头再来。
      const tick = async () => {
        this.progress.set({ done: ++done, total });
        if (done % BASE_SAVE_EVERY === 0) await this.persistBase();
      };
      /**
       * 单个文件在规划之后又变了（本地刚保存 / 云端被别处改了）：跳过它，留给下一轮重新规划，
       * 不能让一篇正在编辑的笔记把整轮同步打成失败。
       */
      const step = <T extends { path: string }>(work: (action: T) => Promise<void>) => async (action: T) => {
        await this.checkpoint();
        try {
          await work(action);
        } catch (err) {
          if (!(err instanceof RemoteConflictError)) throw err;
        }
        await tick();
      };

      for (const action of plan.uploads) {
        await step(async () => {
          if (!localExists(vault, action.path)) throw new RemoteConflictError("local file disappeared during sync", action.path);
          if (await this.uploadTracked(vault, remote, root, action.path, remoteByPath.get(action.path) ?? null)) {
            result.uploaded += 1;
          }
        })(action);
      }

      await eachLimit(plan.downloads, TRANSFER_CONCURRENCY, step(async (action) => {
        assertLocalUnchanged(vault, action.path, action.local);
        const content = await remote.downloadBytes(action.remote);
        assertLocalUnchanged(vault, action.path, action.local);
        const hash = sha256Bytes(content);
        // 云端只是 rev 变了、正文和本地一样（Drive version 自增）：不重写文件，
        // 否则正在编辑的笔记 mtime 被改，下一次保存会误报「文件已在外部被修改」。
        const same = action.local !== null && effectiveLocalHash(action.local, action.base) === hash;
        if (!same) writeLocal(vault, action.path, content);
        this.setBase(action.path, {
          remoteId: action.remote.id,
          remoteRev: action.remote.rev,
          localMtimeMs: vault.mtime(action.path),
          localSize: content.length,
          hash,
        });
        if (!same) {
          result.downloaded += 1;
          result.changedLocal.push(action.path);
        }
      }));

      for (const action of plan.localDeletes) {
        await step(async () => {
          assertLocalUnchanged(vault, action.path, {
            path: action.path,
            mtimeMs: action.base.localMtimeMs,
            size: action.base.localSize,
            hash: null,
          });
          vault.delete(action.path);
          this.dropBase(action.path);
          result.deletedLocal += 1;
          result.changedLocal.push(action.path);
        })(action);
      }

      // 删除云端不可逆：两家的删除都带版本条件（Drive 先核对 version，Dropbox 用 parent_rev），
      // 云端在规划之后被改过会被拒绝并跳过，不必为此再把整个云端列一遍。
      for (const action of plan.remoteDeletes) {
        await step(async () => {
          await remote.remove(action.remote ?? {
            path: action.path,
            id: action.base.remoteId,
            rev: action.base.remoteRev,
            mtimeMs: 0,
            size: 0,
          });
          this.dropBase(action.path);
          result.deletedRemote += 1;
        })(action);
      }

      for (const action of plan.adopts) {
        await step(async () => {
          this.setBase(action.path, {
            remoteId: action.remote.id,
            remoteRev: action.remote.rev,
            localMtimeMs: action.local.mtimeMs,
            localSize: action.local.size,
            hash: action.hash,
          });
        })(action);
      }

      for (const path of plan.forgets) {
        await step(async () => this.dropBase(path))({ path });
      }

      result.conflicts = plan.conflicts;
      this.conflicts.set(plan.conflicts);
      await this.persistBase();
      if (plan.conflicts.length > 0) {
        this.phase.set("conflict");
      } else {
        this.phase.set("synced");
        const now = Date.now();
        this.lastSyncAt.set(now);
        await Storage.setItem(this.lastKey(), String(now));
      }
      return result;
    } catch (err) {
      // 失败前把已完成动作的锚点保存下来，下次同步只补剩余文件。
      await this.persistBase().catch(() => {});
      result.conflicts = this.conflicts();
      if (err instanceof SyncCancelled) {
        this.settle();
        return result;
      }
      const error: { kind: SyncErrorKind; message: string } =
        err instanceof SyncError
          ? { kind: err.kind, message: err.message }
          : {
              kind: "unknown",
              message: err instanceof Error ? err.message : String(err),
            };
      this.error.set(error);
      this.phase.set(
        error.kind === "network" && isRecoverableNetworkError(err) ? "offline" : "error",
      );
      result.ok = false;
      result.error = error;
      return result;
    }
  }

  private finishError(err: unknown): SyncRunResult {
    const error =
      err instanceof SyncError
        ? { kind: err.kind, message: err.message }
        : { kind: "unknown" as const, message: err instanceof Error ? err.message : String(err) };
    this.error.set(error);
    this.phase.set(
      error.kind === "network" && isRecoverableNetworkError(err) ? "offline" : "error",
    );
    return {
      ok: false,
      uploaded: 0,
      downloaded: 0,
      deletedLocal: 0,
      deletedRemote: 0,
      conflicts: this.conflicts(),
      changedLocal: [],
      error,
    };
  }

  private setBase(
    path: string,
    fields: Omit<BaseEntry, "path">,
  ): void {
    this.base.entries[path] = { path, ...fields };
    // 已确认落地：锚点本身就代表云端当前正文，之前未确认的上传不再需要记。
    if (this.base.pending) delete this.base.pending[path];
  }

  private dropBase(path: string): void {
    delete this.base.entries[path];
    if (this.base.pending) delete this.base.pending[path];
  }

  /**
   * 三条上传路径（推送 / 全量同步 / 冲突处理）共用：顺序上的约束都在这里。
   * 1. 先取 mtime 再读正文：上传途中又保存一次时，锚点记旧 mtime，下一轮才看得出还有改动。
   * 2. 请求发出前把正文哈希记进 pending 并落盘：超时或进程被杀时云端可能已写入，
   *    下次同步看到云端正是这份内容，就按本机自己的版本处理，不误报冲突。
   * 3. 云端明确拒绝（rev 冲突 / 路径被占用）时，只撤掉本次新加的记录；
   *    同一份正文之前若已超时落地，那条记录要留着。
   * 正文就是锚点、云端也还是锚点那一版（重存同样内容、阅读偏好没变）时不上传，只刷新 mtime，返回 null。
   */
  private async uploadTracked(
    vault: Vault,
    remote: SyncProvider,
    root: RemoteDir,
    path: string,
    existing: RemoteFile | null,
  ): Promise<RemoteFile | null> {
    const mtimeMs = vault.mtime(path);
    const content = new Uint8Array(vault.readBytes(path));
    const hash = sha256Bytes(content);
    const anchor = this.base.entries[path];
    if (anchor && existing && anchor.hash === hash && anchor.remoteId === existing.id && anchor.remoteRev === existing.rev) {
      this.setBase(path, { ...anchor, localMtimeMs: mtimeMs, localSize: content.length });
      return null;
    }
    const added = this.recordPending(path, hash);
    if (added) await this.persistBase();
    let uploaded: RemoteFile;
    try {
      uploaded = await remote.uploadBytes(root, path, content, { existing });
    } catch (err) {
      if (added && err instanceof RemoteConflictError) this.unrecordPending(path, hash);
      throw err;
    }
    this.setBase(path, {
      remoteId: uploaded.id,
      remoteRev: uploaded.rev,
      localMtimeMs: mtimeMs,
      localSize: content.length,
      hash,
    });
    return uploaded;
  }

  /** 记一份未确认的上传正文；已经记过（重试同一版本）返回 false。 */
  private recordPending(path: string, hash: string): boolean {
    const pending = (this.base.pending ??= {});
    const list = pending[path] ?? [];
    if (list.includes(hash)) return false;
    pending[path] = [...list, hash].slice(-PENDING_PER_PATH);
    return true;
  }

  private unrecordPending(path: string, hash: string): void {
    const list = this.base.pending?.[path];
    if (!list) return;
    const rest = list.filter((h) => h !== hash);
    if (rest.length) this.base.pending![path] = rest;
    else delete this.base.pending![path];
  }

  private async persistBase(): Promise<void> {
    this.base.savedAt = Date.now();
    await Storage.setItem(this.baseKey(), JSON.stringify(this.base));
  }

  private rootDir(conn: SyncConnection): RemoteDir {
    return {
      id: conn.remoteId,
      path: conn.remotePath,
      name: conn.remoteName,
    };
  }

  private requireVault(): Vault {
    if (!this.vault) throw new SyncError("config", "no vault open");
    return this.vault;
  }

  private activeSession(provider: ProviderId): TokenSession {
    if (this.pending && this.pending.provider === provider) return this.pending.session;
    return this.sessionFor(provider, loadSyncConfig(true));
  }

  private sessionFor(provider: ProviderId, config: ReturnType<typeof loadSyncConfig>): TokenSession {
    const cached = this.sessions.get(provider);
    if (cached) return cached;
    const session = new TokenSession(
      provider,
      config,
      {
        authorize: (url, state, port) => OAuth.authorize(url, state, port),
        fetch: this.fetchImpl,
        now: () => Date.now(),
      },
      new KeychainTokenStore(),
    );
    this.sessions.set(provider, session);
    return session;
  }

  private makeProvider(provider: ProviderId, session: TokenSession): SyncProvider {
    if (provider === "google") {
      return new GoogleDriveProvider(session, this.fetchImpl, session.account);
    }
    return new DropboxProvider(session, this.fetchImpl, session.account);
  }
}

/** 单例：设置页与侧栏都读它。 */
export const syncRuntime = new SyncRuntime();

/** 本地库 → 引擎输入；只有 mtime + size 变过的文件才读盘算哈希。 */
export function buildLocalFiles(vault: Vault, base: BaseState, attachments = false): LocalFile[] {
  const entries = attachments ? vault.inventory() : vault.listRecursive("");
  const out: LocalFile[] = [];
  for (const entry of entries) {
    if (entry.isDir === true || !libraryPath(entry.path) || (!attachments && !isMarkdownName(entry.name))) continue;
    const path = normalizeSyncPath(entry.path);
    const anchor = base.entries[path] ?? null;
    const unchanged =
      !!anchor && anchor.localMtimeMs === entry.mtimeMs && anchor.localSize === entry.size;
    let hash: string | null = null;
    if (!unchanged) {
      try {
        hash = attachments ? sha256Bytes(new Uint8Array(vault.readBytes(path))) : sha256Hex(vault.read(path).content);
      } catch (err) {
        throw new SyncError("unknown", `Unable to read library file: ${path}`);
      }
    }
    out.push({ path, mtimeMs: entry.mtimeMs, size: entry.size, hash });
  }
  return out;
}

export function utf8Size(text: string): number {
  return new TextEncoder().encode(text).length;
}

function writeLocal(vault: Vault, path: string, content: Uint8Array): void {
  const parent = dirName(path);
  if (parent) vault.ensureDir(parent);
  if (localExists(vault, path)) {
    vault.writeBytes(path, content);
  } else {
    vault.createBytes(path, content);
  }
}

function localExists(vault: Vault, path: string): boolean {
  try {
    vault.mtime(path);
    return true;
  } catch {
    return false;
  }
}

/** 下载 / 删除前复核本地版本，避免覆盖同步期间刚敲进去的内容。 */
export function assertLocalUnchanged(
  vault: Vault,
  path: string,
  local: LocalFile | null,
): void {
  if (!local) {
    if (localExists(vault, path)) {
      throw new RemoteConflictError("local file appeared during sync", path);
    }
    return;
  }
  let disk: number;
  try {
    disk = vault.mtime(path);
  } catch {
    throw new RemoteConflictError("local file disappeared during sync", path);
  }
  if (disk !== local.mtimeMs) {
    throw new RemoteConflictError("local file changed during sync", path);
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await Storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
