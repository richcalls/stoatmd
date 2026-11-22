import { colors, isDarkTheme } from "./theme";

/** Shared hover/selection ease: state styles run in the native host. */
export const motion = {
  transitionProperty: "background-color, opacity",
  transitionDuration: 120,
  transitionTimingFunction: "ease-out",
} as const;

/** Shared window controls. State styles run in the native host, including focus. */
export const iconButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 6,
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
  panelShadow: isDarkTheme()
    ? "0 1px 3px rgba(0,0,0,0.18)"
    : "0 1px 3px rgba(0,0,0,0.06)",
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
