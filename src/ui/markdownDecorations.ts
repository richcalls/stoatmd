import type { TextStyle } from "nsh";
import type { EditorDecoration } from "nsh/base";
import type { ThemePalette } from "./theme";

/** nsh 把装饰样式标成 ViewStyle，运行时按 Text/NSAttributedString 处理。 */
type SpanStyle = Pick<TextStyle, "color" | "backgroundColor" | "fontWeight" | "fontStyle">;

/**
 * 源码区 Markdown 语法色（DESIGN.md）：标题 accent、粗体标记 ink3、
 * 行内代码 syntaxBold + codeBg、引用 quote。只产出颜色/字重，不改布局。
 */
export function markdownDecorations(text: string, palette: ThemePalette): EditorDecoration[] {
  const out: EditorDecoration[] = [];
  const lines = text.split("\n");
  let fenced = false;

  for (let line = 0; line < lines.length; line++) {
    const source = lines[line];
    if (/^\s*(```|~~~)/.test(source)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    if (/^#{1,6}(\s|$)/.test(source)) {
      styleLine(out, line, source.length, { color: palette.accent, fontWeight: "600" });
      continue;
    }
    if (/^\s*>/.test(source)) {
      styleLine(out, line, source.length, { color: palette.quote });
      continue;
    }
    styleInline(out, line, source, palette);
  }
  return out;
}

function styleLine(out: EditorDecoration[], line: number, length: number, style: SpanStyle) {
  if (length > 0) push(out, line, 0, length, style);
}

function styleInline(out: EditorDecoration[], line: number, source: string, palette: ThemePalette) {
  let at = 0;
  while (at < source.length) {
    const ch = source[at];

    if (ch === "`") {
      const end = source.indexOf("`", at + 1);
      if (end === -1) return;
      push(out, line, at, end + 1, { color: palette.syntaxBold, backgroundColor: palette.codeBg });
      at = end + 1;
      continue;
    }

    if (ch === "*" && source[at + 1] === "*") {
      const end = source.indexOf("**", at + 2);
      if (end === -1) {
        at += 2;
        continue;
      }
      push(out, line, at, at + 2, { color: palette.ink3 });
      push(out, line, at + 2, end, { fontWeight: "650" });
      push(out, line, end, end + 2, { color: palette.ink3 });
      at = end + 2;
      continue;
    }

    if (ch === "*") {
      const end = source.indexOf("*", at + 1);
      if (end <= at + 1) {
        at++;
        continue;
      }
      push(out, line, at, at + 1, { color: palette.ink3 });
      push(out, line, at + 1, end, { fontStyle: "italic" });
      push(out, line, end, end + 1, { color: palette.ink3 });
      at = end + 1;
      continue;
    }

    at++;
  }
}

function push(out: EditorDecoration[], line: number, from: number, to: number, style: SpanStyle) {
  if (to <= from) return;
  out.push({
    range: {
      start: { line, column: from },
      end: { line, column: to },
    },
    style: style as EditorDecoration["style"],
  });
}
