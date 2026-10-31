import { Text, View, host, mount, signal } from "nsh";
import { EditorWorkspace } from "./EditorWorkspace";
import { setLocalePref } from "./i18n";
import { WindowBar, type ViewMode } from "./Toolbar";

/** 供 EditorWorkspace 组件测试挂载的最小入口。 */
const NOTE = "# hi\n\n```ts\nconst a = 1;\n```\n\nhi HI\n中文😀 中文😀\n[x] [x]";

function Harness() {
  if (host.params.locale === "en") setLocalePref("en");
  const mode = signal<ViewMode>("split");
  const source = signal(NOTE);
  const preview = signal(NOTE);
  const documentId = signal("first.md");
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
        source={source()}
        preview={preview()}
        onChange={(value) => preview.set(value)}
        mode={mode()}
        onRevealEditor={() => mode.set("split")}
        documentId={documentId()}
      />
      <View testID="switch-document" role="button" onPress={() => {
        documentId.set("second.md");
        source.set("hi in another file");
        preview.set("hi in another file");
      }}><Text>Switch document</Text></View>
      <Text testID="mode-value">{mode()}</Text>
    </View>
  );
}

mount(Harness);
