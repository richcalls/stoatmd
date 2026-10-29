import { List, Text, View, batch, effect, signal } from "nsh";
import { Editor, ResizablePanel, ResizablePanelGroup, TextView, type EditorDecoration } from "nsh/base";
import { markdownDecorations } from "./markdownDecorations";
import { previewGap, previewModel } from "./previewModel";
import { colors, themePreset, type ThemePreset } from "./theme";
import { fontFamilyName, fontSize, lineHeightPx } from "./typography";
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
};

const editorTextStyles = () => ({
  content: { backgroundColor: colors().editor, color: colors().ink, paddingRight: 16 },
});

/** 预览排版：字号/行高/字体来自设置；代码块与行内代码始终等宽。 */
const previewTextStyles = () => {
  const size = fontSize();
  const lh = lineHeightPx(size);
  const mono = Math.max(12, Math.round(size * 0.87));
  const quote = Math.max(12, Math.round(size * 0.967));
  return {
    root: {
      color: colors().ink,
      fontSize: size,
      lineHeight: lh,
      fontFamily: fontFamilyName(),
    },
    heading1: {
      fontSize: Math.round(size * 1.733),
      lineHeight: Math.round(size * 1.733 * 1.25),
      fontWeight: 650,
      letterSpacing: -0.39,
    },
    heading2: {
      fontSize: Math.round(size * 1.2),
      lineHeight: Math.round(size * 1.2 * 1.3),
      fontWeight: 600,
      letterSpacing: -0.18,
    },
    heading3: {
      fontSize: Math.round(size * 1.067),
      lineHeight: Math.round(size * 1.067 * 1.3),
      fontWeight: 600,
    },
    blockquote: {
      color: colors().ink2,
      fontSize: quote,
      lineHeight: Math.round(quote * 1.65),
      backgroundColor: colors().quoteBg,
      borderLeftWidth: 1,
      borderLeftColor: colors().accent,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 14,
      paddingRight: 14,
    },
    code: {
      color: colors().syntaxBold,
      backgroundColor: colors().codeBg,
      fontFamily: "Menlo",
      fontSize: mono,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    codeBlockCode: {
      fontFamily: "Menlo",
      fontSize: mono,
      lineHeight: Math.round(mono * 1.6),
    },
    strong: { fontWeight: 650 },
    link: { color: colors().accent },
  };
};

/** 右栏：Editor / List 预览；工具条由 MacShell 提供。 */
export function EditorWorkspace(props: Props) {
  // 预览数据走信号：换文时更新 List 的 each，而不是重建整个节点（重建会把滚动位置丢回顶部）
  const initial = previewModel(props.preview);
  const previewBlocks = signal(initial.blocks);
  const previewItemSize = signal(initial.estimatedItemSize);

  // 语法装饰按（正文, 主题）记忆：输入时只扫一遍，主题不变不重复构造
  let decorationCache: { text: string; preset: ThemePreset; value: EditorDecoration[] } | null = null;
  const decorations = (text: string) => {
    const preset = themePreset();
    if (decorationCache && decorationCache.text === text && decorationCache.preset === preset) {
      return decorationCache.value;
    }
    const value = markdownDecorations(text, preset.palette);
    decorationCache = { text, preset, value };
    return value;
  };
  const editorPane = () => (
    <View
      style={{ flex: 1, backgroundColor: colors().editor, position: "relative" }}
      testID="pane-editor"
      onHoverIn={() => markEditorHover(true)}
      onHoverOut={() => markEditorHover(false)}
    >
      {/* 对齐 ui-v1 pane-src：文件名走等宽小字，正文从标题下方开始 */}
      <View style={{ paddingTop: 16, paddingBottom: 4, paddingHorizontal: 20 }}>
        <Text
          testID="doc-title"
          numberOfLines={1}
          style={{
            fontSize: 12,
            fontWeight: "510",
            color: colors().ink3,
            fontFamily: "Menlo",
            letterSpacing: 0.12,
          }}
        >
          {props.fileName}
        </Text>
      </View>
      <View style={{ flex: 1 }} onLayout={(b) => setEditorViewHeight(b.size.height)}>
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
          decorations={decorations(props.source)}
          // 编辑器自己按显示行折行；行内再用 whitespace-nowrap 阻止 Text 二次折行，
          // 否则测量误差会让行尾字符折到下一行、与下一行文字重叠。右侧留白容纳这点溢出。
          classes={{ content: "whitespace-nowrap" }}
          styles={editorTextStyles()}
        />
      </View>
      {/* 隐藏探针：同宽同字体，滚到最大值即可反推出可见编辑器的内容高度（不可见、不可交互） */}
      <View
        style={{ height: 1, opacity: 0, overflow: "hidden" }}
        pointerEvents="none"
        onLayout={(b) => setHiddenViewHeight(b.size.height)}
      >
        <Editor
          ref={attachHiddenEditor}
          value={props.source}
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
          contentClass="px-9 py-7"
          testID="pane-preview"
          ref={attachPreview}
          onScroll={handlePreviewScroll}
          style={{ flex: 1, backgroundColor: colors().preview }}
        >
          {(block, index) => {
            const gap = () => {
              const all = previewBlocks();
              const at = index();
              return previewGap(at > 0 ? all[at - 1] : undefined, block());
            };
            return (
              <View
                style={{
                  maxWidth: 672,
                  width: "100%",
                  alignSelf: "flex-start",
                  paddingTop: gap(),
                }}
              >
                <TextView
                  document={{ blocks: [block()] }}
                  selectable
                  styles={previewTextStyles()}
                  classes={{
                    blockquote: "pl-3 py-1",
                    code: "font-mono",
                    strong: "font-semibold",
                  }}
                />
              </View>
            );
          }}
        </List>
      </View>
    );
  };

  // 预览换文或排版变化后 List 的内容高度不上报，轻推一次让同步拿到新的基准
  effect(() => {
    const model = previewModel(props.preview, {
      fontSize: fontSize(),
      lineHeight: lineHeightPx(),
    });
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
      <View style={{ flex: 1 }} testID={`workspace-mode-${props.mode}`}>
        {body()}
      </View>
    </View>
  );
}
