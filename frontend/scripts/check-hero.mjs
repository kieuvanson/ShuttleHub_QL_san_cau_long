/**
 * Kiểm tra hero mới: không slider, có CTA, form nằm trong hero, không tràn ngang.
 *
 * Dùng: node scripts/check-hero.mjs [url] [width]
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
    () => document.getElementById('root')?.innerText?.trim().length > 20,
    {timeout: 30000},
  );
  await new Promise((r) => setTimeout(r, 1200));

  const result = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];

    const hero = q('.hero');
    const heroRect = hero?.getBoundingClientRect();
    const form = q('.search__form');
    const formRect = form?.getBoundingClientRect();
    const media = q('.hero__media');
    const mediaRect = media?.getBoundingClientRect();

    // Nút CTA
    const cta = qa('a').filter((a) =>
      ['Tìm sân trống', 'Xem bảng giá'].includes(a.textContent.trim()),
    ).map((a) => {
      const cs = getComputedStyle(a);
      return {
        text: a.textContent.trim(),
        href: a.getAttribute('href'),
        bg: cs.backgroundColor,
        color: cs.color,
        h: Math.round(a.getBoundingClientRect().height),
      };
    });

    // Slider/dots cũ còn sót không
    const leftover = {
      slider: !!q('.hero__slider'),
      dots: !!q('.hero__dots'),
      slide: !!q('.hero__slide'),
    };

    // Ảnh hero có tự đổi sau 6s không (slider cũ đổi mỗi 5s)
    const img = q('.hero__media img');
    const srcBefore = img?.getAttribute('src');

    // Tràn ngang?
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const overflowing = qa('*')
      .filter((el) => el.getBoundingClientRect().right > docW + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName}.${el.className}`);

    return {
      heroExists: !!hero,
      heroLeft: heroRect ? Math.round(heroRect.left) : null,
      heroRight: heroRect ? Math.round(heroRect.right) : null,
      formInsideHero:
        !!formRect && !!heroRect
          ? formRect.top >= heroRect.top - 1 && formRect.bottom <= heroRect.bottom + 1
          : null,
      formRight: formRect ? Math.round(formRect.right) : null,
      formOverflow: formRect ? Math.round(formRect.right - docW) : null,
      mediaRight: mediaRect ? Math.round(mediaRect.right) : null,
      cta,
      leftover,
      srcBefore,
      docW,
      scrollW,
      hasHorizontalScroll: scrollW > docW + 1,
      overflowing,
      titleAlignedLeft: (() => {
        const h1 = q('.hero h1');
        if (!h1) return null;
        const cs = getComputedStyle(h1);
        return {textAlign: cs.textAlign, fontFamily: cs.fontFamily.slice(0, 40)};
      })(),
    };
  });

  // Chờ 6s để kiểm tra ảnh có tự đổi không
  await new Promise((r) => setTimeout(r, 6000));
  const srcAfter = await page.evaluate(
    () => document.querySelector('.hero__media img')?.getAttribute('src'),
  );

  console.log(JSON.stringify({...result, srcAfter, imgChanged: result.srcBefore !== srcAfter, errors: errors.slice(0, 5)}, null, 2));
} finally {
  await browser.close();
}
