import { colors, isDarkTheme } from "./theme";

/** Shared window controls. State styles run in the native host, including focus. */
export const iconButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 6,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
} as const;

/** Neutral window chrome follows the current theme; accent is reserved for focus. */
export const chromeColors = () => ({
  hover: isDarkTheme() ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.035)",
  pressed: isDarkTheme() ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
  selection: isDarkTheme() ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.78)",
  selectionEdge: isDarkTheme() ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)",
  panelEdge: isDarkTheme() ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
  panelShadow: isDarkTheme()
    ? "0 1px 3px rgba(0,0,0,0.18)"
    : "0 1px 3px rgba(0,0,0,0.04)",
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
