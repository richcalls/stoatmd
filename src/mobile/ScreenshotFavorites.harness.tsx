import { Storage, mount } from "nsh";
import { MobileShell } from "./MobileShell";
import { mobileLibrary } from "./library";
import { screenshotAllVault } from "./screenshotAllVault";
import { restoreLocale } from "../ui/i18n";
import { restoreTheme } from "../ui/theme";
import { restoreTypography } from "../ui/typography";

const memory = screenshotAllVault();

// 收藏是本机偏好：截图前先写入一条，收藏 Tab 才有内容可看。
void Promise.all([restoreLocale(), restoreTheme(), restoreTypography()]).then(async () => {
  await Storage.setItem("prefs.favorites", JSON.stringify(["工作/项目计划.md"]));
  mount(() => <MobileShell library={mobileLibrary(memory.vault)} initialTab="favorites" />);
});
