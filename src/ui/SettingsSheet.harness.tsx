import { Storage, Text, View, host, mount, setColorScheme, signal } from "nsh";
import { Button } from "nsh/base";
import { fixSyncConfigForTest } from "../sync/config";
import { appLogo, restoreAppLogo } from "./appLogo";
import { SettingsSheet, type SettingsTab } from "./SettingsSheet";
import { loadSystemFonts, restoreTypography } from "./typography";
import { restoreRenderMode } from "./documentAppearance";
import { restoreReaderWidth } from "./readerWidth";
import { setLocalePref, type LocalePref } from "./i18n";
import { themeId, themePreset, type ThemeId } from "./theme";

/** 设置关闭路径的最小挂载入口。 */
function Harness() {
  const open = signal(true);
  if (host.params.locale) setLocalePref(host.params.locale as LocalePref);
  const preset = themePreset((host.params.theme as ThemeId) ?? "merino-light");
  themeId.set(preset.id);
  setColorScheme(preset.mode);
  const tab = signal<SettingsTab>((host.params.tab as SettingsTab) ?? "appearance");
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text testID="settings-open-flag">{open() ? "open" : "closed"}</Text>
      <Text testID="logo-id">{appLogo()}</Text>
      <Button testID="reopen" onPress={() => open.set(true)}>
        <Text>reopen</Text>
      </Button>
      <SettingsSheet
        open={open()}
        tab={tab()}
        onTab={(t) => tab.set(t)}
        onClose={() => open.set(false)}
        vaultRoot="/tmp/stoatmd-test-vault"
        onOpenVault={() => {}}
        onSyncNow={() => {}}
        onManageConflicts={() => {}}
      />
    </View>
  );
}

const testConfig = {
  googleClientId: "",
  googleClientSecret: "",
  dropboxAppKey: "",
  dropboxAppSecret: "",
  dropboxRedirectPort: 0,
  purchaseRequired: false,
  configPath: "/tmp/stoatmd-test-sync.json",
};
loadSystemFonts();
void Promise.all([
  restoreTypography(),
  restoreRenderMode(),
  restoreReaderWidth(),
  restoreAppLogo(),
]).then(async () => {
  testConfig.purchaseRequired = await Storage.getItem("test.locked") === "true";
  fixSyncConfigForTest(testConfig);
  mount(Harness);
});
