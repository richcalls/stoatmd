#!/usr/bin/env python3
"""Generate Cream×Glass screens 04–12 + file tree + favorites + full board."""
from pathlib import Path

ROOT = Path('/workspace/stoatmd/ios-v1-polish')

# Append screen-specific CSS once (idempotent marker)
CSS_MARKER = '/* —— rest screens: editor / reader / onboarding / conflict / settings / tree —— */'
EXTRA_CSS = r'''/* —— rest screens: editor / reader / onboarding / conflict / settings / tree —— */

/* Doc chrome — Liquid Glass back / trailing; mid title stays quiet type */
.doc-nav-float {
  position: absolute; top: 0; left: 0; right: 0; z-index: 20;
  padding: 0 14px 8px; pointer-events: none;
}
.doc-nav-float > * { pointer-events: auto; }
.doc-nav-row {
  display: flex; align-items: center; gap: 8px; min-height: 44px;
}
.doc-nav-left {
  flex: 0 0 auto; min-width: 72px;
  display: flex; align-items: center; justify-content: flex-start;
}
.doc-nav-right {
  flex: 0 0 auto; min-width: 72px;
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
}
.doc-back {
  display: inline-flex; align-items: center; gap: 1px;
  height: 36px; padding: 0 12px 0 8px;
  font-size: 15px; font-weight: 510; color: var(--accent);
  letter-spacing: -0.2px;
}
.doc-back .icon { width: 18px; height: 18px; stroke-width: 2; }
.doc-title-stack {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px;
}
.doc-title-mid {
  width: 100%; text-align: center;
  font-size: 15px; font-weight: 600; letter-spacing: -0.3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: var(--ink);
}
.doc-save-hint {
  font-size: 11px; font-weight: 500; letter-spacing: -0.05px;
  color: var(--ink-3); line-height: 1.1;
}
.doc-edit-btn {
  height: 36px; padding: 0 14px;
  display: inline-flex; align-items: center;
  font-size: 15px; font-weight: 510; color: var(--accent);
  letter-spacing: -0.25px;
}
.doc-nav-right .gbtn.solo {
  width: 40px; height: 40px;
  color: var(--sys-label);
}
.doc-mode-btn { color: var(--accent) !important; }

/* Editor source */
.doc-body {
  flex: 1; min-height: 0; overflow: hidden;
  padding: 58px 18px 8px;
  display: flex; flex-direction: column;
}
.doc-body.reader-mode { padding: 56px 24px 96px; }
.source {
  flex: 1; min-height: 0; overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, "SF Mono", monospace;
  font-size: 13.5px; line-height: 1.75; letter-spacing: -0.1px;
  color: var(--ink); white-space: pre-wrap; word-break: break-word;
}
.source .md-h { color: var(--accent); font-weight: 500; }
.source .md-mark { color: var(--ink-3); opacity: 0.72; }
.source .md-b { font-weight: 500; }
.source .md-quote { color: #4F6B4F; }
.source .md-code {
  color: #3D3D3A;
  background: #F0EEE6;
  border-radius: 3px; padding: 1px 4px;
}
.source .md-em { font-style: italic; }
.source .md-em-m { color: var(--ink-3); opacity: 0.72; }
.source .md-li { color: var(--ink-3); }
.phone.dark .source .md-quote,
.phone.nord .source .md-quote { color: #8FAF8F; }
.phone.dark .source .md-code,
.phone.nord .source .md-code {
  color: #C4A484;
  background: color-mix(in srgb, var(--ink) 12%, transparent);
}
.doc-info {
  display: flex; gap: 12px; padding: 6px 2px 8px;
  font-size: 11px; color: var(--ink-3); letter-spacing: -0.05px;
}

/* Format bar — Liquid Glass accessory strip (chrome only) */
.format-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 2px; height: 46px; padding: 0 6px; margin: 0 12px 8px;
  border-radius: 16px;
  background: var(--glass-fill-strong);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow), 0 0 0 0.5px color-mix(in srgb, var(--glass-stroke) 80%, transparent);
  border: 0.5px solid var(--glass-stroke);
  position: relative;
}
.format-bar::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.72), inset 0 0 0 0.5px var(--glass-stroke-dark);
}
.format-bar span {
  flex: 1; height: 36px; display: grid; place-items: center;
  font-size: 14px; font-weight: 600; color: var(--ink);
  border-radius: 10px; position: relative; z-index: 1;
}
.format-bar span .icon { width: 17px; height: 17px; }
.kbd {
  background: color-mix(in srgb, var(--surface-2) 92%, var(--ink) 3%);
  padding: 8px 6px 10px;
  border-top: 0;
}
.kbd-row { display: flex; gap: 5px; justify-content: center; margin-bottom: 7px; }
.kbd-row span {
  flex: 1; height: 42px; border-radius: 7px;
  display: grid; place-items: center;
  background: var(--surface); color: var(--ink);
  font-size: 16px; font-weight: 420;
  box-shadow: 0 1px 0 rgba(44,42,38,0.10), inset 0 0 0 0.5px rgba(255,255,255,0.5);
}
.phone.dark .kbd-row span,
.phone.nord .kbd-row span {
  background: #2A2723;
  box-shadow: 0 1px 0 rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.06);
}
.kbd-row:nth-child(2) { padding: 0 14px; }
.kbd-row .wide { flex: 1.4; font-size: 12px; background: color-mix(in srgb, var(--ink) 6%, var(--surface)); }
.kbd-row .space { flex: 4.2; font-size: 12px; }

/* Reader — Mac Kami article typography (serif · weight 500 · lh 1.55) */
.reader {
  flex: 1; min-height: 0; overflow: hidden;
  font-family: "Songti SC", "STSong", "Source Han Serif SC", "Noto Serif CJK SC", Charter, Georgia, serif;
  font-size: 15px; line-height: 1.55; letter-spacing: 0.3px;
  font-weight: 400; color: var(--ink);
  font-synthesis: none;
}
.reader h1,
.reader h2,
.reader h3 {
  font-family: inherit;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.3px;
  font-synthesis: none;
}
.reader h1 {
  font-size: 29px; /* phone slight scale of Mac 31; ratio held */
  line-height: 1.2;
  margin: 2px 0 14px;
}
.reader h2 {
  font-size: 21px; /* ~ Mac 23 */
  line-height: 1.25;
  margin: 28px 0 10px;
}
.reader h3 {
  font-size: 18px; /* ~ Mac 19 */
  line-height: 1.3;
  margin: 22px 0 8px;
}
.reader p { margin: 0 0 12px; }
.reader blockquote {
  margin: 16px 0;
  padding: 0 16px;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ink-2);
  font-style: italic;
  font-size: 15px;
  line-height: 1.55;
  letter-spacing: 0.3px;
}
.reader ul, .reader ol { padding-left: 22px; margin: 0 0 12px; }
.reader li { margin: 3px 0; line-height: 1.55; }
.reader li::marker { color: var(--ink-3); }
.reader strong { font-weight: 500; color: var(--ink); }
.reader em { font-style: italic; }
.reader code {
  font-family: "SF Mono", Menlo, ui-monospace, monospace;
  font-size: 13px;
  color: #3D3D3A;
  background: #F0EEE6;
  border-radius: 3px;
  padding: 1px 4px;
  letter-spacing: 0;
}
.phone.nord .reader code {
  color: #C4A484;
  background: color-mix(in srgb, var(--ink) 12%, transparent);
}

/* Quiet Liquid Glass reader dock — 目录 / 字数 / A */
.reader-dock {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 20;
  padding: 0 22px 22px; pointer-events: none;
}
.reader-dock > * { pointer-events: auto; }
.reader-bar {
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 0 20px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif;
}
.reader-bar .rb {
  font-size: 13px; font-weight: 510; color: var(--ink-2);
  letter-spacing: -0.1px;
}
.reader-bar .rb.count {
  font-variant-numeric: tabular-nums;
  color: var(--ink-3); font-weight: 500;
}
.reader-bar .rb.a {
  font-family: Charter, Georgia, "Noto Serif CJK SC", serif;
  font-size: 17px; font-weight: 500; color: var(--ink);
  min-width: 28px; text-align: center;
}

/* Nord / warm charcoal reader override (named Nord in brief; tokens = Warm Charcoal) */
.phone.nord {
  --paper: #1C1A18;
  --surface: #26231F;
  --surface-2: #24211E;
  --ink: #EDE9E3;
  --ink-2: #B0AAA2;
  --ink-3: #9A948C;
  --thread: #33302C;
  --indigo: #7A9CC0;
  --indigo-soft: #2A3340;
  --sys-bg: var(--paper);
  --sys-elevated: var(--surface);
  --sys-label: var(--ink);
  --sys-secondary: color-mix(in srgb, var(--ink-2) 90%, transparent);
  --sys-tertiary: color-mix(in srgb, var(--ink-3) 75%, transparent);
  --sys-separator: color-mix(in srgb, var(--thread) 85%, #fff 15%);
  --sys-fill: rgba(235, 235, 245, 0.14);
  --glass-fill: rgba(38, 35, 31, 0.58);
  --glass-fill-strong: rgba(48, 44, 39, 0.70);
  --glass-stroke: rgba(255, 255, 255, 0.14);
  --glass-stroke-dark: rgba(0, 0, 0, 0.35);
  --glass-shadow: 0 14px 34px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255,255,255,0.05) inset;
  --accent: var(--indigo);
  --accent-soft: var(--indigo-soft);
  background: var(--sys-bg);
  color: var(--sys-label);
}
.phone.nord .home { background: #fff; opacity: 0.85; }
.phone.nord .statusbar .island { background: #1C1C1E; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); }

/* Onboarding */

.onb {
  flex: 1; display: flex; flex-direction: column;
  padding: 18px 22px 28px; min-height: 0;
}
.onb .brand-l {
  display: flex; align-items: center; gap: 10px;
  font-size: 17px; font-weight: 650; letter-spacing: -0.35px;
  margin-bottom: 28px; color: var(--ink);
}
.onb .brand-l img {
  width: 32px; height: 32px; border-radius: 9px;
  box-shadow: 0 4px 12px rgba(44,42,38,0.12);
}
.onb .step {
  font: 600 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.12em; color: var(--ink-3); margin: 0 0 10px;
}
.onb h1 {
  margin: 0 0 10px; font-size: 28px; font-weight: 680;
  letter-spacing: -0.9px; line-height: 1.15;
}
.onb .sub {
  margin: 0 0 24px; font-size: 14px; color: var(--ink-2);
  line-height: 1.6; max-width: 34em;
}
.onb .sec-h {
  font-size: 12px; font-weight: 600; color: var(--ink-2);
  margin: 0 0 6px; letter-spacing: -0.1px;
}
.onb .hint {
  font-size: 12.5px; color: var(--ink-3); margin: 0 0 14px; line-height: 1.5;
}
.prov-card {
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(28px) saturate(155%);
  backdrop-filter: blur(28px) saturate(155%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(44, 42, 38, 0.05), inset 0 0.5px 0 var(--glass-stroke);
  border: 0.5px solid var(--glass-stroke);
}
.prov {
  display: flex; align-items: center; gap: 12px;
  min-height: 64px; padding: 12px 14px; position: relative;
}
.prov + .prov::before {
  content: ""; position: absolute; left: 54px; right: 0; top: 0; height: 1px;
  background: var(--thread);
}
.prov .glyph {
  width: 36px; height: 36px; border-radius: 10px;
  display: grid; place-items: center;
  background: var(--accent-soft); color: var(--accent);
  flex-shrink: 0;
}
.prov .glyph.drop { background: #E8F0FA; color: #0061FF; }
.prov .glyph.drive { background: #EAF3E8; color: #1A73E8; }
.prov .txt { flex: 1; min-width: 0; }
.prov .txt b { display: block; font-size: 16px; font-weight: 600; letter-spacing: -0.3px; }
.prov .txt small { display: block; font-size: 12.5px; color: var(--ink-2); margin-top: 2px; }
.prov .chev { color: var(--sys-tertiary); width: 16px; height: 16px; stroke-width: 2; }
.prov.on {
  background: color-mix(in srgb, var(--indigo-soft) 70%, var(--surface));
}
.prov.on .glyph { background: var(--accent); color: #fff; }
.prov .check { color: var(--accent); width: 18px; height: 18px; stroke-width: 2.2; }
.onb-foot {
  margin-top: auto; padding-top: 22px;
  display: flex; flex-direction: column; gap: 10px;
}
.btn-primary {
  height: 50px; border-radius: 14px; border: 0;
  background: var(--accent); color: #fff;
  font-size: 16px; font-weight: 620; letter-spacing: -0.3px;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--indigo) 30%, transparent);
}
.btn-ghost {
  height: 44px; border-radius: 14px; border: 0;
  background: transparent; color: var(--accent);
  font-size: 15px; font-weight: 560;
}

/* Conflict sheet over library blur */
.scrim {
  position: absolute; inset: 0; z-index: 50;
  background: rgba(44, 42, 38, 0.38);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  display: flex; align-items: flex-end;
}
.sheet {
  width: 100%;
  background: var(--glass-fill-strong);
  -webkit-backdrop-filter: blur(48px) saturate(170%);
  backdrop-filter: blur(48px) saturate(170%);
  border-radius: 22px 22px 0 0;
  padding: 10px 18px calc(22px + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -12px 40px rgba(44,42,38,0.16), inset 0 0.5px 0 var(--glass-stroke);
  border: 0.5px solid var(--glass-stroke);
  border-bottom: 0;
}
.sheet-handle {
  width: 36px; height: 5px; border-radius: 3px;
  background: color-mix(in srgb, var(--ink) 18%, transparent);
  margin: 2px auto 14px;
}
.sheet-h {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.sheet-h h2 {
  margin: 0; font-size: 18px; font-weight: 650; letter-spacing: -0.35px;
}
.sheet > p {
  margin: 0 0 14px; font-size: 13px; color: var(--ink-2); line-height: 1.55;
}
.choice {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px; border-radius: 14px; margin-bottom: 8px;
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  backdrop-filter: blur(18px) saturate(150%);
  border: 0.5px solid var(--glass-stroke);
  box-shadow: inset 0 0.5px 0 var(--glass-stroke);
}
.choice.pref {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--thread));
  background: var(--accent-soft);
}
.choice .ico {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: grid; place-items: center;
  background: var(--surface); color: var(--accent);
  box-shadow: inset 0 0 0 0.5px var(--thread);
}
.choice .ico .icon { width: 18px; height: 18px; }
.choice b { display: block; font-size: 14.5px; font-weight: 620; margin-bottom: 3px; letter-spacing: -0.2px; }
.choice small { display: block; font-size: 12px; color: var(--ink-2); line-height: 1.45; }

/* Settings */
.set-nav-float {
  position: absolute; top: 0; left: 0; right: 0; z-index: 20;
  padding: 0 14px 8px; pointer-events: none;
}
.set-nav-float > * { pointer-events: auto; }
.set-scroll {
  flex: 1; min-height: 0; overflow: hidden;
  padding: 52px 14px 28px;
  display: flex; flex-direction: column; gap: 16px;
}
.set-scroll > h1 {
  margin: 4px 2px 0; font-size: 28px; font-weight: 680; letter-spacing: -0.85px;
}
.set-scroll > .set-lead {
  margin: -8px 2px 0; font-size: 13px; color: var(--ink-2); line-height: 1.5;
}
.set-sec > h3 {
  margin: 0 6px 8px; font-size: 12.5px; font-weight: 600;
  color: var(--ink-2); letter-spacing: -0.08px;
}
.srow {
  display: flex; align-items: center; gap: 11px;
  min-height: 48px; padding: 8px 12px; position: relative;
}
.srow + .srow::before,
.themes + .srow::before {
  content: ""; position: absolute; left: 44px; right: 0; top: 0; height: 1px;
  background: var(--thread);
}
.srow .icon { color: var(--accent); width: 18px; height: 18px; }
.srow .main { flex: 1; min-width: 0; font-size: 15.5px; font-weight: 510; letter-spacing: -0.25px; }
.srow .main small {
  display: block; font-size: 12px; color: var(--ink-2); font-weight: 450; margin-top: 2px;
}
.srow .val { font-size: 14px; color: var(--ink-2); }
.srow .chev { color: var(--sys-tertiary); width: 14px; height: 14px; stroke-width: 2; }
.themes {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  padding: 4px 12px 12px;
}
.swatch {
  border-radius: 12px; overflow: hidden;
  border: 0.5px solid color-mix(in srgb, var(--thread) 80%, transparent);
  background: var(--paper);
}
.swatch.on {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--thread));
  box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--accent) 35%, transparent);
}
.swatch-art {
  height: 54px; padding: 8px;
  background: var(--sw, #FFFCF7); color: var(--si, #2C2A26);
  font: 500 9.5px/1.35 ui-monospace, Menlo, monospace;
}
.swatch-art .h { color: var(--sa, #3D5A80); font-weight: 700; margin-bottom: 3px; }
.swatch-art .m { color: var(--sm, #6E6860); }
.swatch-art .c { color: var(--sc, #8B5E3C); }
.swatch-lab {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 8px; font-size: 11px; font-weight: 560; color: var(--ink);
  background: var(--surface);
}
.swatch-lab .icon { width: 12px; height: 12px; color: var(--accent); }
.sync-line {
  display: flex; align-items: center; justify-content: space-between;
  margin: 8px 6px 0; font-size: 12.5px; color: var(--ink-2);
}
.sync-line .go {
  display: inline-flex; align-items: center; gap: 4px;
  color: var(--accent); font-weight: 600;
}
.sync-line .go .icon { width: 14px; height: 14px; }
.brand-foot {
  text-align: center; font-size: 12px; color: var(--ink-3);
  margin-top: 8px; letter-spacing: -0.1px;
}
.brand-foot b { color: var(--ink-2); font-weight: 620; }

/* File tree (全部 Tab) */
.tree-scroll {
  flex: 1; min-height: 0; overflow: hidden;
  padding: 52px 14px 100px;
  display: flex; flex-direction: column; gap: 10px;
}
.tree-path {
  display: flex; align-items: center; gap: 6px;
  padding: 0 4px; font-size: 12.5px; color: var(--ink-2); font-weight: 510;
}
.tree-path .sep { color: var(--ink-3); opacity: 0.7; }
.tree-path .curr { color: var(--ink); font-weight: 600; }
.tree-group { padding: 4px 0; }
.tree-row {
  display: flex; align-items: center; gap: 8px;
  min-height: 40px; padding: 4px 10px 4px 0;
  position: relative; border-radius: 10px;
}
.tree-row:hover { background: transparent; }
.tree-row .twist {
  width: 22px; height: 22px; display: grid; place-items: center;
  color: var(--ink-3); flex-shrink: 0;
}
.tree-row .twist .icon { width: 14px; height: 14px; stroke-width: 2; }
.tree-row .twist.empty { visibility: hidden; }
.tree-row .fg {
  width: 26px; height: 26px; border-radius: 7px;
  display: grid; place-items: center; flex-shrink: 0;
}
.tree-row .fg.folder { background: var(--accent-soft); color: var(--accent); }
.tree-row .fg.file {
  background: color-mix(in srgb, var(--ink) 6%, var(--surface));
  color: var(--ink-2);
}
.tree-row .fg .icon { width: 14px; height: 14px; }
.tree-row .name {
  flex: 1; min-width: 0;
  font-size: 14.5px; font-weight: 510; letter-spacing: -0.22px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tree-row .name.folder { font-weight: 590; }
.tree-row .meta {
  font-size: 11.5px; color: var(--ink-3);
  font-variant-numeric: tabular-nums; flex-shrink: 0;
}
.tree-row.md-file .name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 500; }
.tree-indent-1 { padding-left: 18px; }
.tree-indent-2 { padding-left: 36px; }
.tree-indent-3 { padding-left: 54px; }

/* Favorites (收藏夹 · upcoming) */
.fav-banner {
  display: flex; align-items: center; gap: 10px;
  margin: 2px 0 4px; padding: 10px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 72%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--glass-stroke) 90%, transparent);
  box-shadow: 0 1px 0 color-mix(in srgb, #fff 55%, transparent) inset;
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
}
.fav-banner .pill {
  flex-shrink: 0;
  height: 22px; padding: 0 9px;
  border-radius: 999px;
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 600; letter-spacing: -0.1px;
  color: var(--accent);
  background: var(--accent-soft);
}
.fav-banner .copy {
  flex: 1; min-width: 0;
  font-size: 12.5px; font-weight: 500; letter-spacing: -0.15px;
  color: var(--ink-2); line-height: 1.35;
}
.fav-banner .copy em {
  font-style: normal; color: var(--ink-3); font-weight: 500;
}
.note-row.fav { padding-left: 28px; }
.note-row.fav .star {
  position: absolute; left: 4px; top: 14px;
  width: 18px; height: 18px;
  color: color-mix(in srgb, var(--accent) 72%, #C4A484);
}
.note-row.fav .star .icon { width: 15px; height: 15px; fill: currentColor; stroke: none; }
.fav-empty {
  flex: 1; min-height: 220px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; text-align: center; padding: 24px 28px 40px;
}
.fav-empty .glyph {
  width: 52px; height: 52px; border-radius: 16px;
  display: grid; place-items: center;
  color: var(--accent);
  background: color-mix(in srgb, var(--surface) 78%, transparent);
  border: 0.5px solid color-mix(in srgb, var(--glass-stroke) 90%, transparent);
  box-shadow: 0 1px 0 color-mix(in srgb, #fff 50%, transparent) inset;
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}
.fav-empty .glyph .icon { width: 24px; height: 24px; fill: currentColor; stroke: none; }
.fav-empty h3 {
  margin: 6px 0 0; font-size: 17px; font-weight: 600; letter-spacing: -0.35px; color: var(--ink);
}
.fav-empty p {
  margin: 0; max-width: 260px;
  font-size: 13.5px; line-height: 1.45; color: var(--ink-2); font-weight: 500;
}
.fav-empty .soon {
  margin-top: 4px;
  height: 24px; padding: 0 11px; border-radius: 999px;
  display: inline-flex; align-items: center;
  font-size: 12px; font-weight: 600; letter-spacing: -0.1px;
  color: var(--accent); background: var(--accent-soft);
}

.grid.full {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px 18px;
}
'''

