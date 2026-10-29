import { mount } from "nsh";
import { MacShell } from "./src/ui/MacShell";
import { restoreLocale } from "./src/ui/i18n";

void restoreLocale();

function App() {
  return <MacShell />;
}

mount(App);
