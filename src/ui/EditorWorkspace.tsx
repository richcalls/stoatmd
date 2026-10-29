import { List, Text, View, batch, effect, signal } from "nsh";
import { Editor, ResizablePanel, ResizablePanelGroup, TextView } from "nsh/base";
import { ModeSwitch } from "./ModeSwitch";
import { previewModel } from "./previewModel";
import { colors } from "./theme";
import type { ViewMode } from "./Toolbar";
import {
  EDITOR_LINE_HEIGHT,
  attachEditor,
  attachHiddenEditor,
  attachPreview,
  handlePreviewScroll,
  markEditorFocus,
  markEditorHover,
  refreshPreviewMetrics,
  setEditorViewHeight,
  setHiddenViewHeight,
  setPreviewViewHeight,
  setSyncMode,
} from "./scrollSync";

type Props = {
  fileName: string;
  source: string;
  /** 延迟同步的正文：预览只在输入停顿后重排，不跟随每个按键。 */
  preview: string;
  onChange: (value: string) => void;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
};

const editorTextStyles = () => ({
  content: { backgroundColor: colors().editor, color: colors().ink, paddingRight: 16 },
});

/** 右栏：顶栏模式切换 + Editor / List 预览。 */
export function EditorWorkspace(props: Props) {
  // 预览数据走信号：换文时更新 List 的 each，而不是重建整个节点（重建会把滚动位置丢回顶部）
  const initial = previewModel(props.preview);
  const previewBlocks = signal(initial.blocks);
  const previewItemSize = signal(initial.estimatedItemSize);
  const editorPane = () => (
    <View
      style={{ flex: 1, backgroundColor: colors().editor, position: "relative" }}
      testID="pane-editor"
      onLayout={(b) => setEditorViewHeight(b.size.height)}
      onHoverIn={() => markEditorHover(true)}
      onHoverOut={() => markEditorHover(false)}
    >
      <Editor
        ref={attachEditor}
        value={props.source}
        onChange={props.onChange}
        onFocus={() => markEditorFocus(true)}
        onBlur={() => markEditorFocus(false)}
        language="markdown"
        softWrap
        lineNumbers={false}
        fontSize={13.5}
        lineHeight={EDITOR_LINE_HEIGHT}
        scrollBeyondLastLine={false}
        style={{ flex: 1 }}
        // 编辑器自己按显示行折行；行内再用 whitespace-nowrap 阻止 Text 二次折行，
        // 否则测量误差会让行尾字符折到下一行、与下一行文字重叠。右侧留白容纳这点溢出。
        classes={{ content: "whitespace-nowrap" }}
        styles={editorTextStyles()}
      />
      {/* 隐藏探针：同宽同字体，滚到最大值即可反推出可见编辑器的内容高度（不可见、不可交互） */}
      <View
        style={{ height: 1, opacity: 0, overflow: "hidden" }}
        pointerEvents="none"
        onLayout={(b) => setHiddenViewHeight(b.size.height)}
      >
        <Editor
          ref={attachHiddenEditor}
          value={props.preview}
          readOnly
          language="markdown"
          softWrap
          lineNumbers={false}
          fontSize={13.5}
          lineHeight={EDITOR_LINE_HEIGHT}
          scrollBeyondLastLine={false}
          style={{ flex: 1 }}
          classes={{ content: "whitespace-nowrap" }}
          styles={editorTextStyles()}
        />
      </View>
    </View>
  );

  const previewPane = () => {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors().preview }}
        onLayout={(b) => setPreviewViewHeight(b.size.height)}
      >
        {/* 整篇 TextView 不虚拟化，长文档会拖垮整窗帧率：按块交给 List 回收渲染 */}
        <List
          each={previewBlocks()}
          estimatedItemSize={previewItemSize()}
          contentClass="px-6 py-4"
          testID="pane-preview"
          ref={attachPreview}
          onScroll={handlePreviewScroll}
          style={{ flex: 1, backgroundColor: colors().preview }}
        >
          {(block) => (
            <View style={{ maxWidth: 672, width: "100%", alignSelf: "center" }}>
              <TextView
                document={{ blocks: [block()] }}
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
          )}
        </List>
      </View>
    );
  };

  // 预览换文后 List 的内容高度不上报，轻推一次让同步拿到新的基准
  effect(() => {
    const model = previewModel(props.preview);
    batch(() => {
      previewBlocks.set(model.blocks);
      previewItemSize.set(model.estimatedItemSize);
    });
    refreshPreviewMetrics();
  });

  // 组件只运行一次：按模式取内容必须是闭包，在 JSX 里调用才会跟随 props.mode 重建
  const body = () => {
    setSyncMode(props.mode);
    if (props.mode === "edit") {
      return <View style={{ flex: 1 }}>{editorPane()}</View>;
    }
    if (props.mode === "preview") {
      return <View style={{ flex: 1 }}>{previewPane()}</View>;
    }
    return (
      <ResizablePanelGroup
        axis="horizontal"
        handleStyle={{ backgroundColor: colors().thread, width: 1 }}
        handleAccessibilityLabel="Resize editor and preview"
        style={{ flex: 1 }}
      >
        <ResizablePanel minSize={220}>{editorPane()}</ResizablePanel>
        <ResizablePanel minSize={220}>{previewPane()}</ResizablePanel>
      </ResizablePanelGroup>
    );
  };

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
        {body()}
      </View>
    </View>
  );
}