SVG = r'''<svg class="svg-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></symbol>
  <symbol id="i-back" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
  <symbol id="i-right" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></symbol>
  <symbol id="i-compose" viewBox="0 0 24 24"><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6M15.5 3.5l5 5M10 14l1-5L18.5 1.5a2.1 2.1 0 0 1 3 3L14 12z"/></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></symbol>
  <symbol id="i-folderplus" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM9 13h6m-3-3v6"/></symbol>
  <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.63.82 1.1 1.51 1.1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></symbol>
  <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></symbol>
  <symbol id="i-sync" viewBox="0 0 24 24"><path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/></symbol>
  <symbol id="i-pause" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></symbol>
  <symbol id="i-retry" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5l2 2m0-5v5h-5M20 12a8 8 0 0 1-14 5l-2-2m0 5v-5h5"/></symbol>
  <symbol id="i-cloud" viewBox="0 0 24 24"><path d="M7 18a5 5 0 1 1-1-9 6.5 6.5 0 0 1 12-1 5 5 0 1 1 1 10H7z"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2z"/></symbol>
  <symbol id="i-code" viewBox="0 0 24 24"><path d="m8 8-4 4 4 4m8-8 4 4-4 4"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h9M3 6h.01M3 12h.01M3 18h.01"/></symbol>
  <symbol id="i-link" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></symbol>
  <symbol id="i-keyboard" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h8"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></symbol>
  <symbol id="i-type" viewBox="0 0 24 24"><path d="M4 20 10 4h4l6 16M7.5 13h9"/><path d="M6 20h4m4 0h4"/></symbol>
  <symbol id="i-drive" viewBox="0 0 24 24"><path d="m12 3 8 14H4zM4 17h16"/><path d="m8.5 11 3.5 6 3.5-6"/></symbol>
  <symbol id="i-dropbox" viewBox="0 0 24 24"><path d="m6 3-5 4 5 4 6-4zm12 0 5 4-5 4-6-4zM6 11l-5 4 5 4 6-4zm12 0 5 4-5 4-6-4zM7 20l5 3 5-3"/></symbol>
  <symbol id="i-note" viewBox="0 0 24 24"><path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8m-8 4h6"/></symbol>
  <symbol id="i-device" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></symbol>
  <symbol id="i-both" viewBox="0 0 24 24"><path d="M8 7h11v12H8z"/><path d="M5 5h11v12H5z"/></symbol>
  <symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3 2 21h20z"/><path d="M12 10v5m0 3h.01"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.2 14.6 9l6.2.5-4.7 4 1.5 6.1L12 16.8 6.4 19.6 7.9 13.5 3.2 9.5 9.4 9z"/></symbol>
</defs></svg>'''

