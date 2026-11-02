import { MAC_DOWNLOAD_URL, RELEASES_URL } from "../lib/download";

/**
 * Download CTAs follow the visitor's OS:
 * - macOS: start the signed DMG download directly.
 * - iOS: point at the download section; the app is not listed yet.
 * - Windows / Linux / other: open the Releases page; builds are not out yet.
 * The server-rendered default is the macOS link, so no-JS visitors still get
 * a working download.
 */
type Mode = "mac" | "soon" | "ios";

const ua = navigator.userAgent;
const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
const platform = nav.userAgentData?.platform || "";

const isIPadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
const isIOS = /iPhone|iPad|iPod/i.test(ua) || isIPadOS;
const isMac = !isIOS && (/mac/i.test(platform) || /Macintosh|Mac OS X/i.test(ua));
const isWindows = /win/i.test(platform) || /Windows/i.test(ua);
const isLinux = /linux/i.test(platform) || (/Linux/i.test(ua) && !/Android/i.test(ua));

const mode: Mode = isMac ? "mac" : isIOS ? "ios" : "soon";

function apply(): void {
  for (const cta of document.querySelectorAll<HTMLAnchorElement>(
    "[data-download-cta]",
  )) {
    const label = cta.querySelector<HTMLElement>("[data-download-label]");
    if (mode === "mac") {
      cta.href = cta.dataset.macUrl || MAC_DOWNLOAD_URL;
      cta.removeAttribute("target");
      cta.removeAttribute("rel");
      if (label) label.textContent = cta.dataset.macLabel || "";
    } else if (mode === "ios") {
      cta.href = cta.dataset.iosUrl || "#download";
      cta.removeAttribute("target");
      cta.removeAttribute("rel");
      if (label) label.textContent = cta.dataset.iosLabel || "";
    } else {
      cta.href = cta.dataset.soonUrl || RELEASES_URL;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      if (label) label.textContent = cta.dataset.soonLabel || "";
    }
    cta.dataset.downloadPlatform = mode;
  }

  document.documentElement.dataset.os = isMac
    ? "macos"
    : isIOS
      ? "ios"
      : isWindows
        ? "windows"
        : isLinux
          ? "linux"
          : "other";
}

apply();
