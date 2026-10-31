import { platform } from "nsh";

/** Match the platform's document find conventions in both menus and key bindings. */
export function findShortcuts() {
  const apple = platform.os === "macos" || platform.os === "ios";
  return {
    open: "mod+f",
    next: apple ? "mod+g" : "f3",
    previous: apple ? "mod+shift+g" : "shift+f3",
  };
}

export type FindAction = "open" | "next" | "previous";
export type FindRequest = { id: number; action: FindAction };
