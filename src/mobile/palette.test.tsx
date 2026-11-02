import { expect, test } from "nsh/test";
import { applyTheme, themePreset } from "../ui/theme";
import { glass, mobileColors } from "./palette";

test("组件里缓存的调色板随主题切换实时更新", () => {
  const c = mobileColors();
  const g = glass();
  applyTheme("everest");
  const light = themePreset("everest").palette;
  expect(c.paper).toBe(light.paper);
  expect(c.sidebar).toBe(light.sidebar);
  expect(c.list).toBe(light.list);
  expect(c.ink).toBe(light.ink);
  expect(g.fill).toBe("rgba(255, 255, 255, 0.22)");

  applyTheme("aurora-borealis");
  const dark = themePreset("aurora-borealis").palette;
  expect(c.paper).toBe(dark.paper);
  expect(c.sidebar).toBe(dark.sidebar);
  expect(c.list).toBe(dark.list);
  expect(c.ink).toBe(dark.ink);
  expect(g.fill).toBe("rgba(28, 28, 30, 0.22)");

  applyTheme("everest");
  expect(c.paper).toBe(light.paper);
});
