import { expect, test } from "nsh/test";
import { applyTheme } from "../ui/theme";
import { glass, mobileColors } from "./palette";

test("组件里缓存的调色板随主题切换实时更新", () => {
  const c = mobileColors();
  const g = glass();
  applyTheme("paper");
  // 浅色：sidebar 当页面底、paper 当卡片。
  expect(c.paper).toBe("#F5F4F0");
  expect(c.list).toBe("#FCFBF9");
  expect(c.ink).toBe("#1A1A1A");
  expect(g.fill).toBe("rgba(255, 255, 255, 0.22)");

  applyTheme("nord");
  // 深色：paper 更暗，当页面底，sidebar 当卡片。
  expect(c.paper).toBe("#2E3440");
  expect(c.list).toBe("#373D49");
  expect(c.ink).toBe("#E5E9F0");
  expect(g.fill).toBe("rgba(28, 28, 30, 0.22)");

  applyTheme("paper");
  expect(c.paper).toBe("#F5F4F0");
});
