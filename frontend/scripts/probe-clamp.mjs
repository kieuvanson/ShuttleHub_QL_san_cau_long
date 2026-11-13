/**
 * Kiểm tra hành vi thật của `display:-webkit-box` + `-webkit-line-clamp`
 * và của property chuẩn `line-clamp` trên Chrome hiện tại.
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
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });

const out = await page.evaluate(() => {
  const mk = (style) => {
    const d = document.createElement('div');
    d.style.cssText = 'width:120px;font:16px/24px sans-serif;';
    d.style.cssText += style;
    d.textContent = 'Cầu Lông dee Hai Bà Trưng quận một Việt Nam rất đẹp và xanh';
    document.body.appendChild(d);
    const cs = getComputedStyle(d);
    const r = {
      style,
      computedDisplay: cs.display,
      lineClamp: cs.webkitLineClamp,
      standardLineClamp: cs.lineClamp,
      height: d.getBoundingClientRect().height,
      scrollHeight: d.scrollHeight,
      clientHeight: d.clientHeight,
      scrollWidth: d.scrollWidth,
      clientWidth: d.clientWidth,
    };
    d.remove();
    return r;
  };

  return {
    ua: navigator.userAgent,
    results: [
      mk('display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;'),
      mk('display:block;line-clamp:1;overflow:hidden;'),
      mk('display:-webkit-box;-webkit-box-orient:vertical;line-clamp:1;overflow:hidden;'),
      mk('display:block;-webkit-line-clamp:1;overflow:hidden;'),
      mk('display:flow-root;-webkit-line-clamp:1;overflow:hidden;'),
    ],
  };
});

console.log(JSON.stringify(out, null, 1));
await browser.close();
