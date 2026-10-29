/** 同步一期仅两家网盘（docs/product/SYNC.md）。 */
export type ProviderId = "google" | "dropbox";

/** 本地库文件（只同步 `.md`）。 */
export type LocalFile = {
  path: string;
  mtimeMs: number;
  size: number;
  /** 内容哈希；mtime + size 未变时可省略，沿用它上次对齐时的哈希。 */
  hash: string | null;
};

/** 云端文件；`rev` 是提供商的版本标记（Drive version / Dropbox rev）。 */
export type RemoteFile = {
  path: string;
  id: string;
  rev: string;
  mtimeMs: number;
  size: number;
};

/** 上次成功对齐时两侧的锚点。 */
export type BaseEntry = {
  path: string;
  remoteId: string;
  remoteRev: string;
  localMtimeMs: number;
  localSize: number;
  hash: string;
};

export type BaseState = {
  version: 1;
  savedAt: number;
  entries: Record<string, BaseEntry>;
};

export type ConflictKind =
  | "bothModified"
  | "localDeletedRemoteModified"
  | "remoteDeletedLocalModified";

export type ConflictChoice = "keepLocal" | "keepRemote" | "keepBoth";

export type UploadAction = {
  path: string;
  local: LocalFile;
  base: BaseEntry | null;
};

export type DownloadAction = {
  path: string;
  remote: RemoteFile;
  base: BaseEntry | null;
  local: LocalFile | null;
};

export type LocalDeleteAction = {
  path: string;
  base: BaseEntry;
};

export type RemoteDeleteAction = {
  path: string;
  base: BaseEntry;
};

export type AdoptAction = {
  path: string;
  local: LocalFile;
  remote: RemoteFile;
  hash: string;
  base: BaseEntry | null;
};

export type ConflictItem = {
  path: string;
  kind: ConflictKind;
  base: BaseEntry | null;
  local: LocalFile | null;
  remote: RemoteFile | null;
  /** 双方都改过且内容不同：保留哪个由用户选。 */
  localHash: string | null;
  remoteHash: string | null;
};

export type SyncPlan = {
  uploads: UploadAction[];
  downloads: DownloadAction[];
  localDeletes: LocalDeleteAction[];
  remoteDeletes: RemoteDeleteAction[];
  adopts: AdoptAction[];
  conflicts: ConflictItem[];
  /** 两侧都已不存在的旧锚点，直接从 base 移除。 */
  forgets: string[];
};

export function emptyBase(now = 0): BaseState {
  return { version: 1, savedAt: now, entries: {} };
}

/** 引擎结果是否一次往返就收敛（没有传输、也没有待用户选择的冲突）。 */
export function planIsQuiet(plan: SyncPlan): boolean {
  return (
    plan.uploads.length === 0 &&
    plan.downloads.length === 0 &&
    plan.localDeletes.length === 0 &&
    plan.remoteDeletes.length === 0 &&
    plan.adopts.length === 0 &&
    plan.forgets.length === 0 &&
    plan.conflicts.length === 0
  );
}
