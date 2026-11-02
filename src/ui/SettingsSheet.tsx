import { uiTextSize, uiLineHeight, uiControlHeight } from "./typography";
import { Image, List, Scroll, Text, View, cleanup, effect, keymap, signal } from "nsh";
import { Button, Input, Popover, Radio, RadioGroup } from "nsh/base";
import { titleBar } from "nsh/desktop";
import { WINDOW_BAR_HEIGHT } from "./Toolbar";
import { APP_LOGOS, applyAppLogo, appLogo, logoAsset } from "./appLogo";
import { Icon, type IconName } from "./Icon";
import { applyRenderMode, renderMode, type RenderMode } from "./documentAppearance";
import { controlFocusStyle, controlHoverStyle, controlPressStyle, chromeColors } from "./chrome";
import { localePref, setLocalePref, t, type LocalePref } from "./i18n";
import { saveLocale } from "./prefs";
import { storageBusy } from "../storage/state";
import { SyncSettings } from "./SyncSettings";
import { THEMES, applyTheme, colors, themeId, type ThemePreset } from "./theme";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  UI_FONT_SIZE_MIN,
  UI_FONT_SIZE_MAX,
  EDITOR_FONT_SIZE_MIN,
  EDITOR_FONT_SIZE_MAX,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_STEP,
  applyFontFamily,
  applyFontLineHeight,
  applyFontSize,
  applyUiFontSize,
  applyEditorFontSize,
  uiFontSize,
  editorFontSize,
  fontFamily,
  fontLineHeight,
  fontSize,
  isDefaultTypography,
  lineHeightPx,
  loadSystemFonts,
  documentFontFamily,
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
  onBeforeMigration?: () => Promise<void>;
  onStorageActivated?: (root: string) => Promise<void>;
  onSyncNow?: () => void;
  onManageConflicts?: () => void;
};

