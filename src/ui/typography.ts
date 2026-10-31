import { signal } from "nsh";
import { SystemFonts } from "stoatmd/native";
import { KAMI_READING_LINE_HEIGHT, kamiSerifFamily } from "./kami";
import {
  loadSavedFontFamily,
  loadSavedFontLineHeight,
  loadSavedFontSize,
  loadSavedUiFontSize,
  loadSavedEditorFontSize,
  saveFontFamily,
  saveFontLineHeight,
  saveFontSize,
  saveUiFontSize,
  saveEditorFontSize,
} from "./prefs";

/** 编辑与预览共用正文字体；界面、编辑与阅读字号独立。 */
export const DEFAULT_FONT_FAMILY = "";
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_UI_FONT_SIZE = 14;
export const DEFAULT_EDITOR_FONT_SIZE = 15;
export const DEFAULT_FONT_LINE_HEIGHT = KAMI_READING_LINE_HEIGHT;

export const fontFamily = signal(DEFAULT_FONT_FAMILY);
/** 系统可用字体族（macOS 由原生桥枚举；不可用时为空）。 */
export const systemFonts = signal<readonly string[]>([]);
export const fontSize = signal(DEFAULT_FONT_SIZE);
export const uiFontSize = signal(DEFAULT_UI_FONT_SIZE);
export const editorFontSize = signal(DEFAULT_EDITOR_FONT_SIZE);
export const fontLineHeight = signal(DEFAULT_FONT_LINE_HEIGHT);

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 24;
export const UI_FONT_SIZE_MIN = 12;
export const UI_FONT_SIZE_MAX = 18;
export const EDITOR_FONT_SIZE_MIN = 12;
export const EDITOR_FONT_SIZE_MAX = 24;
export const LINE_HEIGHT_MIN = 1.3;
export const LINE_HEIGHT_MAX = 2.2;
export const LINE_HEIGHT_STEP = 0.05;

/** 沿用界面原有层级，12pt 基准随用户的界面字号整体调整。 */
export function uiTextSize(base = 12): number {
  return base + uiFontSize() - 12;
}

/** 控件随文字增高，维持上下留白与点击区域。 */
export function uiControlHeight(base: number): number {
  return base + (uiFontSize() - 12) * 2;
}

export function uiLineHeight(base: number): number {
  return base + (uiFontSize() - 12) * 1.5;
}

/** 可见源码与测量探针共用的行高。 */
export function editorLineHeight(): number {
  return Math.round(editorFontSize() * 1.6);
}

function validSize(raw: string | null, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return raw !== null && Number.isFinite(value) && value >= min && value <= max
    ? Math.round(value)
    : fallback;
}

export function applyUiFontSize(next: number) {
  if (!Number.isFinite(next)) return;
  const value = Math.min(UI_FONT_SIZE_MAX, Math.max(UI_FONT_SIZE_MIN, Math.round(next)));
  uiFontSize.set(value);
  void saveUiFontSize(String(value));
}

export function applyEditorFontSize(next: number) {
  if (!Number.isFinite(next)) return;
  const value = Math.min(EDITOR_FONT_SIZE_MAX, Math.max(EDITOR_FONT_SIZE_MIN, Math.round(next)));
  editorFontSize.set(value);
  void saveEditorFontSize(String(value));
}

/** 文稿正文共用的字体：用户选定优先，否则用本机可用的 Kami 衬线。 */
export function documentFontFamily(): string {
  const family = fontFamily();
  return family === "" ? kamiSerifFamily(systemFonts()) : family;
}

/** 字体桥只枚举一次；宿主没有桥时保持为空，下次打开再试。 */
let fontsLoaded = false;

/** 枚举系统字体；宿主没有字体桥时保持为空，界面只剩系统默认。 */
export function loadSystemFonts(): void {
  if (fontsLoaded) return;
  try {
    const list = SystemFonts.list();
    if (list.length > 0) {
      systemFonts.set(list);
      fontsLoaded = true;
    }
  } catch {
    systemFonts.set([]);
  }
}

/** 预览正文行高（像素）。 */
export function lineHeightPx(size = fontSize()): number {
  return Math.round(size * fontLineHeight());
}

export function applyFontFamily(next: string) {
  fontFamily.set(next);
  void saveFontFamily(next === "" ? "system" : next);
}

export function applyFontSize(next: number) {
  if (!Number.isFinite(next)) return;
  const value = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(next)));
  fontSize.set(value);
  void saveFontSize(String(value));
}

export function applyFontLineHeight(next: number) {
  if (!Number.isFinite(next)) return;
  const value = Math.min(
    LINE_HEIGHT_MAX,
    Math.max(LINE_HEIGHT_MIN, Math.round(next * 100) / 100),
  );
  fontLineHeight.set(value);
  void saveFontLineHeight(String(value));
}

/** 是否使用默认的界面、编辑与阅读排版。 */
export function isDefaultTypography(): boolean {
  return (
    fontFamily() === DEFAULT_FONT_FAMILY &&
    uiFontSize() === DEFAULT_UI_FONT_SIZE &&
    editorFontSize() === DEFAULT_EDITOR_FONT_SIZE &&
    Math.round(fontSize()) === DEFAULT_FONT_SIZE &&
    Math.abs(fontLineHeight() - DEFAULT_FONT_LINE_HEIGHT) < 0.001
  );
}

/** 一键恢复默认排版并覆盖已保存的偏好。 */
export function resetTypography() {
  applyUiFontSize(DEFAULT_UI_FONT_SIZE);
  applyEditorFontSize(DEFAULT_EDITOR_FONT_SIZE);
  applyFontFamily(DEFAULT_FONT_FAMILY);
  applyFontSize(DEFAULT_FONT_SIZE);
  applyFontLineHeight(DEFAULT_FONT_LINE_HEIGHT);
}

/** 启动时恢复字体偏好；无效值回落到默认。 */
export async function restoreTypography(): Promise<void> {
  const [family, size, lineHeight, uiSize, editorSize] = await Promise.all([
    loadSavedFontFamily(),
    loadSavedFontSize(),
    loadSavedFontLineHeight(),
    loadSavedUiFontSize(),
    loadSavedEditorFontSize(),
  ]);
  fontFamily.set(DEFAULT_FONT_FAMILY);
  if (!family || family === "system") {
    fontFamily.set("");
  } else {
    // 字体桥不可用时保留偏好，可用了再校验是否仍安装。
    const installed = systemFonts();
    if (installed.length === 0 || installed.includes(family)) {
      fontFamily.set(family);
    }
  }
  fontSize.set(validSize(size, DEFAULT_FONT_SIZE, FONT_SIZE_MIN, FONT_SIZE_MAX));
  uiFontSize.set(validSize(uiSize, DEFAULT_UI_FONT_SIZE, UI_FONT_SIZE_MIN, UI_FONT_SIZE_MAX));
  editorFontSize.set(validSize(editorSize, DEFAULT_EDITOR_FONT_SIZE, EDITOR_FONT_SIZE_MIN, EDITOR_FONT_SIZE_MAX));
  fontLineHeight.set(DEFAULT_FONT_LINE_HEIGHT);
  const lineNum = Number(lineHeight);
  if (
    Number.isFinite(lineNum) &&
    lineNum >= LINE_HEIGHT_MIN &&
    lineNum <= LINE_HEIGHT_MAX
  ) {
    fontLineHeight.set(lineNum);
  }
}
