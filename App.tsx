import { mount } from "nsh";
import { restoreAppLogo } from "./src/ui/appLogo";
import { MacShell } from "./src/ui/MacShell";
import { restoreLocale } from "./src/ui/i18n";
import { restoreSettingsWindowFrame } from "./src/ui/settingsWindow";
import { restoreTheme } from "./src/ui/theme";
import { restoreTypography, loadSystemFonts } from "./src/ui/typography";

loadSystemFonts();

void (async () => {
  try {
    // 先恢复主题，应用图标要按主题明暗选浅色 / 暗色版本。
    await Promise.all([
      restoreLocale(),
      restoreTheme(),
      restoreTypography(),
      restoreSettingsWindowFrame(),
    ]);
    await restoreAppLogo();
  } catch {
    // 偏好读取失败时按默认值启动
  } finally {
    mount(App);
  }
})();

function App() {
  return <MacShell />;
}
