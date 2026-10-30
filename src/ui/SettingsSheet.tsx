import { List, Scroll, Text, View, effect, signal } from "nsh";
import { Button, Dialog, Input, Popover } from "nsh/base";
import { Icon, type IconName } from "./Icon";
import { localePref, setLocalePref, t, type LocalePref } from "./i18n";
import { saveLocale } from "./prefs";
import { SyncSettings } from "./SyncSettings";
import { THEMES, applyTheme, colors, themeId, type ThemePreset } from "./theme";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_STEP,
  applyFontFamily,
  applyFontLineHeight,
  applyFontSize,
  fontFamily,
  fontLineHeight,
  fontSize,
  isDefaultTypography,
  lineHeightPx,
  loadSystemFonts,
  previewFontFamily,
  resetTypography,
  systemFonts,
} from "./typography";

export type SettingsTab = "appearance" | "font" | "sync";

type Props = {
  open: boolean;
  tab: SettingsTab;
  onTab: (tab: SettingsTab) => void;
  onClose: () => void;
  vaultRoot?: string | null;
  onOpenVault?: () => void;
  onSyncNow?: () => void;
  onManageConflicts?: () => void;
};

const TABS: { id: SettingsTab; labelKey: string; icon: IconName }[] = [
  { id: "appearance", labelKey: "settings.appearance", icon: "palette" },
  { id: "font", labelKey: "settings.font", icon: "text-t" },
  { id: "sync", labelKey: "settings.sync", icon: "sync" },
];

