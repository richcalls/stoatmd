import { mount } from "nsh";
import { MobileShell } from "./MobileShell";
import { mobileLibrary } from "./library";
import { memoryVault } from "./testVault";
import { restoreLocale } from "../ui/i18n";
import { restoreTheme } from "../ui/theme";
import { restoreTypography } from "../ui/typography";

const memory = memoryVault();
memory.files.clear();
void Promise.all([restoreLocale(), restoreTheme(), restoreTypography()]).then(() => {
  mount(() => <MobileShell library={mobileLibrary(memory.vault)} />);
});
