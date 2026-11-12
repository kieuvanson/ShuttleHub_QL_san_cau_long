/**
 * Kiểm tra trang /dang-nhap: card Astryx, tab, nút submit >= 44px,
 * social buttons (Google/Facebook) render đúng href, không tràn ngang.
 *
 * Dùng: node scripts/check-auth.mjs [url] [width]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] ?? 'http://localhost:5173/dang-nhap';
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
  await page.waitForSelector('.auth__card', {timeout: 30000});
  await new Promise((r) => setTimeout(r, 800));

  const result = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const scrollW = document.documentElement.scrollWidth;
    const socials = [...document.querySelectorAll('.auth__social')];

    return {
      cardIsAstryx: !!document.querySelector('.auth__card.astryx-card'),
      title: document.querySelector('.auth__title')?.textContent?.trim() ?? null,
      titleTag: document.querySelector('.auth__title')?.tagName ?? null,
      tabs: [...document.querySelectorAll('.auth__tab')].map((t) => t.textContent.trim()),
      submitLabel: document.querySelector('.auth__submit')?.textContent?.trim() ?? null,
      submitTag: document.querySelector('.auth__submit')?.tagName ?? null,
      submitHeight: Math.round(
        document.querySelector('.auth__submit')?.getBoundingClientRect().height ?? 0,
      ),
      socials: socials.map((s) => ({
        tag: s.tagName,
        text: s.textContent.trim(),
        href: s.getAttribute('href'),
        height: Math.round(s.getBoundingClientRect().height),
      })),
      divider: document.querySelector('.auth__divider')?.textContent?.trim() ?? null,
      inputCount: document.querySelectorAll('.auth__form input').length,
      docW,
      scrollW,
      hasHorizontalScroll: scrollW > docW + 1,
    };
  });

  console.log(JSON.stringify({...result, errors: errors.slice(0, 5)}, null, 2));
} finally {
  await browser.close();
}
