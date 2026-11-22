import { List, View, batch, cleanup, computed, effect, keymap, signal, type InputRef } from "nsh";
import { Editor, ResizablePanel, ResizablePanelGroup, TextView, type EditorDecoration, type EditorRef, type EditorSearchResult, type TextViewStyles } from "nsh/base";
import { FindBar } from "./FindBar";
import { findShortcuts, type FindRequest } from "./findShortcuts";
import { markdownDecorations } from "./markdownDecorations";
import { displayBlock, documentColors, renderMode, type RenderMode } from "./documentAppearance";
import { t } from "./i18n";
import { kamiMonoFamily } from "./kami";
import {
  PREVIEW_TOP_PADDING,
  previewGap,
  previewModel,
  resolveAnchor,
} from "./previewModel";
import { colors, themePreset, type ThemePalette, type ThemePreset } from "./theme";
import { editorFontSize, editorLineHeight, editorFontFamily, fontSize, lineHeightPx, documentFontFamily, systemFonts } from "./typography";
import { readerWidth } from "./readerWidth";
import type { ViewMode } from "./Toolbar";
import {
  attachEditor,
  attachHiddenEditor,
  attachPreview,
  handlePreviewScroll,
  markEditorActivity,
  markEditorFocus,
  markEditorHover,
  refreshPreviewMetrics,
  scrollPreviewToIndex,
  setEditorViewHeight,
  setHiddenViewHeight,
  setPreviewViewHeight,
  setSyncMode,
} from "./scrollSync";

type Props = {
  source: string;
  readOnly?: boolean;
  /** 延迟同步的正文：预览只在输入停顿后重排，不跟随每个按键。 */
  preview: string;
  onChange: (value: string) => void;
  mode: ViewMode;
  documentId?: string;
  findRequest?: FindRequest;
  searchEnabled?: boolean;
  onRevealEditor: () => void;
  /** 阅读模式视口顶部块（目录滚动高亮用）。 */
  onVisibleBlock?: (index: number) => void;
};

const editorTextStyles = () => ({
  content: { backgroundColor: colors().editor, color: colors().ink, paddingRight: 16 },
});

