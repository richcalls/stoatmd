#!/usr/bin/env python3
"""Screenshots for StoatMD website-v1 — needs HTTP (ES module / iframe)."""
from __future__ import annotations

import http.server
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "shots"
OUT.mkdir(exist_ok=True)
PORT = 8788
BASE = f"http://127.0.0.1:{PORT}"

VIEWPORTS = [
    (1440, 900, 1, "desktop"),
    (390, 844, 2, "mobile"),
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):  # noqa: A003
        pass


def start_server():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def wait_threads_ready(page, timeout_ms: int = 20000) -> None:
    """Wait until <pro-threads> iframe has class ready (first frame drawn)."""
    page.wait_for_function(
        """() => {
          const host = document.getElementById('heroThreads');
          if (!host || !host.classList.contains('is-on')) return false;
          const el = host.querySelector('pro-threads');
          if (!el || !el.shadowRoot) return false;
          const iframe = el.shadowRoot.querySelector('iframe');
          return !!(iframe && iframe.classList.contains('ready'));
        }""",
        timeout=timeout_ms,
    )
    # Extra settle after fade-in / first paint
    page.wait_for_timeout(2500)


def main() -> None:
    server = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path="/usr/bin/google-chrome",
                args=["--no-sandbox", "--disable-dev-shm-usage"],
            )
            for w, h, scale, name in VIEWPORTS:
                for theme in ("dark",):
                    page = browser.new_page(
                        viewport={"width": w, "height": h},
                        device_scale_factor=scale,
                        color_scheme=theme,
                    )
                    q = "lang=zh"
                    q += "&threadsT=4"
                    page.goto(f"{BASE}/index.html?{q}", wait_until="networkidle")
                    page.wait_for_timeout(400)
                    page.evaluate("document.fonts && document.fonts.ready")
                    if True:
                        try:
                            wait_threads_ready(page)
                        except Exception as exc:  # noqa: BLE001
                            print("WARN threads ready:", exc)
                            page.wait_for_timeout(5000)
                    else:
                        page.wait_for_timeout(500)
                    out = OUT / f"{name}-zh-{theme}.png"
                    page.screenshot(path=str(out), full_page=True, type="png")
                    print("wrote", out, out.stat().st_size)
                    page.close()

            # Hero viewport only (desktop 1440×900, not full_page)
            for theme in ("dark",):
                page = browser.new_page(
                    viewport={"width": 1440, "height": 900},
                    device_scale_factor=1,
                    color_scheme=theme,
                )
                q = "lang=zh"
                q += "&threadsT=4"
                page.goto(f"{BASE}/index.html?{q}", wait_until="networkidle")
                page.wait_for_timeout(400)
                page.evaluate("document.fonts && document.fonts.ready")
                if True:
                    try:
                        wait_threads_ready(page)
                    except Exception as exc:  # noqa: BLE001
                        print("WARN hero threads ready:", exc)
                        page.wait_for_timeout(5000)
                else:
                    page.wait_for_timeout(500)
                out = OUT / f"hero-zh-{theme}.png"
                page.screenshot(path=str(out), full_page=False, type="png")
                print("wrote", out, out.stat().st_size)
                page.close()

            browser.close()
    finally:
        server.shutdown()
    print("done")


if __name__ == "__main__":
    main()