STATUS = '''<div class="statusbar"><span>9:41</span><div class="island"></div><div class="status-icons"><svg viewBox="0 0 17 12"><rect x="0" y="8" width="3" height="4" rx=".6"/><rect x="4.5" y="5.5" width="3" height="6.5" rx=".6"/><rect x="9" y="3" width="3" height="9" rx=".6"/><rect x="13.5" y=".5" width="3" height="11.5" rx=".6"/></svg><svg viewBox="0 0 18 14"><path d="M1 4a12 12 0 0 1 16 0l-1.8 2a9 9 0 0 0-12.4 0zm3.3 4a7 7 0 0 1 9.4 0l-2 2a4 4 0 0 0-5.4 0zM7 12l2 2 2-2a3 3 0 0 0-4 0"/></svg><span class="battery"></span></div></div>'''

HOME = '<div class="home"></div>'

def wrap(title, body, phone_cls='phone bare'):
    return f'''<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="liquid.css">
</head>
<body>
{SVG}
<div class="shot-page" id="page">
<div class="{phone_cls}">{STATUS}<div class="app">
{body}
</div>{HOME}</div>
</div>
</body>
</html>
'''

def doc_nav(back, title, edit_on=True):
    """Liquid Glass chrome: glass back + trailing.
    No segmented control. Reader: indigo「编辑」; Editor: book → reader; 「已保存」under mid title.
    """
    more = (
        '<span class="gbtn solo glass glass-capsule" aria-label="更多">'
        '<svg class="icon md" aria-hidden="true"><use href="#i-more"/></svg></span>'
    )
    if edit_on:
        title_block = (
            f'<div class="doc-title-stack">'
            f'<span class="doc-title-mid">{title}</span>'
            f'<span class="doc-save-hint">已保存</span>'
            f'</div>'
        )
        trailing = (
            '<span class="gbtn solo glass glass-capsule doc-mode-btn" aria-label="阅读">'
            '<svg class="icon md" aria-hidden="true"><use href="#i-book"/></svg></span>'
            + more
        )
    else:
        title_block = '<div class="doc-title-stack" aria-hidden="true"></div>'
        trailing = (
            '<span class="doc-edit-btn glass glass-capsule">编辑</span>'
            + more
        )
    return (
        '\n'
        '    <div class="doc-nav-float">\n'
        '      <div class="doc-nav-row">\n'
        '        <div class="doc-nav-left">\n'
        f'          <span class="doc-back glass glass-capsule"><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg>{back}</span>\n'
        '        </div>\n'
        f'        {title_block}\n'
        '        <div class="doc-nav-right">\n'
        f'          {trailing}\n'
        '        </div>\n'
        '      </div>\n'
        '    </div>\n'
    )



