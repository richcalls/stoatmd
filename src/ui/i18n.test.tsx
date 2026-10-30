import { expect, test } from "nsh/test";
import en from "../../locales/en.json";
import zh from "../../locales/zh.json";

const MENU_KEYS = [
  "context.open",
  "context.reveal",
  "context.copyPath",
  "context.copyRelativePath",
  "context.rename",
  "context.duplicate",
  "context.trash",
];

test("中英文案键完全一致，右键菜单文案齐全", () => {
  expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  for (const key of MENU_KEYS) {
    expect(typeof (zh as Record<string, string>)[key]).toBe("string");
    expect(typeof (en as Record<string, string>)[key]).toBe("string");
  }
});
