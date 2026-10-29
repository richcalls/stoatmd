import { mount } from "nsh";
import { MacShell } from "./src/ui/MacShell";
import { restoreLocale } from "./src/ui/i18n";
import { restoreTheme } from "./src/ui/theme";

void restoreLocale();
void restoreTheme();

function App() {
  return <MacShell />;
}

mount(App);
