import { List, Text, View } from "nsh";
import { Input } from "nsh/base";
import { Icon } from "./Icon";
import { locale, t } from "./i18n";
import { colors } from "./theme";
import { formatWhen, type NoteItem } from "./vaultModel";

type Props = {
  folderLabel: string;
  notes: NoteItem[];
  selectedNoteId: string;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  query: string;
  onQuery: (q: string) => void;
  disabled?: boolean;
};

/** 中栏：搜索 + 分类标题 + 真实笔记列表。 */
export function NoteList(props: Props) {
  // 组件只运行一次：派生列表必须是闭包，在 JSX 里调用才会跟随 props 更新
  const notes = () =>
    props.notes.filter((n) => {
      const q = props.query.trim().toLowerCase();
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || n.path.toLowerCase().includes(q);
    });

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors().list,
        borderRightWidth: 1,
        borderRightColor: colors().thread,
      }}
    >
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            height: 32,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors().thread,
            backgroundColor: colors().editor,
            paddingHorizontal: 10,
          }}
        >
          <Icon name="magnifying-glass" color={colors().ink3} size={14} />
          <Input
            value={props.query}
            onChange={(text) => props.onQuery(text)}
            placeholder={t("search.placeholder")}
            style={{
              flex: 1,
              fontSize: 13,
              color: colors().ink,
              backgroundColor: "transparent",
              borderWidth: 0,
              padding: 0,
              height: 28,
            }}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "560", color: colors().ink }}>
            {props.folderLabel}
          </Text>
          <View
            role="button"
            accessibilityLabel={t("note.new")}
            onPress={() => {
              if (!props.disabled) props.onNewNote();
            }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors().thread,
              alignItems: "center",
              justifyContent: "center",
              opacity: props.disabled ? 0.4 : 1,
            }}
          >
            <Icon name="plus" color={colors().ink2} size={14} />
          </View>
        </View>
      </View>

      {/* 虚拟化列表：只渲染视口附近的单元格并复用，笔记再多也不整列重建。
          行内一律通过 item() 读值，单元格被复用到另一篇笔记时才会跟着更新。 */}
      <List
        style={{ flex: 1 }}
        contentClass="px-2 pb-3"
        each={notes()}
        keyExtractor={(n) => n.id}
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
            {props.disabled ? t("vault.empty.hint") : t("note.empty")}
          </Text>
        }
      >
        {(item) => {
          const on = () => item().id === props.selectedNoteId;
          return (
            <View
              role="button"
              onPress={() => props.onSelectNote(item().id)}
              style={{
                width: "100%",
                paddingVertical: 10,
                paddingHorizontal: 10,
                borderRadius: 6,
                marginBottom: 2,
                backgroundColor: on() ? colors().accentSoft : "transparent",
                borderLeftWidth: on() ? 1 : 0,
                borderLeftColor: on() ? colors().accent : "transparent",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "560", color: colors().ink }}>
                {item().title}
              </Text>
              <If when={!!item().relativePath}>
                <Text style={{ fontSize: 11, color: colors().ink3, marginTop: 2 }}>
                  {item().relativePath}
                </Text>
              </If>
              <Text style={{ fontSize: 12, color: colors().ink2, marginTop: 3 }}>
                {formatWhen(item().mtimeMs, locale())}
              </Text>
            </View>
          );
        }}
      </List>
    </View>
  );
}