SOURCE = '''<div class="source"><span class="md-h"># 写作的框架</span>
<span class="md-h">## 为什么需要框架</span>
好的文章不是灵感的堆砌，而是<span class="md-mark">**</span><span class="md-b">结构</span><span class="md-mark">**</span>的展开。
框架让读者知道自己站在哪里，也让作者知道下一步写什么。

<span class="md-h">## 三个层次</span>
<span class="md-li">- </span><span class="md-mark">**</span><span class="md-b">骨架</span><span class="md-mark">**</span>：论点与顺序
<span class="md-li">- </span><span class="md-mark">**</span><span class="md-b">肌肉</span><span class="md-mark">**</span>：例证与细节
<span class="md-li">- </span><span class="md-mark">**</span><span class="md-b">皮肤</span><span class="md-mark">**</span>：语气与节奏

<span class="md-quote">&gt; 先写骨架，再填血肉。</span>
<span class="md-quote">&gt; 润色永远放在最后。</span>

在编辑器里用 <span class="md-code">Cmd + B</span> 加粗，用 <span class="md-em-m">*</span><span class="md-em">斜体</span><span class="md-em-m">*</span> 强调语气。

<span class="md-h">## 今日练习</span>
<span class="md-li">1. 用三句话概括主题</span>
<span class="md-li">2. 为每句补一个例子</span>
<span class="md-li">3. 删掉一半形容词</span></div>'''

