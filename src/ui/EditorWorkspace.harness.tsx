import { Text, View, mount, signal } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import type { ViewMode } from "./Toolbar";

/** 供 EditorWorkspace 组件测试挂载的最小入口。 */
function Harness() {
  const mode = signal<ViewMode>("split");
  return (
    <View style={{ flex: 1, flexDirection: "column" }}>
      <EditorWorkspace
        fileName="a.md"
        source="# hi"
        preview="# hi"
        onChange={() => {}}
        mode={mode()}
        onMode={(m) => mode.set(m)}
      />
      <Text testID="mode-value">{mode()}</Text>
    </View>
  );
}

mount(Harness);
