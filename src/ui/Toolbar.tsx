import { Text, View, signal } from "nsh";
import { Button } from "nsh/base";
import { titleBar } from "nsh/desktop";
import { Icon } from "./Icon";
import { ModeSwitch } from "./ModeSwitch";
import { t } from "./i18n";
import { colors } from "./theme";

export type ViewMode = "edit" | "split" | "preview";
/** 左栏：展开 / 隐藏。 */
export type SidebarMode = "expanded" | "hidden";

/** 顶栏右侧的悬停区宽度：鼠标进入这里才露出文件树开关（对齐 Otty）。 */
const TITLEBAR_SIDE_ZONE = 220;

type TitleBarProps = {
  showSidebarToggle: boolean;
  onToggleSidebar: () => void;
};

/** macOS 原生标题栏：居中产品名，右侧悬停显示文件树开关，整条可拖窗。 */
export function TitleBar(props: TitleBarProps) {
  const barH = Math.max(titleBar().height || 52, 52);
  const hoverRight = signal(false);
  return (
    <View
      desktop={{ windowDrag: true }}
      style={{
        height: barH,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors().thread,
        backgroundColor: colors().sidebar,
      }}
    >
      <View style={{ width: TITLEBAR_SIDE_ZONE }} />
      <View
        testID="titlebar-center"
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 13, fontWeight: "510", color: colors().ink2 }}>
          {t("app.name")}
        </Text>
      </View>
      <If when={props.showSidebarToggle}>
        <View
          testID="titlebar-sidebar-zone"
          onHoverIn={() => hoverRight.set(true)}
          onHoverOut={() => hoverRight.set(false)}
          style={{
            width: TITLEBAR_SIDE_ZONE,
            height: "100%",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingRight: 14,
          }}
        >
          <If when={hoverRight()}>
            <ToolButton
              testID="toolbar-sidebar"
              label={t("toolbar.sidebar")}
              onPress={props.onToggleSidebar}
            >
              <Icon name="sidebar" color={colors().ink2} size={16} />
            </ToolButton>
          </If>
        </View>
      </If>
      <If when={!props.showSidebarToggle}>
        <View style={{ width: TITLEBAR_SIDE_ZONE }} />
      </If>
    </View>
  );
}

type Props = {
  onFont: () => void;
  onSettings: () => void;
};

type WorkspaceProps = Props & {
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  /** 当前笔记标题；没有打开笔记时为空。 */
  title?: string;
  /** 没有库时只留字体/设置：栏布局与编辑模式无从谈起。 */
  minimal?: boolean;
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
        width: 28,
        height: 28,
        borderRadius: 6,
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

/** 编辑区工具条：左侧当前笔记标题，右侧模式 | 字体 · 设置（对齐 ui-v1 editor-toolbar）。 */
export function WorkspaceToolbar(props: WorkspaceProps) {
  const ink = () => colors().ink2;
  return (
    <View
      testID="workspace-toolbar"
      style={{
        height: 40,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors().thread,
        backgroundColor: colors().editor,
      }}
    >
      <If when={!props.minimal}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <Text
            testID="toolbar-title"
            numberOfLines={1}
            style={{
              fontSize: 16,
              fontWeight: "600",
              letterSpacing: 0.2,
              color: colors().ink,
            }}
          >
            {props.title ?? ""}
          </Text>
        </View>
      </If>
      <If when={props.minimal}>
        <View style={{ flex: 1 }} />
      </If>

      <If when={!props.minimal}>
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}>
          <ModeSwitch mode={props.mode} onMode={props.onMode} />
          <View
            style={{
              width: 1,
              height: 16,
              marginLeft: 6,
              marginRight: 6,
              backgroundColor: colors().thread,
            }}
          />
        </View>
      </If>

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
  );
}
