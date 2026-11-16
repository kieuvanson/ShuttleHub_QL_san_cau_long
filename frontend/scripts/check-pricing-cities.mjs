/**
 * Kiểm tra section Bảng giá + Cities: neo #bang-gia tồn tại, ảnh 3:2,
 * 5 ảnh thành phố không trùng nhau, không tràn ngang.
 *
 * Dùng: node scripts/check-pricing-cities.mjs [url] [width]
 */
import puppeteer from 'puppeteer-core';
import { waitScrollSettled } from './lib/wait-scroll-settled.mjs';

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
  await page.waitForFunction(
    () => document.querySelector('.pricing') && document.querySelector('.cities'),
    {timeout: 30000},
  );
  await new Promise((r) => setTimeout(r, 600));

  const result = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;

    const pricing = document.querySelector('.pricing');
    const cards = [...document.querySelectorAll('.pricing__card')];
    const cityCards = [...document.querySelectorAll('.cities__card')];
    const imgs = [...document.querySelectorAll('.cities__media img')];

    return {
      pricingExists: !!pricing,
      pricingId: pricing?.id ?? null,
      pricingTitle: pricing?.querySelector('h2')?.textContent?.trim() ?? null,
      pricingCards: cards.map((c) => ({
        name: c.querySelector('h3')?.textContent?.trim() ?? null,
        price: c.querySelector('.pricing__price')?.textContent?.trim() ?? null,
        priceColor: c.querySelector('.pricing__price')
          ? getComputedStyle(c.querySelector('.pricing__price')).color
          : null,
        perks: c.querySelectorAll('.pricing__perks li').length,
        btnHref: c.querySelector('a.astryx-button')?.getAttribute('href') ?? null,
        btnH: Math.round(
          c.querySelector('a.astryx-button')?.getBoundingClientRect().height ?? 0,
        ),
      })),
      cityCount: cityCards.length,
      cityImgs: imgs.map((i) => i.getAttribute('src')),
      uniqueCityImgs: new Set(imgs.map((i) => i.getAttribute('src'))).size,
      cityRatios: imgs.map((i) => {
        const r = i.getBoundingClientRect();
        return Math.round((r.width / r.height) * 100) / 100;
      }),
      docW,
      scrollW,
      hasHorizontalScroll: scrollW > docW + 1,
      overflowing: [...document.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > docW + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName}.${el.className}`),
    };
  });

  // Kiểm tra neo #bang-gia: bấm link "Bảng giá" ở header rồi đo vị trí
  // (Bảng giá nay nằm ở trang /tim-san, link header trỏ tới /tim-san#bang-gia)
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find(
      (a) => a.getAttribute('href') === '/tim-san#bang-gia',
    );
    link?.click();
  });
  await waitScrollSettled(page);
  const anchor = await page.evaluate(() => {
    const el = document.getElementById('bang-gia');
    if (!el) return {exists: false};
    const r = el.getBoundingClientRect();
    return {
      exists: true,
      top: Math.round(r.top),
      visible: r.top < window.innerHeight && r.bottom > 0,
    };
  });

  console.log(
    JSON.stringify({...result, anchor, errors: errors.slice(0, 5)}, null, 2),
  );
} finally {
  await browser.close();
}
