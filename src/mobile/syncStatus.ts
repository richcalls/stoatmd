import type { SyncErrorKind } from "../sync/provider";
import type { SyncPhase } from "../sync/runtime";

export type SyncStatus = {
  kind: "progress" | "error";
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

/** 同步横幅：进行中显示进度，失败显示可读原因；其余状态交给原有状态行。 */
export function syncStatus(
  phase: SyncPhase,
  progress: { done: number; total: number },
  error: { kind: SyncErrorKind; message: string } | null,
): SyncStatus | null {
  if (phase === "syncing") {
    const total = Math.max(0, progress.total);
    const done = Math.min(Math.max(0, progress.done), total);
    if (total === 0) return { kind: "progress", key: "mobile.syncPreparing", percent: 0 };
    return {
      kind: "progress",
      key: "mobile.syncProgress",
      params: { done, total },
      percent: Math.round((done / total) * 100),
    };
  }
  if ((phase === "offline" || phase === "error") && error) {
    return { kind: "error", key: errorKey(error.kind), percent: 0 };
  }
  return null;
}
