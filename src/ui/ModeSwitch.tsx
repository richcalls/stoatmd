import { View } from "nsh";
import { Button } from "nsh/base";
import { Icon } from "./Icon";
import { t } from "./i18n";
import { colors } from "./theme";
import type { ViewMode } from "./Toolbar";

type Props = {
  mode: ViewMode;
  onMode: (mode: ViewMode) => void;
};

function ModeButton(props: {
  id: string;
  label: string;
  active: boolean;
  onPress: () => void;
  children: any;
}) {
  return (
    <Button
      testID={props.id}
      accessibilityLabel={props.label}
      selected={props.active}
      onPress={props.onPress}
      style={{
        width: 29,
        height: 29,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: props.active ? colors().accentSoft : "transparent",
      }}
      activeStyle={{ opacity: 0.75 }}
    >
      {props.children}
    </Button>
  );
}

/** 源码 / 分栏 / 阅读：放在统一窗口栏右侧。 */
export function ModeSwitch(props: Props) {
  const ink = () => colors().ink2;
  const active = () => colors().accent;
  return (
    <View
      testID="mode-switch"
      style={{ flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 }}
    >
      <ModeButton
        id="mode-edit"
        label={t("mode.edit")}
        active={props.mode === "edit"}
        onPress={() => props.onMode("edit")}
      >
        <Icon name="code" color={props.mode === "edit" ? active() : ink()} size={16} />
      </ModeButton>
      <ModeButton
        id="mode-split"
        label={t("mode.split")}
        active={props.mode === "split"}
        onPress={() => props.onMode("split")}
      >
        <Icon name="split" color={props.mode === "split" ? active() : ink()} size={16} />
      </ModeButton>
      <ModeButton
        id="mode-preview"
        label={t("mode.preview")}
        active={props.mode === "preview"}
        onPress={() => props.onMode("preview")}
      >
        <Icon name="eye" color={props.mode === "preview" ? active() : ink()} size={16} />
      </ModeButton>
    </View>
  );
}
