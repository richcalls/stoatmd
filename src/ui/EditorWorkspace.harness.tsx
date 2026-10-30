import { Text, View, mount, signal } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import { WorkspaceToolbar, type ViewMode } from "./Toolbar";

/** 供 EditorWorkspace 组件测试挂载的最小入口。 */
function Harness() {
  const mode = signal<ViewMode>("split");
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <WorkspaceToolbar
        title="写作的框架"
        mode={mode()}
        onMode={(m) => mode.set(m)}
        onFont={() => {}}
        onSettings={() => {}}
      />
      <EditorWorkspace
        source="# hi"
        preview="# hi"
        onChange={() => {}}
        mode={mode()}
      />
      <Text testID="mode-value">{mode()}</Text>
    </View>
  );
}

mount(Harness);
