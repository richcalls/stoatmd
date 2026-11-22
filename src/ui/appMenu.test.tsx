import { expect, test } from "nsh/test";
import { appMenu, type AppMenuHandlers, type AppMenuState } from "./appMenu";
import {
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_FONT_SIZE,
  editorFontSize,
  fontSize,
} from "./typography";

const handlers = (): AppMenuHandlers => ({
  openSettings: () => {},
  checkUpdates: () => {},
  openFolder: () => {},
  newNote: () => {},
  syncNow: () => {},
  toggleSidebar: () => {},
  toggleInspector: () => {},
  setMode: () => {},
  find: () => {},
});

const state = (patch: Partial<AppMenuState> = {}): AppMenuState => ({
  mac: true,
  mode: "split",
  sidebarVisible: true,
  inspectorOpen: false,
  noteOpen: true,
  theme: "merino-light",
  readerWidth: "comfortable",
  renderMode: "color",
  syncEnabled: true,
  searchEnabled: true,
  findKeys: { open: "mod+f", next: "mod+g", previous: "mod+shift+g" },
  ...patch,
});

type Item = {
  label?: string;
  role?: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  submenu?: Item[];
  onSelect?: () => void;
};

const top = (items: readonly (Item | null | undefined | false)[], label: string): Item[] =>
  (items.find((item) => item && (item as Item).label === label) as Item).submenu ?? [];

const find = (items: Item[], label: string): Item | undefined =>
  items.find((item) => item.label === label);

const labels = (items: Item[]) => items.map((item) => item.label ?? `role:${item.role}`);

test("应用菜单：mac 顶层含 StoatMD / File / Edit / View / Window", () => {
  const menu = appMenu(state(), handlers()) as Item[];
  expect(menu.map((item) => item.label)).toEqual(["StoatMD", "File", "Edit", "View", "Window"]);
  expect(labels(top(menu, "Window"))).toEqual(["role:minimize", "role:zoom"]);
});

test("应用菜单：File 含 Sync Now 与 close，Sync Now 随连接状态禁用", () => {
  const menu = appMenu(state(), handlers()) as Item[];
  const file = top(menu, "File");
  expect(find(file, "Sync now")?.disabled).toBe(false);
  expect(file.filter(Boolean).pop()?.role).toBe("close");
  const offline = top(appMenu(state({ syncEnabled: false }), handlers()) as Item[], "File");
  expect(find(offline, "Sync now")?.disabled).toBe(true);
});

test("应用菜单：View 含侧栏 / 目录栏 / 模式 / 缩放 / 主题 / 宽度 / 颜色 / 全屏", () => {
  const menu = appMenu(state({ mode: "preview", inspectorOpen: true, theme: "catppuccin-mocha" }), handlers()) as Item[];
  const view = top(menu, "View");
  const names = labels(view);
  expect(names).toContain("File Tree");
  expect(names).toContain("Contents Panel");
  expect(names).toContain("Reading");
  expect(names).toContain("Zoom In");
  expect(names).toContain("Zoom Out");
  expect(names).toContain("Actual Size");
  expect(names).toContain("Theme");
  expect(names).toContain("Reading width");
  expect(names).toContain("Document colors");
  expect(names).toContain("role:toggleFullScreen");

  expect(find(view, "File Tree")?.checked).toBe(true);
  expect(find(view, "File Tree")?.shortcut).toBe("mod+b");
  const inspector = find(view, "Contents Panel");
  expect(inspector?.checked).toBe(true);
  expect(inspector?.shortcut).toBe("mod+alt+0");
  expect(inspector?.disabled).toBe(false);
  expect(find(view, "Reading")?.checked).toBe(true);
  expect(find(view, "Source")?.checked).toBe(false);

  const theme = find(view, "Theme")?.submenu ?? [];
  expect(find(theme, "Catppuccin Mocha")?.checked).toBe(true);
  const width = find(view, "Reading width")?.submenu ?? [];
  expect(find(width, "Comfortable")?.checked).toBe(true);
  const colors = find(view, "Document colors")?.submenu ?? [];
  expect(find(colors, "Color")?.checked).toBe(true);
});

test("应用菜单：无笔记时 Contents Panel 禁用", () => {
  const menu = appMenu(state({ noteOpen: false }), handlers()) as Item[];
  expect(find(top(menu, "View"), "Contents Panel")?.disabled).toBe(true);
});

test("应用菜单：Zoom In / Actual Size 同时调整阅读与编辑字号", () => {
  fontSize.set(DEFAULT_FONT_SIZE);
  editorFontSize.set(DEFAULT_EDITOR_FONT_SIZE);
  const view = top(appMenu(state(), handlers()) as Item[], "View");
  find(view, "Zoom In")?.onSelect?.();
  expect(fontSize()).toBe(DEFAULT_FONT_SIZE + 1);
  expect(editorFontSize()).toBe(DEFAULT_EDITOR_FONT_SIZE + 1);
  find(view, "Zoom Out")?.onSelect?.();
  expect(fontSize()).toBe(DEFAULT_FONT_SIZE);
  expect(editorFontSize()).toBe(DEFAULT_EDITOR_FONT_SIZE);
  fontSize.set(20);
  editorFontSize.set(20);
  find(view, "Actual Size")?.onSelect?.();
  expect(fontSize()).toBe(DEFAULT_FONT_SIZE);
  expect(editorFontSize()).toBe(DEFAULT_EDITOR_FONT_SIZE);
});
