import { Storage, signal } from "nsh";
import { OAuth, Vault } from "stoatmd/native";
import { loadSyncConfig } from "./config";
import { DropboxProvider } from "./dropbox";
import { planSync, probeCandidates, resolveConflict as resolveActions } from "./engine";
import { GoogleDriveProvider } from "./google";
import { activeStorage, readActiveStorage, writeActiveStorage, storageBusy, type Cleanup } from "../storage/state";
import { sha256Hex, sha256Bytes } from "./hash";
import { uniqueConflictCopyPath } from "./naming";
import { dirName, isMarkdownName, normalizeSyncPath } from "./paths";
import {
  RemoteConflictError,
  SyncError,
  fetchWithTimeout,
  isRecoverableNetworkError,
  type FetchLike,
  type RemoteDir,
  type SyncErrorKind,
  type SyncProvider,
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

export type SyncPhase =
  | "off"
  | "authorizing"
  | "syncing"
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
  readonly progress = signal<{ done: number; total: number }>({ done: 0, total: 0 });

  private vault: Vault | null = null;
  private stored: SyncConnection | null = null;
  private base: BaseState = emptyBase();
  private loaded = false;
  private loading: Promise<void> | null = null;
  private running: Promise<SyncRunResult> | null = null;
  private pushing: Promise<SyncRunResult | null> | null = null;
  private readonly fetchImpl: FetchLike;
  private resolving: Promise<void> | null = null;
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

  /** Drain a running sync before taking the migration snapshot. */
  async pause(): Promise<void> {
    await Promise.all([this.running, this.resolving?.catch(() => {})]);
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
      this.phase.set("synced");
    }
    return bundle.account;
  }

  /** 手动 / 自动同步；并发调用返回同一轮。 */
  async syncNow(): Promise<SyncRunResult | null> {
    await this.load();
    if (this.resolving) await this.resolving.catch(() => {});
    if (storageBusy() || !this.isAttached()) return null;
    if (loadSyncConfig(true).purchaseRequired) return this.finishError(new SyncError("config", "purchase required"));
    if (this.running) return this.running;
    this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** 保存后只推变化的文件，不列远端目录。 */
  async pushPaths(paths: string[]): Promise<SyncRunResult | null> {
    await this.load();
    if (this.resolving) await this.resolving.catch(() => {});
    if (storageBusy() || !this.isAttached()) return null;
    if (loadSyncConfig(true).purchaseRequired) {
      return this.finishError(new SyncError("config", "purchase required"));
    }
    if (this.phase() === "conflict") return null;
    if (this.running) await this.running.catch(() => {});
    if (this.pushing) await this.pushing.catch(() => {});
    if (storageBusy() || !this.isAttached() || this.phase() === "conflict") return null;
    const operation = this.push(paths);
    this.pushing = operation;
    try {
      return await operation;
    } finally {
      if (this.pushing === operation) this.pushing = null;
    }
  }

  private async push(paths: string[]): Promise<SyncRunResult | null> {
    const conn = this.connection();
    if (!conn) return null;
    const vault = this.requireVault();
    const result: SyncRunResult = { ...EMPTY, conflicts: [], changedLocal: [], error: null };
    const previous = this.phase();
    this.phase.set("syncing");
    this.error.set(null);
    try {
      const remote = await this.providerFor(conn.provider);
      const root = this.rootDir(conn);
      for (const raw of paths) {
        const path = normalizeSyncPath(raw);
        if (!path || !localExists(vault, path)) {
          result.needsFullSync = true;
          continue;
        }
        const anchor = this.base.entries[path] ?? null;
        const content = new Uint8Array(vault.readBytes(path));
        const existing: RemoteFile | null = anchor ? {
          path,
          id: anchor.remoteId,
          rev: anchor.remoteRev,
          mtimeMs: 0,
          size: anchor.localSize,
        } : null;
        try {
          const uploaded = await remote.uploadBytes(root, path, content, { existing });
          this.setBase(path, {
            remoteId: uploaded.id,
            remoteRev: uploaded.rev,
            localMtimeMs: vault.mtime(path),
            localSize: content.length,
            hash: sha256Bytes(content),
          });
          result.uploaded += 1;
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
      this.phase.set("synced");
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
      this.error.set(error);
      this.phase.set(
        error.kind === "network" && isRecoverableNetworkError(err) ? "offline" : "error",
      );
      result.ok = false;
      result.error = error;
      result.conflicts = this.conflicts();
      return result;
    }
  }

  /** 对单个冲突应用用户选择；调用方在所有冲突处理完后重新同步。 */
  async resolveConflict(item: ConflictItem, choice: ConflictChoice): Promise<void> {
    if (storageBusy() || loadSyncConfig(true).purchaseRequired) throw new SyncError("config", "cloud writes paused");
    const operation = (this.resolving ?? Promise.resolve()).catch(() => {}).then(async () => {
      if (this.running) await this.running;
      if (storageBusy()) throw new SyncError("config", "cloud writes paused");
      await this.applyConflict(item, choice);
    });
    this.resolving = operation;
    try { await operation; }
    finally { if (this.resolving === operation) this.resolving = null; }
  }

  private async applyConflict(item: ConflictItem, choice: ConflictChoice): Promise<void> {
    const vault = this.requireVault();
    const conn = this.connection();
    if (!conn) throw new SyncError("config", "no connection");
    const config = loadSyncConfig(true);
    const session = this.sessionFor(conn.provider, config);
    const remote = this.makeProvider(conn.provider, session);
    const root = this.rootDir(conn);

    const actions = resolveActions(item, choice);
    if (!actions) return;

    for (const action of actions) {
      if (action.type === "upload") {
        const content = new Uint8Array(vault.readBytes(item.path));
        const remoteFile = item.remote ?? null;
        const result = await remote.uploadBytes(root, item.path, content, { existing: remoteFile });
        this.setBase(item.path, {
          remoteId: result.id,
          remoteRev: result.rev,
          localMtimeMs: vault.mtime(item.path),
          localSize: content.length,
          hash: sha256Bytes(content),
        });
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
        delete this.base.entries[item.path];
      } else if (action.type === "remoteDelete") {
        const anchor = item.base;
        if (!anchor) continue;
        await remote.remove({
          path: item.path,
          id: anchor.remoteId,
          rev: anchor.remoteRev,
          mtimeMs: 0,
          size: 0,
        });
        delete this.base.entries[item.path];
      }
    }

    this.conflicts.update((list) => list.filter((c) => c.path !== item.path));
    await this.persistBase();
    if (this.conflicts().length === 0) {
      this.phase.set("synced");
    }
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

      const local = buildLocalFiles(vault, this.base, true);
      const inventory = await remote.inventory(root);
      const remoteFiles = inventory.files;
      for (const dir of inventory.directories) vault.ensureDir(dir);
      for (const entry of vault.inventory()) {
        if (entry.isDir) await remote.ensureDirectory(root, entry.path);
      }

      const remoteHashes: Record<string, string> = {};
      const candidates = probeCandidates({ base: this.base, local, remote: remoteFiles });
      for (const candidate of candidates) {
        const file = remoteFiles.find((r) => r.path === candidate.path);
        if (!file) continue;
        const content = await remote.downloadBytes(file);
        remoteHashes[candidate.path] = sha256Bytes(content);
      }

      const plan = planSync({ base: this.base, local, remote: remoteFiles, remoteHashes });
      const total =
        plan.uploads.length +
        plan.downloads.length +
        plan.localDeletes.length +
        plan.remoteDeletes.length +
        plan.adopts.length +
        plan.conflicts.length;
      this.progress.set({ done: 0, total });
      let done = 0;
      // 长同步每完成 10 个动作落一次锚点：中断或被杀后重试不用从头再来。
      const tick = async () => {
        this.progress.set({ done: ++done, total });
        if (done % BASE_SAVE_EVERY === 0) await this.persistBase();
      };

      for (const action of plan.uploads) {
        const content = new Uint8Array(vault.readBytes(action.path));
        const mtimeMs = vault.mtime(action.path);
        const remoteFile = remoteFiles.find((r) => r.path === action.path) ?? null;
        const uploaded = await remote.uploadBytes(root, action.path, content, {
          existing: remoteFile,
        });
        this.setBase(action.path, {
          remoteId: uploaded.id,
          remoteRev: uploaded.rev,
          localMtimeMs: mtimeMs,
          localSize: content.length,
          hash: sha256Bytes(content),
        });
        result.uploaded += 1;
        await tick();
      }

      for (const action of plan.downloads) {
        assertLocalUnchanged(vault, action.path, action.local);
        const content = await remote.downloadBytes(action.remote);
        assertLocalUnchanged(vault, action.path, action.local);
        writeLocal(vault, action.path, content);
        this.setBase(action.path, {
          remoteId: action.remote.id,
          remoteRev: action.remote.rev,
          localMtimeMs: vault.mtime(action.path),
          localSize: content.length,
          hash: sha256Bytes(content),
        });
        result.downloaded += 1;
        result.changedLocal.push(action.path);
        await tick();
      }

      for (const action of plan.localDeletes) {
        assertLocalUnchanged(vault, action.path, {
          path: action.path,
          mtimeMs: action.base.localMtimeMs,
          size: action.base.localSize,
          hash: null,
        });
        vault.delete(action.path);
        delete this.base.entries[action.path];
        result.deletedLocal += 1;
        result.changedLocal.push(action.path);
        await tick();
      }

      if (plan.remoteDeletes.length > 0) {
        // 删除远端不可逆：先确认云端版本仍是规划时那一版
        const fresh = new Map(
          (await remote.inventory(root)).files.map((file) => [file.path, file] as const),
        );
        for (const action of plan.remoteDeletes) {
          const current = fresh.get(action.path);
          if (current && current.rev !== action.base.remoteRev) {
            throw new RemoteConflictError("remote file changed before delete", action.path);
          }
          await remote.remove({
            path: action.path,
            id: action.base.remoteId,
            rev: action.base.remoteRev,
            mtimeMs: 0,
            size: 0,
          });
          delete this.base.entries[action.path];
          result.deletedRemote += 1;
          await tick();
        }
      }

      for (const action of plan.adopts) {
        this.setBase(action.path, {
          remoteId: action.remote.id,
          remoteRev: action.remote.rev,
          localMtimeMs: action.local.mtimeMs,
          localSize: action.local.size,
          hash: action.hash,
        });
        await tick();
      }

      for (const path of plan.forgets) {
        delete this.base.entries[path];
        await tick();
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
      result.conflicts = this.conflicts();
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
    if (entry.isDir === true || (!attachments && !isMarkdownName(entry.name))) continue;
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
