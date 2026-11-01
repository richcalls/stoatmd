import { expect, test } from "nsh/test";
import { applyTheme } from "../ui/theme";
import { glass, mobileColors } from "./palette";

test("组件里缓存的调色板随主题切换实时更新", () => {
  const c = mobileColors();
  const g = glass();
  applyTheme("paper");
  // 和 Mac 同一份色板：paper / sidebar / list 都按主题原值，不按亮度重排。
  expect(c.paper).toBe("#FCFBF9");
  expect(c.sidebar).toBe("#F5F4F0");
  expect(c.list).toBe("#F3F2F0");
  expect(c.ink).toBe("#1A1A1A");
  expect(g.fill).toBe("rgba(255, 255, 255, 0.22)");

  applyTheme("nord");
  // Mac 的 Nord：paper #2E3440、sidebar #373D49、list #3B4252。
  expect(c.paper).toBe("#2E3440");
  expect(c.sidebar).toBe("#373D49");
  expect(c.list).toBe("#3B4252");
  expect(c.ink).toBe("#E5E9F0");
  expect(g.fill).toBe("rgba(28, 28, 30, 0.22)");

  applyTheme("paper");
  expect(c.paper).toBe("#FCFBF9");
});
