import { Text, View } from "nsh";
import { Dialog } from "nsh/base";
import { locale, setLocale, t, type Locale } from "./i18n";
import { applyAppearanceForTheme, colors, themeId, type ThemeId } from "./theme";

export type SettingsTab = "appearance" | "font" | "sync";

type Props = {
  open: boolean;
  tab: SettingsTab;
  onTab: (tab: SettingsTab) => void;
  onClose: () => void;
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

/** 设置 sheet：外观 / 字体 / 同步（无 MCP；同步仅占位）。 */
export function SettingsSheet(props: Props) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      closeOnBackdropPress
      closeOnEscape
      backdropStyle={{ backgroundColor: "rgba(44,42,38,0.28)" }}
      style={{
        width: 720,
        maxHeight: 780,
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
            const on = props.tab === item.id;
            return (
              <View
                role="button"
                onPress={() => props.onTab(item.id)}
                style={{
                  height: 32,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  justifyContent: "center",
                  backgroundColor: on ? colors().accentSoft : "transparent",
                  borderLeftWidth: on ? 1 : 0,
                  borderLeftColor: on ? colors().accent : "transparent",
                }}
              >
                <Text style={{ fontSize: 13, color: on ? colors().accent : colors().ink }}>
                  {t(item.labelKey)}
                </Text>
              </View>
            );
          }}
        </Each>
      </View>

      <View style={{ flex: 1, padding: 20, gap: 16 }}>
        <If when={props.tab === "appearance"}>
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors().ink }}>
              {t("settings.theme")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Each of={THEMES}>
                {(row) => {
                  const item = row();
                  const on = themeId() === item.id;
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
                        borderColor: on ? colors().accent : colors().thread,
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
                  const on = locale() === item.id;
                  return (
                    <View
                      role="button"
                      onPress={() => setLocale(item.id)}
                      style={{
                        paddingHorizontal: 12,
                        height: 30,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: on ? colors().accent : colors().thread,
                        backgroundColor: on ? colors().accentSoft : "transparent",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: on ? colors().accent : colors().ink }}>
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
              {t("settings.font.family")}: 系统 UI · {t("settings.font.size")} 15 ·{" "}
              {t("settings.font.lineHeight")} 1.75
            </Text>
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
              <Text style={{ fontSize: 15, lineHeight: 26, color: colors().ink }}>
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
            <Text style={{ fontSize: 13, color: colors().ink2, lineHeight: 22 }}>{t("sync.off")}</Text>
            <Text style={{ fontSize: 13, color: colors().ink3, lineHeight: 22 }}>
              {t("sync.later")}
            </Text>
          </View>
        </If>
      </View>
    </Dialog>
  );
}
