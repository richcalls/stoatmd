import { expect, test } from "nsh/test";
import { THEMES, type ThemePalette } from "./theme";

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((at) => parseInt(value.slice(at, at + 2), 16) / 255);
  const linear = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("主题色：文字与强调色在纸面 / 侧栏 / 列表面板上均达到 4.5:1", () => {
  const surfaces: (keyof ThemePalette)[] = ["paper", "sidebar", "list", "editor", "preview"];
  const failures: string[] = [];
  for (const preset of THEMES) {
    const palette = preset.palette;
    for (const surface of surfaces) {
      for (const ink of ["ink", "ink2", "ink3", "accent"] as const) {
        const ratio = contrast(palette[ink], palette[surface]);
        if (ratio < 4.5) {
          failures.push(`${preset.id}: ${ink}/${surface} = ${ratio.toFixed(2)}`);
        }
      }
    }
    if (contrast(palette.accentInk, palette.accent) < 4.5) {
      failures.push(`${preset.id}: accentInk/accent`);
    }
    if (contrast(palette.syntaxBold, palette.codeBg) < 4.5) {
      failures.push(`${preset.id}: syntaxBold/codeBg`);
    }
  }
  expect(failures).toEqual([]);
});