READER = '''
<div class="reader">
  <h1>写作的框架</h1>
  <h2>为什么需要框架</h2>
  <p>好的文章不是灵感的堆砌，而是<strong>结构</strong>的展开。框架让读者知道自己站在哪里，也让作者知道下一步写什么。</p>
  <h2>三个层次</h2>
  <ul>
    <li><strong>骨架</strong>：论点与顺序</li>
    <li><strong>肌肉</strong>：例证与细节</li>
    <li><strong>皮肤</strong>：语气与节奏</li>
  </ul>
  <blockquote>先写骨架，再填血肉。<br>润色永远放在最后。</blockquote>
  <p>在编辑器里用 <code>Cmd + B</code> 加粗，用 <em>斜体</em> 强调语气。</p>
  <h2>今日练习</h2>
  <ol>
    <li>用三句话概括主题</li>
    <li>为每句补一个例子</li>
    <li>删掉一半形容词</li>
  </ol>
</div>
'''


def editor():
    body = doc_nav('随笔', '写作的框架', True) + f'''
    <div class="doc-body">
{SOURCE}
      <div class="doc-info"><span>Markdown</span><span>155 字符</span></div>
    </div>
    <div class="format-bar glass">
      <span>H<sub style="font-size:9px">1</sub></span>
      <span><b>B</b></span>
      <span><svg class="icon" aria-hidden="true"><use href="#i-list"/></svg></span>
      <span>❞</span>
      <span><svg class="icon" aria-hidden="true"><use href="#i-link"/></svg></span>
      <span><svg class="icon" aria-hidden="true"><use href="#i-code"/></svg></span>
      <span><svg class="icon" aria-hidden="true"><use href="#i-keyboard"/></svg></span>
    </div>
    <div class="kbd">
      <div class="kbd-row"><span>q</span><span>w</span><span>e</span><span>r</span><span>t</span><span>y</span><span>u</span><span>i</span><span>o</span><span>p</span></div>
      <div class="kbd-row"><span>a</span><span>s</span><span>d</span><span>f</span><span>g</span><span>h</span><span>j</span><span>k</span><span>l</span></div>
      <div class="kbd-row"><span class="wide">⇧</span><span>z</span><span>x</span><span>c</span><span>v</span><span>b</span><span>n</span><span>m</span><span class="wide">⌫</span></div>
      <div class="kbd-row"><span class="wide">123</span><span class="wide">，</span><span class="space">空格</span><span class="wide">。</span><span class="wide">换行</span></div>
    </div>
'''
    return wrap('编辑 · Cream×Glass', body)

