import { mount } from "nsh";
import { MobileShell } from "./MobileShell";
import { restoreLocale } from "../ui/i18n";
import { restoreTheme } from "../ui/theme";
import { restoreTypography } from "../ui/typography";

void Promise.all([restoreLocale(), restoreTheme(), restoreTypography()]).then(() => {
  mount(() => <MobileShell />);
});
