import { expect, test } from "nsh/test";
import { applyTheme } from "../ui/theme";
import { glass, mobileColors } from "./palette";

test("组件里缓存的调色板随主题切换实时更新", () => {
  const c = mobileColors();
  const g = glass();
  applyTheme("paper");
  expect(c.paper).toBe("#F7F3EB");
  expect(c.ink).toBe("#2C2A26");
  expect(g.fill).toBe("rgba(255, 252, 247, 0.62)");

  applyTheme("nord");
  expect(c.paper).toBe("#1C1A18");
  expect(c.ink).toBe("#EDE9E3");
  expect(g.fill).toBe("rgba(38, 35, 31, 0.58)");

  applyTheme("paper");
  expect(c.paper).toBe("#F7F3EB");
});
