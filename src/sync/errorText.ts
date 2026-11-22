import type { SyncErrorKind } from "./provider";

export type SyncFailure = { kind: SyncErrorKind; message: string };

export function syncErrorKey(error: SyncFailure): string {
  // 云盘限流 / 超时 / 5xx 都不是「设备没网」，别把它们都说成网络不可用。
  if (error.kind === "network" && /^HTTP 429\b/.test(error.message)) return "sync.error.rateLimited";
  if (error.kind === "network" && (/^HTTP 5\d\d\b/.test(error.message) || /timed out/.test(error.message))) {
    return "sync.error.remote";
  }
  if (error.kind === "network") return "sync.error.network";
  if (error.kind === "auth") return "sync.error.auth";
  if (error.kind === "config") return "sync.error.config";
  return "sync.error.generic";
}

/** 网络与未知错误多半是暂时的：连击阈值内不在状态栏报警，留给下一次同步。 */
export function isTransientSyncError(error: SyncFailure): boolean {
  return error.kind === "network" || error.kind === "unknown";
}

/** 要展示给用户的失败：瞬时错误未达阈值时返回 null（状态栏当作一切正常）。 */
export function shownSyncFailure<T extends SyncFailure | null>(error: T, fails: number, threshold: number): T {
  if (!error) return error;
  return isTransientSyncError(error) && fails < threshold ? (null as T) : error;
}
