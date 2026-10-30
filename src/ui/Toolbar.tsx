import { Text, View } from "nsh";
import { Button } from "nsh/base";
import { titleBar } from "nsh/desktop";
import { Icon } from "./Icon";
import { ModeSwitch } from "./ModeSwitch";
import { t } from "./i18n";
import { colors } from "./theme";

export type ViewMode = "edit" | "split" | "preview";
/** 左栏：展开 / 隐藏。 */
export type SidebarMode = "expanded" | "hidden";

/** 与左栏同宽；顶栏左段容纳系统红绿灯与应用名。 */
export const SIDEBAR_WIDTH = 208;
const BAR_HEIGHT = 52;
const NAV_HIDDEN_WIDTH = 150;
const TRAFFIC_LIGHTS = 84;

type Props = {
  showSidebarToggle: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** 库名（面包屑第一段）；为空时不显示。 */
  vaultName: string;
  /** 当前笔记标题。 */
  title: string;
  showModes: boolean;
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
};

function ToolButton(props: {
  testID?: string;
  label: string;
  onPress: () => void;
  children: any;
}) {
  return (
    <Button
      testID={props.testID}
      accessibilityLabel={props.label}
      tooltip={<Text style={{ fontSize: 12 }}>{props.label}</Text>}
      onPress={props.onPress}
      style={{
        width: 29,
        height: 29,
        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
        flexShrink: 0,
      }}
      activeStyle={{ opacity: 0.75 }}
    >
      {props.children}
    </Button>
  );
}

/**
 * 统一窗口栏：左侧红绿灯 + 品牌，正文区放文件树开关、库名/标题与三个模式按钮。
 * 字体与设置移入应用菜单，不再占用顶栏。
 */
export function WindowBar(props: Props) {
  const barH = Math.max(titleBar().height || BAR_HEIGHT, BAR_HEIGHT);
  const leftWidth =
    props.showSidebarToggle && props.sidebarOpen ? SIDEBAR_WIDTH : NAV_HIDDEN_WIDTH;
  const ink = () => colors().ink3;
  return (
    <View
      testID="window-bar"
      desktop={{ windowDrag: true }}
      style={{
        height: barH,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors().sidebar,
      }}
    >
      <View
        style={{
          width: leftWidth,
          height: "100%",
          paddingLeft: TRAFFIC_LIGHTS,
          paddingRight: 10,
          flexDirection: "row",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: "500", color: colors().ink3 }}
        >
          {t("app.name")}
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingLeft: 8,
          paddingRight: 12,
        }}
      >
        <If when={props.showSidebarToggle}>
          <ToolButton
            testID="toolbar-sidebar"
            label={t("toolbar.sidebar")}
            onPress={props.onToggleSidebar}
          >
            <Icon name="sidebar" color={colors().ink2} size={16} />
          </ToolButton>
        </If>

        <View
          testID="toolbar-breadcrumb"
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
          }}
        >
          <If when={props.vaultName !== ""}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                flexShrink: 1,
                minWidth: 0,
              }}
            >
              <Text
                numberOfLines={1}
                style={{ maxWidth: 170, fontSize: 12, color: colors().ink3 }}
              >
                {props.vaultName}
              </Text>
              <Icon name="caret-right" color={ink()} size={10} />
            </View>
          </If>
          <Text
            testID="toolbar-title"
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 0.1,
              color: colors().ink,
            }}
          >
            {props.title}
          </Text>
        </View>

        <If when={props.showModes}>
          <ModeSwitch mode={props.mode} onMode={props.onMode} />
        </If>
      </View>
    </View>
  );
}
