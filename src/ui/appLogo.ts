import { signal, type ImageAsset } from "nsh";
import { AppIcon } from "stoatmd/native";
import logoAgileDark from "../../assets/app-logos/agile-dark.png";
import logoAgile from "../../assets/app-logos/agile.png";
import logoThreadDark from "../../assets/app-logos/thread-dark.png";
import logoThread from "../../assets/app-logos/thread.png";
import { loadSavedAppLogo, saveAppLogo } from "./prefs";
import { isDarkTheme } from "./theme";

export type AppLogoId = "thread" | "agile";

type AppLogoOption = {
  id: AppLogoId;
  src: ImageAsset;
  srcDark: ImageAsset;
  nameKey: string;
};

/** 两套品牌方向：A 织线白鼬（默认）、C 敏捷剪影；各有浅色 / 暗色版本。 */
export const APP_LOGOS: readonly AppLogoOption[] = [
  {
    id: "thread",
    src: logoThread,
    srcDark: logoThreadDark,
    nameKey: "settings.logo.thread",
  },
  {
    id: "agile",
    src: logoAgile,
    srcDark: logoAgileDark,
    nameKey: "settings.logo.agile",
  },
];

/** 当前主题明暗对应的图标版本。 */
export function logoAsset(item: (typeof APP_LOGOS)[number]): ImageAsset {
  return isDarkTheme() ? item.srcDark : item.src;
}

export const appLogo = signal<AppLogoId>("thread");

function isAppLogoId(value: string): value is AppLogoId {
  return value === "thread" || value === "agile";
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
  applyAppLogo(saved !== null && isAppLogoId(saved) ? saved : "thread");
}
