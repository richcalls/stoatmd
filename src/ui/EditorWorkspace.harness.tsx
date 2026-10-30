import { Text, View, mount, signal } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import { WindowBar, type ViewMode } from "./Toolbar";

/** 供 EditorWorkspace 组件测试挂载的最小入口。 */
const NOTE = "# hi\n\n```ts\nconst a = 1;\n```";

function Harness() {
  const mode = signal<ViewMode>("split");
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <WindowBar
        showSidebarToggle={false}
        sidebarOpen={false}
        onToggleSidebar={() => {}}
        vaultName=""
        title="写作的框架"
        showModes
        mode={mode()}
        onMode={(m) => mode.set(m)}
      />
      <EditorWorkspace
        source={NOTE}
        preview={NOTE}
        onChange={() => {}}
        mode={mode()}
      />
      <Text testID="mode-value">{mode()}</Text>
    </View>
  );
}

mount(Harness);
