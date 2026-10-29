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
  onSync: () => void;
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
        paddingTop: props.rail ? 12 : 14,
        paddingBottom: props.rail ? 10 : 12,
        paddingHorizontal: props.rail ? 6 : 10,
      }}
    >
      <If when={!props.rail}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            paddingBottom: 8,
            gap: 8,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: "510",
              color: colors().ink3,
              letterSpacing: 0.12,
            }}
          >
            {t("library.label")}
          </Text>
          <View
            role="button"
            accessibilityLabel={t("vault.open")}
            onPress={props.onOpenVault}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="folder" color={colors().ink3} size={15} />
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

      <View style={{ flex: 1, gap: 2 }}>
        <Each of={props.folders}>
          {(folder) => {
            const f = folder();
            const on = () => normalizeVaultPath(props.selected) === f.id;
            const label = f.id === "" ? t("vault.rootFolder") : f.name;
            return (
              <View
                role="button"
                accessibilityLabel={label}
                tooltip={props.rail ? <Text style={{ fontSize: 12 }}>{label}</Text> : undefined}
                onPress={() => props.onSelect(f.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  height: props.rail ? 36 : 32,
                  width: props.rail ? 36 : undefined,
                  alignSelf: props.rail ? "center" : "auto",
                  // 嵌套目录按深度缩进（根 depth=0）
                  paddingLeft: props.rail ? 0 : 10 + (f.depth || 0) * 12,
                  paddingRight: props.rail ? 0 : 10,
                  justifyContent: props.rail ? "center" : "flex-start",
                  borderRadius: 7,
                  backgroundColor: on() ? colors().accentSoft : "transparent",
                  borderLeftWidth: on() ? 1 : 0,
                  borderLeftColor: on() ? colors().accent : "transparent",
                }}
              >
                <Icon
                  name={f.id === "" ? "notebook" : "folder"}
                  color={on() ? colors().accent : colors().ink2}
                  size={16}
                />
                <If when={!props.rail}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: colors().ink,
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
        role="button"
        testID="sidebar-sync"
        accessibilityLabel={t("settings.sync")}
        tooltip={props.rail ? <Text style={{ fontSize: 12 }}>{t("settings.sync")}</Text> : undefined}
        onPress={props.onSync}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: props.rail ? 0 : 8,
          width: props.rail ? 36 : undefined,
          height: props.rail ? 36 : undefined,
          alignSelf: props.rail ? "center" : "auto",
          paddingHorizontal: props.rail ? 0 : 10,
          paddingVertical: props.rail ? 0 : 8,
          borderRadius: 7,
          justifyContent: props.rail ? "center" : "flex-start",
        }}
      >
        <Icon name="cloud" color={colors().ink2} size={14} />
        <If when={!props.rail}>
          <Text style={{ fontSize: 12, color: colors().ink2, flex: 1 }}>{t("sync.off")}</Text>
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
