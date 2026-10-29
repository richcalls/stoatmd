import { Storage, signal } from "nsh";
import { OAuth, type Vault } from "stoatmd/native";
import { loadSyncConfig } from "./config";
import { DropboxProvider } from "./dropbox";
import { planSync, probeCandidates, resolveConflict as resolveActions } from "./engine";
import { GoogleDriveProvider } from "./google";
import { sha256Hex } from "./hash";
import { uniqueConflictCopyPath } from "./naming";
import { dirName, isMarkdownName, normalizeSyncPath } from "./paths";
import {
  RemoteConflictError,
  SyncError,
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
} from "./types";

const CONNECTION_KEY = "sync.connection";
const BASE_KEY = "sync.base";
const LAST_KEY = "sync.lastAt";

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
  private running: Promise<SyncRunResult> | null = null;
  private sessions = new Map<ProviderId, TokenSession>();
  private pending: { provider: ProviderId; session: TokenSession } | null = null;

  constructor(private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init)) {}

  attach(vault: Vault | null): void {
    this.vault = vault;
    void this.load().then(() => this.applyForVault());
  }

  /** 读一次本地偏好；之后 UI 直接读信号。 */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    this.stored = await readJson<SyncConnection>(CONNECTION_KEY);
    this.base = (await readJson<BaseState>(BASE_KEY)) ?? emptyBase();
    if (!this.base.entries) this.base = emptyBase();
    const last = await Storage.getItem(LAST_KEY);
    this.lastSyncAt.set(last ? Number(last) || 0 : 0);
    this.applyForVault();
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
      const bundle = await session.connect();
      this.pending = { provider, session };
      this.phase.set("off");
      return bundle.account;
    } catch (err) {
      this.phase.set("off");
      throw err;
    }
  }

  /** 取消授权 / 选文件夹流程：清掉刚拿到的令牌，避免悬挂授权。 */
  async cancelConnect(): Promise<void> {
    OAuth.cancel();
    const pending = this.pending;
    this.pending = null;
    if (pending) {
      await pending.session.disconnect();
      this.sessions.delete(pending.provider);
    }
    this.phase.set("off");
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

  /** 绑定远程文件夹并持久化；返回绑定结果。 */
  async bind(remote: RemoteDir): Promise<SyncConnection> {
    const vault = this.requireVault();
    const pending = this.pending;
    if (!pending) throw new SyncError("auth", "no pending authorization");
    const conn: SyncConnection = {
      provider: pending.provider,
      account: pending.session.account,
      remoteId: remote.id,
      remotePath: normalizeSyncPath(remote.path),
      remoteName: remote.name,
      localRoot: vault.root,
      connectedAt: Date.now(),
    };
    this.stored = conn;
    this.base = emptyBase(Date.now());
    this.pending = null;
    this.sessions.set(conn.provider, pending.session);
    await Storage.setItem(CONNECTION_KEY, JSON.stringify(conn));
    await this.persistBase();
    await Storage.setItem(LAST_KEY, "0");
    this.connection.set(conn);
    this.lastSyncAt.set(0);
    this.conflicts.set([]);
    this.error.set(null);
    this.phase.set("synced");
    return conn;
  }

  /** 授权失效后重新走一次 OAuth，保留现有绑定与锚点。 */
  async reconnect(provider: ProviderId): Promise<string | null> {
    const config = loadSyncConfig(true);
    if (config.purchaseRequired) {
      throw new SyncError("config", "purchase required");
    }
    const session = this.sessionFor(provider, config);
    const bundle = await session.connect();
    const conn = this.stored;
    if (conn && conn.provider === provider) {
      const next: SyncConnection = { ...conn, account: bundle.account };
      this.stored = next;
      this.connection.set(next);
      await Storage.setItem(CONNECTION_KEY, JSON.stringify(next));
      this.error.set(null);
      this.conflicts.set([]);
      this.phase.set("synced");
    }
    return bundle.account;
  }

  /** 断开：清令牌、锚点与绑定；本地文件不动。 */
  async disconnect(): Promise<void> {
    const conn = this.stored;
    if (conn) {
      const session = this.sessions.get(conn.provider);
      if (session) await session.disconnect();
      this.sessions.delete(conn.provider);
    }
    if (this.pending) await this.cancelConnect();
    this.stored = null;
    this.base = emptyBase();
    this.connection.set(null);
    this.phase.set("off");
    this.lastSyncAt.set(0);
    this.conflicts.set([]);
    this.error.set(null);
    this.progress.set({ done: 0, total: 0 });
    await Storage.removeItem(CONNECTION_KEY);
    await Storage.removeItem(BASE_KEY);
    await Storage.removeItem(LAST_KEY);
  }

  /** 手动 / 自动同步；并发调用返回同一轮。 */
  async syncNow(): Promise<SyncRunResult | null> {
    await this.load();
    if (!this.isAttached()) return null;
    if (this.running) return this.running;
    this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** 对单个冲突应用用户选择；调用方在所有冲突处理完后重新同步。 */
  async resolveConflict(item: ConflictItem, choice: ConflictChoice): Promise<void> {
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
        const content = vault.read(item.path).content;
        const remoteFile = item.remote ?? null;
        const result = await remote.upload(root, item.path, content, { existing: remoteFile });
        this.setBase(item.path, {
          remoteId: result.id,
          remoteRev: result.rev,
          localMtimeMs: vault.mtime(item.path),
          localSize: utf8Size(content),
          hash: sha256Hex(content),
        });
      } else if (action.type === "download") {
        const source = item.remote;
        if (!source) continue;
        const content = await remote.download(source);
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
            localSize: utf8Size(content),
            hash: sha256Hex(content),
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
      const config = loadSyncConfig(true);
      const session = this.sessionFor(conn.provider, config);
      const bundle = await session.restore();
      if (!bundle) throw new SyncError("auth", "authorization expired");
      const remote = this.makeProvider(conn.provider, session);
      const root = this.rootDir(conn);

      const local = buildLocalFiles(vault, this.base);
      const remoteFiles = await remote.listFiles(root);

      const remoteHashes: Record<string, string> = {};
      const candidates = probeCandidates({ base: this.base, local, remote: remoteFiles });
      for (const candidate of candidates) {
        const file = remoteFiles.find((r) => r.path === candidate.path);
        if (!file) continue;
        const content = await remote.download(file);
        remoteHashes[candidate.path] = sha256Hex(content);
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
      const tick = () => this.progress.set({ done: ++done, total });

      for (const action of plan.uploads) {
        const content = vault.read(action.path).content;
        const remoteFile = remoteFiles.find((r) => r.path === action.path) ?? null;
        const uploaded = await remote.upload(root, action.path, content, {
          existing: remoteFile,
        });
        this.setBase(action.path, {
          remoteId: uploaded.id,
          remoteRev: uploaded.rev,
          localMtimeMs: action.local.mtimeMs,
          localSize: action.local.size,
          hash: action.local.hash ?? sha256Hex(content),
        });
        result.uploaded += 1;
        tick();
      }

      for (const action of plan.downloads) {
        assertLocalUnchanged(vault, action.path, action.local);
        const content = await remote.download(action.remote);
        writeLocal(vault, action.path, content);
        this.setBase(action.path, {
          remoteId: action.remote.id,
          remoteRev: action.remote.rev,
          localMtimeMs: vault.mtime(action.path),
          localSize: utf8Size(content),
          hash: sha256Hex(content),
        });
        result.downloaded += 1;
        result.changedLocal.push(action.path);
        tick();
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
        tick();
      }

      if (plan.remoteDeletes.length > 0) {
        // 删除远端不可逆：先确认云端版本仍是规划时那一版
        const fresh = new Map(
          (await remote.listFiles(root)).map((file) => [file.path, file] as const),
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
          tick();
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
        tick();
      }

      for (const path of plan.forgets) {
        delete this.base.entries[path];
        tick();
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
        await Storage.setItem(LAST_KEY, String(now));
      }
      return result;
    } catch (err) {
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
    await Storage.setItem(BASE_KEY, JSON.stringify(this.base));
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
export function buildLocalFiles(vault: Vault, base: BaseState): LocalFile[] {
  const entries = vault.listRecursive("");
  const out: LocalFile[] = [];
  for (const entry of entries) {
    if (entry.isDir === true || !isMarkdownName(entry.name)) continue;
    const path = normalizeSyncPath(entry.path);
    const anchor = base.entries[path] ?? null;
    const unchanged =
      !!anchor && anchor.localMtimeMs === entry.mtimeMs && anchor.localSize === entry.size;
    let hash: string | null = null;
    if (!unchanged) {
      try {
        hash = sha256Hex(vault.read(path).content);
      } catch {
        hash = null;
      }
    }
    out.push({ path, mtimeMs: entry.mtimeMs, size: entry.size, hash });
  }
  return out;
}

export function utf8Size(text: string): number {
  return new TextEncoder().encode(text).length;
}

function writeLocal(vault: Vault, path: string, content: string): void {
  const parent = dirName(path);
  if (parent) vault.ensureDir(parent);
  if (localExists(vault, path)) {
    vault.write(path, content, null);
  } else {
    vault.create(path, content);
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
function assertLocalUnchanged(
  vault: Vault,
  path: string,
  local: LocalFile | null,
): void {
  if (!local) return;
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
