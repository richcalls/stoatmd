import { uiTextSize, uiLineHeight, uiControlHeight } from "./typography";
import { List, Text, View, cleanup, effect, keymap, signal } from "nsh";
import { Button, Input, Menu, MenuItem, MenuSeparator } from "nsh/base";
import type { SyncPhase } from "../sync/runtime";
import { Icon, type IconName } from "./Icon";
import { t } from "./i18n";
import { colors, statusColor } from "./theme";
import { chromeColors, controlFocusStyle, controlHoverStyle, controlPressStyle } from "./chrome";
import {
  libraryRows,
  vaultNameFromRoot,
  type FolderNode,
  type NoteItem,
} from "./vaultModel";

type Props = {
  folders: FolderNode[];
  notes: NoteItem[];
  selectedNoteId: string;
  /** 新建笔记的目标文件夹；点文件夹或打开笔记时更新。 */
  folderId: string;
  collapsed: string[];
  query: string;
  contentMatches?: readonly string[];
  currentNote?: { path: string; content: string };
  searchPending?: boolean;
  searchError?: string;
  onQuery: (q: string) => void;
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onToggleFolder: (id: string) => void;
  /** 右键笔记：在 pagePosition 处弹出文件菜单。 */
  onNoteMenu?: (id: string, at: { x: number; y: number }) => void;
  onOpenVault: () => void;
  onNewNote: () => void;
  onSync: () => void;
  vaultRoot: string | null;
  syncPhase?: SyncPhase;
  syncConflictCount?: number;
};

const headerButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 5,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
} as const;

