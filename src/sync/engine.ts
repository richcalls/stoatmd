import type {
  AdoptAction,
  BaseEntry,
  BaseState,
  ConflictChoice,
  ConflictItem,
  DownloadAction,
  LocalDeleteAction,
  LocalFile,
  RemoteDeleteAction,
  RemoteFile,
  SyncPlan,
  UploadAction,
} from "./types";
import { planIsQuiet } from "./types";

export type PlanInput = {
  base: BaseState;
  local: LocalFile[];
  remote: RemoteFile[];
  /** 双方都有改动时，云端正文的哈希（由 runtime 下载后计算）。 */
  remoteHashes?: Record<string, string>;
};

export type ProbeCandidate = {
  path: string;
  /** 本地已删除时为 null：只需要云端正文判断它是否真被别处改过。 */
  localHash: string | null;
};

/**
 * 判断本地是否偏离锚点：mtime+size 不变即认为没改，省掉整库重读。
 * mtime 变了但正文哈希仍是锚点（保存同样内容、外部 touch）也算没改。
 */
export function localChanged(local: LocalFile, base: BaseEntry | null): boolean {
  if (!base) return true;
  if (local.hash !== null) return local.hash !== base.hash;
  return local.mtimeMs !== base.localMtimeMs || local.size !== base.localSize;
}

export function remoteChanged(remote: RemoteFile, base: BaseEntry | null): boolean {
  if (!base) return true;
  return remote.id !== base.remoteId || remote.rev !== base.remoteRev;
}

export function effectiveLocalHash(local: LocalFile, base: BaseEntry | null): string | null {
  if (local.hash !== null) return local.hash;
  if (
    base &&
    local.mtimeMs === base.localMtimeMs &&
    local.size === base.localSize
  ) {
    return base.hash;
  }
  return null;
}

/**
 * 本机认得的云端正文：上次对齐的内容，加上发出后没收到回执的上传。
 * 云端 rev 变了但正文落在这里面，说明没有别的设备改过它——
 * Drive 的 version 会因元数据变化自增；上传超时时云端可能已经写入。
 */
function ownRemoteHashes(input: PlanInput, path: string, anchor: BaseEntry | null): Set<string> {
  const known = new Set(input.base.pending?.[path] ?? []);
  if (anchor) known.add(anchor.hash);
  return known;
}

/**
 * 需要下载云端正文才能判定「云端是否真被别处改过」的路径：
 * 双方都存在且没有共同锚点或两边都改过，或本地已删而云端 rev 变了。
 */
export function probeCandidates(input: PlanInput): ProbeCandidate[] {
  const base = input.base.entries;
  const locals = new Map(input.local.map((file) => [file.path, file]));
  const out: ProbeCandidate[] = [];
  for (const remote of input.remote) {
    const local = locals.get(remote.path);
    const anchor = base[remote.path] ?? null;
    if (!local) {
      if (anchor && remoteChanged(remote, anchor)) out.push({ path: remote.path, localHash: null });
      continue;
    }
    if (anchor && !(localChanged(local, anchor) && remoteChanged(remote, anchor))) continue;
    const hash = effectiveLocalHash(local, anchor);
    if (hash) out.push({ path: remote.path, localHash: hash });
  }
  return out;
}

