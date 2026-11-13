/**
 * Kiểm chứng hành vi khi backend tạm thời không chạy:
 *   1. Backend TẮT  → trang đăng nhập phải hiện cảnh báo (không im lặng).
 *   2. Backend BẬT lại → nút social tự xuất hiện sau khi retry (không cần F5).
 *
 * Dùng: node scripts/check-social-retry.mjs
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 768 });

const read = () =>
  page.evaluate(() => ({
    socials: !!document.querySelector('.auth__socials'),
    buttons: [...document.querySelectorAll('.auth__socials a')].map((a) => a.textContent.trim()),
    warn: document.querySelector('.auth__alert--warn')?.textContent?.trim() ?? null,
  }));

// --- 1. Backend đang chạy
await page.goto('http://localhost:5173/dang-nhap', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 1500));
console.log('1) backend BẬT :', JSON.stringify(await read()));

// --- 2. Chặn request để giả lập backend chết
let blocked = true;
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (blocked && req.url().includes('/api/auth/oauth/providers')) req.abort();
  else req.continue();
});
await page.goto('http://localhost:5173/dang-nhap', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 1500));
console.log('2) backend TẮT :', JSON.stringify(await read()));

// --- 3. Bỏ chặn → chờ retry tự động (5s)
blocked = false;
await new Promise((r) => setTimeout(r, 7000));
console.log('3) sau retry   :', JSON.stringify(await read()));

await browser.close();
