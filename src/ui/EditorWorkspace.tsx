import { Scroll, Text, View } from "nsh";
import { Editor, ResizablePanel, ResizablePanelGroup, TextView } from "nsh/base";
import { ModeSwitch } from "./ModeSwitch";
import { colors } from "./theme";
import type { ViewMode } from "./Toolbar";

type Props = {
  fileName: string;
  source: string;
  onChange: (value: string) => void;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
};

/** 右栏：顶栏模式切换 + Editor / TextView。 */
export function EditorWorkspace(props: Props) {
  const editorPane = (
    <View style={{ flex: 1, backgroundColor: colors().editor }} testID="pane-editor">
      <Editor
        value={props.source}
        onChange={props.onChange}
        language="markdown"
        softWrap
        lineNumbers={false}
        fontSize={13.5}
        lineHeight={24}
        style={{ flex: 1 }}
        styles={{
          content: { backgroundColor: colors().editor, color: colors().ink },
        }}
      />
    </View>
  );

  const previewPane = (
    <Scroll
      testID="pane-preview"
      style={{ flex: 1, backgroundColor: colors().preview }}
      contentClass="px-6 py-4"
    >
      <View style={{ maxWidth: 672, width: "100%", alignSelf: "center" }}>
        <TextView
          markdown={props.source}
          selectable
          styles={{
            root: { color: colors().ink, fontSize: 15, lineHeight: 26 },
            blockquote: { color: colors().ink2 },
            code: { color: colors().syntaxBold },
            link: { color: colors().accent },
          }}
          classes={{
            heading1: "text-[26px] font-semibold",
            heading2: "text-[18px] font-semibold",
            heading3: "text-[16px] font-semibold",
            blockquote: "pl-3 py-1",
            code: "font-mono text-[13px]",
            strong: "font-semibold",
          }}
        />
      </View>
    </Scroll>
  );

  let body: any;
  if (props.mode === "edit") {
    body = <View style={{ flex: 1 }}>{editorPane}</View>;
  } else if (props.mode === "preview") {
    body = <View style={{ flex: 1 }}>{previewPane}</View>;
  } else {
    body = (
      <ResizablePanelGroup
        axis="horizontal"
        handleStyle={{ backgroundColor: colors().thread, width: 1 }}
        handleAccessibilityLabel="Resize editor and preview"
        style={{ flex: 1 }}
      >
        <ResizablePanel minSize={220}>{editorPane}</ResizablePanel>
        <ResizablePanel minSize={220}>{previewPane}</ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: "column", backgroundColor: colors().editor }}>
      {/* 编辑区顶栏：文件名左、模式右——对齐 ui-v1 editor-toolbar */}
      <View
        testID="editor-toolbar"
        style={{
          height: 40,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors().thread,
          backgroundColor: colors().editor,
          gap: 8,
        }}
      >
        <Text
          style={{ flex: 1, fontSize: 12, color: colors().ink3 }}
          numberOfLines={1}
        >
          {props.fileName}
        </Text>
        <ModeSwitch mode={props.mode} onMode={props.onMode} />
      </View>
      <View style={{ flex: 1 }} testID={`workspace-mode-${props.mode}`}>
        {body}
      </View>
    </View>
  );
}
