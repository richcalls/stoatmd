import { Text, View, mount, signal } from "nsh";
import { Button } from "nsh/base";
import { fixSyncConfigForTest } from "../sync/config";
import { appLogo, restoreAppLogo } from "./appLogo";
import { SettingsSheet, type SettingsTab } from "./SettingsSheet";
import { restoreSettingsWindowFrame, settingsWindowFrame } from "./settingsWindow";
import { loadSystemFonts, restoreTypography } from "./typography";

/** 设置关闭路径的最小挂载入口。 */
function Harness() {
  const open = signal(true);
  const tab = signal<SettingsTab>("appearance");
  const frameText = () => {
    const frame = settingsWindowFrame();
    return frame ? `${frame.x},${frame.y}` : "centered";
  };
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text testID="settings-open-flag">{open() ? "open" : "closed"}</Text>
      <Text testID="logo-id">{appLogo()}</Text>
      <Text testID="settings-frame">{frameText()}</Text>
      <Button testID="reopen" onPress={() => open.set(true)}>
        <Text>reopen</Text>
      </Button>
      <SettingsSheet
        open={open()}
        tab={tab()}
        onTab={(t) => tab.set(t)}
        onClose={() => open.set(false)}
        windowWidth={1280}
        windowHeight={800}
        vaultRoot="/tmp/stoatmd-test-vault"
        onOpenVault={() => {}}
        onSyncNow={() => {}}
        onManageConflicts={() => {}}
      />
    </View>
  );
}

fixSyncConfigForTest({
  googleClientId: "",
  googleClientSecret: "",
  dropboxAppKey: "",
  dropboxAppSecret: "",
  dropboxRedirectPort: 0,
  purchaseRequired: false,
  configPath: "/tmp/stoatmd-test-sync.json",
});
loadSystemFonts();
void Promise.all([
  restoreTypography(),
  restoreAppLogo(),
  restoreSettingsWindowFrame(),
]).then(() => mount(Harness));
