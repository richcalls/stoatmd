import { expect, test } from "nsh/test";
import { THEMES, statusColor, type ThemePalette } from "./theme";

function isHex(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
}

test("主题色：每套调色板提供完整且有效的 UI token", () => {
  const keys: (keyof ThemePalette)[] = ["paper", "sidebar", "list", "editor", "preview", "ink", "ink2", "ink3", "thread", "accent", "accentInk", "accentSoft", "syntaxBold", "quote", "codeBg", "searchBg"];
  expect(THEMES.length).toBe(2);
  for (const preset of THEMES) {
    for (const key of keys) expect(isHex(preset.palette[key])).toBe(true);
    for (const swatch of preset.swatches) expect(isHex(swatch)).toBe(true);
    expect(preset.name.length > 0).toBe(true);
  }
});

test("主题色：状态使用绿色和红色终端色", () => {
  expect(statusColor("ok")).toBe(THEMES[0].swatches[2]);
  expect(statusColor("danger")).toBe(THEMES[0].swatches[3]);
});