/** 左栏：库标题、搜索、紧凑文件树与底部同步状态。 */
export function Sidebar(props: Props) {
  const searchFocused = signal(false);
  const vaultMenuOpen = signal(false);
  const rootLabel = (): string => vaultNameFromRoot(props.vaultRoot) || t("vault.rootFolder");

  const rows = () =>
    libraryRows(props.folders, props.notes, props.collapsed, props.query, rootLabel(), props.contentMatches, props.currentNote);

  // Obsidian 习惯：搜索框里按 Esc 先清空内容；空着时 Esc 才交给别的快捷键（如收起文章栏）。
  effect(() => {
    if (!searchFocused() || props.query === "") return;
    const off = keymap.bind("escape", () => props.onQuery(""), { when: "always" });
    cleanup(off);
  });

  const syncLabel = (): string => {
    const phase = props.syncPhase ?? "off";
    if (phase === "conflict") {
      return t("sync.conflictsCount", { n: props.syncConflictCount ?? 0 });
    }
    if (phase === "authorizing") return t("sync.authorizing");
    if (phase === "syncing") return t("sync.syncing");
    if (phase === "synced") return t("sync.synced");
    if (phase === "offline") return t("sync.offline");
    if (phase === "error") return t("sync.error");
    return t("sync.off");
  };

  const syncDotColor = (): string => {
    const phase = props.syncPhase ?? "off";
    if (phase === "conflict" || phase === "error") return statusColor("danger");
    if (phase === "synced") return statusColor("ok");
    if (phase === "authorizing" || phase === "syncing") return colors().accent;
    return colors().ink3;
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: 0,
        paddingBottom: 9,
        paddingHorizontal: 8,
      }}
    >
      <View
        style={{
          paddingHorizontal: 3,
          paddingBottom: 12,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 0, height: uiControlHeight(30) }}>
          <Menu
            open={vaultMenuOpen()}
            onOpenChange={({ open }) => vaultMenuOpen.set(open)}
            placement="bottom"
            align="start"
            offset={6}
            style={{ minWidth: 0, flexShrink: 1 }}
            popupStyle={{
              width: 260,
              padding: 5,
              gap: 3,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors().thread,
              backgroundColor: colors().editor,
              boxShadow: chromeColors().panelShadow,
            }}
            trigger={
              <View
                role="button"
                testID="sidebar-vault-menu"
                accessibilityLabel={t("vault.menu", { name: rootLabel() })}
                accessibilityState={{ expanded: vaultMenuOpen() }}
                tooltip={<Text style={{ fontSize: uiTextSize(12) }}>{t("vault.menu", { name: rootLabel() })}</Text>}
                hoverStyle={controlHoverStyle()}
                focusStyle={controlFocusStyle()}
                activeStyle={controlPressStyle()}
                style={{
                  minWidth: 0,
                  height: uiControlHeight(26),
                  paddingHorizontal: 5,
                  gap: 8,
                  borderRadius: 5,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ flexShrink: 1, fontSize: uiTextSize(12), fontWeight: "600", color: colors().ink2, numberOfLines: 1 }}>
                  {rootLabel()}
                </Text>
                <Icon name="caret-down" color={colors().ink3} size={9} />
              </View>
            }
          >
            <MenuItem
              testID="sidebar-vault-root"
              onSelect={() => props.onSelectFolder("")}
              hoverStyle={controlHoverStyle()}
              focusStyle={controlFocusStyle()}
              activeStyle={controlPressStyle()}
              style={{ padding: 8, gap: 8, borderRadius: 4, flexDirection: "row", alignItems: "center" }}
            >
              <Icon name="folder" color={colors().ink2} size={14} />
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text style={{ fontSize: uiTextSize(12), fontWeight: "600", color: colors().ink, numberOfLines: 1 }}>{rootLabel()}</Text>
                <Text style={{ fontSize: uiTextSize(11), color: colors().ink3, numberOfLines: 2 }}>{props.vaultRoot ?? t("vault.none")}</Text>
              </View>
              <Icon name="check" color={colors().ink2} size={12} />
            </MenuItem>
            <MenuSeparator style={{ height: 1, marginVertical: 3, backgroundColor: colors().thread }} />
            <MenuItem
              testID="sidebar-open"
              onSelect={props.onOpenVault}
              hoverStyle={controlHoverStyle()}
              focusStyle={controlFocusStyle()}
              activeStyle={controlPressStyle()}
              style={{ height: uiControlHeight(30), paddingHorizontal: 8, borderRadius: 4, justifyContent: "center" }}
            >
              <Text style={{ fontSize: uiTextSize(12), color: colors().ink }}>{t("vault.open")}</Text>
            </MenuItem>
          </Menu>
          <View style={{ flex: 1 }} />
          <Button
            testID="sidebar-new"
            accessibilityLabel={t("note.new")}
            tooltip={<Text style={{ fontSize: uiTextSize(12) }}>{t("note.new")}</Text>}
            onPress={props.onNewNote}
            style={headerButtonStyle}
            hoverStyle={controlHoverStyle()}
            focusStyle={controlFocusStyle()}
            activeStyle={controlPressStyle()}
          >
            <Icon name="pencil" color={colors().ink3} size={14} />
          </Button>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            height: uiControlHeight(28),
            borderRadius: 6,
            borderWidth: 1,
            borderColor: searchFocused() ? colors().accent : "transparent",
            backgroundColor: chromeColors().hover,
            paddingHorizontal: 8,
          }}
        >
          <Icon name="magnifying-glass" color={colors().ink3} size={14} />
          <Input
            testID="sidebar-search"
            accessibilityLabel={t("search.placeholder")}
            onFocus={() => searchFocused.set(true)}
            onBlur={() => searchFocused.set(false)}
            value={props.query}
            onChange={({ value }) => props.onQuery(value)}
            placeholder={t("search.placeholder")}
            style={{
              flex: 1,
              fontSize: uiTextSize(12),
              color: colors().ink,
              backgroundColor: "transparent",
              borderWidth: 0,
              padding: 0,
              height: uiControlHeight(24),
            }}
          />
        </View>
      </View>

      <If when={!!props.query.trim() && (!!props.searchError || !!props.searchPending)}>
        <Text testID="sidebar-search-status" style={{ fontSize: uiTextSize(12), color: colors().ink3, paddingHorizontal: 10, paddingBottom: 6 }}>
          {props.searchError ? t("search.failed") : t("search.pending")}
        </Text>
      </If>

      {/* 虚拟化文件树：行被复用，所有取值都通过 row() 读取，不能捕获成常量。 */}
      <List
        style={{ flex: 1 }}
        contentStyle={{ paddingTop: 0, paddingBottom: 12 }}
        estimatedItemSize={uiControlHeight(28) + 1}
        each={rows()}
        keyExtractor={(row) => `${row.kind}:${row.id}`}
        empty={
          <Text
            style={{
              fontSize: uiTextSize(12),
              color: colors().ink3,
              paddingHorizontal: 10,
              paddingTop: 8,
              lineHeight: uiLineHeight(18),
            }}
          >
            {props.query.trim() ? (props.searchPending || props.searchError ? "" : t("search.empty")) : t("note.empty")}
          </Text>
        }
      >
        {(row) => {
          const isFolder = (): boolean => row().kind === "folder";
          const selected = (): boolean => {
            const r = row();
            return r.kind === "note" && r.id === props.selectedNoteId;
          };
          const expanded = (): boolean | undefined => {
            const r = row();
            return r.kind === "folder" ? !r.collapsed : undefined;
          };
          const label = (): string => {
            const r = row();
            return r.kind === "folder" ? r.name : r.title;
          };
          const hint = (): string => {
            const r = row();
            return r.kind === "note" ? r.hint : "";
          };
          const caret = (): IconName => {
            const r = row();
            return r.kind === "folder" && r.collapsed ? "caret-right" : "caret-down";
          };
          return (
            <View
              role="button"
              testID={`sidebar-row-${row().id}`}
              accessibilityLabel={label()}
              accessibilityState={{
                selected: selected(),
                expanded: expanded(),
              }}
              hoverStyle={selected() ? { backgroundColor: chromeColors().selection } : controlHoverStyle()}
              focusStyle={controlFocusStyle()}
              activeStyle={controlPressStyle()}
              onPress={() => {
                const r = row();
                if (r.kind === "folder") {
                  props.onSelectFolder(r.id);
                  props.onToggleFolder(r.id);
                } else {
                  props.onSelectNote(r.id);
                }
              }}
              onContextMenu={(e) => {
                const r = row();
                if (r.kind === "note") props.onNoteMenu?.(r.id, e.pagePosition);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: uiControlHeight(28),
                marginBottom: 1,
                paddingLeft: 5 + row().depth * 12,
                paddingRight: 7,
                borderRadius: 6,
                // Keep the selected row flat against the sidebar. A full
                // border plus shadow produced dark vertical bands at both
                // sides of the row, especially while the list was clipped.
                borderWidth: 0,
                borderBottomWidth: selected() ? 1 : 0,
                borderBottomColor: selected() ? chromeColors().selectionEdge : "transparent",
                backgroundColor: selected() ? chromeColors().selection : "transparent",
                boxShadow: "none",
              }}
            >
              <If when={isFolder()}>
                <View style={{ width: 9, alignItems: "center" }}>
                  <Icon name={caret()} color={colors().ink3} size={8} />
                </View>
                <Icon name="folder" color={colors().ink3} size={14} />
              </If>
              <If when={!isFolder()}>
                <View style={{ width: 9 }} />
                <Icon name="file-text" color={selected() ? colors().ink2 : colors().ink3} size={14} />
              </If>
              <Text
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: uiTextSize(12),
                  fontWeight: selected() || isFolder() ? "500" : "400",
                  color: selected() ? colors().ink : colors().ink2,
                  numberOfLines: 1,
                }}
              >
                {label()}
              </Text>
              <If when={hint() !== ""}>
                <Text
                  style={{ maxWidth: 60, fontSize: uiTextSize(10.5), color: colors().ink3, numberOfLines: 1 }}
                >
                  {hint()}
                </Text>
              </If>
            </View>
          );
        }}
      </List>

      <Button
        hoverStyle={controlHoverStyle()}
        focusStyle={controlFocusStyle()}
        activeStyle={controlPressStyle()}
        testID="sidebar-sync"
        accessibilityLabel={t("settings.sync")}
        onPress={props.onSync}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          marginTop: 6,
          paddingHorizontal: 8,
          height: uiControlHeight(28),
          borderRadius: 6,
        }}
      >
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: syncDotColor(),
          }}
        />
        <Text
          style={{ fontSize: uiTextSize(11), color: colors().ink2, flex: 1, minWidth: 0, numberOfLines: 1 }}
        >
          {syncLabel()}
        </Text>
        <Text
          testID="sidebar-count"
          style={{ fontSize: uiTextSize(10.5), color: colors().ink3, numberOfLines: 1 }}
        >
          {t("sidebar.noteCount", { n: props.notes.length })}
        </Text>
      </Button>
    </View>
  );
}
