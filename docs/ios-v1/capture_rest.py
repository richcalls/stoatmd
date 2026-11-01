#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

root = Path('/workspace/stoatmd/ios-v1-polish')
shots = [
  '04-editor',
  '05-reader-paper',
  '06-reader-nord',
  '07-onboarding-provider',
  '08-onboarding-folder',
  '09-conflict-sheet',
  '10-settings',
  '11-file-tree',
  '12-favorites',
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/usr/bin/google-chrome',
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
    )
    context = browser.new_context(viewport={'width': 430, 'height': 900}, device_scale_factor=2)
    for sid in shots:
        page = context.new_page()
        page.goto((root / f'{sid}.html').as_uri(), wait_until='networkidle')
        page.wait_for_timeout(250)
        page.locator('.phone').screenshot(path=str(root / f'{sid}.png'), type='png')
        page.close()
        print('ok', sid)
    browser.close()

# Full board from all PNGs (2 rows-ish / wrap 4 cols)
labels = [
    ('01', 'Library idle', '01-library-idle.png'),
    ('01b', 'Pull light', '01b-library-search-pulled.png'),
    ('01c', 'Search', '01c-library-search-active.png'),
    ('02', 'Syncing', '02-library-syncing.png'),
    ('03', 'Paused', '03-library-paused.png'),
    ('03b', 'Error', '03b-library-error.png'),
    ('11', 'All · tree', '11-file-tree.png'),
    ('12', 'Favorites', '12-favorites.png'),
    ('04', 'Editor', '04-editor.png'),
    ('05', 'Reader Paper', '05-reader-paper.png'),
    ('06', 'Reader Nord', '06-reader-nord.png'),
    ('07', 'Onboard cloud', '07-onboarding-provider.png'),
    ('08', 'Onboard folder', '08-onboarding-folder.png'),
    ('09', 'Conflict', '09-conflict-sheet.png'),
    ('10', 'Settings', '10-settings.png'),
]
thumb_w = 240
gap_x, gap_y = 20, 36
pad = 48
header_h = 96
cols = 4
imgs = []
for code, label, fn in labels:
    path = root / fn
    if not path.exists():
        print('missing', fn)
        continue
    im = Image.open(path).convert('RGBA')
    ratio = thumb_w / im.width
    im = im.resize((thumb_w, int(im.height * ratio)), Image.Resampling.LANCZOS)
    imgs.append((code, label, im))

rows = (len(imgs) + cols - 1) // cols
row_h = max(im.height for _,_,im in imgs) + 34
W = pad*2 + thumb_w*cols + gap_x*(cols-1)
H = pad + header_h + rows*row_h + gap_y*(rows-1) + pad
board = Image.new('RGB', (W, H), '#E8E2D6')
draw = ImageDraw.Draw(board)
try:
    font_h = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
    font_s = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
    font_m = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 11)
except Exception:
    font_h = font_s = font_m = ImageFont.load_default()
draw.text((pad, pad), 'StoatMD iOS  ·  Cream×Glass · 全套', fill='#111', font=font_h)
draw.text((pad, pad+36), '2026-11-01  CREAM×GLASS · 参考妙言 · indigo · Tab 最近修改/全部/收藏夹', fill='#666', font=font_m)
draw.line((pad, pad+68, W-pad, pad+68), fill='#DDD5C8', width=1)
for i, (code, label, im) in enumerate(imgs):
    r, c = divmod(i, cols)
    x = pad + c * (thumb_w + gap_x)
    y = pad + header_h + r * (row_h + gap_y)
    draw.text((x, y), label, fill='#111', font=font_s)
    draw.text((x + thumb_w - 36, y+1), code, fill='#8E8E93', font=font_m)
    board.paste(im, (x, y+26), im)
out = root / '00-board-overview.png'
board.save(out, 'PNG')
print('ok board', out, board.size)
