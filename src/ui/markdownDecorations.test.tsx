import { expect, test } from "nsh/test";
import { markdownDecorations } from "./markdownDecorations";
import { themePreset } from "./theme";

const palette = themePreset("paper").palette;

function stylesFor(text: string) {
  return markdownDecorations(text, palette).map((decoration) => ({
    line: decoration.range.start.line,
    from: decoration.range.start.column,
    to: decoration.range.end.column,
    style: decoration.style as Record<string, unknown>,
  }));
}

test("markdownDecorations：标题整行用 accent，加粗标记 ink3、粗体文本 650", () => {
  const spans = stylesFor("# 标题\n正文**重点**结尾");
  expect(spans).toEqual([
    { line: 0, from: 0, to: 4, style: { color: palette.accent, fontWeight: "600" } },
    { line: 1, from: 2, to: 4, style: { color: palette.ink3 } },
    { line: 1, from: 4, to: 6, style: { fontWeight: "650" } },
    { line: 1, from: 6, to: 8, style: { color: palette.ink3 } },
  ]);
});

test("markdownDecorations：行内代码带 codeBg，代码里的星号不当作强调", () => {
  const spans = stylesFor("用 `a*b` 强调");
  expect(spans).toEqual([
    {
      line: 0,
      from: 2,
      to: 7,
      style: { color: palette.syntaxBold, backgroundColor: palette.codeBg },
    },
  ]);
});

test("markdownDecorations：引用行用 quote 色，围栏代码块不参与着色", () => {
  const spans = stylesFor("> 引用\n```\n# 代码不是标题\n**也不是粗体**\n```");
  expect(spans).toEqual([
    { line: 0, from: 0, to: 4, style: { color: palette.quote } },
  ]);
});
