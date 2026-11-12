/**
 * Kiểm tra FAQ: accordion mở 1/đóng 1, ảnh cột phải, anchor #faq /
 * #dieu-khoan / #chinh-sach, không tràn ngang.
 *
 * Dùng: node scripts/check-faq.mjs [url] [width]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] ?? 'http://localhost:5173/';
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
  await page.waitForFunction(() => document.querySelector('.faq'), {timeout: 30000});
  await new Promise((r) => setTimeout(r, 600));

  const result = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const triggers = [...document.querySelectorAll('.faq [aria-expanded]')];

    return {
      faqId: document.querySelector('.faq')?.id ?? null,
      title: document.querySelector('#faq-title')?.textContent?.trim() ?? null,
      triggerCount: triggers.length,
      expandedAtStart: triggers.map((t) => t.getAttribute('aria-expanded')),
      mediaImg: document.querySelector('.faq__media img')?.getAttribute('src') ?? null,
      mediaRatio: (() => {
        const i = document.querySelector('.faq__media img');
        if (!i) return null;
        const r = i.getBoundingClientRect();
        return Math.round((r.width / r.height) * 100) / 100;
      })(),
      terms: ['dieu-khoan', 'chinh-sach'].map((id) => {
        const el = document.getElementById(id);
        return {id, exists: !!el, heading: el?.querySelector('h3')?.textContent?.trim() ?? null};
      }),
      ctaHref: document.querySelector('.faq a.astryx-button')?.getAttribute('href') ?? null,
      ctaH: Math.round(
        document.querySelector('.faq a.astryx-button')?.getBoundingClientRect().height ?? 0,
      ),
      docW,
      scrollW,
      hasHorizontalScroll: scrollW > docW + 1,
      overflowing: [...document.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > docW + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName}.${el.className}`),
    };
  });

  // Accordion: bấm trigger thứ 2 → thứ 2 mở, thứ 1 đóng
  await page.evaluate(() => {
    const triggers = [...document.querySelectorAll('.faq [aria-expanded]')];
    triggers[1]?.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  const afterClick = await page.evaluate(() =>
    [...document.querySelectorAll('.faq [aria-expanded]')].map((t) =>
      t.getAttribute('aria-expanded'),
    ),
  );

  // Anchor #chinh-sach: click link footer rồi đo vị trí
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find(
      (a) => a.getAttribute('href') === '/#chinh-sach',
    );
    link?.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  const anchor = await page.evaluate(() => {
    const el = document.getElementById('chinh-sach');
    if (!el) return {exists: false};
    const r = el.getBoundingClientRect();
    return {
      exists: true,
      top: Math.round(r.top),
      notHiddenByHeader: r.top >= 0,
      visible: r.top < window.innerHeight && r.bottom > 0,
    };
  });

  console.log(
    JSON.stringify({...result, afterClick, anchor, errors: errors.slice(0, 5)}, null, 2),
  );
} finally {
  await browser.close();
}
