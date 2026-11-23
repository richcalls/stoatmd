import { colors, isDarkTheme } from "./theme";

/**
 * 界面尺寸 token，取自 Obsidian 主题 Baseline 的默认值：小圆角 8、中圆角 16，
 * 状态过渡 160ms。颜色不在这里，由主题决定。
 */
export const RADIUS_S = 8;
export const RADIUS_M = 16;

/** Shared hover/selection ease: state styles run in the native host. */
export const motion = {
  transitionProperty: "background-color, opacity",
  transitionDuration: 160,
  transitionTimingFunction: "ease-out",
} as const;

/** Shared window controls. State styles run in the native host, including focus. */
export const iconButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: RADIUS_S,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  ...motion,
} as const;

/** Neutral window chrome follows the current theme; accent is reserved for focus. */
export const chromeColors = () => ({
  hover: isDarkTheme() ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  pressed: isDarkTheme() ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
  selection: isDarkTheme() ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.075)",
  field: isDarkTheme() ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
  panelEdge: isDarkTheme() ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
  // Baseline 的 shadow-s：一圈极淡描边加两层很近的阴影，比单层阴影更像一块放在桌面上的纸。
  panelShadow: isDarkTheme()
    ? "0 0 0 1px rgba(255,255,255,0.07), 0 8px 24px rgba(0,0,0,0.1), 0 4px 12px -4px rgba(0,0,0,0.35)"
    : "0 0 0 1px rgba(0,0,0,0.05), 0 2px 2px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.025)",
  shellFinish: isDarkTheme()
    ? "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)"
    : "linear-gradient(180deg, rgba(255,255,255,0.35), transparent)",
});

export const controlHoverStyle = () => ({ backgroundColor: chromeColors().hover });
export const controlPressStyle = () => ({ backgroundColor: chromeColors().pressed });
// An inset ring keeps the focus visible inside clipped lists without shifting content.
export const controlFocusStyle = () => ({
  outlineWidth: 2,
  outlineOffset: -2,
  outlineColor: colors().accent,
});

export const segmentStyle = (selected: boolean) => ({
  backgroundColor: selected ? colors().paper : "transparent",
  boxShadow: selected
    ? isDarkTheme()
      ? "0 1px 3px rgba(0, 0, 0, 0.3)"
      : "0 1px 3px rgba(0, 0, 0, 0.1)"
    : "none",
});