/** 语言名用各自的写法，只有「跟随系统」随界面翻译。 */
const LOCALES: { id: LocalePref; label: string; key?: string }[] = [
  { id: "system", label: "", key: "settings.locale.system" },
  { id: "en", label: "English" },
  { id: "zh", label: "简体中文" },
  { id: "zh-Hant", label: "繁體中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "de", label: "Deutsch" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
];

const SHEET_WIDTH = 720;
const SHEET_HEIGHT = 600;
const THEME_CARD_WIDTH = 126;

function localeName(id: LocalePref): string {
  const item = LOCALES.find((row) => row.id === id);
  if (!item) return String(id);
  return item.key ? t(item.key) : item.label;
}

function ThemeCard(props: { item: ThemePreset }) {
  const on = () => themeId() === props.item.id;
  return (
    <View
      role="button"
      testID={`theme-${props.item.id}`}
      accessibilityLabel={t(props.item.nameKey)}
      onPress={() => applyTheme(props.item.id)}
      style={{
        width: THEME_CARD_WIDTH,
        height: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 10,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: on() ? colors().accent : colors().thread,
        backgroundColor: on() ? colors().accentSoft : colors().list,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: props.item.palette.paper,
          borderWidth: 1,
          borderColor: props.item.palette.thread,
        }}
      />
      <Text
        style={{
          fontSize: 12.5,
          fontWeight: "560",
          letterSpacing: -0.12,
          color: colors().ink,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {t(props.item.nameKey)}
      </Text>
    </View>
  );
}

function Stepper(props: {
  testID: string;
  value: string;
  disabledDec: boolean;
  disabledInc: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  const arrow = () => ({
    width: 30,
    height: 30,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  });
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 32,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: colors().thread,
        backgroundColor: colors().list,
        overflow: "hidden",
      }}
    >
      <Button
        testID={`${props.testID}-dec`}
        accessibilityLabel={t("settings.font.decrease")}
        disabled={props.disabledDec}
        disabledStyle={{ opacity: 0.4 }}
        onPress={props.onDec}
        style={arrow()}
        activeStyle={{ opacity: 0.7 }}
      >
        <Text style={{ fontSize: 15, color: colors().ink2 }}>−</Text>
      </Button>
      <View
        style={{
          width: 52,
          height: 30,
          alignItems: "center",
          justifyContent: "center",
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors().thread,
        }}
      >
        <Text
          testID={`${props.testID}-value`}
          style={{ fontSize: 13, fontWeight: "560", color: colors().ink }}
        >
          {props.value}
        </Text>
      </View>
      <Button
        testID={`${props.testID}-inc`}
        accessibilityLabel={t("settings.font.increase")}
        disabled={props.disabledInc}
        disabledStyle={{ opacity: 0.4 }}
        onPress={props.onInc}
        style={arrow()}
        activeStyle={{ opacity: 0.7 }}
      >
        <Text style={{ fontSize: 15, color: colors().ink2 }}>+</Text>
      </Button>
    </View>
  );
}

/** 字体下拉：触发条 + 搜索 + 系统字体列表。 */
function FontPicker() {
  const menuOpen = signal(false);
  const query = signal("");

  /** 先过滤再交给虚拟化列表，避免每次输入都遍历并渲染全部系统字体。 */
  const visibleFonts = () => {
    const q = query().trim().toLowerCase();
    const all = systemFonts();
    return q === "" ? all : all.filter((name) => name.toLowerCase().includes(q));
  };

  const defaultSelected = () => fontFamily() === "";
  // 行高 32 + 行距 2，最多露出 7 行多一点，超出后列表内部滚动。
  const listHeight = () => Math.min(238, Math.max(34, visibleFonts().length * 34));

  return (
    <Popover
      open={menuOpen()}
      onOpenChange={(next) => menuOpen.set(next)}
      onOpen={() => {
        query.set("");
        loadSystemFonts();
      }}
      placement="bottom"
      align="start"
      offset={6}
      popupStyle={{
        width: 300,
        padding: 8,
        gap: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors().thread,
        backgroundColor: colors().editor,
      }}
      trigger={
        <View
          role="button"
          testID="font-select"
          accessibilityLabel={t("settings.font.family")}
          style={{
            height: 32,
            paddingHorizontal: 10,
            borderRadius: 7,
            borderWidth: 1,
            borderColor: colors().thread,
            backgroundColor: colors().list,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: "500",
              color: colors().ink,
              fontFamily: previewFontFamily(),
            }}
            numberOfLines={1}
          >
            {fontFamily() || t("settings.font.kamiDefault")}
          </Text>
          <Icon name="caret-down" color={colors().ink3} size={14} />
        </View>
      }
    >
      <View style={{ gap: 6 }}>
        <Input
          testID="font-search"
          value={query()}
          onChange={(text) => query.set(text)}
          placeholder={t("settings.font.search")}
          autoFocus
          style={{
            height: 30,
            paddingHorizontal: 8,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors().thread,
            backgroundColor: colors().list,
            fontSize: 13,
            color: colors().ink,
          }}
        />
        <View
          role="button"
          testID="font-option-kami"
          onPress={() => {
            applyFontFamily("");
            menuOpen.set(false);
          }}
          style={{
            height: 32,
            paddingHorizontal: 8,
            borderRadius: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: defaultSelected() ? colors().accentSoft : "transparent",
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: defaultSelected() ? colors().accent : colors().ink,
            }}
            numberOfLines={1}
          >
            {t("settings.font.kamiDefault")}
          </Text>
          <If when={defaultSelected()}>
            <Icon name="check" color={colors().accent} size={13} />
          </If>
        </View>
        <List
          testID="font-options"
          style={{ height: listHeight() }}
          contentStyle={{ paddingVertical: 0 }}
          each={visibleFonts()}
          keyExtractor={(name) => name}
          empty={
            <Text style={{ fontSize: 12, color: colors().ink3, padding: 8 }}>
              {t("settings.font.empty")}
            </Text>
          }
        >
          {(name) => {
            // 行会被复用给别的字体，所有取值都必须走 name()，不能捕获成常量。
            const selected = () => fontFamily() === name();
            return (
              <View
                role="button"
                testID="font-option"
                onPress={() => {
                  applyFontFamily(name());
                  menuOpen.set(false);
                }}
                style={{
                  height: 32,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  marginBottom: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: selected() ? colors().accentSoft : "transparent",
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: selected() ? colors().accent : colors().ink,
                    fontFamily: name(),
                  }}
                  numberOfLines={1}
                >
                  {name()}
                </Text>
                <If when={selected()}>
                  <Icon name="check" color={colors().accent} size={13} />
                </If>
              </View>
            );
          }}
        </List>
      </View>
    </Popover>
  );
}

function LocalePicker() {
  const menuOpen = signal(false);

  return (
    <Popover
      open={menuOpen()}
      onOpenChange={(next) => menuOpen.set(next)}
      placement="bottom"
      align="start"
      offset={6}
      popupStyle={{
        width: 240,
        padding: 6,
        gap: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors().thread,
        backgroundColor: colors().editor,
      }}
      trigger={
        <View
          role="button"
          testID="locale-select"
          accessibilityLabel={t("settings.locale")}
          style={{
            height: 32,
            paddingHorizontal: 10,
            borderRadius: 7,
            borderWidth: 1,
            borderColor: colors().thread,
            backgroundColor: colors().list,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{ flex: 1, fontSize: 13, fontWeight: "500", color: colors().ink }}
            numberOfLines={1}
          >
            {localeName(localePref())}
          </Text>
          <Icon name="caret-down" color={colors().ink3} size={14} />
        </View>
      }
    >
      <View testID="locale-options" style={{ gap: 2 }}>
        <Each of={LOCALES}>
          {(row) => {
            const item = row();
            const selected = () => localePref() === item.id;
            return (
              <View
                role="button"
                testID={`locale-${item.id}`}
                onPress={() => {
                  setLocalePref(item.id);
                  void saveLocale(item.id);
                  menuOpen.set(false);
                }}
                style={{
                  height: 30,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: selected() ? colors().accentSoft : "transparent",
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: selected() ? colors().accent : colors().ink,
                  }}
                  numberOfLines={1}
                >
                  {item.key ? t(item.key) : item.label}
                </Text>
                <If when={selected()}>
                  <Icon name="check" color={colors().accent} size={13} />
                </If>
              </View>
            );
          }}
        </Each>
      </View>
    </Popover>
  );
}

/** 设置 sheet：即时写入 prefs；× / Esc / 遮罩均可关闭。 */
export function SettingsSheet(props: Props) {
  const close = () => props.onClose();
  const formatLineHeight = () => String(Number(fontLineHeight().toFixed(2)));

  effect(() => {
    if (props.tab === "font") loadSystemFonts();
  });

  return (
    <Dialog
      open={props.open}
      testID="settings-dialog"
      onOpenChange={(open) => {
        if (!open) close();
      }}
      onCancel={close}
      onClose={close}
      closeOnBackdropPress
      closeOnEscape
      animation="fade"
      backdropStyle={{ backgroundColor: "rgba(44,42,38,0.28)" }}
      backdropTestID="settings-backdrop"
      style={{
        width: SHEET_WIDTH,
        height: SHEET_HEIGHT,
        margin: "auto",
        alignSelf: "center",
        borderRadius: 12,
        backgroundColor: colors().paper,
        borderWidth: 1,
        borderColor: colors().thread,
        overflow: "hidden",
        flexDirection: "column",
      }}
    >
      <View
        style={{
          height: 56,
          flexShrink: 0,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors().thread,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 17,
            fontWeight: "650",
            letterSpacing: -0.26,
            color: colors().ink,
          }}
        >
          {t("settings.title")}
        </Text>
        <Button
          testID="settings-close"
          accessibilityLabel={t("settings.close")}
          onPress={close}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeStyle={{ opacity: 0.7 }}
        >
          <Icon name="x" color={colors().ink2} size={16} />
        </Button>
      </View>

      <View style={{ flex: 1, flexDirection: "row", minHeight: 0 }}>
        <View
          style={{
            width: 148,
            flexShrink: 0,
            backgroundColor: colors().sidebar,
            borderRightWidth: 1,
            borderRightColor: colors().thread,
            paddingVertical: 12,
            paddingHorizontal: 10,
            gap: 2,
          }}
        >
          <Each of={TABS}>
            {(tab) => {
              const item = tab();
              const on = () => props.tab === item.id;
              return (
                <View
                  role="button"
                  testID={`settings-tab-${item.id}`}
                  onPress={() => props.onTab(item.id)}
                  style={{
                    height: 32,
                    borderRadius: 7,
                    paddingHorizontal: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: on() ? colors().accentSoft : "transparent",
                    borderLeftWidth: on() ? 1 : 0,
                    borderLeftColor: on() ? colors().accent : "transparent",
                  }}
                >
                  <Icon
                    name={item.icon}
                    color={on() ? colors().accent : colors().ink2}
                    size={15}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "500",
                      color: colors().ink,
                    }}
                  >
                    {t(item.labelKey)}
                  </Text>
                </View>
              );
            }}
          </Each>
        </View>

        <Scroll style={{ flex: 1 }} contentStyle={{ padding: 18, paddingBottom: 22 }}>
          <View style={{ gap: 22 }}>
            <If when={props.tab === "appearance"}>
              <View style={{ gap: 22 }}>
                <View style={{ gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      letterSpacing: -0.14,
                      color: colors().ink,
                    }}
                  >
                    {t("settings.theme")}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: colors().ink2, lineHeight: 18 }}>
                    {t("settings.theme.desc")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    <Each of={THEMES}>
                      {(row) => <ThemeCard item={row()} />}
                    </Each>
                  </View>
                </View>

                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      letterSpacing: -0.14,
                      color: colors().ink,
                    }}
                  >
                    {t("settings.locale")}
                  </Text>
                  <View style={{ width: 240 }}>
                    <LocalePicker />
                  </View>
                </View>
              </View>
            </If>

            <If when={props.tab === "font"}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: "600",
                      letterSpacing: -0.14,
                      color: colors().ink,
                    }}
                  >
                    {t("settings.font")}
                  </Text>
                  <Button
                    testID="font-reset"
                    accessibilityLabel={t("settings.font.reset")}
                    disabled={isDefaultTypography()}
                    disabledStyle={{ opacity: 0.4 }}
                    onPress={resetTypography}
                    style={{
                      height: 26,
                      paddingHorizontal: 9,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: colors().thread,
                      backgroundColor: colors().list,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    activeStyle={{ opacity: 0.7 }}
                  >
                    <Text style={{ fontSize: 12.5, color: colors().ink2 }}>
                      {t("settings.font.reset")}
                    </Text>
                  </Button>
                </View>
                <Text style={{ fontSize: 12.5, color: colors().ink2, lineHeight: 18 }}>
                  {t("settings.font.desc")}
                </Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text
                      style={{
                        width: 72,
                        fontSize: 13,
                        fontWeight: "500",
                        color: colors().ink2,
                      }}
                    >
                      {t("settings.font.family")}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <FontPicker />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text
                      style={{
                        width: 72,
                        fontSize: 13,
                        fontWeight: "500",
                        color: colors().ink2,
                      }}
                    >
                      {t("settings.font.size")}
                    </Text>
                    <Stepper
                      testID="font-size"
                      value={String(fontSize())}
                      disabledDec={fontSize() <= FONT_SIZE_MIN}
                      disabledInc={fontSize() >= FONT_SIZE_MAX}
                      onDec={() => applyFontSize(fontSize() - 1)}
                      onInc={() => applyFontSize(fontSize() + 1)}
                    />
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text
                      style={{
                        width: 72,
                        fontSize: 13,
                        fontWeight: "500",
                        color: colors().ink2,
                      }}
                    >
                      {t("settings.font.lineHeight")}
                    </Text>
                    <Stepper
                      testID="font-line"
                      value={formatLineHeight()}
                      disabledDec={fontLineHeight() <= LINE_HEIGHT_MIN}
                      disabledInc={fontLineHeight() >= LINE_HEIGHT_MAX}
                      onDec={() => applyFontLineHeight(fontLineHeight() - LINE_HEIGHT_STEP)}
                      onInc={() => applyFontLineHeight(fontLineHeight() + LINE_HEIGHT_STEP)}
                    />
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 10,
                    padding: 14,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: colors().thread,
                    backgroundColor: colors().editor,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "510",
                      color: colors().ink3,
                      marginBottom: 8,
                      letterSpacing: 0.11,
                    }}
                  >
                    {t("settings.font.previewLabel")}
                  </Text>
                  <Text
                    style={{
                      fontSize: fontSize(),
                      lineHeight: lineHeightPx(),
                      fontFamily: previewFontFamily(),
                      color: colors().ink,
                    }}
                  >
                    {t("settings.font.preview")}
                  </Text>
                </View>
              </View>
            </If>

            <If when={props.tab === "sync"}>
              <SyncSettings
                open={props.open}
                vaultRoot={props.vaultRoot}
                onOpenVault={props.onOpenVault}
                onSyncNow={props.onSyncNow}
                onManageConflicts={props.onManageConflicts}
              />
            </If>
          </View>
        </Scroll>
      </View>
    </Dialog>
  );
}