/** 预览排版：系统正文字体、克制的标题阶梯（以正文字号为基准），字号随设置缩放。 */
export const previewTextStyles = (palette: ThemePalette = colors()): TextViewStyles => {
  const size = fontSize();
  const lh = lineHeightPx(size);
  const mono = kamiMonoFamily(systemFonts());
  const ink = documentColors(palette);
  const h1 = Math.round(size * 1.75);
  const h2 = Math.round(size * 1.375);
  const h3 = Math.round(size * 1.125);
  const h6 = Math.round(size * 0.875);
  const code = Math.round(size * 0.875);
  return {
    root: {
      color: palette.ink,
      fontSize: size,
      lineHeight: lh,
      fontFamily: documentFontFamily(),
      letterSpacing: 0,
    },
    heading: { fontWeight: 600, color: ink.heading },
    heading1: {
      fontSize: h1,
      lineHeight: Math.round(h1 * 1.2),
      letterSpacing: -0.5,
    },
    heading2: {
      fontSize: h2,
      lineHeight: Math.round(h2 * 1.25),
      letterSpacing: -0.3,
    },
    heading3: {
      fontSize: h3,
      lineHeight: Math.round(h3 * 1.3),
      letterSpacing: -0.1,
    },
    heading4: {
      fontSize: size,
      lineHeight: Math.round(size * 1.4),
    },
    heading5: {
      fontSize: size,
      lineHeight: Math.round(size * 1.4),
    },
    heading6: {
      fontSize: h6,
      lineHeight: Math.round(h6 * 1.4),
      color: palette.ink2,
    },
    // 引用：左侧竖线、无底色，文字颜色跟随文稿配色。
    blockquote: {
      color: ink.quote,
      fontSize: size,
      lineHeight: lh,
      backgroundColor: "transparent",
      borderLeftWidth: 3,
      borderLeftColor: palette.thread,
      paddingLeft: 14,
      paddingRight: 0,
    },
    // Callout（GitHub alert）：圆角灰底卡片，种类靠原生图标颜色表达，
    // 覆盖引用块的竖线与文字色。
    alert: {
      color: palette.ink,
      backgroundColor: palette.codeBg,
      borderLeftWidth: 0,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    code: {
      color: ink.code,
      backgroundColor: palette.codeBg,
      fontFamily: mono,
      fontSize: code,
      borderRadius: 4,
      paddingHorizontal: 5,
    },
    codeBlock: {
      // Fenced code keeps a stable neutral surface across appearance themes.
      backgroundColor: palette.codeBg,
      borderWidth: 0,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    codeBlockCode: {
      fontFamily: mono,
      fontSize: code,
      lineHeight: Math.round(code * 1.55),
      color: palette.ink,
    },
    strong: { fontWeight: 600 },
    link: { color: ink.link, textDecorationLine: "underline" },
    listMarker: { color: ink.marker },
    // Tables read like a document: horizontal rules only, no outer frame or column lines.
    table: { borderWidth: 0 },
    tableHead: { backgroundColor: "transparent" },
    tableHeaderCell: {
      color: palette.ink,
      fontWeight: 600,
      borderTopWidth: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: palette.thread,
    },
    tableCell: {
      borderTopWidth: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: palette.thread,
    },
    rule: { borderTopColor: palette.thread },
  };
};

/** 右栏：Editor / List 预览；工具条由 MacShell 提供。 */
export function EditorWorkspace(props: Props) {
  const findOpen = signal(false);
  const findQuery = signal("");
  const findResult = signal<EditorSearchResult>({ count: 0, current: null });
  const findFocused = signal(false);
  let editor: EditorRef | null = null;
  // macOS sends Command editing keystrokes through the application keymap
  // before the native editor receives them. Keep the focused state so the
  // fallback bindings only act on the document editor, while find inputs keep
  // their own native editing behavior.
  const editorFocused = signal(false);
  let findInput: InputRef | null = null;
  let findGeneration = 0;
  let selectPending = false;
  const shortcuts = findShortcuts();
  const focusFind = () => {
    findInput?.focus();
    findInput?.setSelection(0, findQuery().length);
  };
  const openFind = () => {
    if (props.searchEnabled === false) return;
    // `keymap` bindings for the editor are intentionally allowed to run while
    // a text field is focused. Clear that state before moving focus to the
    // find field so Command+A/C/X/V stay native to the query input.
    editorFocused.set(false);
    const generation = ++findGeneration;
    const selected = editor?.selectedText();
    if (props.mode === "preview") props.onRevealEditor();
    if (!findOpen()) selectPending = true;
    findOpen.set(true);
    focusFind();
    if (selected) void selected.then((text) => {
      if (generation !== findGeneration || !findOpen()) return;
      if (text && !/[\r\n]/.test(text)) {
        selectPending = text !== findQuery();
        findQuery.set(text);
      }
      focusFind();
    }).catch(() => {});
  };
  const closeFind = () => {
    findGeneration += 1;
    findOpen.set(false);
    findFocused.set(false);
    findInput = null;
    editor?.focus();
    // Keep the fallback command route available immediately. The editor's
    // focus event follows on the next native turn on macOS.
    editorFocused.set(true);
  };
  const moveMatch = (forward: boolean) => {
    if (props.searchEnabled === false) return;
    if (!findOpen() || props.mode === "preview") {
      openFind();
      return;
    }
    editor?.run(forward ? "findNext" : "findPrevious");
  };
  const onSearchChange = ({ result }: { result: EditorSearchResult }) => {
    findResult.set(result);
    // A new query highlights every match; select and reveal the nearest one as well.
    if (selectPending) {
      selectPending = false;
      if (findOpen() && result.count > 0 && result.current == null) editor?.run("findNext");
    }
  };
  keymap.bind(shortcuts.open, openFind, { when: "always" });
  keymap.bind(shortcuts.next, () => moveMatch(true), { when: "always" });
  keymap.bind(shortcuts.previous, () => moveMatch(false), { when: "always" });
  effect(() => {
    // While the find overlay is mounted, its Input owns Command editing
    // shortcuts even if the native focus transition has not reported yet.
    if (!editorFocused() || findOpen()) return;
    const off = keymap.bind({
      "mod+a": () => editor?.run("selectAll"),
      "mod+c": () => editor?.run("copy"),
      "mod+x": () => editor?.run("cut"),
      "mod+v": () => editor?.run("paste"),
    }, { when: "always" });
    cleanup(off);
  });
  effect(() => {
    // Esc closes find only while the find field or the document has the focus.
    // Bound "always" so it also fires in the find field, but an unrelated input
    // (the sidebar search, where Esc cancels an input method's candidates) must
    // keep its Esc: closing find there would move the focus into the document,
    // and the keys typed next (backspace, select all) would edit the note.
    if (!findOpen() || props.searchEnabled === false) return;
    if (!findFocused() && !editorFocused()) return;
    const off = keymap.bind("escape", closeFind, { when: "always" });
    cleanup(off);
  });
  effect(() => {
    if (!findOpen() || !findFocused() || props.searchEnabled === false) return;
    const off = keymap.bind({
      enter: () => moveMatch(true),
      "shift+enter": () => moveMatch(false),
    }, { when: "always" });
    cleanup(off);
  });
  let lastRequest = 0;
  effect(() => {
    const request = props.findRequest;
    if (!request || request.id === lastRequest) return;
    lastRequest = request.id;
    if (request.action === "open") openFind();
    else moveMatch(request.action === "next");
  });
  let documentId = props.documentId;
  effect(() => {
    if (documentId === props.documentId) return;
    documentId = props.documentId;
    findGeneration += 1;
    selectPending = findOpen();
  });
  let lastSource = props.source;
  effect(() => {
    const source = props.source;
    if (source === lastSource) return;
    lastSource = source;
    if (!findOpen() || !editor) return;
    const ref = editor;
    const generation = ++findGeneration;
    selectPending = true;
    // nsh 0.3 updates matches on a controlled value change, but only reports
    // the new count after a selection command. Read after the value commits.
    void ref.selections().then((selections) => {
      if (generation === findGeneration && editor === ref && findOpen()) ref.setSelections(selections);
    }).catch(() => {});
  });
  // 预览数据走信号：换文时更新 List 的 each，而不是重建整个节点（重建会把滚动位置丢回顶部）
  const initial = previewModel(props.preview);
  const previewBlocks = signal(initial.blocks);
  const previewItemSize = signal(initial.estimatedItemSize);
  const previewAnchors = signal(initial.anchors);
  const previewWidth = signal(0);
  const editorWidth = signal(0);
  // 缓存预览样式：List 回收每个块时复用同一份样式对象，避免逐块重建 25 个样式节点与字体扫描。
  const memoPreviewStyles = computed(() => previewTextStyles());
  const memoEditorStyles = computed(() => editorTextStyles());

  // 源码装饰跟随编辑内容防抖更新，不回灌 Editor.value，兼顾实时语法着色与光标稳定。
  const decorText = signal(props.source);
  let decorTimer: ReturnType<typeof setTimeout> | null = null;
  const cancelDecorTimer = () => {
    if (decorTimer) {
      clearTimeout(decorTimer);
      decorTimer = null;
    }
  };
  effect(() => {
    const next = props.source;
    cancelDecorTimer();
    decorText.set(next);
  });
  cleanup(cancelDecorTimer);

  /** 正文外侧保留呼吸空间；舒适版心由文档最大宽度控制。 */
  const gutter = () => {
    const width = previewWidth();
    if (width <= 0) return 24;
    if (width >= 760) return 32;
    if (width >= 520) return 24;
    return 16;
  };

  /** 适中版心按正文行长控制在约 40–70 个汉字。 */
  const documentWidth = () =>
    Math.min(880, Math.max(600, Math.round(720 + (fontSize() - 16) * 20)));
  const previewMaxWidth = computed(() => (readerWidth() === "full" ? "100%" : documentWidth()));
  const editorMeasureWidth = computed(() => (readerWidth() === "full" ? "100%" : documentWidth() + 48));

  const handleVisible = (info: {
    viewableItems: { index: number; isViewable: boolean }[];
  }) => {
    let top = Number.POSITIVE_INFINITY;
    for (const item of info.viewableItems) {
      if (item.isViewable && item.index < top) top = item.index;
    }
    if (Number.isFinite(top)) props.onVisibleBlock?.(top);
  };

  /** 外链由 TextView 的 `links="open"` 交给系统；预览里的锚点自己滚动到对应块。 */
  const followPreviewLink = (url: string) => {
    const index = resolveAnchor(previewAnchors(), url);
    if (index !== undefined) scrollPreviewToIndex(index);
  };

  // 语法装饰按（正文, 主题, 配色模式）记忆，切换配色时即时刷新。
  let decorationCache: { text: string; preset: ThemePreset; mode: RenderMode; value: EditorDecoration[] } | null = null;
  let refreshMarker = false;
  const decorations = (text: string) => {
    const preset = themePreset();
    const mode = renderMode();
    if (decorationCache && decorationCache.text === text && decorationCache.preset === preset && decorationCache.mode === mode) {
      return decorationCache.value;
    }
    if (decorationCache && (decorationCache.preset !== preset || decorationCache.mode !== mode)) {
      refreshMarker = !refreshMarker;
    }
    const value = markdownDecorations(text, preset.palette, mode);
    // nsh 0.3 的行缓存只比较装饰索引，颜色变化会沿用旧 span。
    // 交替插入无样式的范围，使索引变化并刷新文字，同时保留光标与滚动位置。
    if (refreshMarker && text.length > 0) {
      const lines = text.split("\n");
      value.unshift({
        range: {
          start: { line: 0, column: 0 },
          end: { line: lines.length - 1, column: lines[lines.length - 1].length },
        },
      });
    }
    decorationCache = { text, preset, mode, value };
    return value;
  };
  const editorPane = (isSplit: boolean) => (
    <View
      style={{ flex: 1, backgroundColor: colors().editor, position: "relative" }}
      testID="pane-editor"
      onMouseEnter={() => markEditorHover(true)}
      onMouseLeave={() => markEditorHover(false)}
      onLayout={({ bounds }) => editorWidth.set(bounds.size.width)}
    >
      <View
        style={{
          flex: 1,
          paddingTop: 28,
          paddingHorizontal: isSplit ? 12 : (editorWidth() >= 760 ? 28 : 16),
          maxWidth: isSplit ? "100%" : editorMeasureWidth(),
          width: "100%",
          alignSelf: "center",
        }}
        onLayout={({ bounds }) => setEditorViewHeight(bounds.size.height)}
      >
        <Editor
          ref={(ref) => {
            editor = ref;
            selectPending = findOpen();
            attachEditor(ref);
          }}
          testID="document-editor"
          value={props.source}
          readOnly={props.readOnly}
          onChange={({ value }) => {
            markEditorActivity();
            props.onChange(value);
            cancelDecorTimer();
            decorTimer = setTimeout(() => {
              decorTimer = null;
              decorText.set(value);
            }, 250);
          }}
          onFocus={() => { editorFocused.set(true); markEditorFocus(true); }}
          onBlur={() => { editorFocused.set(false); markEditorFocus(false); }}
          search={findOpen() ? { query: findQuery() } : null}
          onSearchChange={onSearchChange}
          onFindWithSelection={({ query }) => {
            openFind();
            findGeneration += 1;
            selectPending = query !== findQuery();
            findQuery.set(query);
          }}
          language="markdown"
          highlighting={renderMode() === "color"}
          softWrap
          lineNumbers={false}
          folding={false}
          indentGuides={false}
          fontFamily={editorFontFamily()}
          fontSize={editorFontSize()}
          lineHeight={editorLineHeight()}
          scrollBeyondLastLine={false}
          style={{ flex: 1 }}
          decorations={decorations(decorText())}
          // 编辑器自己按显示行折行；行内再用 whitespace-nowrap 阻止 Text 二次折行，
          // 否则测量误差会让行尾字符折到下一行、与下一行文字重叠。右侧留白容纳这点溢出。
          classes={{ content: "whitespace-nowrap" }}
          styles={memoEditorStyles()}
        />
      </View>
      {/* 隐藏探针只在分栏模式挂载且关闭语法高亮：仅用于测量折行后的编辑器内容总高。 */}
      {isSplit ? (
        <View
          style={{ height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none", paddingHorizontal: 12 }}
          onLayout={({ bounds }) => setHiddenViewHeight(bounds.size.height)}
        >
          <Editor
            ref={attachHiddenEditor}
            value={props.source}
            readOnly
            language="markdown"
            highlighting={false}
            softWrap
            lineNumbers={false}
            folding={false}
            indentGuides={false}
            fontFamily={editorFontFamily()}
            fontSize={editorFontSize()}
            lineHeight={editorLineHeight()}
            scrollBeyondLastLine={false}
            style={{ flex: 1 }}
            classes={{ content: "whitespace-nowrap" }}
            styles={memoEditorStyles()}
          />
        </View>
      ) : null}
      <If when={findOpen()}>
        <View
          style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 10, alignItems: "flex-end", pointerEvents: "box-none" }}
        >
          <FindBar
            query={findQuery()}
            result={findResult()}
            inputRef={(node) => { findInput = node; }}
            onQuery={(query) => {
              findGeneration += 1;
              selectPending = query !== findQuery();
              findQuery.set(query);
            }}
            onFocus={(focused) => {
              findFocused.set(focused);
              if (focused) editorFocused.set(false);
            }}
            onNext={() => moveMatch(true)}
            onPrevious={() => moveMatch(false)}
            onClose={closeFind}
          />
        </View>
      </If>
    </View>
  );

  const previewPane = () => {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors().preview }}
        onLayout={({ bounds }) => {
          setPreviewViewHeight(bounds.size.height);
          previewWidth.set(bounds.size.width);
        }}
      >
        {/* 整篇 TextView 不虚拟化，长文档会拖垮整窗帧率：按块交给 List 回收渲染 */}
        <List
          each={previewBlocks()}
          keyExtractor={(_block, index) => String(index)}
          estimatedItemSize={previewItemSize()}
          contentStyle={{
            paddingTop: PREVIEW_TOP_PADDING,
            paddingBottom: 64,
            paddingHorizontal: gutter(),
          }}
          testID="pane-preview"
          ref={attachPreview}
          onScroll={handlePreviewScroll}
          onViewableItemsChange={handleVisible}
          style={{ flex: 1, backgroundColor: colors().preview }}
        >
          {(block, index) => {
            const gap = () => {
              const all = previewBlocks();
              const at = index();
              return previewGap(at > 0 ? all[at - 1] : undefined, block(), fontSize() / 15);
            };
            return (
              <View
                style={{
                  maxWidth: previewMaxWidth(),
                  width: "100%",
                  alignSelf: "center",
                  paddingTop: gap(),
                }}
              >
                <TextView
                  document={{ blocks: [displayBlock(block(), renderMode())] }}
                  selectable
                  links="open"
                  codeBlockActions={[{ id: "copy", label: t("preview.copyCode") }]}
                  onLinkPress={(event) => followPreviewLink(event.url)}
                  styles={memoPreviewStyles()}
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
      previewAnchors.set(model.anchors);
    });
    refreshPreviewMetrics();
  });

  // 字体与字号变化会改变折行及内容高度，重新测量两侧的滚动比例。
  effect(() => {
    editorFontSize();
    editorFontFamily();
    refreshPreviewMetrics();
  });

  // 组件只运行一次：按模式取内容必须是闭包，在 JSX 里调用才会跟随 props.mode 重建
  const body = () => {
    setSyncMode(props.mode);
    if (props.mode === "edit") {
      attachHiddenEditor(null);
      return <View style={{ flex: 1 }}>{editorPane(false)}</View>;
    }
    if (props.mode === "preview") {
      attachHiddenEditor(null);
      return <View style={{ flex: 1 }}>{previewPane()}</View>;
    }
    return (
      <ResizablePanelGroup
        axis="horizontal"
        handleStyle={{ backgroundColor: colors().thread, width: 1 }}
        handleThumbStyle={{ width: 3, borderRadius: 2, backgroundColor: colors().thread }}
        handleAccessibilityLabel="Resize editor and preview"
        style={{ flex: 1 }}
      >
        <ResizablePanel minSize={180}>{editorPane(true)}</ResizablePanel>
        <ResizablePanel minSize={180}>{previewPane()}</ResizablePanel>
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
