import { Text, View, mount, signal } from "nsh";
import { WindowBar, type SidebarMode, type ViewMode } from "./Toolbar";

/** 统一窗口栏的最小挂载入口：左段品牌、面包屑、文件树开关与模式按钮。 */
function Harness() {
  const mode = signal<ViewMode>("split");
  const withVault = signal(true);
  const sidebar = signal<SidebarMode>("expanded");
  const toggles = signal(0);
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <WindowBar
        showSidebarToggle={withVault()}
        sidebarOpen={sidebar() === "expanded"}
        onToggleSidebar={() => {
          toggles.update((n) => n + 1);
          sidebar.update((s) => (s === "expanded" ? "hidden" : "expanded"));
        }}
        vaultName="带娃笔记"
        title="写作的框架"
        showModes={withVault()}
        mode={mode()}
        onMode={(m) => mode.set(m)}
      />
      <View role="button" testID="no-vault" onPress={() => withVault.set(false)}>
        <Text>no-vault</Text>
      </View>
      <Text testID="toggles">{String(toggles())}</Text>
      <Text testID="current-mode">{mode()}</Text>
    </View>
  );
}

mount(Harness);
