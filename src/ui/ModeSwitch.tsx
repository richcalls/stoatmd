import { uiTextSize } from "./typography";
import { Text, View } from "nsh";
import { Button } from "nsh/base";
import { Icon } from "./Icon";
import { t } from "./i18n";
import { colors } from "./theme";
import type { ViewMode } from "./Toolbar";
import { controlFocusStyle, controlPressStyle, segmentStyle } from "./chrome";

type Props = {
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
  /** 标题栏移入时显露；独立使用默认显示。 */
  revealed?: boolean;
};

function ModeButton(props: {
  id: string;
  label: string;
  active: boolean;
  revealed: boolean;
  onPress: () => void;
  children: any;
}) {
  return (
    <Button
      testID={props.id}
      accessibilityLabel={props.label}
      tooltip={<Text style={{ fontSize: uiTextSize(12) }}>{props.label}</Text>}
      selected={props.active}
      onPress={props.onPress}
      style={{
        width: 30,
        height: 26,
        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center",
        ...segmentStyle(props.active),
        opacity: props.revealed ? 1 : 0,
      }}
      hoverStyle={{ backgroundColor: props.active ? colors().paper : colors().thread, opacity: 1 }}
      focusStyle={{ ...controlFocusStyle(), opacity: 1 }}
      activeStyle={controlPressStyle()}
    >
      {props.children}
    </Button>
  );
}

/** 源码 / 分栏 / 阅读：固定占位，悬停显露时保留分段控件外观。 */
export function ModeSwitch(props: Props) {
  const ink = () => colors().ink2;
  const active = () => colors().ink;
  return (
    <View
      testID="mode-switch"
      desktop={{ windowDrag: false }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        padding: 3,
        borderRadius: 8,
        backgroundColor: props.revealed === false ? "transparent" : colors().searchBg,
        flexShrink: 0,
      }}
    >
      <ModeButton
        id="mode-edit"
        label={t("mode.edit")}
        active={props.mode === "edit"}
        revealed={props.revealed !== false}
        onPress={() => props.onMode("edit")}
      >
        <Icon name="code" color={props.mode === "edit" ? active() : ink()} size={16} />
      </ModeButton>
      <ModeButton
        id="mode-split"
        label={t("mode.split")}
        active={props.mode === "split"}
        revealed={props.revealed !== false}
        onPress={() => props.onMode("split")}
      >
        <Icon name="split" color={props.mode === "split" ? active() : ink()} size={16} />
      </ModeButton>
      <ModeButton
        id="mode-preview"
        label={t("mode.preview")}
        active={props.mode === "preview"}
        revealed={props.revealed !== false}
        onPress={() => props.onMode("preview")}
      >
        <Icon name="eye" color={props.mode === "preview" ? active() : ink()} size={16} />
      </ModeButton>
    </View>
  );
}
