import { Text, View } from "nsh";
import { Button } from "nsh/base";
import { titleBar } from "nsh/desktop";
import { Icon } from "./Icon";
import { t } from "./i18n";
import { colors } from "./theme";

export type ViewMode = "edit" | "split" | "preview";
/** 文件夹栏：展开 200 / 图标轨 48 / 隐藏。 */
export type SidebarMode = "expanded" | "rail" | "hidden";

type Props = {
  sidebarMode: SidebarMode;
  listOpen: boolean;
  onCycleSidebar: () => void;
  onToggleList: () => void;
  onFont: () => void;
  onSettings: () => void;
};

function ToolButton(props: {
  testID?: string;
  active?: boolean;
  label: string;
  onPress: () => void;
  children: any;
}) {
  return (
    <Button
      testID={props.testID}
      accessibilityLabel={props.label}
      tooltip={<Text style={{ fontSize: 12 }}>{props.label}</Text>}
      selected={!!props.active}
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
        flexShrink: 0,
      }}
      activeStyle={{ opacity: 0.75 }}
    >
      {props.children}
    </Button>
  );
}

/**
 * 窗口顶栏：折叠/列表 + 标题拖拽区 + 字体/设置。
 * 模式切换改在 EditorWorkspace（编辑区右上角），避免 titleBar 拖拽吞点击。
 */
export function Toolbar(props: Props) {
  const ink = () => colors().ink2;
  const active = () => colors().accent;
  const barH = Math.max(titleBar().height || 44, 44);

  return (
    <View
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <ToolButton
          testID="toolbar-sidebar"
          active={props.sidebarMode !== "hidden"}
          label={t("toolbar.sidebar")}
          onPress={props.onCycleSidebar}
        >
          <Icon name="sidebar" color={props.sidebarMode !== "hidden" ? active() : ink()} size={16} />
        </ToolButton>
        <ToolButton
          testID="toolbar-list"
          active={props.listOpen}
          label={t("toolbar.list")}
          onPress={props.onToggleList}
        >
          <Icon name="list-pane" color={props.listOpen ? active() : ink()} size={16} />
        </ToolButton>
      </View>

      {/* 仅中间条可拖窗，左右按钮不参与 windowDrag */}
      <View
        desktop={{ windowDrag: true }}
        style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 13, fontWeight: "510", color: colors().ink }}>{t("app.name")}</Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <ToolButton testID="toolbar-font" label={t("toolbar.font")} onPress={props.onFont}>
          <Icon name="text-t" color={ink()} size={16} />
        </ToolButton>
        <ToolButton
          testID="toolbar-settings"
          label={t("toolbar.settings")}
          onPress={props.onSettings}
        >
          <Icon name="gear" color={ink()} size={16} />
        </ToolButton>
      </View>
    </View>
  );
}
