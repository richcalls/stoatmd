import { Text, View, mount, signal } from "nsh";
import { TitleBar, WorkspaceToolbar, type ViewMode } from "./Toolbar";

/** 顶栏与编辑工具条的最小挂载入口：标题排版与悬停开关。 */
function Harness() {
  const mode = signal<ViewMode>("split");
  const withVault = signal(true);
  const toggles = signal(0);
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <TitleBar
        showSidebarToggle={withVault()}
        onToggleSidebar={() => toggles.update((n) => n + 1)}
      />
      <WorkspaceToolbar
        title="写作的框架"
        mode={mode()}
        onMode={(m) => mode.set(m)}
        onFont={() => {}}
        onSettings={() => {}}
      />
      <View role="button" testID="no-vault" onPress={() => withVault.set(false)}>
        <Text>no-vault</Text>
      </View>
      <Text testID="toggles">{String(toggles())}</Text>
    </View>
  );
}

mount(Harness);
