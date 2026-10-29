import { Text, View, signal } from "nsh";
import { Button, Dialog } from "nsh/base";
import { Icon } from "./Icon";
import { locale, setLocale, t, type Locale } from "./i18n";
import { saveFontLineHeight, saveFontSize, saveLocale } from "./prefs";
import { applyAppearanceForTheme, colors, themeId, type ThemeId } from "./theme";

export type SettingsTab = "appearance" | "font" | "sync";

type Props = {
  open: boolean;
  tab: SettingsTab;
  onTab: (tab: SettingsTab) => void;
  onClose: () => void;
  vaultRoot?: string | null;
  onOpenVault?: () => void;
};

const THEMES: { id: ThemeId; labelKey: string; swatch: string; disabled?: boolean }[] = [
  { id: "weave-paper", labelKey: "settings.theme.weavePaper", swatch: "#F7F3EB" },
  { id: "pure-white", labelKey: "settings.theme.pureWhite", swatch: "#FFFFFF", disabled: true },
  { id: "warm-charcoal", labelKey: "settings.theme.warmCharcoal", swatch: "#1C1A18" },
];

const TABS: { id: SettingsTab; labelKey: string }[] = [
  { id: "appearance", labelKey: "settings.appearance" },
  { id: "font", labelKey: "settings.font" },
  { id: "sync", labelKey: "settings.sync" },
];

const LOCALES: { id: Locale; key: string }[] = [
  { id: "zh", key: "settings.locale.zh" },
  { id: "en", key: "settings.locale.en" },
];

const FONT_SIZES = ["14", "15", "16", "18"];
const LINE_HEIGHTS = ["1.5", "1.75", "2"];

const SHEET_WIDTH = 720;
const SHEET_HEIGHT = 520;

/** 设置 sheet：即时写入 prefs；× / Esc / 遮罩 / 完成 均可关闭。 */
export function SettingsSheet(props: Props) {
  const fontSize = signal("15");
  const lineHeight = signal("1.75");
  const close = () => props.onClose();

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
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink }}>
                {t("settings.theme")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <Each of={THEMES}>
                  {(row) => {
                    const item = row();
                    const on = () => themeId() === item.id;
                    return (
                      <View
                        role="button"
                        onPress={() => {
                          if (!item.disabled) applyAppearanceForTheme(item.id);
                        }}
                        style={{
                          width: 148,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: on() ? colors().accent : colors().thread,
                          opacity: item.disabled ? 0.45 : 1,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: item.swatch,
                            borderWidth: 1,
                            borderColor: colors().thread,
                          }}
                        />
                        <Text style={{ fontSize: 12, color: colors().ink, flex: 1 }}>
                          {t(item.labelKey)}
                        </Text>
                      </View>
                    );
                  }}
                </Each>
              </View>

              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink, marginTop: 8 }}>
                {t("settings.locale")}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Each of={LOCALES}>
                  {(row) => {
                    const item = row();
                    const on = () => locale() === item.id;
                    return (
                      <View
                        role="button"
                        onPress={() => {
                          setLocale(item.id);
                          void saveLocale(item.id);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          height: 30,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: on() ? colors().accent : colors().thread,
                          backgroundColor: on() ? colors().accentSoft : "transparent",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: on() ? colors().accent : colors().ink }}>
                          {t(item.key)}
                        </Text>
                      </View>
                    );
                  }}
                </Each>
              </View>
            </View>
          </If>

          <If when={props.tab === "font"}>
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink }}>
                {t("settings.font")}
              </Text>
              <Text style={{ fontSize: 13, color: colors().ink2 }}>
                {t("settings.font.family")}: 系统 UI
              </Text>
              <Text style={{ fontSize: 13, color: colors().ink2 }}>{t("settings.font.size")}</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Each of={FONT_SIZES}>
                  {(row) => {
                    const size = row();
                    const on = () => fontSize() === size;
                    return (
                      <View
                        role="button"
                        onPress={() => {
                          fontSize.set(size);
                          void saveFontSize(size);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          height: 30,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: on() ? colors().accent : colors().thread,
                          backgroundColor: on() ? colors().accentSoft : "transparent",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: on() ? colors().accent : colors().ink }}>
                          {size}
                        </Text>
                      </View>
                    );
                  }}
                </Each>
              </View>
              <Text style={{ fontSize: 13, color: colors().ink2 }}>
                {t("settings.font.lineHeight")}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Each of={LINE_HEIGHTS}>
                  {(row) => {
                    const lh = row();
                    const on = () => lineHeight() === lh;
                    return (
                      <View
                        role="button"
                        onPress={() => {
                          lineHeight.set(lh);
                          void saveFontLineHeight(lh);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          height: 30,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: on() ? colors().accent : colors().thread,
                          backgroundColor: on() ? colors().accentSoft : "transparent",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 13, color: on() ? colors().accent : colors().ink }}>
                          {lh}
                        </Text>
                      </View>
                    );
                  }}
                </Each>
              </View>
              <View
                style={{
                  marginTop: 8,
                  padding: 14,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors().thread,
                  backgroundColor: colors().list,
                }}
              >
                <Text
                  style={{
                    fontSize: Number(fontSize()),
                    lineHeight: Math.round(Number(fontSize()) * Number(lineHeight())),
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
