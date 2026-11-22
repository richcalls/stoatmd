import { expect, test } from "nsh/test";
import { KAMI, kamiMonoFamily } from "./kami";

test("Kami token：羊皮纸、墨蓝与官方 tokens.json 一致", () => {
  expect(KAMI.parchment).toBe("#f5f4ed");
  expect(KAMI.ivory).toBe("#faf9f5");
  expect(KAMI.brand).toBe("#1B365D");
  expect(KAMI.nearBlack).toBe("#141413");
  expect(KAMI.olive).toBe("#504e49");
});

test("Kami 等宽字体：按安装情况回退", () => {
  expect(kamiMonoFamily(["Menlo", "JetBrains Mono"])).toBe("JetBrains Mono");
  expect(kamiMonoFamily([])).toBe("Menlo");
});
