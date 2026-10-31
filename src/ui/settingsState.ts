import { setColorScheme } from "nsh";
import { syncRuntime } from "../sync/runtime";
import { storageMigration } from "../storage/runtime";
import { activeStorage, storageBusy } from "../storage/state";
import { appLogo } from "./appLogo";
import { renderMode } from "./documentAppearance";
import { localePref, t } from "./i18n";
import { themeId, themePreset } from "./theme";
import { uiFontSize, editorFontSize, fontFamily, fontSize, fontLineHeight } from "./typography";
import type { SettingsTab } from "./SettingsSheet";

/** JSON state shared by the two engines; all sync operations run in the main engine. */
export function settingsState(vaultRoot: string | null, tab: SettingsTab) {
  return {
    title: t("settings.title"), vaultRoot, tab,
    theme: themeId(), locale: localePref(), logo: appLogo(), renderMode: renderMode(),
    typography: { ui: uiFontSize(), editor: editorFontSize(), family: fontFamily(), size: fontSize(), line: fontLineHeight() },
    storage: {
      busy: storageBusy(), active: activeStorage(),
      phase: storageMigration.phase(), target: storageMigration.target(), summary: storageMigration.summary(),
      keepOriginal: storageMigration.keepOriginal(), progress: storageMigration.progress(),
      error: storageMigration.error(), warning: storageMigration.warning(),
    },
    sync: {
      phase: syncRuntime.phase(), connection: syncRuntime.connection(), lastSyncAt: syncRuntime.lastSyncAt(),
      error: syncRuntime.error(), conflicts: syncRuntime.conflicts(), progress: syncRuntime.progress(),
    },
  };
}
export type SettingsState = ReturnType<typeof settingsState>;

export function applySettingsState(state: SettingsState) {
  themeId.set(state.theme);
  setColorScheme(themePreset(state.theme).mode);
  localePref.set(state.locale);
  appLogo.set(state.logo);
  renderMode.set(state.renderMode);
  uiFontSize.set(state.typography.ui);
  editorFontSize.set(state.typography.editor);
  fontFamily.set(state.typography.family);
  fontSize.set(state.typography.size);
  fontLineHeight.set(state.typography.line);
  storageBusy.set(state.storage.busy);
  activeStorage.set(state.storage.active);
  storageMigration.phase.set(state.storage.phase);
  const targetChanged = JSON.stringify(storageMigration.target()) !== JSON.stringify(state.storage.target);
  storageMigration.target.set(state.storage.target);
  storageMigration.summary.set(state.storage.summary);
  if (targetChanged || state.storage.phase !== "confirm") storageMigration.keepOriginal.set(state.storage.keepOriginal);
  storageMigration.progress.set(state.storage.progress);
  storageMigration.error.set(state.storage.error);
  storageMigration.warning.set(state.storage.warning);
  syncRuntime.phase.set(state.sync.phase);
  syncRuntime.connection.set(state.sync.connection);
  syncRuntime.lastSyncAt.set(state.sync.lastSyncAt);
  syncRuntime.error.set(state.sync.error);
  syncRuntime.conflicts.set(state.sync.conflicts);
  syncRuntime.progress.set(state.sync.progress);
}
