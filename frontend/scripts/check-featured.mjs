/**
 * Kiểm tra khu vực "Sân nổi bật": ảnh thật, tên không đè rating, không tràn ngang.
 *
 * Dùng: node scripts/check-featured.mjs [url] [width]
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
  await page.waitForFunction(
    () => document.querySelectorAll('.featured__card').length > 0,
    {timeout: 30000},
  );
  await new Promise((r) => setTimeout(r, 600));

  const result = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.featured__card')];
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;

    const cardData = cards.map((card) => {
      const img = card.querySelector('img');
      const name = card.querySelector('.featured__name');
      const rating = card.querySelector('.featured__rating');
      const badge = card.querySelector('.astryx-badge');
      const nameRect = name?.getBoundingClientRect();
      const ratingRect = rating?.getBoundingClientRect();
      const cs = getComputedStyle(card);

      return {
        imgSrc: img?.getAttribute('src') ?? null,
        imgLoaded: img ? img.naturalWidth > 0 : false,
        hasGradient: !img,
        nameText: name?.textContent?.trim() ?? null,
        nameTruncated:
          !!name && name.scrollWidth > name.clientWidth + 1,
        overlap: !!(nameRect && ratingRect && nameRect.right > ratingRect.left + 1),
        ratingColor: rating ? getComputedStyle(rating).color : null,
        badgeText: badge?.textContent?.trim() ?? null,
        cardDisplay: cs.display,
        cardRadius: cs.borderRadius,
        cardOverflow: cs.overflow,
        cardH: Math.round(card.getBoundingClientRect().height),
      };
    });

    // Ảnh nền gradient cũ còn sót không
    const oldGradient = document.querySelectorAll('.featured__visual').length;

    return {
      cardCount: cards.length,
      cardData,
      oldGradient,
      docW,
      scrollW,
      hasHorizontalScroll: scrollW > docW + 1,
      overflowing: [...document.querySelectorAll('*')]
        .filter((el) => el.getBoundingClientRect().right > docW + 1)
        .slice(0, 5)
        .map((el) => `${el.tagName}.${el.className}`),
      moreLink: (() => {
        const el = document.querySelector('.featured__more');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {href: el.getAttribute('href'), h: Math.round(r.height)};
      })(),
    };
  });

  console.log(JSON.stringify({...result, errors: errors.slice(0, 5)}, null, 2));
} finally {
  await browser.close();
}
