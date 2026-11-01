import { mount } from "nsh";
import { MobileShell } from "./MobileShell";
import { mobileLibrary } from "./library";
import { screenshotAllVault } from "./screenshotAllVault";
import { restoreLocale } from "../ui/i18n";
import { restoreTheme } from "../ui/theme";
import { restoreTypography } from "../ui/typography";

const memory = screenshotAllVault();

void Promise.all([restoreLocale(), restoreTheme(), restoreTypography()]).then(() => {
  mount(() => <MobileShell library={mobileLibrary(memory.vault)} initialTab="favorites" />);
});
