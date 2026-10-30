import { expect, test } from "nsh/test";
import { previewBlockOffset, previewModel } from "./previewModel";

const MD = `# 标题

${"这是一段用于估算行高的中文正文。".repeat(40)}

\`\`\`ts
const a = 1;
const b = 2;
\`\`\`
`;

test("previewModel：字号与行高变大时估算块高随之变大", () => {
  const small = previewModel(MD, { fontSize: 14, lineHeight: 24 });
  const large = previewModel(MD, { fontSize: 18, lineHeight: 32 });
  expect(large.estimatedItemSize).toBeGreaterThan(small.estimatedItemSize);
});

test("previewModel：相同正文与排版命中缓存", () => {
  const first = previewModel(MD, { fontSize: 15, lineHeight: 26 });
  const second = previewModel(MD, { fontSize: 15, lineHeight: 26 });
  expect(second === first).toBe(true);
  const other = previewModel(MD, { fontSize: 16, lineHeight: 26 });
  expect(other === first).toBe(false);
});

test("previewModel：块偏移随块序递增，越界夹到首尾", () => {
  const first = previewBlockOffset(MD, 0);
  const middle = previewBlockOffset(MD, 1);
  const last = previewBlockOffset(MD, 2);
  expect(first).toBe(0);
  expect(middle).toBeGreaterThan(first);
  expect(last).toBeGreaterThan(middle);
  expect(previewBlockOffset(MD, -5)).toBe(first);
  expect(previewBlockOffset(MD, 99)).toBe(last);
  expect(previewBlockOffset("", 3)).toBe(0);
});
