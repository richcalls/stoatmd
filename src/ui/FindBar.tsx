import { Text, View, keymap, type InputRef } from "nsh";
import { Button, Input, type EditorSearchResult } from "nsh/base";
import { chromeColors, controlFocusStyle, controlHoverStyle, controlPressStyle, iconButtonStyle } from "./chrome";
import { findShortcuts } from "./findShortcuts";
import { Icon } from "./Icon";
import { t } from "./i18n";
import { colors } from "./theme";

type Props = {
  query: string;
  result: EditorSearchResult;
  inputRef: (node: InputRef) => void;
  onQuery: (query: string) => void;
  onFocus: (focused: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
};

export function FindBar(props: Props) {
  const shortcuts = findShortcuts();
  const button = (id: string, label: string, shortcut: string, onPress: () => void, text: string) => (
    <Button
      testID={id}
      accessibilityLabel={label}
      tooltip={<Text>{`${label} (${keymap.label(shortcut)})`}</Text>}
      disabled={props.result.count === 0}
      onPress={onPress}
      style={iconButtonStyle}
      hoverStyle={controlHoverStyle()}
      focusStyle={controlFocusStyle()}
      activeStyle={controlPressStyle()}
    >
      <Text style={{ color: props.result.count ? colors().ink2 : colors().ink3, fontSize: 16 }}>{text}</Text>
    </Button>
  );
  return (
    <View
      testID="document-find"
      style={{
        width: 420, maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 4,
        paddingLeft: 10, paddingRight: 5, paddingVertical: 5,
        backgroundColor: colors().paper, borderWidth: 1, borderColor: chromeColors().panelEdge,
        borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <Icon name="magnifying-glass" color={colors().ink3} size={14} />
      <Input
        ref={props.inputRef}
        testID="document-find-input"
        accessibilityLabel={t("find.placeholder")}
        placeholder={t("find.placeholder")}
        value={props.query}
        onChange={({ value }) => props.onQuery(value)}
        onFocus={() => props.onFocus(true)}
        onBlur={() => props.onFocus(false)}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        submitBehavior="submit"
        onSubmit={props.onNext}
        style={{ flex: 1, minWidth: 0, height: 28, fontSize: 13, color: colors().ink, backgroundColor: "transparent", borderWidth: 0, padding: 0 }}
      />
      <Text testID="document-find-count" style={{ flexShrink: 0, fontSize: 12, color: colors().ink3 }}>
        {props.query ? (props.result.count
          ? t("find.count", { current: props.result.current == null ? 0 : props.result.current + 1, total: props.result.count })
          : t("find.noResults")) : ""}
      </Text>
      {button("document-find-previous", t("find.previous"), shortcuts.previous, props.onPrevious, "↑")}
      {button("document-find-next", t("find.next"), shortcuts.next, props.onNext, "↓")}
      <Button
        testID="document-find-close"
        accessibilityLabel={t("find.close")}
        tooltip={<Text>{`${t("find.close")} (${keymap.label("escape")})`}</Text>}
        onPress={props.onClose}
        style={iconButtonStyle}
        hoverStyle={controlHoverStyle()}
        focusStyle={controlFocusStyle()}
        activeStyle={controlPressStyle()}
      >
        <Icon name="x" color={colors().ink2} size={14} />
      </Button>
    </View>
  );
}