/** 纯规划：不读写、不联网；执行与冲突选择由 runtime 负责。 */
export function planSync(input: PlanInput): SyncPlan {
  const base = input.base.entries;
  const locals = new Map(input.local.map((file) => [file.path, file]));
  const remotes = new Map(input.remote.map((file) => [file.path, file]));
  const paths = new Set<string>([...Object.keys(base), ...locals.keys(), ...remotes.keys()]);

  const plan: SyncPlan = {
    uploads: [],
    downloads: [],
    localDeletes: [],
    remoteDeletes: [],
    adopts: [],
    conflicts: [],
    forgets: [],
  };

  for (const path of [...paths].sort()) {
    const local = locals.get(path) ?? null;
    const remote = remotes.get(path) ?? null;
    const anchor = base[path] ?? null;
    const localHash = local ? effectiveLocalHash(local, anchor) : null;
    const remoteHash = input.remoteHashes?.[path] ?? null;
    // 云端正文是本机自己写过的版本：rev 变化不代表别处改过。
    const remoteIsOurs = remoteHash !== null && ownRemoteHashes(input, path, anchor).has(remoteHash);

    if (local && remote) {
      if (!anchor) {
        if (localHash && remoteHash && localHash === remoteHash) {
          plan.adopts.push(adopt(path, local, remote, localHash, null));
        } else if (remoteIsOurs) {
          plan.uploads.push(upload(path, local, null));
        } else {
          plan.conflicts.push(conflict(path, "bothModified", null, local, remote, localHash, remoteHash));
        }
        continue;
      }
      const localMoved = localChanged(local, anchor);
      const remoteMoved = remoteChanged(remote, anchor);
      if (!localMoved && !remoteMoved) {
        // 只是 mtime 变了（同内容重存 / touch）：刷新锚点，免得之后每轮都重读重算哈希。
        if (localHash && (local.mtimeMs !== anchor.localMtimeMs || local.size !== anchor.localSize)) {
          plan.adopts.push(adopt(path, local, remote, localHash, anchor));
        }
        continue;
      }
      if (localMoved && remoteMoved) {
        if (localHash && remoteHash && localHash === remoteHash) {
          plan.adopts.push(adopt(path, local, remote, localHash, anchor));
        } else if (remoteIsOurs) {
          plan.uploads.push(upload(path, local, anchor));
        } else {
          plan.conflicts.push(
            conflict(path, "bothModified", anchor, local, remote, localHash, remoteHash),
          );
        }
      } else if (localMoved) {
        plan.uploads.push(upload(path, local, anchor));
      } else {
        plan.downloads.push(download(path, remote, anchor, local));
      }
      continue;
    }

    if (local && !remote) {
      if (!anchor) {
        plan.uploads.push(upload(path, local, null));
      } else if (localChanged(local, anchor)) {
        plan.conflicts.push(
          conflict(path, "remoteDeletedLocalModified", anchor, local, null, localHash, null),
        );
      } else {
        plan.localDeletes.push(localDelete(path, anchor));
      }
      continue;
    }

    if (!local && remote) {
      if (!anchor) {
        plan.downloads.push(download(path, remote, null, null));
      } else if (remoteChanged(remote, anchor) && !remoteIsOurs) {
        plan.conflicts.push(
          conflict(path, "localDeletedRemoteModified", anchor, null, remote, null, null),
        );
      } else {
        plan.remoteDeletes.push(remoteDelete(path, anchor, remote));
      }
      continue;
    }

    if (anchor) plan.forgets.push(path);
  }

  return plan;
}

export type ResolvedAction =
  | { type: "upload"; path: string }
  | { type: "download"; path: string; copyRemote: boolean }
  | { type: "localDelete"; path: string }
  | { type: "remoteDelete"; path: string };

/**
 * 用户对单个冲突的选择 → 要执行的动作。
 * 删除类冲突没有「两边都留」：一侧已不存在，留两份没有意义。
 */
export function resolveConflict(
  item: ConflictItem,
  choice: ConflictChoice,
): ResolvedAction[] | null {
  if (item.kind === "bothModified") {
    if (choice === "keepLocal") return [{ type: "upload", path: item.path }];
    if (choice === "keepRemote") return [{ type: "download", path: item.path, copyRemote: false }];
    return [
      { type: "download", path: item.path, copyRemote: true },
      { type: "upload", path: item.path },
    ];
  }
  if (item.kind === "localDeletedRemoteModified") {
    if (choice === "keepLocal") return [{ type: "remoteDelete", path: item.path }];
    if (choice === "keepRemote") return [{ type: "download", path: item.path, copyRemote: false }];
    return null;
  }
  if (choice === "keepLocal") return [{ type: "upload", path: item.path }];
  if (choice === "keepRemote") return [{ type: "localDelete", path: item.path }];
  return null;
}

export { planIsQuiet };

function upload(path: string, local: LocalFile, base: BaseEntry | null): UploadAction {
  return { path, local, base };
}

function download(
  path: string,
  remote: RemoteFile,
  base: BaseEntry | null,
  local: LocalFile | null,
): DownloadAction {
  return { path, remote, base, local };
}

function localDelete(path: string, base: BaseEntry): LocalDeleteAction {
  return { path, base };
}

function remoteDelete(path: string, base: BaseEntry, remote: RemoteFile | null = null): RemoteDeleteAction {
  return { path, base, remote };
}

function adopt(
  path: string,
  local: LocalFile,
  remote: RemoteFile,
  hash: string,
  base: BaseEntry | null,
): AdoptAction {
  return { path, local, remote, hash, base };
}

function conflict(
  path: string,
  kind: ConflictItem["kind"],
  base: BaseEntry | null,
  local: LocalFile | null,
  remote: RemoteFile | null,
  localHash: string | null,
  remoteHash: string | null,
): ConflictItem {
  return { path, kind, base, local, remote, localHash, remoteHash };
}
