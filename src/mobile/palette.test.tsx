import { expect, test } from "nsh/test";
import { applyTheme } from "../ui/theme";
import { glass, mobileColors } from "./palette";

test("组件里缓存的调色板随主题切换实时更新", () => {
  const c = mobileColors();
  const g = glass();
  applyTheme("paper");
  expect(c.paper).toBe("#F2F2F7");
  expect(c.ink).toBe("#000000");
  expect(g.fill).toBe("rgba(255, 255, 255, 0.22)");

  applyTheme("nord");
  expect(c.paper).toBe("#000000");
  expect(c.ink).toBe("#FFFFFF");
  expect(g.fill).toBe("rgba(28, 28, 30, 0.22)");

  applyTheme("paper");
  expect(c.paper).toBe("#F2F2F7");
});
