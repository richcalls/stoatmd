import { mount } from "nsh";
import { fixSyncConfigForTest } from "../sync/config";
import { restoreRenderMode } from "../ui/documentAppearance";
import { restoreLocale } from "../ui/i18n";
import { MobileShell } from "./MobileShell";

fixSyncConfigForTest({ googleClientId: "", googleClientSecret: "", dropboxAppKey: "", dropboxAppSecret: "",
  dropboxRedirectPort: 53682, purchaseRequired: true, configPath: "" });
void Promise.all([restoreLocale(), restoreRenderMode()]).then(() => mount(MobileShell));