def reader(nord=False):
    phone = 'phone bare nord' if nord else 'phone bare'
    title = '阅读 · Nord/暗 · Cream×Glass' if nord else '阅读 · Paper · Cream×Glass'
    body = doc_nav('随笔', '写作的框架', False) + f'''
    <div class="doc-body reader-mode">
{READER}
    </div>
    <div class="reader-dock">
      <div class="reader-bar glass glass-capsule">
        <span class="rb">目录</span>
        <span class="rb count">155 字</span>
        <span class="rb a">A</span>
      </div>
    </div>
'''
    return wrap(title, body, phone)

def onboarding_provider():
    body = '''
<div class="onb">
  <div class="brand-l"><img src="thread.png" alt="">StoatMD</div>
  <div class="step">STEP 1 / 2</div>
  <h1>连接你的笔记库</h1>
  <p class="sub">iOS 付费版已包含云盘同步。选择账号后，笔记以普通 Markdown 存在你自己的文件夹里。</p>
  <div class="sec-h">存储</div>
  <p class="hint">可选 Google Drive 或 Dropbox。首次同步后支持离线读写。无本地库迁移。</p>
  <div class="prov-card">
    <div class="prov"><span class="glyph drop"><svg class="icon" aria-hidden="true"><use href="#i-dropbox"/></svg></span><span class="txt"><b>Dropbox</b><small>云盘同步已包含</small></span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
    <div class="prov"><span class="glyph drive"><svg class="icon" aria-hidden="true"><use href="#i-drive"/></svg></span><span class="txt"><b>Google Drive</b><small>云盘同步已包含</small></span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
  </div>
</div>
'''
    return wrap('首启 · 选云盘 · Cream×Glass', body)

def onboarding_folder():
    body = '''
<div class="onb">
  <div class="brand-l"><img src="thread.png" alt="">StoatMD</div>
  <div class="step">STEP 2 / 2</div>
  <h1>选择远程文件夹</h1>
  <p class="sub">选定 Google Drive 中的文件夹作为笔记库根目录。之后启动直接进入库，无需迁移。</p>
  <div class="prov-card">
    <div class="prov"><span class="glyph folder"><svg class="icon" aria-hidden="true"><use href="#i-folder"/></svg></span><span class="txt"><b>我的云端硬盘</b><small>/</small></span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
    <div class="prov on"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-folder"/></svg></span><span class="txt"><b>StoatMD</b><small>/StoatMD</small></span><svg class="icon check" aria-hidden="true"><use href="#i-check"/></svg></div>
    <div class="prov"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-folder"/></svg></span><span class="txt"><b>Notes</b><small>/Notes</small></span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
    <div class="prov"><span class="glyph"><svg class="icon" aria-hidden="true"><use href="#i-folder"/></svg></span><span class="txt"><b>Archive</b><small>/Archive</small></span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
  </div>
  <div class="onb-foot">
    <button class="btn-primary">使用此文件夹</button>
    <button class="btn-ghost">新建文件夹</button>
  </div>
</div>
'''
    return wrap('首启 · 选文件夹 · Cream×Glass', body)

LIB_BLUR_LIST = '''
    <div class="nav-float">
      <div class="nav-row">
        <h1 class="nav-title">笔记库</h1>
        <div class="nav-actions">
          <span class="gbtn solo glass glass-capsule" aria-label="同步"><svg class="icon md" aria-hidden="true"><use href="#i-sync"/></svg></span>
          <span class="gbtn solo glass glass-capsule" aria-label="设置"><svg class="icon md" aria-hidden="true"><use href="#i-settings"/></svg></span>
        </div>
      </div>
    </div>
    <div class="edge-top"></div>
    <div class="scroll">
      <div class="filters"><span class="on">最近修改</span><span>全部</span><span>收藏夹</span></div>
      <div>
        <div class="sec-head"><span>最近的文字</span><span class="mono">OCTOBER</span></div>
        <div class="group">
          <div class="note-row"><h3>写作的框架</h3><p>好的文章不是灵感的堆砌，而是结构的展开。</p><div class="note-meta"><span>随笔</span><time>10:24</time></div></div>
          <div class="note-row"><h3>十月，散步的片刻</h3><p>风把梧桐叶吹到脚边。</p><div class="note-meta"><span>随笔</span><time>昨天</time></div></div>
        </div>
      </div>
    </div>

    <div class="bottom-float">
      <div class="bottom-bar">
        <span class="bbtn" aria-label="新建文件夹"><svg class="icon" aria-hidden="true"><use href="#i-folderplus"/></svg></span>
        <div class="bottom-search" aria-label="搜索"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="ph">搜索</span></div>
        <span class="bbtn compose" aria-label="新建文件"><svg class="icon" aria-hidden="true"><use href="#i-compose"/></svg></span>
      </div>
    </div>

'''

def conflict():
    body = LIB_BLUR_LIST + '''
<div class="scrim">
  <div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-h"><h2>同步冲突</h2><span class="gbtn solo glass glass-capsule"><svg class="icon md" aria-hidden="true"><use href="#i-close"/></svg></span></div>
    <p>「写作的框架.md」在本机与云端都有改动。选一种保留方式：</p>
    <div class="choice pref">
      <span class="ico"><svg class="icon" aria-hidden="true"><use href="#i-device"/></svg></span>
      <span><b>保留本地</b><small>用本机版本覆盖云端。云端改动会进入冲突副本。</small></span>
    </div>
    <div class="choice">
      <span class="ico"><svg class="icon" aria-hidden="true"><use href="#i-cloud"/></svg></span>
      <span><b>保留云端</b><small>用云端版本替换本机。本机改动会进入冲突副本。</small></span>
    </div>
    <div class="choice">
      <span class="ico"><svg class="icon" aria-hidden="true"><use href="#i-both"/></svg></span>
      <span><b>两边都留</b><small>保留两份：原文件与「… (conflict).md」，由你稍后合并。</small></span>
    </div>
  </div>
</div>
'''
    return wrap('冲突 · Cream×Glass', body)

