/**
 * Kiểm tra nút social (Google / Facebook) có hiện trên trang đăng nhập không.
 * Chạy: node scripts/check-social-buttons.mjs
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:5173/dang-nhap', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.auth__socials a, .auth__socials button')].map((a) => ({
    label: (a.textContent || '').trim(),
    href: a.getAttribute('href'),
    visible: a.getBoundingClientRect().height > 0,
  }));
  return {
    socialBlock: !!document.querySelector('.auth__socials'),
    divider: !!document.querySelector('.auth__divider'),
    buttons: btns,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: '.taste-skill/social-buttons.png' });
await browser.close();
