import { signal } from "nsh";
import { SystemFonts } from "stoatmd/native";
import {
  loadSavedFontFamily,
  loadSavedFontLineHeight,
  loadSavedFontSize,
  saveFontFamily,
  saveFontLineHeight,
  saveFontSize,
} from "./prefs";

/** 正文字体、字号、行高只作用于预览；源码区始终等宽。字体为空串时用系统默认。 */
export const fontFamily = signal("");
/** 系统可用字体族（macOS 由原生桥枚举；不可用时为空）。 */
export const systemFonts = signal<readonly string[]>([]);
export const fontSize = signal(15);
export const fontLineHeight = signal(1.75);

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 24;
export const LINE_HEIGHT_MIN = 1.3;
export const LINE_HEIGHT_MAX = 2.2;
export const LINE_HEIGHT_STEP = 0.05;

export function fontFamilyName(): string | undefined {
  const family = fontFamily();
  return family === "" ? undefined : family;
}

/** 枚举系统字体；宿主没有字体桥时保持为空，界面只剩系统默认。 */
export function loadSystemFonts(): void {
  try {
    const list = SystemFonts.list();
    if (list.length > 0) systemFonts.set(list);
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
  const value = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(next)));
  fontSize.set(value);
  void saveFontSize(String(value));
}

export function applyFontLineHeight(next: number) {
  const value = Math.min(
    LINE_HEIGHT_MAX,
    Math.max(LINE_HEIGHT_MIN, Math.round(next * 100) / 100),
  );
  fontLineHeight.set(value);
  void saveFontLineHeight(String(value));
}

/** 启动时恢复字体偏好；无效值回落到默认。 */
export async function restoreTypography(): Promise<void> {
  const [family, size, lineHeight] = await Promise.all([
    loadSavedFontFamily(),
    loadSavedFontSize(),
    loadSavedFontLineHeight(),
  ]);
  if (!family || family === "system") {
    fontFamily.set("");
  } else {
    // 字体桥不可用时保留偏好，可用了再校验是否仍安装。
    const installed = systemFonts();
    if (installed.length === 0 || installed.includes(family)) {
      fontFamily.set(family);
    }
  }
  const sizeNum = Number(size);
  if (Number.isFinite(sizeNum) && sizeNum >= FONT_SIZE_MIN && sizeNum <= FONT_SIZE_MAX) {
    fontSize.set(Math.round(sizeNum));
  }
  const lineNum = Number(lineHeight);
  if (
    Number.isFinite(lineNum) &&
    lineNum >= LINE_HEIGHT_MIN &&
    lineNum <= LINE_HEIGHT_MAX
  ) {
    fontLineHeight.set(lineNum);
  }
}