def settings():
    body = '''
    <div class="set-nav-float">
      <div class="doc-nav-row">
        <span class="doc-back glass glass-capsule"><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg>笔记库</span>
        <span style="flex:1"></span>
        <span class="gbtn solo glass glass-capsule"><svg class="icon md" aria-hidden="true"><use href="#i-more"/></svg></span>
      </div>
    </div>
    <div class="set-scroll">
      <h1>设置</h1>
      <p class="set-lead">外观、字体与你的云盘账号。</p>
      <section class="set-sec">
        <h3>外观</h3>
        <div class="group">
          <div class="srow"><svg class="icon" aria-hidden="true"><use href="#i-sun"/></svg><span class="main">主题</span><span class="val">Paper</span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
          <div class="themes">
            <div class="swatch on" style="--sw:#FFFCF7;--si:#2C2A26;--sa:#3D5A80;--sm:#6E6860;--sc:#8B5E3C">
              <div class="swatch-art"><div class="h"># 标题</div><div><span class="m">**</span>粗体<span class="m">**</span> <span class="c">`code`</span></div></div>
              <div class="swatch-lab">Paper<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg></div>
            </div>
            <div class="swatch" style="--sw:#1C1A18;--si:#EDE9E3;--sa:#7A9CC0;--sm:#9A948C;--sc:#C4A484">
              <div class="swatch-art"><div class="h"># 标题</div><div><span class="m">**</span>粗体<span class="m">**</span> <span class="c">`code`</span></div></div>
              <div class="swatch-lab">Nord</div>
            </div>
            <div class="swatch" style="--sw:#F4F4F1;--si:#2C2C2A;--sa:#2F5E89;--sm:#6E6E6C;--sc:#8B5E3C">
              <div class="swatch-art"><div class="h"># 标题</div><div><span class="m">**</span>粗体<span class="m">**</span> <span class="c">`code`</span></div></div>
              <div class="swatch-lab">Newsprint</div>
            </div>
          </div>
          <div class="srow"><svg class="icon" aria-hidden="true"><use href="#i-book"/></svg><span class="main">语言</span><span class="val">跟随系统</span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
        </div>
      </section>
      <section class="set-sec">
        <h3>文字</h3>
        <div class="group">
          <div class="srow"><svg class="icon" aria-hidden="true"><use href="#i-type"/></svg><span class="main">字体与排版</span><span class="val">Kami · 15 / 1.55</span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
        </div>
      </section>
      <section class="set-sec">
        <h3>存储</h3>
        <div class="group">
          <div class="srow"><svg class="icon" aria-hidden="true"><use href="#i-drive"/></svg><span class="main">存储位置<small>我的笔记 · /StoatMD</small></span><span class="val">Google Drive</span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
        </div>
        <div class="sync-line"><span>已同步 · 刚刚</span><span class="go"><svg class="icon" aria-hidden="true"><use href="#i-sync"/></svg>立即同步</span></div>
      </section>
      <section class="set-sec">
        <h3>StoatMD</h3>
        <div class="group">
          <div class="srow"><svg class="icon" aria-hidden="true"><use href="#i-cloud"/></svg><span class="main">iOS 付费版</span><span class="val">同步已包含</span><svg class="icon chev" aria-hidden="true"><use href="#i-chevron"/></svg></div>
        </div>
      </section>
      <div class="brand-foot"><b>StoatMD</b> · 让文字，慢慢生长。</div>
    </div>
'''
    return wrap('设置 · Cream×Glass', body)

def file_tree():
    """库页「全部」Tab → 可展开缩进文件树（嵌套文件夹 + .md）"""
    def row(indent, kind, name, meta='', expanded=None, md=False):
        cls = f'tree-row tree-indent-{indent}'
        if md:
            cls += ' md-file'
        if kind == 'folder':
            if expanded is True:
                twist = '<span class="twist"><svg class="icon" aria-hidden="true"><use href="#i-down"/></svg></span>'
            elif expanded is False:
                twist = '<span class="twist"><svg class="icon" aria-hidden="true"><use href="#i-right"/></svg></span>'
            else:
                twist = '<span class="twist empty"></span>'
            fg = f'<span class="fg folder"><svg class="icon" aria-hidden="true"><use href="#i-folder"/></svg></span>'
            name_cls = 'name folder'
        else:
            twist = '<span class="twist empty"></span>'
            fg = f'<span class="fg file"><svg class="icon" aria-hidden="true"><use href="#i-note"/></svg></span>'
            name_cls = 'name'
        meta_html = f'<span class="meta">{meta}</span>' if meta else ''
        return f'<div class="{cls}">{twist}{fg}<span class="{name_cls}">{name}</span>{meta_html}</div>'

    rows = [
        row(0, 'folder', '随笔', '3', True),
        row(1, 'file', '写作的框架.md', '10:24', md=True),
        row(1, 'file', '十月，散步的片刻.md', '昨天', md=True),
        row(1, 'folder', '草稿', '1', True),
        row(2, 'file', '未命名.md', '周一', md=True),
        row(0, 'folder', '产品', '4', True),
        row(1, 'file', '一个轻盈的笔记本.md', '昨天', md=True),
        row(1, 'file', '同步不必挡住阅读.md', '周一', md=True),
        row(1, 'folder', '规格', '2', False),
        row(0, 'folder', '研究', '2', True),
        row(1, 'file', '纸感阅读与源码编辑.md', '周日', md=True),
        row(1, 'folder', '参考文献', '1', False),
        row(0, 'file', 'README.md', '根目录', md=True),
    ]
    tree_html = '\n        '.join(rows)
    body = f'''
    <div class="nav-float">
      <div class="nav-row">
        <h1 class="nav-title">笔记库</h1>
        <div class="nav-actions">
          <span class="gbtn solo glass glass-capsule" aria-label="同步"><svg class="icon md" aria-hidden="true"><use href="#i-sync"/></svg></span>
          <span class="gbtn solo glass glass-capsule" aria-label="设置"><svg class="icon md" aria-hidden="true"><use href="#i-settings"/></svg></span>
        </div>
      </div>
    </div>
    <div class="edge-top"></div>
    <div class="tree-scroll">
      <div class="filters"><span>最近修改</span><span class="on">全部</span><span>收藏夹</span></div>
      <div class="tree-path"><span>Google Drive</span><span class="sep">/</span><span class="curr">StoatMD</span></div>
      <div class="group tree-group">
        {tree_html}
      </div>
    </div>

    <div class="bottom-float">
      <div class="bottom-bar">
        <span class="bbtn" aria-label="新建文件夹"><svg class="icon" aria-hidden="true"><use href="#i-folderplus"/></svg></span>
        <div class="bottom-search" aria-label="搜索"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="ph">搜索</span></div>
        <span class="bbtn compose" aria-label="新建文件"><svg class="icon" aria-hidden="true"><use href="#i-compose"/></svg></span>
      </div>
    </div>

'''
    return wrap('全部 · 文件树 · Cream×Glass', body)


