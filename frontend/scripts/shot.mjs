/**
 * Chụp ảnh trang bằng Puppeteer (Chrome đã cài sẵn trên máy).
 *
 * Chrome headless `--screenshot` chụp quá sớm nên trang React (Vite dev server)
 * chưa kịp render → ảnh trắng. Puppeteer chờ tới khi app có nội dung rồi mới chụp.
 *
 * Dùng:
 *   node scripts/shot.mjs <url> <out.png> [width] [height] [waitSelector]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'shot.png';
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 900);
const waitSelector = process.argv[6] ?? '';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({width, height, deviceScaleFactor: 1});

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(url, {waitUntil: 'networkidle2', timeout: 60000});

  // Chờ React có nội dung thật (không phải skeleton rỗng)
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      return root && root.innerText && root.innerText.trim().length > 20;
    },
    {timeout: 30000},
  );

  if (waitSelector) {
    await page.waitForSelector(waitSelector, {timeout: 20000});
  }

  // Thêm chút trễ cho animation framer-motion ổn định
  await new Promise((r) => setTimeout(r, 900));

  await page.screenshot({path: out, fullPage: false});

  const info = await page.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    return {
      title: document.title,
      themeAttr: html.getAttribute('data-astryx-theme'),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      accent: cs.getPropertyValue('--color-accent').trim(),
      text: (document.getElementById('root')?.innerText ?? '').slice(0, 200),
    };
  });

  console.log(JSON.stringify({ok: true, out, ...info, errors: errors.slice(0, 5)}, null, 2));
} catch (e) {
  console.log(JSON.stringify({ok: false, error: String(e)}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
