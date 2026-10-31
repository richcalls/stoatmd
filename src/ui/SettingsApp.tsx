import { host, signal } from "nsh";
import { SettingsWindow } from "stoatmd/native";
import { storageMigration } from "../storage/runtime";
import { settingsStorage } from "./settingsStorage";
import { syncRuntime } from "../sync/runtime";
import { SettingsSheet, type SettingsTab } from "./SettingsSheet";
import { applySettingsState, type SettingsState } from "./settingsState";
import { unwrapSettingsSync, type SettingsSyncResult } from "./settingsSync";

/** Secondary window root. The host channel forwards work to the main engine. */
export function SettingsApp() {
  const initial = host.params.state as unknown as SettingsState;
  const state = signal(initial);
  const open = signal(true);
  const tab = signal<SettingsTab>(initial.tab);
  applySettingsState(initial);
  const receive = (next: SettingsState) => {
    state.set(next);
    applySettingsState(next);
  };
  host.on<SettingsState>("state", receive);
  host.on<SettingsState>("open", (next) => {
    if (!next.storage.busy) tab.set(next.tab);
    open.set(true);
    receive(next);
  });
  host.on<boolean>("visibility", (visible) => open.set(visible));

  syncRuntime.load = async () => {};
  for (const method of ["beginConnect", "cancelConnect", "listFolders", "createFolder", "reconnect"] as const) {
    Object.assign(syncRuntime, {
      [method]: async (...args: unknown[]) => unwrapSettingsSync(await host.call<SettingsSyncResult>(
        "settings", { kind: "sync", method, args }, { timeout: 330_000 },
      )),
    });
  }
  const storageCall = async (method: string, extra: object = {}) => {
    const value = unwrapSettingsSync(await host.call<SettingsSyncResult>(
      "settings", { kind: "storage", method, ...extra }, { timeout: 3_600_000 },
    ));
    receive(value as SettingsState);
    return value;
  };
  settingsStorage.prepare = async (_root, target) => { await storageCall("prepare", { target }); };
  settingsStorage.migrate = async () => { await storageCall("migrate", { keepOriginal: storageMigration.keepOriginal() }); };
  settingsStorage.retryCleanup = async () => { await storageCall("retryCleanup"); };
  settingsStorage.keepRemainingOriginals = async () => { await storageCall("keepRemainingOriginals"); };
  settingsStorage.cancel = async () => { await storageCall("cancel"); };
  const action = (action: string) => { host.post("settings", { kind: "action", action }); };
  return <SettingsSheet
    open={open()}
    tab={tab()}
    onTab={(next) => tab.set(next)}
    onClose={() => SettingsWindow.close()}
    vaultRoot={state().vaultRoot}
    onOpenVault={() => action("openVault")}
    onBeforeMigration={async () => {}}
    onStorageActivated={async () => {}}
    onSyncNow={() => action("syncNow")}
    onManageConflicts={() => action("conflicts")}
  />;
}
