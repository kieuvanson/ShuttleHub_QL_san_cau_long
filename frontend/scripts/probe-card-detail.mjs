/**
 * Đo geometry từng phần tử trong card featured/cities để tìm nguyên nhân
 * overlap-text, collide, cut-text, contrast.
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = process.argv[2] ?? 'http://localhost:5173';
const width = Number(process.argv[3] ?? 1440);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900 });
await page.goto(`${base}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const out = await page.evaluate(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x), y: Math.round(r.y),
      w: Math.round(r.width), h: Math.round(r.height),
      sw: el.scrollWidth, cw: el.clientWidth,
      sh: el.scrollHeight, ch: el.clientHeight,
    };
  };
  const pick = (el) => {
    const cs = getComputedStyle(el);
    return {
      ...rect(el),
      tag: el.tagName.toLowerCase(),
      cls: el.className?.toString().slice(0, 60),
      text: (el.textContent || '').trim().slice(0, 40),
      display: cs.display,
      clamp: cs.webkitLineClamp,
      overflow: cs.overflow,
      flex: cs.flex,
      minH: cs.minHeight,
      h: cs.height,
    };
  };

  const grid = document.querySelector('.featured__grid');
  const cards = [...document.querySelectorAll('.featured__card')].map((c) => {
    const kids = [...c.children].map(pick);
    const name = c.querySelector('.featured__name');
    const district = c.querySelector('.featured__body span');
    const rangeRect = name ? (() => {
      const r = document.createRange();
      r.selectNodeContents(name);
      return [...r.getClientRects()].map((x) => ({
        x: Math.round(x.x), y: Math.round(x.y),
        w: Math.round(x.width), h: Math.round(x.height),
      }));
    })() : null;
    return {
      card: pick(c),
      kids,
      name: name ? pick(name) : null,
      nameRects: rangeRect,
      district: district ? pick(district) : null,
    };
  });

  return {
    grid: grid ? pick(grid) : null,
    gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    cards,
  };
});

process.stdout.write(JSON.stringify(out, null, 1));
await browser.close();
