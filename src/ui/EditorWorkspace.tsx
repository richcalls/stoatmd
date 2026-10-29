import { Scroll, Text, View } from "nsh";
import { Editor, ResizablePanel, ResizablePanelGroup, TextView } from "nsh/base";
import { colors } from "./theme";
import type { ViewMode } from "./Toolbar";

type Props = {
  fileName: string;
  source: string;
  onChange: (value: string) => void;
  mode: ViewMode;
};

/** 右栏：Editor + TextView；按模式显示仅编辑 / 分栏 / 仅预览。 */
export function EditorWorkspace(props: Props) {
  const editorPane = (
    <View style={{ flex: 1, backgroundColor: colors().editor }}>
      <Text
        style={{
          fontSize: 12,
          color: colors().ink3,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        {props.fileName}
      </Text>
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
    <Scroll style={{ flex: 1, backgroundColor: colors().preview }} contentClass="px-6 py-4">
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

  if (props.mode === "edit") {
    return <View style={{ flex: 1 }}>{editorPane}</View>;
  }
  if (props.mode === "preview") {
    return <View style={{ flex: 1 }}>{previewPane}</View>;
  }

  return (
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
