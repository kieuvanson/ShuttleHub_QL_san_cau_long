/**
 * Đo khoảng hở giữa các section theo đúng cách check `section-gaps` của
 * skill taste-skill (extent của nội dung, không phải mép section),
 * ở đúng kích thước viewport mà audit dùng.
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const base = process.argv[2] ?? 'http://localhost:5173';
const sizes = [
  [1440, 900], [1024, 768], [820, 1180], [768, 1024], [390, 844],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();

for (const [w, h] of sizes) {
  await page.setViewport({ width: w, height: h });
  await page.goto(`${base}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 700));

  const out = await page.evaluate(() => {
    const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'NOSCRIPT']);
    const MEDIA = new Set(['IMG', 'PICTURE', 'VIDEO', 'CANVAS']);
    const shown = (e, r) => {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      return r.width > 1 && r.height > 1;
    };
    const ownText = (e) => {
      for (const n of e.childNodes) {
        if (n.nodeType === 3 && n.textContent.trim()) return true;
      }
      return false;
    };
    const INTER = 'a,button,input,select,textarea,[role="button"],[role="link"]';
    const alphaOf = (c) => {
      const m = String(c).match(/rgba?\(([^)]+)\)/);
      if (!m) return c === 'transparent' ? 0 : 1;
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      return p.length > 3 ? parseFloat(p[3]) : 1;
    };
    const sides = (s) => ['Top', 'Right', 'Bottom', 'Left']
      .filter((k) => parseFloat(s['border' + k + 'Width']) > 0 && s['border' + k + 'Style'] !== 'none' && alphaOf(s['border' + k + 'Color']) > 0.05).length;
    // một hộp có nền/viền/bóng → chạm tới mép của nó, không phải mép chữ
    const faintBox = (s) =>
      alphaOf(s.backgroundColor) > 0.03 || (s.boxShadow && s.boxShadow !== 'none') || sides(s) >= 3;
    const quickKind = (e) => e.matches(INTER);
    const lines = (e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      return [...r.getClientRects()].filter((x) => x.width > 1 && x.height > 1);
    };
    const extent = (sec) => {
      let top = Infinity, bottom = -Infinity;
      for (const e of sec.querySelectorAll('*')) {
        if (SKIP.has(e.tagName)) continue;
        const r = e.getBoundingClientRect();
        if (!shown(e, r)) continue;
        const cs = getComputedStyle(e);
        let box = null;
        if (MEDIA.has(e.tagName)) box = r;
        else if ((quickKind(e) || faintBox(cs)) && r.width < innerWidth * 0.98 &&
                 (!ownText(e) || (e.matches(INTER) && r.height <= 120))) box = r;
        else if (ownText(e)) {
          const ls = lines(e);
          if (ls.length) box = { left: Math.min(...ls.map((l) => l.left)), right: Math.max(...ls.map((l) => l.right)), top: Math.min(...ls.map((l) => l.top)), bottom: Math.max(...ls.map((l) => l.bottom)) };
        }
        if (!box) continue;
        top = Math.min(top, box.top); bottom = Math.max(bottom, box.bottom);
      }
      return isFinite(top) ? { top, bottom } : null;
    };
    const secs = [...document.querySelectorAll('main > section, main > div, footer')];
    const out = [];
    for (let i = 0; i + 1 < secs.length; i++) {
      const a = extent(secs[i]), b = extent(secs[i + 1]);
      if (!a || !b) continue;
      out.push({
        a: secs[i].className.toString().split(' ')[0] || secs[i].tagName,
        b: secs[i + 1].className.toString().split(' ')[0] || secs[i + 1].tagName,
        gap: Math.round(b.top - a.bottom),
      });
    }
    const gaps = out.map((o) => o.gap).sort((x, y) => x - y);
    const med = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
    return { gaps: out, median: med };
  });

  console.log(`--- ${w}x${h}  median=${out.median}`);
  for (const g of out.gaps) {
    const dev = out.median ? (g.gap - out.median) / out.median : 0;
    console.log(`   ${g.a} -> ${g.b}: ${g.gap}px (${dev > 0 ? '+' : ''}${Math.round(dev * 100)}%)${Math.abs(dev) > 0.25 ? '  <<< ' : ''}`);
  }
}

await browser.close();
