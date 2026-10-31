import { SyncError, type SyncErrorKind } from "../sync/provider";

/** Keep error categories intact across the independent JavaScript engines. */
export type SettingsSyncResult =
  | { ok: true; value: unknown }
  | { ok: false; error: { kind: SyncErrorKind; message: string; detail: string | null } };

export async function settingsSyncResult(run: () => Promise<unknown>): Promise<SettingsSyncResult> {
  try {
    return { ok: true, value: (await run()) ?? null };
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: error instanceof SyncError ? error.kind : "unknown",
        message: error instanceof Error ? error.message : String(error),
        detail: error instanceof SyncError ? error.detail : null,
      },
    };
  }
}

export function unwrapSettingsSync(result: SettingsSyncResult): unknown {
  if (result.ok === false) {
    throw new SyncError(result.error.kind, result.error.message, result.error.detail);
  }
  return result.value;
}
