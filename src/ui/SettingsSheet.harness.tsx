import { Text, View, mount, signal } from "nsh";
import { Button } from "nsh/base";
import { SettingsSheet, type SettingsTab } from "./SettingsSheet";
import { loadSystemFonts, restoreTypography } from "./typography";

/** 设置关闭路径的最小挂载入口。 */
function Harness() {
  const open = signal(true);
  const tab = signal<SettingsTab>("appearance");
  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text testID="settings-open-flag">{open() ? "open" : "closed"}</Text>
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

loadSystemFonts();
void restoreTypography().then(() => mount(Harness));
