/**
 * Kiểm tra 2 trang OAuth: /oauth/callback (chờ + lỗi) và /oauth/facebook
 * (hoàn thiện hồ sơ). Cả hai phải dùng Card của Astryx, tiêu đề là H1,
 * nút >= 44px, không tràn ngang.
 *
 * Dùng: node scripts/check-oauth-pages.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = process.argv[2] ?? 'http://localhost:5173';
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 900);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

async function probe(url, waitFor) {
  const page = await browser.newPage();
  await page.setViewport({width, height});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(url, {waitUntil: 'networkidle2', timeout: 60000});
  await page.waitForSelector(waitFor, {timeout: 30000});
  await new Promise((r) => setTimeout(r, 2000));

  const data = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const card = document.querySelector('.astryx-card');
    const title = document.querySelector('h1');
    const btn = document.querySelector('.astryx-button');

    return {
      cardIsAstryx: !!card,
      title: title?.textContent?.trim() ?? null,
      titleTag: title?.tagName ?? null,
      btnLabel: btn?.textContent?.trim() ?? null,
      btnHeight: btn ? Math.round(btn.getBoundingClientRect().height) : null,
      docW,
      scrollW,
      hasHorizontalScroll: scrollW > docW + 1,
    };
  });

  await page.close();
  return {...data, errors: errors.slice(0, 3)};
}

try {
  const cb = await probe(`${base}/oauth/callback?ticket=khong-ton-tai`, '.oauth-cb__card');
  const fb = await probe(`${base}/oauth/facebook?ticket=abc`, '.fb-complete__card');

  console.log(JSON.stringify({oauthCallback: cb, facebookComplete: fb}, null, 2));
} finally {
  await browser.close();
}
