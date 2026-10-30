import { expect, test } from "nsh/test";
import { KAMI, kamiMonoFamily, kamiSerifFamily, kamiTypeScale } from "./kami";

test("Kami token：羊皮纸、墨蓝与官方 tokens.json 一致", () => {
  expect(KAMI.parchment).toBe("#f5f4ed");
  expect(KAMI.ivory).toBe("#faf9f5");
  expect(KAMI.brand).toBe("#1B365D");
  expect(KAMI.nearBlack).toBe("#141413");
  expect(KAMI.olive).toBe("#504e49");
});

test("Kami 字号阶梯：以 10.5pt 正文为基准缩放", () => {
  expect(kamiTypeScale(15)).toEqual({
    h1: 31,
    h2: 23,
    h3: 19,
    h4: 16,
    h5: 15,
    h6: 14,
    code: 13,
  });
  const large = kamiTypeScale(21);
  expect(large.h1).toBe(44);
  expect(large.code).toBe(18);
});

test("Kami 字体：优先中文衬线，缺字体时按栈回退", () => {
  expect(kamiSerifFamily(["Charter", "Songti SC", "Georgia"])).toBe("Songti SC");
  expect(kamiSerifFamily(["Charter", "Georgia"])).toBe("Charter");
  expect(kamiSerifFamily([])).toBe("Georgia");
  expect(kamiMonoFamily(["Menlo", "JetBrains Mono"])).toBe("JetBrains Mono");
  expect(kamiMonoFamily([])).toBe("Menlo");
});
