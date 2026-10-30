import { expect, test } from "nsh/test";
import en from "../../locales/en.json";
import zh from "../../locales/zh.json";
import zhHant from "../../locales/zh-Hant.json";
import ja from "../../locales/ja.json";
import ko from "../../locales/ko.json";
import de from "../../locales/de.json";
import fr from "../../locales/fr.json";
import es from "../../locales/es.json";
import { resolveLocale } from "./i18n";

const CATALOGS: Record<string, Record<string, string>> = { en, zh, "zh-Hant": zhHant, ja, ko, de, fr, es };

const MENU_KEYS = [
  "context.open",
  "context.reveal",
  "context.copyPath",
  "context.copyRelativePath",
  "context.rename",
  "context.duplicate",
  "context.trash",
];

test("八种语言的文案键完全一致，右键菜单文案齐全", () => {
  const keys = Object.keys(en).sort();
  for (const [id, table] of Object.entries(CATALOGS)) {
    expect({ id, keys: Object.keys(table).sort() }).toEqual({ id, keys });
    for (const key of MENU_KEYS) {
      expect(typeof table[key]).toBe("string");
    }
  }
});

test("系统语言标签映射到界面语言", () => {
  expect(resolveLocale("zh-CN")).toBe("zh");
  expect(resolveLocale("zh-Hans")).toBe("zh");
  expect(resolveLocale("zh-TW")).toBe("zh-Hant");
  expect(resolveLocale("zh-HK")).toBe("zh-Hant");
  expect(resolveLocale("zh-Hant")).toBe("zh-Hant");
  expect(resolveLocale("ja-JP")).toBe("ja");
  expect(resolveLocale("ko-KR")).toBe("ko");
  expect(resolveLocale("de-AT")).toBe("de");
  expect(resolveLocale("fr-CA")).toBe("fr");
  expect(resolveLocale("es-MX")).toBe("es");
  expect(resolveLocale("pt-BR")).toBe("en");
  expect(resolveLocale("")).toBe("en");
});
