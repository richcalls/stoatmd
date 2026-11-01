from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path('/workspace/stoatmd/ios-v1-polish')
shots = [
  '01-library-idle',
  '01b-library-search-pulled',
  '01c-library-search-active',
  '02-library-syncing',
  '03-library-paused',
  '03b-library-error',
  '01-library-idle-dark',
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
        page.wait_for_timeout(200)
        page.locator('.phone').screenshot(path=str(root / f'{sid}.png'), type='png')
        page.close()
        print('ok', sid)

    # board: compose from PNGs with PIL for reliability
    from PIL import Image, ImageDraw, ImageFont
    labels = [
        ('01', 'Idle', '01-library-idle.png'),
        ('01b', 'Pull light', '01b-library-search-pulled.png'),
        ('01c', 'Search', '01c-library-search-active.png'),
        ('02', 'Syncing', '02-library-syncing.png'),
        ('03', 'Paused', '03-library-paused.png'),
        ('03b', 'Error', '03b-library-error.png'),
    ]
    thumb_w = 280
    gap = 28
    pad = 48
    header_h = 90
    imgs = []
    for code, label, fn in labels:
        im = Image.open(root / fn).convert('RGBA')
        ratio = thumb_w / im.width
        im = im.resize((thumb_w, int(im.height * ratio)), Image.Resampling.LANCZOS)
        imgs.append((code, label, im))
    row_h = max(im.height for _,_,im in imgs) + 36
    W = pad*2 + thumb_w*6 + gap*5
    H = pad + header_h + row_h + pad
    board = Image.new('RGB', (W, H), '#E8E2D6')
    draw = ImageDraw.Draw(board)
    try:
        font_h = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
        font_s = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
        font_m = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 12)
    except Exception:
        font_h = font_s = font_m = ImageFont.load_default()
    draw.text((pad, pad), 'StoatMD iOS  ·  Cream×Glass · 库页五态', fill='#111', font=font_h)
    draw.text((pad, pad+40), '2026-11-01  CREAM×GLASS · 参考妙言 · StoatMD indigo', fill='#666', font=font_m)
    draw.line((pad, pad+72, W-pad, pad+72), fill='#DDD5C8', width=1)
    y = pad + header_h
    x = pad
    for code, label, im in imgs:
        draw.text((x, y), label, fill='#111', font=font_s)
        draw.text((x + thumb_w - 40, y+2), code, fill='#8E8E93', font=font_m)
        board.paste(im, (x, y+28), im)
        x += thumb_w + gap
    out = root / '00-board-library.png'
    board.save(out, 'PNG')
    print('ok board', out, board.size)
    browser.close()
