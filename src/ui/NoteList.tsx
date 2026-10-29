import { Scroll, Text, View } from "nsh";
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
  const notes = props.notes.filter((n) => {
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

      <Scroll style={{ flex: 1 }} contentClass="px-2 pb-3">
        <If when={notes.length === 0}>
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
        </If>
        <Each of={notes}>
          {(note) => {
            const n = note();
            const on = n.id === props.selectedNoteId;
            const c = colors();
            const when = formatWhen(n.mtimeMs, locale());
            return (
              <View
                role="button"
                onPress={() => props.onSelectNote(n.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 6,
                  marginBottom: 2,
                  backgroundColor: on ? c.accentSoft : "transparent",
                  borderLeftWidth: on ? 1 : 0,
                  borderLeftColor: on ? c.accent : "transparent",
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "560", color: c.ink }}>{n.title}</Text>
                <Text style={{ fontSize: 12, color: c.ink2, marginTop: 3 }}>{when}</Text>
              </View>
            );
          }}
        </Each>
      </Scroll>
    </View>
  );
}
