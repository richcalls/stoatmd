import { platform, signal, type ImageAsset } from "nsh";
import { AppIcon } from "stoatmd/native";
import logoAgileDark from "../../assets/app-logos/agile-dark.png";
import logoAgile from "../../assets/app-logos/agile.png";
import logoHeadADark from "../../assets/app-logos/head-a-dark.png";
import logoHeadA from "../../assets/app-logos/head-a.png";
import logoHeadBDark from "../../assets/app-logos/head-b-dark.png";
import logoHeadB from "../../assets/app-logos/head-b.png";
import logoHeadDDark from "../../assets/app-logos/head-d-dark.png";
import logoHeadD from "../../assets/app-logos/head-d.png";
import logoThreadDark from "../../assets/app-logos/thread-dark.png";
import logoThread from "../../assets/app-logos/thread.png";
import iosThread from "../../assets/ios/AppIcon.png";
import iosThreadDark from "../../assets/ios/AppIcon-dark.png";
import iosAgile from "../../assets/ios/agile.png";
import iosAgileDark from "../../assets/ios/agile-dark.png";
import iosHeadA from "../../assets/ios/head-a.png";
import iosHeadB from "../../assets/ios/head-b.png";
import iosHeadD from "../../assets/ios/head-d.png";
import { loadSavedAppLogo, saveAppLogo } from "./prefs";
import { isDarkTheme } from "./theme";

export type AppLogoId = "thread" | "agile" | "head-a" | "head-b" | "head-d";

type AppLogoOption = {
  id: AppLogoId;
  src: ImageAsset;
  srcDark: ImageAsset;
  ios: ImageAsset;
  iosDark: ImageAsset;
  nameKey: string;
};

/** 品牌方向：织线白鼬（默认）、敏捷剪影，外加头像组 A/B/D 草案；各有浅色 / 暗色版本。 */
export const APP_LOGOS: readonly AppLogoOption[] = [
  {
    id: "thread",
    src: logoThread,
    srcDark: logoThreadDark,
    ios: iosThread,
    iosDark: iosThreadDark,
    nameKey: "settings.logo.thread",
  },
  {
    id: "agile",
    src: logoAgile,
    srcDark: logoAgileDark,
    ios: iosAgile,
    iosDark: iosAgileDark,
    nameKey: "settings.logo.agile",
  },
  {
    id: "head-a",
    src: logoHeadA,
    srcDark: logoHeadADark,
    ios: iosHeadA,
    iosDark: iosHeadA,
    nameKey: "settings.logo.head-a",
  },
  {
    id: "head-b",
    src: logoHeadB,
    srcDark: logoHeadBDark,
    ios: iosHeadB,
    iosDark: iosHeadB,
    nameKey: "settings.logo.head-b",
  },
  {
    id: "head-d",
    src: logoHeadD,
    srcDark: logoHeadDDark,
    ios: iosHeadD,
    iosDark: iosHeadD,
    nameKey: "settings.logo.head-d",
  },
];

/** 当前主题明暗对应的图标版本。 */
export function logoAsset(item: (typeof APP_LOGOS)[number]): ImageAsset {
  if (platform.os === "ios") return isDarkTheme() ? item.iosDark : item.ios;
  return isDarkTheme() ? item.srcDark : item.src;
}

export const appLogo = signal<AppLogoId>("thread");
export const appLogoBusy = signal(false);
export const appLogoError = signal("");

/** 使用 UIKit 的应用图标接口；失败时保留当前选择与偏好。 */
export async function selectMobileAppLogo(id: AppLogoId): Promise<void> {
  if (appLogoBusy() || appLogo() === id) return;
  appLogoBusy.set(true);
  appLogoError.set("");
  try {
    await AppIcon.selectIos(id);
    appLogo.set(id);
    await saveAppLogo(id);
  } catch (error) {
    appLogoError.set(String(error));
  } finally {
    appLogoBusy.set(false);
  }
}

function isAppLogoId(value: string): value is AppLogoId {
  return APP_LOGOS.some((item) => item.id === value);
}

/** 立即切换 Dock 图标并写入偏好。 */
export function applyAppLogo(id: AppLogoId) {
  appLogo.set(id);
  void saveAppLogo(id);
  try {
    AppIcon.set(id, isDarkTheme());
  } catch {
    // 非 macOS 宿主没有应用图标，设置面板仍保留选择
  }
}

/** 启动时恢复上次选择的图标（无效值回落到默认）。 */
export async function restoreAppLogo(): Promise<void> {
  let saved: string | null = null;
  try {
    saved = await loadSavedAppLogo();
  } catch {
    // 偏好读取失败时按默认图标启动
  }
  const id = saved !== null && isAppLogoId(saved) ? saved : "thread";
  // iOS 保留系统已选的备用图标；启动只恢复界面，切换由用户点击触发。
  if (platform.os === "ios") appLogo.set(id);
  else applyAppLogo(id);
}
