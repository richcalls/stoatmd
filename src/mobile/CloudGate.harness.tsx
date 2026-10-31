import { mount } from "nsh";
import { fixSyncConfigForTest } from "../sync/config";
import { restoreLocale } from "../ui/i18n";
import { MobileShell } from "./MobileShell";

fixSyncConfigForTest({ googleClientId: "", googleClientSecret: "", dropboxAppKey: "", dropboxAppSecret: "",
  dropboxRedirectPort: 53682, purchaseRequired: true, configPath: "" });
void restoreLocale().then(() => mount(MobileShell));
