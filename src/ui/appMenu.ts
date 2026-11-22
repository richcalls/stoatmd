import type { MenuItem } from "nsh/desktop";
import type { FindAction } from "./findShortcuts";
import { t } from "./i18n";
import type { RenderMode } from "./documentAppearance";
import { applyRenderMode } from "./documentAppearance";
import { applyReaderWidth, type ReaderWidth } from "./readerWidth";
import { applyTheme, THEMES, type ThemeId } from "./theme";
import {
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_FONT_SIZE,
  applyEditorFontSize,
  applyFontSize,
  editorFontSize,
  fontSize,
} from "./typography";
import type { ViewMode } from "./Toolbar";

/** Live state the menu reflects; rebuilt whenever one of these changes. */
export type AppMenuState = {
  mac: boolean;
  mode: ViewMode;
  sidebarVisible: boolean;
  inspectorOpen: boolean;
  noteOpen: boolean;
  theme: ThemeId;
  readerWidth: ReaderWidth;
  renderMode: RenderMode;
  /** Sync Now: a connection exists and no sync run is in flight. */
  syncEnabled: boolean;
  searchEnabled: boolean;
  findKeys: { open: string; next: string; previous: string };
};

export type AppMenuHandlers = {
  openSettings: () => void;
  checkUpdates: () => void;
  openFolder: () => void;
  newNote: () => void;
  syncNow: () => void;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setMode: (mode: ViewMode) => void;
  find: (action: FindAction) => void;
};

const zoom = (delta: number) => {
  applyFontSize(fontSize() + delta);
  applyEditorFontSize(editorFontSize() + delta);
};

/** macOS 常规应用菜单；checked/disabled 来自调用方读取的实时信号。 */
export function appMenu(state: AppMenuState, handlers: AppMenuHandlers): (MenuItem | false)[] {
  const mac = state.mac;
  const settingsItem = {
    label: t("menu.settings"),
    shortcut: "mod+,",
    onSelect: handlers.openSettings,
  };
  const modeItem = (id: ViewMode, labelKey: string, shortcut: string): MenuItem => ({
    label: t(labelKey),
    shortcut,
    checked: state.mode === id,
    onSelect: () => handlers.setMode(id),
  });
  const themeItems = (dark: boolean): MenuItem[] =>
    THEMES.filter((preset) => preset.mode === (dark ? "dark" : "light")).map((preset) => ({
      label: preset.name,
      checked: state.theme === preset.id,
      onSelect: () => applyTheme(preset.id),
    }));

  return [
    mac && {
      label: "StoatMD",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { label: t("menu.checkUpdates"), onSelect: handlers.checkUpdates },
        { type: "separator" },
        settingsItem,
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: t("menu.file"),
      submenu: [
        { label: t("vault.open"), shortcut: "mod+o", onSelect: handlers.openFolder },
        { label: t("note.new"), shortcut: "mod+n", onSelect: handlers.newNote },
        { type: "separator" },
        {
          label: t("sync.syncNow"),
          disabled: !state.syncEnabled,
          onSelect: handlers.syncNow,
        },
        { type: "separator" },
        mac && { role: "close" },
        !mac && settingsItem,
        !mac && { type: "separator" },
        !mac && { role: "quit", label: t("menu.quit") },
      ],
    },
    {
      label: t("menu.edit"),
      submenu: [
        // Let focused native text controls consume editing shortcuts first.
        // The EditorWorkspace fallback handles the custom Editor surface.
        { role: "undo", shortcut: "mod+z", when: "auto" },
        { role: "redo", shortcut: "mod+shift+z", when: "auto" },
        { type: "separator" },
        { role: "cut", shortcut: "mod+x", when: "auto" },
        { role: "copy", shortcut: "mod+c", when: "auto" },
        { role: "paste", shortcut: "mod+v", when: "auto" },
        { role: "selectAll", shortcut: "mod+a", when: "auto" },
        { type: "separator" },
        { label: t("find.open"), shortcut: state.findKeys.open, disabled: !state.searchEnabled, onSelect: () => handlers.find("open") },
        { label: t("find.next"), shortcut: state.findKeys.next, disabled: !state.searchEnabled, onSelect: () => handlers.find("next") },
        { label: t("find.previous"), shortcut: state.findKeys.previous, disabled: !state.searchEnabled, onSelect: () => handlers.find("previous") },
      ],
    },
    {
      label: t("menu.view"),
      submenu: [
        {
          label: t("menu.view.sidebar"),
          shortcut: "mod+b",
          checked: state.sidebarVisible,
          onSelect: handlers.toggleSidebar,
        },
        {
          label: t("menu.view.inspector"),
          shortcut: "mod+alt+0",
          checked: state.inspectorOpen,
          disabled: !state.noteOpen,
          onSelect: handlers.toggleInspector,
        },
        { type: "separator" },
        modeItem("edit", "mode.edit", "mod+1"),
        modeItem("split", "mode.split", "mod+2"),
        modeItem("preview", "mode.preview", "mod+3"),
        { type: "separator" },
        { label: t("menu.zoomIn"), shortcut: "mod+plus", onSelect: () => zoom(1) },
        { label: t("menu.zoomOut"), shortcut: "mod+minus", onSelect: () => zoom(-1) },
        {
          label: t("menu.actualSize"),
          shortcut: "mod+0",
          onSelect: () => {
            applyFontSize(DEFAULT_FONT_SIZE);
            applyEditorFontSize(DEFAULT_EDITOR_FONT_SIZE);
          },
        },
        { type: "separator" },
        {
          label: t("settings.theme"),
          submenu: [...themeItems(false), { type: "separator" as const }, ...themeItems(true)],
        },
        {
          label: t("settings.readerWidth.title"),
          submenu: [
            {
              label: t("settings.readerWidth.comfortable"),
              checked: state.readerWidth === "comfortable",
              onSelect: () => {
                void applyReaderWidth("comfortable");
              },
            },
            {
              label: t("settings.readerWidth.full"),
              checked: state.readerWidth === "full",
              onSelect: () => {
                void applyReaderWidth("full");
              },
            },
          ],
        },
        {
          label: t("settings.renderMode"),
          submenu: [
            {
              label: t("settings.renderMode.color"),
              checked: state.renderMode === "color",
              onSelect: () => applyRenderMode("color"),
            },
            {
              label: t("settings.renderMode.monochrome"),
              checked: state.renderMode === "monochrome",
              onSelect: () => applyRenderMode("monochrome"),
            },
          ],
        },
        { type: "separator" },
        { role: "toggleFullScreen" },
      ],
    },
    mac && {
      label: t("menu.window"),
      submenu: [{ role: "minimize" }, { role: "zoom" }],
    },
  ];
}
