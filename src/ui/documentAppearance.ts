import { signal } from "nsh";
import type { TextViewBlock } from "nsh/base";
import { loadSavedRenderMode, saveRenderMode } from "./prefs";
import { colors, type ThemePalette } from "./theme";

export type RenderMode = "color" | "monochrome";

/** 文稿配色独立于界面主题，源码与预览共用。 */
export const renderMode = signal<RenderMode>("color");

export function applyRenderMode(mode: RenderMode): void {
  renderMode.set(mode);
  void saveRenderMode(mode);
}

export async function restoreRenderMode(): Promise<void> {
  const saved = await loadSavedRenderMode();
  renderMode.set(saved === "monochrome" ? "monochrome" : "color");
}

export function documentColors(palette: ThemePalette = colors(), mode: RenderMode = renderMode()) {
  const colorful = mode === "color";
  return {
    body: palette.ink,
    heading: colorful ? palette.accent : palette.ink,
    quote: colorful ? palette.quote : palette.ink,
    code: colorful ? palette.syntaxBold : palette.ink,
    link: colorful ? palette.accent : palette.ink,
    marker: colorful ? palette.accent : palette.ink,
    syntaxMarker: palette.ink3,
    codeBackground: palette.codeBg,
  };
}

/** 单色预览以纯文本显示代码，避免 TextView 异步加载语法后重新上色。 */
export function displayBlock(block: TextViewBlock, mode: RenderMode): TextViewBlock {
  if (mode === "color") return block;
  if (block.type === "codeBlock") return { ...block, language: undefined };
  if (block.type === "list") {
    return { ...block, items: block.items.map((item) => ({ ...item, children: item.children.map((child) => displayBlock(child, mode)) })) };
  }
  if ("children" in block && block.children) {
    return { ...block, children: block.children.map((child) => displayBlock(child, mode)) };
  }
  return block;
}
