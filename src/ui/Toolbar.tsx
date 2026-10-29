import { Text, View } from "nsh";
import { titleBar } from "nsh/desktop";
import { Icon } from "./Icon";
import { t } from "./i18n";
import { colors } from "./theme";

export type ViewMode = "edit" | "split" | "preview";

type Props = {
  sidebarOpen: boolean;
  listOpen: boolean;
  mode: ViewMode;
  onToggleSidebar: () => void;
  onToggleList: () => void;
  onMode: (mode: ViewMode) => void;
  onFont: () => void;
  onSettings: () => void;
};

function ToolButton(props: {
  active?: boolean;
  label: string;
  onPress: () => void;
  children: any;
}) {
  return (
    <View
      role="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: props.active ? colors().accentSoft : "transparent",
        borderWidth: props.active ? 1 : 0,
        borderColor: props.active ? colors().accent : "transparent",
      }}
    >
      {props.children}
    </View>
  );
}

/** 顶栏：左折叠 · 右 Code/Split/Eye | TextT/Gear（无 Palette）。 */
export function Toolbar(props: Props) {
  const ink = () => colors().ink2;
  const active = () => colors().accent;
  const barH = Math.max(titleBar().height || 44, 44);

  return (
    <View
      desktop={{ windowDrag: true }}
      style={{
        height: barH,
        paddingLeft: (titleBar().left || 12) + 8,
        paddingRight: (titleBar().right || 0) + 12,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors().thread,
        backgroundColor: colors().paper,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <ToolButton
          active={props.sidebarOpen}
          label={t("toolbar.sidebar")}
          onPress={props.onToggleSidebar}
        >
          <Icon name="sidebar" color={props.sidebarOpen ? active() : ink()} size={16} />
        </ToolButton>
        <ToolButton active={props.listOpen} label={t("toolbar.list")} onPress={props.onToggleList}>
          <Icon name="list-pane" color={props.listOpen ? active() : ink()} size={16} />
        </ToolButton>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 13, fontWeight: "510", color: colors().ink }}>{t("app.name")}</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <ToolButton
          active={props.mode === "edit"}
          label={t("mode.edit")}
          onPress={() => props.onMode("edit")}
        >
          <Icon name="code" color={props.mode === "edit" ? active() : ink()} size={16} />
        </ToolButton>
        <ToolButton
          active={props.mode === "split"}
          label={t("mode.split")}
          onPress={() => props.onMode("split")}
        >
          <Icon name="split" color={props.mode === "split" ? active() : ink()} size={16} />
        </ToolButton>
        <ToolButton
          active={props.mode === "preview"}
          label={t("mode.preview")}
          onPress={() => props.onMode("preview")}
        >
          <Icon name="eye" color={props.mode === "preview" ? active() : ink()} size={16} />
        </ToolButton>

        <View
          style={{
            width: 1,
            height: 16,
            backgroundColor: colors().thread,
            marginHorizontal: 6,
          }}
        />

        <ToolButton label={t("toolbar.font")} onPress={props.onFont}>
          <Icon name="text-t" color={ink()} size={16} />
        </ToolButton>
        <ToolButton label={t("toolbar.settings")} onPress={props.onSettings}>
          <Icon name="gear" color={ink()} size={16} />
        </ToolButton>
      </View>
    </View>
  );
}
