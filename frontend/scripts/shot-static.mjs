/**
 * Chụp ảnh MOCKUP tĩnh (HTML không phải React app).
 * Khác `shot.mjs`: không đợi `#root`, chỉ đợi `body` có nội dung.
 *
 * Dùng:
 *   node scripts/shot-static.mjs <url> <out.png> [width] [height]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const url = process.argv[2] ?? 'http://localhost:5173/mockup-feed.html';
const out = process.argv[3] ?? 'mockup.png';
const width = Number(process.argv[4] ?? 1440);
const height = Number(process.argv[5] ?? 1100);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(
    () => document.body && document.body.innerText.trim().length > 50,
    { timeout: 20000 },
  );
  await new Promise((r) => setTimeout(r, 600));

  await page.screenshot({ path: out, fullPage: false });
  console.log(JSON.stringify({ ok: true, out, size: `${width}x${height}` }, null, 2));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e) }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