def favorites():
    """库页「收藏夹」Tab — 未来功能；示例列表 + 即将推出提示（非灰禁用）"""
    body = '\n    <div class="nav-float">\n      <div class="nav-row">\n        <h1 class="nav-title">笔记库</h1>\n        <div class="nav-actions">\n          <span class="gbtn solo glass glass-capsule" aria-label="同步"><svg class="icon md" aria-hidden="true"><use href="#i-sync"/></svg></span>\n          <span class="gbtn solo glass glass-capsule" aria-label="设置"><svg class="icon md" aria-hidden="true"><use href="#i-settings"/></svg></span>\n        </div>\n      </div>\n    </div>\n    <div class="edge-top"></div>\n    <div class="scroll">\n      <div class="filters"><span>最近修改</span><span>全部</span><span class="on">收藏夹</span></div>\n      <div class="fav-banner">\n        <span class="pill">即将推出</span>\n        <span class="copy">跨设备收藏 · Mac 版随后跟上 <em>· 先看看会是什么样子</em></span>\n      </div>\n      <div>\n        <div class="sec-head"><span>收藏的文字</span><span class="mono">SAMPLE</span></div>\n        <div class="group">\n          <div class="note-row fav"><span class="star" aria-hidden="true"><svg class="icon"><use href="#i-star"/></svg></span><h3>写作的框架</h3><p>好的文章不是灵感的堆砌，而是结构的展开。</p><div class="note-meta"><span>随笔</span><time>收藏 · 今天</time></div></div>\n          <div class="note-row fav"><span class="star" aria-hidden="true"><svg class="icon"><use href="#i-star"/></svg></span><h3>一个轻盈的笔记本</h3><p>让工具安静下来，让内容站到前面。</p><div class="note-meta"><span>产品</span><time>收藏 · 昨天</time></div></div>\n          <div class="note-row fav"><span class="star" aria-hidden="true"><svg class="icon"><use href="#i-star"/></svg></span><h3>纸感阅读与源码编辑</h3><p>同一份 Markdown，两种相处方式。</p><div class="note-meta"><span>研究</span><time>收藏 · 周日</time></div></div>\n        </div>\n      </div>\n    </div>\n\n    <div class="bottom-float">\n      <div class="bottom-bar">\n        <span class="bbtn" aria-label="新建文件夹"><svg class="icon" aria-hidden="true"><use href="#i-folderplus"/></svg></span>\n        <div class="bottom-search" aria-label="搜索"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="ph">搜索</span></div>\n        <span class="bbtn compose" aria-label="新建文件"><svg class="icon" aria-hidden="true"><use href="#i-compose"/></svg></span>\n      </div>\n    </div>\n\n'
    return wrap('收藏夹 · 即将推出 · Cream×Glass', body)


def ensure_css():
    css_path = ROOT / 'liquid.css'
    text = css_path.read_text(encoding='utf-8')
    if CSS_MARKER in text:
        # replace from marker to EOF
        text = text.split(CSS_MARKER)[0].rstrip() + '\n' + EXTRA_CSS
    else:
        text = text.rstrip() + '\n' + EXTRA_CSS
    css_path.write_text(text, encoding='utf-8')
    print('updated liquid.css')


def main():
    ensure_css()
    files = {
        '04-editor.html': editor(),
        '05-reader-paper.html': reader(False),
        '06-reader-nord.html': reader(True),
        '07-onboarding-provider.html': onboarding_provider(),
        '08-onboarding-folder.html': onboarding_folder(),
        '09-conflict-sheet.html': conflict(),
        '10-settings.html': settings(),
        '11-file-tree.html': file_tree(),
        '12-favorites.html': favorites(),
    }
    for name, html in files.items():
        (ROOT / name).write_text(html, encoding='utf-8')
        print('wrote', name)

    # Full board HTML (for reference; PNG composed in capture)
    cells = [
        ('01', 'Library idle', '01-library-idle.html'),
        ('01b', 'Pull sync', '01b-library-search-pulled.html'),
        ('01c', 'Search', '01c-library-search-active.html'),
        ('02', 'Syncing', '02-library-syncing.html'),
        ('03', 'Paused', '03-library-paused.html'),
        ('03b', 'Error', '03b-library-error.html'),
        ('11', 'All · tree', '11-file-tree.html'),
        ('12', 'Favorites', '12-favorites.html'),
        ('04', 'Editor', '04-editor.html'),
        ('05', 'Reader Paper', '05-reader-paper.html'),
        ('06', 'Reader Nord', '06-reader-nord.html'),
        ('07', 'Onboard cloud', '07-onboarding-provider.html'),
        ('08', 'Onboard folder', '08-onboarding-folder.html'),
        ('09', 'Conflict', '09-conflict-sheet.html'),
        ('10', 'Settings', '10-settings.html'),
    ]
    board_cells = []
    for code, label, href in cells:
        board_cells.append(f'''
  <div class="cell">
    <div class="cell-label"><span><b>{label}</b></span><small>{code}</small></div>
    <iframe src="{href}" style="width:430px;height:900px;border:0;transform:scale(0.55);transform-origin:top left;pointer-events:none;background:#F7F3EB"></iframe>
  </div>''')
    board = f'''<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<title>StoatMD iOS · Cream×Glass full board</title>
<link rel="stylesheet" href="liquid.css">
<style>
  body {{ background: #E8E2D6; }}
  .grid.full {{ display:grid; grid-template-columns: repeat(4, 240px); gap: 22px 14px; justify-content:start; }}
  .cell {{ width: 240px; height: 520px; overflow: hidden; }}
</style>
</head>
<body>
<div class="board">
  <div class="board-head">
    <h1>StoatMD iOS <span>Cream×Glass · 全套</span></h1>
    <div class="board-meta">2026-11-01 · CREAM × GLASS · Tab：最近修改 / 全部 / 收藏夹</div>
  </div>
  <div class="grid full">
{''.join(board_cells)}
  </div>
</div>
</body>
</html>
'''
    (ROOT / '00-board-overview.html').write_text(board, encoding='utf-8')
    (ROOT / '00-board-liquid.html').write_text(board, encoding='utf-8')
    print('wrote 00-board-overview.html')

if __name__ == '__main__':
    main()
