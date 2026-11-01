from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path('/workspace/stoatmd/ios-v1-polish')
shots = [
  '01-library-idle',
  '01b-library-search-pulled',
  '02-library-syncing',
  '03-library-paused',
  '03b-library-error',
  '04-editor',
  '05-reader-paper',
  '06-reader-nord',
  '07-onboarding-provider',
  '08-onboarding-folder',
  '09-conflict-sheet',
  '10-settings',
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
        page.wait_for_timeout(150)
        page.locator('.phone').screenshot(path=str(root / f'{sid}.png'), type='png')
        page.close()
        print('ok', sid)

    board = context.new_page()
    board.set_viewport_size({'width': 1720, 'height': 1700})
    board.goto((root / '00-board.html').as_uri(), wait_until='networkidle')
    board.wait_for_timeout(250)
    board.locator('.board').screenshot(path=str(root / '00-board-overview.png'), type='png')
    print('ok board')
    browser.close()
