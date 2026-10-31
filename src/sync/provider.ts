import type { ProviderId, RemoteFile } from "./types";

/** 云端目录；`id` 是提供商的定位（Drive folder id / Dropbox 绝对路径）。 */
export type RemoteDir = {
  id: string;
  path: string;
  name: string;
};

export type SyncErrorKind =
  | "network"
  | "auth"
  | "notFound"
  | "conflict"
  | "config"
  | "ambiguous"
  | "unknown";

export class SyncError extends Error {
  readonly kind: SyncErrorKind;
  readonly detail: string | null;

  constructor(kind: SyncErrorKind, message: string, detail: string | null = null) {
    super(message);
    this.name = "SyncError";
    this.kind = kind;
    this.detail = detail;
  }
}

export class RemoteConflictError extends SyncError {
  constructor(message: string, detail: string | null = null) {
    super("conflict", message, detail);
    this.name = "RemoteConflictError";
  }
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** 单次网络请求的上限：挂起的请求要变成可重试的错误，而不是永远停在「同步中」。 */
export const REQUEST_TIMEOUT_MS = 60_000;

export function fetchWithTimeout(
  fetchImpl: FetchLike,
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Response>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error("request timed out"));
      controller.abort();
    }, timeoutMs);
  });
  return Promise.race([
    fetchImpl(input, { ...init, signal: controller.signal }),
    timeout,
  ]).finally(() => clearTimeout(timer));
}

export type SyncProvider = {
  readonly id: ProviderId;
  readonly account: string | null;
  listFiles(root: RemoteDir): Promise<RemoteFile[]>;
  inventory(root: RemoteDir): Promise<{ files: RemoteFile[]; directories: string[] }>;
  ensureDirectory(root: RemoteDir, path: string): Promise<void>;
  downloadBytes(file: RemoteFile): Promise<Uint8Array>;
  uploadBytes(root: RemoteDir, path: string, content: Uint8Array,
    options: { existing: RemoteFile | null }): Promise<RemoteFile>;
  listFolders(root: RemoteDir, dir: RemoteDir): Promise<RemoteDir[]>;
  createFolder(root: RemoteDir, parent: RemoteDir, name: string): Promise<RemoteDir>;
  download(file: RemoteFile): Promise<string>;
  upload(
    root: RemoteDir,
    path: string,
    content: string,
    options: { existing: RemoteFile | null },
  ): Promise<RemoteFile>;
  remove(file: RemoteFile): Promise<void>;
};

/** 统一的 HTTP 错误分类，界面据此显示离线 / 重新授权等状态。 */
export function providerStatusError(status: number, detail: string): SyncError {
  if (status === 401 || status === 403) return new SyncError("auth", `HTTP ${status}`, detail);
  if (status === 404) return new SyncError("notFound", `HTTP ${status}`, detail);
  if (status === 409 || status === 412) {
    return new RemoteConflictError(`HTTP ${status}`, detail);
  }
  if (status === 429 || status >= 500) return new SyncError("network", `HTTP ${status}`, detail);
  return new SyncError("unknown", `HTTP ${status}`, detail);
}

export function networkError(err: unknown): never {
  if (err instanceof SyncError) throw err;
  const message = err instanceof Error ? err.message : String(err);
  throw new SyncError("network", message);
}

/** 网络类错误可以自动重试；授权 / 配置类不能。 */
export function isRecoverableNetworkError(err: unknown): boolean {
  return err instanceof SyncError && (err.kind === "network" || err.kind === "unknown");
}
