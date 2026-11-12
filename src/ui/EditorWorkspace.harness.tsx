import { Text, View, host, mount, signal } from "nsh";
import { Button, Input } from "nsh/base";
import { applyRenderMode, restoreRenderMode } from "./documentAppearance";
import { applyTheme, restoreTheme } from "./theme";
import { EditorWorkspace } from "./EditorWorkspace";
import { loadSystemFonts, restoreTypography } from "./typography";
import { setLocalePref } from "./i18n";
import { WindowBar, type ViewMode } from "./Toolbar";

/** 供 EditorWorkspace 组件测试挂载的最小入口。 */
const NOTE = "# hi\n\n```ts\nconst a = 1;\n```\n\nhi HI\n中文😀 中文😀\n[x] [x]\n\n正文 plain text\n\n> 引用 quote\n\n[链接 link](https://example.com) 与 `inline_code`";

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
      {/* 编辑器之外的普通输入框（如侧栏搜索）：正文的快捷键回退不能作用到这里。 */}
      <Input testID="outside-input" placeholder="outside" />
      <Text testID="preview-value">{preview()}</Text>
      <Text testID="mode-value">{mode()}</Text>
      <Button testID="render-color" onPress={() => applyRenderMode("color")}><Text>Color</Text></Button>
      <Button testID="render-monochrome" onPress={() => applyRenderMode("monochrome")}><Text>Monochrome</Text></Button>
      <Button testID="theme-silver-point-dark" onPress={() => applyTheme("silver-point-dark")}><Text>Silver Point Dark</Text></Button>
    </View>
  );
}

loadSystemFonts();
void Promise.all([restoreRenderMode(), restoreTheme(), restoreTypography()]).then(() => mount(Harness));
