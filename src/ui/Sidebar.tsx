import { Text, View } from "nsh";
import { Icon } from "./Icon";
import { t } from "./i18n";
import { colors } from "./theme";
import { normalizeVaultPath, type FolderNode } from "./vaultModel";

type Props = {
  folders: FolderNode[];
  selected: string;
  onSelect: (id: string) => void;
  onOpenVault: () => void;
  vaultRoot: string | null;
  rail?: boolean;
};

/** 左栏：真实库文件夹树；rail 时仅图标轨。 */
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingBottom: 8,
            gap: 8,
          }}
        >
          <Text style={{ flex: 1, fontSize: 13, fontWeight: "500", color: colors().ink2 }}>
            {t("library.label")}
          </Text>
          <View
            role="button"
            accessibilityLabel={t("vault.open")}
            onPress={props.onOpenVault}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: colors().thread,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="folder" color={colors().ink2} size={14} />
          </View>
        </View>
      </If>

      <If when={!props.vaultRoot}>
        <View style={{ paddingHorizontal: 14, paddingTop: 8 }}>
          <Text style={{ fontSize: 12, color: colors().ink3, lineHeight: 18 }}>
            {t("vault.empty.hint")}
          </Text>
        </View>
      </If>

      <View style={{ flex: 1, gap: 2, paddingHorizontal: 8 }}>
        <Each of={props.folders}>
          {(folder) => {
            const f = folder();
            const on = normalizeVaultPath(props.selected) === f.id;
            const c = colors();
            const label = f.id === "" ? t("vault.rootFolder") : f.name;
            return (
              <View
                role="button"
                onPress={() => props.onSelect(f.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  height: 32,
                  // 嵌套目录按深度缩进（根 depth=0）
                  paddingLeft: props.rail ? 0 : 10 + (f.depth || 0) * 12,
                  paddingRight: 10,
                  justifyContent: props.rail ? "center" : "flex-start",
                  borderRadius: 6,
                  backgroundColor: on ? c.accentSoft : "transparent",
                  borderLeftWidth: on && !props.rail ? 1 : 0,
                  borderLeftColor: on ? c.accent : "transparent",
                }}
              >
                <Icon
                  name={f.id === "" ? "notebook" : "folder"}
                  color={on ? c.accent : c.ink2}
                  size={16}
                />
                <If when={!props.rail}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: on ? c.accent : c.ink,
                      flex: 1,
                    }}
                  >
                    {label}
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
