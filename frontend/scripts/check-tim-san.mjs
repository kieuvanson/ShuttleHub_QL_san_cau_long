/**
 * Kiểm tra trang /tim-san: CourtCard dùng Astryx, ảnh thật, badge,
 * nút "Đặt sân" >= 44px, không tràn ngang.
 *
 * Dùng: node scripts/check-tim-san.mjs [url] [width]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] ?? 'http://localhost:5173/tim-san';
const width = Number(process.argv[3] ?? 1440);
const height = Number(process.argv[4] ?? 900);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({width, height});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(url, {waitUntil: 'networkidle2', timeout: 60000});
  await page.waitForSelector('.cd__list', {timeout: 30000});
  await new Promise((r) => setTimeout(r, 600));

  const result = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const cards = [...document.querySelectorAll('.cd__list .astryx-card')];
    const first = cards[0] ?? null;
    const btn = first?.querySelector('.astryx-button') ?? null;
    const img = first?.querySelector('img') ?? null;

    return {
      cardCount: cards.length,
      firstCardName: first?.querySelector('.astryx-heading')?.textContent?.trim() ?? null,
      badges: first ? [...first.querySelectorAll('.astryx-badge')].map((b) => b.textContent.trim()) : [],
      imgSrc: img?.getAttribute('src') ?? null,
      imgRatio: img
        ? Math.round((img.getBoundingClientRect().width / img.getBoundingClientRect().height) * 100) / 100
        : null,
      btnLabel: btn?.textContent?.trim() ?? null,
      btnHeight: btn ? Math.round(btn.getBoundingClientRect().height) : null,
      resultsBorder: getComputedStyle(document.querySelector('.cd__results')).borderTopColor,
      docW,
      scrollW,
      hasHorizontalScroll: scrollW > docW + 1,
      overflowing: [...document.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > docW + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName}.${el.className}`),
    };
  });

  console.log(JSON.stringify({...result, errors: errors.slice(0, 5)}, null, 2));
} finally {
  await browser.close();
}
