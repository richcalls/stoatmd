import type { SyncErrorKind } from "../sync/provider";
import type { SyncPhase } from "../sync/runtime";

export type SyncStatus = {
  kind: "progress" | "paused" | "error";
  key: string;
  params?: { done: number; total: number };
  percent: number;
};

function errorKey(kind: SyncErrorKind): string {
  if (kind === "network") return "sync.error.network";
  if (kind === "auth") return "sync.error.auth";
  if (kind === "config") return "sync.error.config";
  return "sync.error.generic";
}

function percentOf(progress: { done: number; total: number }): number {
  const total = Math.max(0, progress.total);
  if (total === 0) return 0;
  return Math.round((Math.min(Math.max(0, progress.done), total) / total) * 100);
}

/** 同步 accessory：进行中显示进度，暂停保留进度，失败显示可读原因并提供重试。 */
export function syncStatus(
  phase: SyncPhase,
  progress: { done: number; total: number },
  error: { kind: SyncErrorKind; message: string } | null,
): SyncStatus | null {
  if (phase === "syncing" || phase === "paused") {
    const total = Math.max(0, progress.total);
    const done = Math.min(Math.max(0, progress.done), total);
    const params = { done, total };
    if (phase === "paused") {
      return { kind: "paused", key: "mobile.syncPaused", params, percent: percentOf(progress) };
    }
    if (total === 0) return { kind: "progress", key: "mobile.syncPreparing", percent: 0 };
    return { kind: "progress", key: "mobile.syncProgress", params, percent: percentOf(progress) };
  }
  if ((phase === "offline" || phase === "error") && error) {
    return { kind: "error", key: errorKey(error.kind), percent: percentOf(progress) };
  }
  return null;
}
