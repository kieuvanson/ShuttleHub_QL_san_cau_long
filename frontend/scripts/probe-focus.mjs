/**
 * Kiểm tra focus ring thật: focus bằng bàn phím vào nút của Astryx rồi đọc
 * computed outline. Nếu `outline: none` → mất focus ring (a11y).
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = process.argv[2] ?? 'http://localhost:5173';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({width: 1440, height: 900});
await page.goto(`${base}/`, {waitUntil: 'networkidle2', timeout: 60000});
await new Promise((r) => setTimeout(r, 1500));

const out = await page.evaluate(() => {
  const res = [];
  // mô phỏng focus bằng bàn phím: :focus-visible chỉ bật khi focus đến từ bàn phím
  const el = document.querySelector('.hero__actions .astryx-button');
  if (el) {
    el.focus();
    const cs = getComputedStyle(el);
    res.push({
      what: 'hero button (focus() — không phải focus-visible)',
      outline: cs.outline,
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      outlineColor: cs.outlineColor,
      boxShadow: cs.boxShadow?.slice(0, 60),
    });
  }
  return res;
});

// Tab bằng bàn phím thật để kích hoạt :focus-visible
await page.evaluate(() => document.body.focus());
const tabInfo = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 24),
      matchesFocusVisible: el.matches(':focus-visible'),
      outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
      boxShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 50),
    };
  });
  if (info) tabInfo.push(info);
}

console.log(JSON.stringify({focusProbe: out, tabOrder: tabInfo}, null, 1));
await browser.close();
