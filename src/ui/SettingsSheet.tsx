import { Scroll, Text, View, effect, signal } from "nsh";
import { Button, Dialog, Input, Popover } from "nsh/base";
import { Icon } from "./Icon";
import { localePref, setLocalePref, t, type LocalePref } from "./i18n";
import { saveLocale } from "./prefs";
import { THEMES, applyTheme, colors, themeId, type ThemePreset } from "./theme";
import {
  FONT_SIZES,
  LINE_HEIGHTS,
  applyFontFamily,
  applyFontLineHeight,
  applyFontSize,
  fontFamily,
  fontFamilyName,
  fontLineHeight,
  fontSize,
  lineHeightPx,
  loadSystemFonts,
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
};

const TABS: { id: SettingsTab; labelKey: string }[] = [
  { id: "appearance", labelKey: "settings.appearance" },
  { id: "font", labelKey: "settings.font" },
  { id: "sync", labelKey: "settings.sync" },
];

const LOCALES: { id: LocalePref; key: string }[] = [
  { id: "system", key: "settings.locale.system" },
  { id: "zh", key: "settings.locale.zh" },
  { id: "en", key: "settings.locale.en" },
];

const LIGHT_THEMES = THEMES.filter((theme) => theme.mode === "light");
const DARK_THEMES = THEMES.filter((theme) => theme.mode === "dark");

const SHEET_WIDTH = 720;
const SHEET_HEIGHT = 540;

function OptionChip(props: {
  testID?: string;
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <View
      role="button"
      testID={props.testID}
      onPress={props.onPress}
      style={{
        paddingHorizontal: 12,
        height: 30,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: props.active ? colors().accent : colors().thread,
        backgroundColor: props.active ? colors().accentSoft : "transparent",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 13, color: props.active ? colors().accent : colors().ink }}>
        {props.label}
      </Text>
    </View>
  );
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
        width: 158,
        height: 42,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: on() ? colors().accent : colors().thread,
        backgroundColor: on() ? colors().accentSoft : "transparent",
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: props.item.palette.paper,
          borderWidth: 1,
          borderColor: props.item.palette.thread,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: props.item.palette.accent,
          }}
        />
      </View>
      <Text style={{ fontSize: 12, color: colors().ink, flex: 1 }} numberOfLines={1}>
        {t(props.item.nameKey)}
      </Text>
      <If when={on()}>
        <Icon name="check" color={colors().accent} size={13} />
      </If>
    </View>
  );
}

/** 字体下拉：触发条 + 搜索 + 系统字体列表。 */
function FontPicker() {
  const menuOpen = signal(false);
  const query = signal("");

  const matches = (name: string): boolean => {
    const q = query().trim().toLowerCase();
    return q === "" || name.toLowerCase().includes(q);
  };

  const systemSelected = () => fontFamily() === "";
  const visibleCount = () => systemFonts().filter(matches).length;
  const listHeight = () => Math.min(256, Math.max(32, visibleCount() * 32));

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
            height: 34,
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
              color: colors().ink,
              fontFamily: fontFamilyName(),
            }}
            numberOfLines={1}
          >
            {fontFamily() || t("settings.font.systemDefault")}
          </Text>
          <Icon name="caret-down" color={colors().ink3} size={12} />
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
          testID="font-option-system"
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
            backgroundColor: systemSelected() ? colors().accentSoft : "transparent",
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              color: systemSelected() ? colors().accent : colors().ink,
            }}
            numberOfLines={1}
          >
            {t("settings.font.systemDefault")}
          </Text>
          <If when={systemSelected()}>
            <Icon name="check" color={colors().accent} size={13} />
          </If>
        </View>
        <Scroll testID="font-options" style={{ height: listHeight() }}>
          <View style={{ gap: 2 }}>
            <Each of={systemFonts()} key="index">
              {(name, index) => {
                const family = name();
                const selected = () => fontFamily() === family;
                return (
                  <If when={matches(family)}>
                    <View
                      role="button"
                      testID={`font-option-${index()}`}
                      onPress={() => {
                        applyFontFamily(family);
                        menuOpen.set(false);
                      }}
                      style={{
                        height: 32,
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
                          fontFamily: family,
                        }}
                        numberOfLines={1}
                      >
                        {family}
                      </Text>
                      <If when={selected()}>
                        <Icon name="check" color={colors().accent} size={13} />
                      </If>
                    </View>
                  </If>
                );
              }}
            </Each>
          </View>
        </Scroll>
      </View>
    </Popover>
  );
}