const TABS: { id: SettingsTab; labelKey: string; icon: IconName }[] = [
  { id: "appearance", labelKey: "settings.appearance", icon: "palette" },
  { id: "font", labelKey: "settings.font", icon: "text-t" },
  { id: "sync", labelKey: "storage.title", icon: "folder" },
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

const SETTINGS_SIDEBAR_WIDTH = 188;
const CONTENT_MAX_WIDTH = 760;
const THEME_CARD_WIDTH = 168;
const LOGO_CARD_WIDTH = 168;

function localeName(id: LocalePref): string {
  const item = LOCALES.find((row) => row.id === id);
  if (!item) return String(id);
  return item.key ? t(item.key) : item.label;
}

function RenderModePicker() {
  const modes: RenderMode[] = ["color", "monochrome"];
  return (
    <RadioGroup
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
    >
      <Each of={modes}>
        {(row) => {
          const mode = row();
          const selected = () => renderMode() === mode;
          return (
            <Radio
              testID={`render-mode-${mode}`}
              accessibilityLabel={t(`settings.renderMode.${mode}`)}
              checked={selected()}
              onChange={() => applyRenderMode(mode)}
              style={{
                width: LOGO_CARD_WIDTH,
                height: uiControlHeight(64),
                flexDirection: "row",
                gap: 10,
                paddingHorizontal: 10,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: selected() ? colors().accent : colors().thread,
                backgroundColor: selected() ? colors().accentSoft : colors().list,
                alignItems: "center",
              }}
              hoverStyle={controlHoverStyle()}
              focusStyle={controlFocusStyle()}
              activeStyle={controlPressStyle()}
            >
              <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={mode === "color" ? "palette" : "text-t"} color={mode === "color" ? colors().accent : colors().ink} size={26} />
              </View>
              <Text style={{ flex: 1, minWidth: 0, fontSize: uiTextSize(12.5), fontWeight: selected() ? "600" : "500", color: colors().ink }}>
                {t(`settings.renderMode.${mode}`)}
              </Text>
              <View style={{ width: 13, flexShrink: 0 }}>
                <If when={selected()}>
                  <Icon name="check" color={colors().accent} size={13} />
                </If>
              </View>
            </Radio>
          );
        }}
      </Each>
    </RadioGroup>
  );
}

function ThemeCard(props: { item: ThemePreset }) {
  const on = () => themeId() === props.item.id;
  return (
    <View
      role="button"
      testID={`theme-${props.item.id}`}
      accessibilityLabel={props.item.name}
      onPress={() => {
        applyTheme(props.item.id);
        // 图标有浅色 / 暗色两版，主题明暗变化后同步 Dock 图标。
        applyAppLogo(appLogo());
      }}
      style={{
        width: THEME_CARD_WIDTH,
        height: uiControlHeight(44),
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
          fontSize: uiTextSize(12.5),
          fontWeight: "560",
          letterSpacing: -0.12,
          color: colors().ink,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {props.item.name}
      </Text>
    </View>
  );
}

function LogoCard(props: { item: (typeof APP_LOGOS)[number] }) {
  const on = () => appLogo() === props.item.id;
  return (
    <View
      role="button"
      testID={`logo-${props.item.id}`}
      accessibilityLabel={t(props.item.nameKey)}
      onPress={() => applyAppLogo(props.item.id)}
      style={{
        width: LOGO_CARD_WIDTH,
        height: uiControlHeight(64),
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 10,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: on() ? colors().accent : colors().thread,
        backgroundColor: on() ? colors().accentSoft : colors().list,
      }}
    >
      <Image
        src={logoAsset(props.item)}
        resizeMode="contain"
        style={{ width: 40, height: 40, borderRadius: 9 }}
      />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text
          style={{
            fontSize: uiTextSize(12.5),
            fontWeight: "560",
            letterSpacing: -0.12,
            color: colors().ink,
          }}
          numberOfLines={1}
        >
          {t(props.item.nameKey)}
        </Text>
        <If when={props.item.id === "thread"}>
          <Text style={{ fontSize: uiTextSize(11.5), color: colors().ink3 }} numberOfLines={1}>
            {t("settings.logo.default")}
          </Text>
        </If>
      </View>
      <If when={on()}>
        <Icon name="check" color={colors().accent} size={13} />
      </If>
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
    height: uiControlHeight(30),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  });
  return (
    <View
      testID={props.testID}
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: uiControlHeight(32),
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
        <Text style={{ fontSize: uiTextSize(15), color: colors().ink2 }}>−</Text>
      </Button>
      <View
        style={{
          width: 52,
          height: uiControlHeight(30),
          alignItems: "center",
          justifyContent: "center",
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: colors().thread,
        }}
      >
        <Text
          testID={`${props.testID}-value`}
          style={{ fontSize: uiTextSize(13), fontWeight: "560", color: colors().ink }}
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
        <Text style={{ fontSize: uiTextSize(15), color: colors().ink2 }}>+</Text>
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
  const listHeight = () => Math.min(238, Math.max(34, visibleFonts().length * (uiControlHeight(32) + 2)));

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
            height: uiControlHeight(32),
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
              fontSize: uiTextSize(13),
              fontWeight: "500",
              color: colors().ink,
              fontFamily: documentFontFamily(),
            }}
            numberOfLines={1}
          >
            {documentFontFamily()}
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
            height: uiControlHeight(30),
            paddingHorizontal: 8,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors().thread,
            backgroundColor: colors().list,
            fontSize: uiTextSize(13),
            color: colors().ink,
          }}
        />
        <View
          role="button"
          testID="font-option-default"
          onPress={() => {
            applyFontFamily("");
            menuOpen.set(false);
          }}
          style={{
            height: uiControlHeight(32),
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
              fontSize: uiTextSize(13),
              color: defaultSelected() ? colors().accent : colors().ink,
            }}
            numberOfLines={1}
          >
            {t("settings.font.defaultOption", { font: documentFontFamily() })}
          </Text>
          <If when={defaultSelected()}>
            <Icon name="check" color={colors().accent} size={13} />
          </If>
        </View>
        <List
          testID="font-options"
          style={{ height: listHeight() }}
          estimatedItemSize={uiControlHeight(32) + 2}
          contentStyle={{ paddingVertical: 0 }}
          each={visibleFonts()}
          keyExtractor={(name) => name}
          empty={
            <Text style={{ fontSize: uiTextSize(12), color: colors().ink3, padding: 8 }}>
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
                  height: uiControlHeight(32),
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
                    fontSize: uiTextSize(13),
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
            height: uiControlHeight(32),
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
            style={{ flex: 1, fontSize: uiTextSize(13), fontWeight: "500", color: colors().ink }}
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
                  height: uiControlHeight(30),
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
                    fontSize: uiTextSize(13),
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

/** 独立设置窗口的内容；标题栏、窗口按钮与调整大小由 AppKit 管理。 */
export function SettingsSheet(props: Props) {
  const close = () => {
    if (storageBusy()) return;
    props.onClose();
  };
  const formatLineHeight = () => String(Number(fontLineHeight().toFixed(2)));

  effect(() => {
    if (props.tab === "font") loadSystemFonts();
  });

  effect(() => {
    if (!props.open) return;
    const offEscape = keymap.bind("escape", close);
    const offClose = keymap.bind("mod+w", close);
    cleanup(() => {
      offEscape();
      offClose();
    });
  });

  return (
    <If when={props.open}>
      <View
        testID="settings-window"
        accessibilityLabel={t("settings.title")}
        style={{ flex: 1, flexDirection: "column", minHeight: 0, backgroundColor: colors().paper }}
      >
        <View
          testID="settings-window-bar"
          desktop={{ windowDrag: true }}
          style={{
            height: Math.max(titleBar().height, WINDOW_BAR_HEIGHT),
            flexShrink: 0,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors().sidebar,
            backgroundImage: chromeColors().shellFinish,
          }}
        >
          <View style={{ width: titleBar().left + 8, flexShrink: 0 }} />
          <View style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
            <Text numberOfLines={1} style={{ fontSize: uiTextSize(13), fontWeight: "600", color: colors().ink2 }}>{t("settings.title")}</Text>
          </View>
          <View style={{ width: titleBar().left + 8, flexShrink: 0 }} />
        </View>
        <View style={{ flex: 1, flexDirection: "row", minHeight: 0 }}>
        <View
          style={{
            width: SETTINGS_SIDEBAR_WIDTH,
            flexShrink: 0,
            backgroundColor: colors().sidebar,
            borderRightWidth: 1,
            borderRightColor: colors().thread,
            paddingTop: 12,
            paddingBottom: 12,
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
                  onPress={() => { if (!storageBusy()) props.onTab(item.id); }}
                  style={{
                    height: uiControlHeight(32),
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
                      fontSize: uiTextSize(13),
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

        <Scroll
          style={{ flex: 1 }}
          contentStyle={{ paddingHorizontal: 28, paddingTop: 24, paddingBottom: 32 }}
        >
          <View style={{ gap: 22, width: "100%", maxWidth: CONTENT_MAX_WIDTH }}>
            <If when={props.tab === "appearance"}>
              <View style={{ gap: 22 }}>
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: uiTextSize(14), fontWeight: "600", color: colors().ink }}>
                    {t("settings.renderMode")}
                  </Text>
                  <RenderModePicker />
                  <Text style={{ fontSize: uiTextSize(12.5), color: colors().ink2, lineHeight: uiLineHeight(18) }}>
                    {t("settings.renderMode.desc")}
                  </Text>
                </View>
                <View style={{ gap: 4 }}>
                  <Text
                    style={{
                      fontSize: uiTextSize(14),
                      fontWeight: "600",
                      letterSpacing: -0.14,
                      color: colors().ink,
                    }}
                  >
                    {t("settings.theme")}
                  </Text>
                  <Text style={{ fontSize: uiTextSize(12.5), color: colors().ink2, lineHeight: uiLineHeight(18) }}>
                    {t("settings.theme.desc")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    <Each of={THEMES}>
                      {(row) => <ThemeCard item={row()} />}
                    </Each>
                  </View>
                </View>

                <View style={{ gap: 4 }}>
                  <Text
                    style={{
                      fontSize: uiTextSize(14),
                      fontWeight: "600",
                      letterSpacing: -0.14,
                      color: colors().ink,
                    }}
                  >
                    {t("settings.logo")}
                  </Text>
                  <Text style={{ fontSize: uiTextSize(12.5), color: colors().ink2, lineHeight: uiLineHeight(18) }}>
                    {t("settings.logo.desc")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    <Each of={APP_LOGOS}>
                      {(row) => <LogoCard item={row()} />}
                    </Each>
                  </View>
                </View>

                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: uiTextSize(14),
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
                      fontSize: uiTextSize(14),
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
                      height: uiControlHeight(26),
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
                    <Text style={{ fontSize: uiTextSize(12.5), color: colors().ink2 }}>
                      {t("settings.font.reset")}
                    </Text>
                  </Button>
                </View>
                <Text style={{ fontSize: uiTextSize(12.5), color: colors().ink2, lineHeight: uiLineHeight(18) }}>
                  {t("settings.font.desc")}
                </Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ flex: 1, color: colors().ink2, fontSize: uiTextSize(13) }}>
                      {t("settings.font.interfaceSize")}
                    </Text>
                    <Stepper
                      testID="ui-font-size"
                      value={String(uiFontSize())}
                      disabledDec={uiFontSize() <= UI_FONT_SIZE_MIN}
                      disabledInc={uiFontSize() >= UI_FONT_SIZE_MAX}
                      onDec={() => applyUiFontSize(uiFontSize() - 1)}
                      onInc={() => applyUiFontSize(uiFontSize() + 1)}
                    />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ flex: 1, color: colors().ink2, fontSize: uiTextSize(13) }}>
                      {t("settings.font.editorSize")}
                    </Text>
                    <Stepper
                      testID="editor-font-size"
                      value={String(editorFontSize())}
                      disabledDec={editorFontSize() <= EDITOR_FONT_SIZE_MIN}
                      disabledInc={editorFontSize() >= EDITOR_FONT_SIZE_MAX}
                      onDec={() => applyEditorFontSize(editorFontSize() - 1)}
                      onInc={() => applyEditorFontSize(editorFontSize() + 1)}
                    />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text
                      style={{
                        width: 72,
                        fontSize: uiTextSize(13),
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

                  <Text style={{ fontSize: uiTextSize(13), fontWeight: "600", color: colors().ink, marginTop: 12 }}>
                    {t("settings.font.reading")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text
                      style={{
                        width: 72,
                        fontSize: uiTextSize(13),
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
                        fontSize: uiTextSize(13),
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
                      fontSize: uiTextSize(11),
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
                      fontFamily: documentFontFamily(),
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
                onBeforeMigration={props.onBeforeMigration}
                onStorageActivated={props.onStorageActivated}
                onSyncNow={props.onSyncNow}
                onManageConflicts={props.onManageConflicts}
              />
            </If>
          </View>
        </Scroll>
        </View>
      </View>
    </If>
  );
}
