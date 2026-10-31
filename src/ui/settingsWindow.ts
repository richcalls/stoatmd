import { Storage, cleanup, effect, signal, type Accessor } from "nsh";
import { SettingsWindow } from "stoatmd/native";
import { storageMigration } from "../storage/runtime";
import { storageBusy, type Location } from "../storage/state";
import { settingsStorage } from "./settingsStorage";
import { syncRuntime } from "../sync/runtime";
import { restoreAppLogo } from "./appLogo";
import { restoreRenderMode } from "./documentAppearance";
import { restoreLocale, t } from "./i18n";
import { settingsState } from "./settingsState";
import { settingsSyncResult } from "./settingsSync";
import { restoreTheme } from "./theme";
import { restoreTypography } from "./typography";
import type { SettingsTab } from "./SettingsSheet";

const SYNC_METHODS = ["beginConnect", "cancelConnect", "listFolders", "createFolder", "reconnect"] as const;
export type SettingsSyncMethod = typeof SYNC_METHODS[number];
type Request = { kind: "storage"; method: "prepare" | "migrate" | "cancel" | "retryCleanup" | "keepRemainingOriginals"; target?: Location; keepOriginal?: boolean } | { kind: "preference"; key: string; value: string } | { kind: "sync"; method: SettingsSyncMethod; args: unknown[] } | { kind: "action"; action: string };

type Options = {
  vaultRoot: Accessor<string | null>;
  onOpenVault: () => void;
  onBeforeMigration: () => Promise<void>;
  onStorageActivated: (root: string) => Promise<void>;
  onSyncNow: () => void;
  onManageConflicts: () => void;
};

/** Dispatches secondary-window requests in the main engine, including all vault writes. */
export function createSettingsRequestHandler(options: Options, tab: Accessor<SettingsTab>) {
  let preparation = 0;
  const cancelPreparation = async () => { preparation++; await settingsStorage.cancel(); };
  const execute = async (request: Request): Promise<unknown> => {
    if (request.kind === "preference") {
      if (!request.key.startsWith("prefs.")) throw new Error("Invalid preference key");
      await Storage.setItem(request.key, request.value);
      if (request.key === "prefs.theme") await restoreTheme();
      else if (request.key === "prefs.locale") await restoreLocale();
      else if (request.key === "prefs.appLogo") await restoreAppLogo();
      else if (request.key === "prefs.renderMode") await restoreRenderMode();
      else await restoreTypography();
      return null;
    }
    if (request.kind === "storage") {
      return settingsSyncResult(async () => {
        if (storageBusy()) return settingsState(options.vaultRoot(), tab());
        if (request.method === "prepare") {
          if (!request.target) throw new Error("Missing migration target");
          const generation = ++preparation;
          await settingsStorage.prepare(options.vaultRoot(), request.target, () => generation === preparation);
        } else if (request.method === "migrate") {
          storageMigration.keepOriginal.set(request.keepOriginal !== false);
          await settingsStorage.migrate(options.vaultRoot(), options.onBeforeMigration, options.onStorageActivated);
        } else if (request.method === "cancel") await cancelPreparation();
        else if (request.method === "retryCleanup") await settingsStorage.retryCleanup();
        else if (request.method === "keepRemainingOriginals") await settingsStorage.keepRemainingOriginals();
        else throw new Error("Invalid storage method");
        return settingsState(options.vaultRoot(), tab());
      });
    }
    if (request.kind === "sync") {
      if (!SYNC_METHODS.includes(request.method)) throw new Error("Invalid sync method");
      const method = syncRuntime[request.method] as (...args: unknown[]) => Promise<unknown>;
      return settingsSyncResult(() => method.apply(syncRuntime, request.args));
    }
    if (request.kind === "action") {
      if (request.action === "openVault") options.onOpenVault();
      if (request.action === "syncNow") options.onSyncNow();
      if (request.action === "conflicts") {
        SettingsWindow.close();
        options.onManageConflicts();
      }
    }
    return null;
  };

  return { execute, cancelPreparation };
}

export function createSettingsWindow(options: Options) {
  const tab = signal<SettingsTab>("appearance");
  const open = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const { execute, cancelPreparation } = createSettingsRequestHandler(options, tab);
  const snapshot = () => JSON.stringify(settingsState(options.vaultRoot(), tab()));
  const drain = () => {
    for (const request of SettingsWindow.takeRequests()) {
      void Promise.resolve().then(() => execute(JSON.parse(request.data) as Request)).then(
        (value) => SettingsWindow.reply(request.id, JSON.stringify(value ?? null), null),
        (error) => SettingsWindow.reply(request.id, "null", String(error)),
      );
    }
    if (open() && !SettingsWindow.isOpen()) {
      open.set(false);
      void cancelPreparation();
      if (!storageBusy() && syncRuntime.phase() !== "syncing") void syncRuntime.cancelConnect();
    }
    timer = setTimeout(drain, open() ? 50 : 500);
  };

  effect(() => {
    if (open()) SettingsWindow.publish(snapshot());
  });
  cleanup(() => { clearTimeout(timer); SettingsWindow.close(); });

  return {
    open(next: SettingsTab) {
      if (!storageBusy()) tab.set(next);
      SettingsWindow.open(t("settings.title"), snapshot());
      open.set(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(drain, 50);
    },
  };
}
