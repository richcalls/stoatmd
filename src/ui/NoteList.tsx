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
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 10,
          gap: 10,
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

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: "600",
              letterSpacing: -0.15,
              color: colors().ink,
            }}
          >
            {props.folderLabel}
          </Text>
          <View
            role="button"
            accessibilityLabel={t("note.new")}
            onPress={() => {
              if (!props.disabled) props.onNewNote();
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              backgroundColor: colors().accentSoft,
              alignItems: "center",
              justifyContent: "center",
              opacity: props.disabled ? 0.4 : 1,
            }}
          >
            <Icon name="plus" color={colors().accent} size={15} />
          </View>
        </View>
      </View>

      {/* 虚拟化列表：只渲染视口附近的单元格并复用，笔记再多也不整列重建。
          行内一律通过 item() 读值，单元格被复用到另一篇笔记时才会跟着更新。 */}
      <List
        style={{ flex: 1 }}
        contentStyle={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 12 }}
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
                paddingHorizontal: 12,
                borderRadius: 8,
                marginBottom: 2,
                backgroundColor: on() ? colors().accentSoft : "transparent",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "560", color: colors().ink }}>
                {item().title}
              </Text>
              <Text style={{ fontSize: 12, color: colors().ink3, marginTop: 3 }}>
                {formatWhen(item().mtimeMs, locale())}
              </Text>
            </View>
          );
        }}
      </List>
    </View>
  );
}
