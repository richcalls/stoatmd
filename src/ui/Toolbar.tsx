import { Text, View, effect, platform, signal } from "nsh";
import { Button } from "nsh/base";
import { titleBar } from "nsh/desktop";
import { Icon } from "./Icon";
import { ModeSwitch } from "./ModeSwitch";
import { t } from "./i18n";
import { colors } from "./theme";
import { controlFocusStyle, controlHoverStyle, controlPressStyle, iconButtonStyle } from "./chrome";

export type ViewMode = "edit" | "split" | "preview";
/** 左栏：展开 / 隐藏。 */
export type SidebarMode = "expanded" | "hidden";

/** 文件树宽度独立于标题栏，收起时标题保持窗口居中。 */
export const SIDEBAR_WIDTH = 208;
export const WINDOW_BAR_HEIGHT = 34;

type Props = {
  showSidebarToggle: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** 无打开笔记时显示库名。 */
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
  revealed: boolean;
  selected?: boolean;
  children: any;
}) {
  return (
    <View desktop={{ windowDrag: false }} style={{ width: 30, height: 30, flexShrink: 0 }}>
      <Button
        testID={props.testID}
        accessibilityLabel={props.label}
        tooltip={<Text style={{ fontSize: 12 }}>{props.label}</Text>}
        onPress={props.onPress}
        selected={props.selected}
        style={{ ...iconButtonStyle, opacity: props.revealed ? 1 : 0 }}
        hoverStyle={{ ...controlHoverStyle(), opacity: 1 }}
        focusStyle={{ ...controlFocusStyle(), opacity: 1 }}
        activeStyle={controlPressStyle()}
      >
        {props.children}
      </Button>
    </View>
  );
}

/**
 * Otty 式窗口栏：标题始终居中，移入顶部时显露两侧工具。
 * 控件保持挂载与占位，键盘焦点也能显露，显隐不会改变布局。
 */
export function WindowBar(props: Props) {
  const barH = signal(WINDOW_BAR_HEIGHT);
  effect(() => {
    const height = titleBar().height;
    // AppKit 缩放期间会暂时用旧的内容矩形计算窗口栏，保留最近的有效高度。
    if (platform.os !== "macos" || height <= 44) {
      barH.set(Math.max(height, WINDOW_BAR_HEIGHT));
    }
  });
  const hovered = signal(false);
  const revealed = () => hovered() || platform.os === "ios" || platform.os === "android";
  // 两翼等宽，并分别避开各平台的系统窗口按钮。
  const wingWidth = () => Math.max(titleBar().left + 42, titleBar().right + 116);
  return (
    <View
      testID="window-bar"
      desktop={{ windowDrag: true }}
      onHoverIn={() => hovered.set(true)}
      onHoverOut={() => hovered.set(false)}
      style={{
        height: barH(),
        flexShrink: 0,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: wingWidth(),
          height: "100%",
          paddingLeft: titleBar().left + 4,
          flexDirection: "row",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <If when={props.showSidebarToggle}>
          <ToolButton
            testID="toolbar-sidebar"
            label={t("toolbar.sidebar")}
            onPress={props.onToggleSidebar}
            revealed={revealed()}
            selected={props.sidebarOpen}
          >
            <Icon name="sidebar" color={colors().ink2} size={16} />
          </ToolButton>
        </If>
      </View>

      <View
        testID="toolbar-heading"
        pointerEvents="none"
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <Text
          testID="toolbar-title"
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontWeight: "500",
            color: colors().ink2,
            textAlign: "center",
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {props.title || props.vaultName || t("app.name")}
        </Text>
      </View>
      <View
        style={{
          width: wingWidth(),
          height: "100%",
          paddingRight: titleBar().right + 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          flexShrink: 0,
        }}
      >
        <If when={props.showModes}>
          <ModeSwitch mode={props.mode} onMode={props.onMode} revealed={revealed()} />
        </If>
      </View>
    </View>
  );
}
