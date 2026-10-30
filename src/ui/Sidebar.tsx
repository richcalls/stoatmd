import { List, Text, View } from "nsh";
import { Input } from "nsh/base";
import type { SyncPhase } from "../sync/runtime";
import { Icon, type IconName } from "./Icon";
import { t } from "./i18n";
import { colors, statusColor } from "./theme";
import {
  libraryRows,
  normalizeVaultPath,
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
  onQuery: (q: string) => void;
  onSelectNote: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onOpenVault: () => void;
  onNewNote: () => void;
  onSync: () => void;
  vaultRoot: string | null;
  syncPhase?: SyncPhase;
  syncConflictCount?: number;
};

/** 左栏：搜索 + 可折叠文件树（笔记嵌套在文件夹下），底部同步状态。 */
export function Sidebar(props: Props) {
  const rootLabel = (): string => {
    const root = props.vaultRoot ?? "";
    const base = root.split(/[\\/]/).filter(Boolean).pop();
    return base || t("vault.rootFolder");
  };

  const rows = () =>
    libraryRows(props.folders, props.notes, props.collapsed, props.query, rootLabel());

  const syncLabel = (): string => {
    const phase = props.syncPhase ?? "off";
    if (phase === "conflict") {
      return `${props.syncConflictCount ?? 0} ${t("sync.conflicts")}`;
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
        backgroundColor: colors().sidebar,
        borderRightWidth: 1,
        borderRightColor: colors().thread,
        paddingTop: 12,
        paddingBottom: 10,
        paddingHorizontal: 8,
      }}
    >
      <View
        style={{
          paddingHorizontal: 4,
          paddingBottom: 10,
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors().thread,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            height: 30,
            borderRadius: 7,
            backgroundColor: colors().searchBg,
            paddingHorizontal: 10,
          }}
        >
          <Icon name="magnifying-glass" color={colors().ink3} size={13} />
          <Input
            testID="sidebar-search"
            value={props.query}
            onChange={(text) => props.onQuery(text)}
            placeholder={t("search.placeholder")}
            style={{
              flex: 1,
              fontSize: 12.5,
              color: colors().ink,
              backgroundColor: "transparent",
              borderWidth: 0,
              padding: 0,
              height: 26,
            }}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <View
            role="button"
            accessibilityLabel={rootLabel()}
            onPress={() => props.onSelectFolder("")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              height: 28,
              paddingHorizontal: 6,
              borderRadius: 6,
            }}
          >
            <Icon name="notebook" color={colors().ink2} size={15} />
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: 13, fontWeight: "560", color: colors().ink }}
            >
              {rootLabel()}
            </Text>
          </View>
          <View
            role="button"
            testID="sidebar-new"
            accessibilityLabel={t("note.new")}
            onPress={props.onNewNote}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors().accentSoft,
            }}
          >
            <Icon name="plus" color={colors().accent} size={14} />
          </View>
          <View
            role="button"
            testID="sidebar-open"
            accessibilityLabel={t("vault.open")}
            onPress={props.onOpenVault}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="folder" color={colors().ink3} size={15} />
          </View>
        </View>
      </View>

      {/* 虚拟化文件树：行被复用，所有取值都通过 row() 读取，不能捕获成常量。 */}
      <List
        style={{ flex: 1 }}
        contentStyle={{ paddingTop: 6, paddingBottom: 12 }}
        each={rows()}
        keyExtractor={(row) => `${row.kind}:${row.id}`}
        empty={
          <Text
            style={{
              fontSize: 12,
              color: colors().ink3,
              paddingHorizontal: 10,
              paddingTop: 8,
              lineHeight: 18,
            }}
          >
            {props.query.trim() ? t("search.empty") : t("note.empty")}
          </Text>
        }
      >
        {(row) => {
          const isFolder = (): boolean => row().kind === "folder";
          const selected = (): boolean => {
            const r = row();
            return r.kind === "note" && r.id === props.selectedNoteId;
          };
          const targeting = (): boolean => {
            const r = row();
            return r.kind === "folder" && r.id === normalizeVaultPath(props.folderId);
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
              accessibilityLabel={label()}
              onPress={() => {
                const r = row();
                if (r.kind === "folder") {
                  props.onSelectFolder(r.id);
                  props.onToggleFolder(r.id);
                } else {
                  props.onSelectNote(r.id);
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 30,
                marginBottom: 1,
                paddingLeft: 6 + row().depth * 14,
                paddingRight: 8,
                borderRadius: 6,
                backgroundColor: selected() ? colors().accentSoft : "transparent",
                borderLeftWidth: selected() ? 1 : 0,
                borderLeftColor: selected() ? colors().accent : "transparent",
              }}
            >
              <If when={isFolder()}>
                <Icon name={caret()} color={colors().ink3} size={11} />
                <Icon
                  name="folder"
                  color={targeting() ? colors().accent : colors().ink2}
                  size={14}
                />
              </If>
              <If when={!isFolder()}>
                <View style={{ width: 11 }} />
                <Icon name="file-text" color={colors().ink3} size={13} />
              </If>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: selected() ? "560" : "450",
                  color: selected() ? colors().accent : colors().ink,
                }}
              >
                {label()}
              </Text>
              <If when={hint() !== ""}>
                <Text
                  numberOfLines={1}
                  style={{ maxWidth: 88, fontSize: 11, color: colors().ink3 }}
                >
                  {hint()}
                </Text>
              </If>
            </View>
          );
        }}
      </List>

      <View
        role="button"
        testID="sidebar-sync"
        accessibilityLabel={t("settings.sync")}
        onPress={props.onSync}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          paddingHorizontal: 8,
          paddingVertical: 7,
          borderRadius: 7,
        }}
      >
        <Icon name="cloud" color={colors().ink2} size={14} />
        <Text style={{ fontSize: 12, color: colors().ink2, flex: 1 }}>{syncLabel()}</Text>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: syncDotColor(),
          }}
        />
      </View>
    </View>
  );
}