/** 设置 sheet：即时写入 prefs；× / Esc / 遮罩 / 完成 均可关闭。 */
export function SettingsSheet(props: Props) {
  const close = () => props.onClose();

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
        backgroundColor: colors().editor,
        borderWidth: 1,
        borderColor: colors().thread,
        overflow: "hidden",
        flexDirection: "row",
      }}
    >
      <View
        style={{
          width: 168,
          backgroundColor: colors().sidebar,
          borderRightWidth: 1,
          borderRightColor: colors().thread,
          paddingVertical: 16,
          paddingHorizontal: 10,
          gap: 4,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: colors().ink,
            paddingHorizontal: 8,
            marginBottom: 8,
          }}
        >
          {t("settings.title")}
        </Text>
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
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  backgroundColor: on() ? colors().accentSoft : "transparent",
                  borderLeftWidth: on() ? 1 : 0,
                  borderLeftColor: on() ? colors().accent : "transparent",
                }}
              >
                <Text style={{ fontSize: 13, color: on() ? colors().accent : colors().ink }}>
                  {t(item.labelKey)}
                </Text>
              </View>
            );
          }}
        </Each>
      </View>

      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
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

        <View style={{ flex: 1, gap: 12 }}>
          <If when={props.tab === "appearance"}>
            <View style={{ gap: 12 }}>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors().ink3 }}>
                  {t("settings.theme.light")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <Each of={LIGHT_THEMES}>
                    {(row) => <ThemeCard item={row()} />}
                  </Each>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors().ink3 }}>
                  {t("settings.theme.dark")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <Each of={DARK_THEMES}>
                    {(row) => <ThemeCard item={row()} />}
                  </Each>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors().ink }}>
                  {t("settings.locale")}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Each of={LOCALES}>
                    {(row) => {
                      const item = row();
                      return (
                        <OptionChip
                          testID={`locale-${item.id}`}
                          active={localePref() === item.id}
                          label={t(item.key)}
                          onPress={() => {
                            setLocalePref(item.id);
                            void saveLocale(item.id);
                          }}
                        />
                      );
                    }}
                  </Each>
                </View>
              </View>
            </View>
          </If>

          <If when={props.tab === "font"}>
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink }}>
                {t("settings.font.family")}
              </Text>
              <FontPicker />

              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink, marginTop: 2 }}>
                {t("settings.font.size")}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Each of={FONT_SIZES}>
                  {(row) => (
                    <OptionChip
                      testID={`font-size-${row()}`}
                      active={fontSize() === row()}
                      label={String(row())}
                      onPress={() => applyFontSize(row())}
                    />
                  )}
                </Each>
              </View>

              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink, marginTop: 2 }}>
                {t("settings.font.lineHeight")}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Each of={LINE_HEIGHTS}>
                  {(row) => (
                    <OptionChip
                      testID={`font-line-${row()}`}
                      active={fontLineHeight() === row()}
                      label={String(row())}
                      onPress={() => applyFontLineHeight(row())}
                    />
                  )}
                </Each>
              </View>

              <View
                style={{
                  marginTop: 6,
                  padding: 14,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors().thread,
                  backgroundColor: colors().list,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize(),
                    lineHeight: lineHeightPx(),
                    fontFamily: fontFamilyName(),
                    color: colors().ink,
                  }}
                >
                  {t("settings.font.preview")}
                </Text>
              </View>
            </View>
          </If>

          <If when={props.tab === "sync"}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink }}>
                {t("settings.sync")}
              </Text>
              <Text style={{ fontSize: 13, color: colors().ink2, lineHeight: 22 }}>
                {t("sync.off")}
              </Text>
              <Text style={{ fontSize: 13, color: colors().ink3, lineHeight: 22 }}>
                {t("sync.later")}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink, marginTop: 12 }}>
                {t("vault.section")}
              </Text>
              <Text style={{ fontSize: 12, color: colors().ink3, lineHeight: 18 }}>
                {props.vaultRoot ? props.vaultRoot : t("vault.none")}
              </Text>
              <If when={!!props.onOpenVault}>
                <View
                  role="button"
                  onPress={props.onOpenVault}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 4,
                    paddingHorizontal: 12,
                    height: 30,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: colors().thread,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, color: colors().ink }}>{t("vault.open")}</Text>
                </View>
              </If>
            </View>
          </If>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Button
            testID="settings-done"
            accessibilityLabel={t("settings.done")}
            onPress={close}
            style={{
              paddingHorizontal: 16,
              height: 32,
              borderRadius: 8,
              backgroundColor: colors().accent,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeStyle={{ opacity: 0.85 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "560", color: "#FFFFFF" }}>
              {t("settings.done")}
            </Text>
          </Button>
        </View>
      </View>
    </Dialog>
  );
}
