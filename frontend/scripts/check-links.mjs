/**
 * Kiểm tra link chết + tap target của Header/Footer.
 *
 * Dùng: node scripts/check-links.mjs [url]
 */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] ?? 'http://localhost:5173/';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({width: 390, height: 844});
  await page.goto(url, {waitUntil: 'networkidle2', timeout: 60000});
  await page.waitForFunction(
    () => document.getElementById('root')?.innerText?.trim().length > 20,
    {timeout: 30000},
  );

  const result = await page.evaluate(() => {
    const deadLinks = [...document.querySelectorAll('a[href]')]
      .filter((a) => a.getAttribute('href') === '#' || a.getAttribute('href') === '')
      .map((a) => `${a.className || '(no class)'} :: ${a.textContent.trim()}`);

    const allLinks = [...document.querySelectorAll('a[href]')].map((a) => ({
      text: a.textContent.trim().slice(0, 40),
      href: a.getAttribute('href'),
      h: Math.round(a.getBoundingClientRect().height),
    }));

    // Tap target < 44px trong Header/Footer
    const smallTargets = allLinks
      .filter((l) => l.h > 0 && l.h < 44)
      .map((l) => `${l.text} (${l.href}) = ${l.h}px`);

    return {
      deadLinks,
      smallTargets,
      linkCount: allLinks.length,
      links: allLinks,
    };
  });

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
