import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shots = [
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
];

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const context = await browser.newContext({
  viewport: { width: 430, height: 900 },
  deviceScaleFactor: 2,
});

for (const id of shots) {
  const page = await context.newPage();
  const file = pathToFileURL(path.join(__dirname, `${id}.html`)).href;
  await page.goto(file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(120);
  const phone = page.locator('.phone');
  await phone.screenshot({ path: path.join(__dirname, `${id}.png`), type: 'png' });
  await page.close();
  console.log('ok', id);
}

// board overview - full page wide
const boardPage = await context.newPage();
await boardPage.setViewportSize({ width: 1680, height: 1600 });
await boardPage.goto(pathToFileURL(path.join(__dirname, '00-board.html')).href, { waitUntil: 'networkidle' });
await boardPage.waitForTimeout(200);
await boardPage.locator('.board').screenshot({ path: path.join(__dirname, '00-board-overview.png'), type: 'png' });
console.log('ok board');
await browser.close();
