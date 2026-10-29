import { mount } from "nsh";
import { MacShell } from "./src/ui/MacShell";
import { restoreLocale } from "./src/ui/i18n";
import { restoreTheme } from "./src/ui/theme";
import { restoreTypography, loadSystemFonts } from "./src/ui/typography";

loadSystemFonts();

void (async () => {
  try {
    await Promise.all([restoreLocale(), restoreTheme(), restoreTypography()]);
  } finally {
    mount(App);
  }
})();

function App() {
  return <MacShell />;
}
