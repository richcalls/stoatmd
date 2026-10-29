import { Text, View } from "nsh";
import { Icon } from "./Icon";
import { t } from "./i18n";
import { FOLDERS, type FolderId } from "./mockData";
import { colors } from "./theme";

type Props = {
  selected: FolderId;
  onSelect: (id: FolderId) => void;
  rail?: boolean;
};

/** 左栏文件夹树；rail 时仅图标轨。 */
export function Sidebar(props: Props) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors().sidebar,
        borderRightWidth: 1,
        borderRightColor: colors().thread,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <If when={!props.rail}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: colors().ink2,
            paddingHorizontal: 14,
            paddingBottom: 8,
          }}
        >
          {t("library.label")}
        </Text>
      </If>

      <View style={{ flex: 1, gap: 2, paddingHorizontal: 8 }}>
        <Each of={FOLDERS}>
          {(folder) => {
            const f = folder();
            const on = props.selected === f.id;
            const c = colors();
            return (
              <View
                role="button"
                onPress={() => props.onSelect(f.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  height: 32,
                  paddingLeft: props.rail ? 0 : 10,
                  paddingRight: 10,
                  justifyContent: props.rail ? "center" : "flex-start",
                  borderRadius: 6,
                  backgroundColor: on ? c.accentSoft : "transparent",
                  borderLeftWidth: on && !props.rail ? 1 : 0,
                  borderLeftColor: on ? c.accent : "transparent",
                }}
              >
                <Icon name={f.icon} color={on ? c.accent : c.ink2} size={16} />
                <If when={!props.rail}>
                  <Text style={{ fontSize: 13, fontWeight: "500", color: on ? c.accent : c.ink }}>
                    {t(f.labelKey)}
                  </Text>
                </If>
              </View>
            );
          }}
        </Each>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: props.rail ? 8 : 14,
          paddingTop: 8,
          justifyContent: props.rail ? "center" : "flex-start",
        }}
      >
        <Icon name="cloud" color={colors().ink3} size={14} />
        <If when={!props.rail}>
          <Text style={{ fontSize: 12, color: colors().ink3, flex: 1 }}>{t("sync.off")}</Text>
        </If>
        <If when={!props.rail}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors().ink3,
              opacity: 0.7,
            }}
          />
        </If>
      </View>
    </View>
  );
}
