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

/** macOS 原生标题栏：只留居中文案，整条可拖窗。 */
export function TitleBar() {
  const barH = Math.max(titleBar().height || 52, 52);
  return (
    <View
      desktop={{ windowDrag: true }}
      style={{
        height: barH,
        alignItems: "center",
        justifyContent: "center",
        borderBottomWidth: 1,
        borderBottomColor: colors().thread,
        backgroundColor: colors().sidebar,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "510", color: colors().ink2 }}>
        {t("app.name")}
      </Text>
    </View>
  );
}

type Props = {
  sidebarMode: SidebarMode;
  onCycleSidebar: () => void;
  onFont: () => void;
  onSettings: () => void;
};

type WorkspaceProps = Props & {
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  /** 没有库时只留字体/设置：栏布局与编辑模式无从谈起。 */
  minimal?: boolean;
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
        flexShrink: 0,
      }}
      activeStyle={{ opacity: 0.75 }}
    >
      {props.children}
    </Button>
  );
}

/** 编辑区工具条：左侧栏布局，右侧模式 | 字体 · 设置（对齐 ui-v1 editor-toolbar）。 */
export function WorkspaceToolbar(props: WorkspaceProps) {
  const ink = () => colors().ink2;
  const active = () => colors().accent;
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <ToolButton
            testID="toolbar-sidebar"
            active={props.sidebarMode !== "hidden"}
            label={t("toolbar.sidebar")}
            onPress={props.onCycleSidebar}
          >
            <Icon
              name="sidebar"
              color={props.sidebarMode !== "hidden" ? active() : ink()}
              size={16}
            />
          </ToolButton>
        </View>
      </If>

      <View style={{ flex: 1 }} />

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
