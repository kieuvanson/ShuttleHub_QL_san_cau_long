/**
 * Kiểm tra bằng browser thật cho đợt tách trang chủ / trang tìm sân.
 *
 * Dùng:
 *   node scripts/verify-split.mjs
 */
import puppeteer from 'puppeteer-core';
import { waitScrollSettled } from './lib/wait-scroll-settled.mjs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const results = [];
const check = (name, pass, detail = '') =>
  results.push({ name, pass, detail: String(detail) });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  /* ---------- 1. Trang chủ / chỉ có feed ---------- */
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('article').length > 0, {
    timeout: 20000,
  });

  const home = await page.evaluate(() => ({
    articles: document.querySelectorAll('article').length,
    hero: !!document.querySelector('.hero'),
    featured: !!document.querySelector('.featured'),
    bangGia: !!document.getElementById('bang-gia'),
    faq: !!document.getElementById('faq'),
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    h1VisibleSize: (() => {
      const el = document.querySelector('h1');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    })(),
  }));

  check('/ có feed', home.articles === 8, `articles=${home.articles}`);
  check('/ không có Hero', !home.hero);
  check('/ không có Sân nổi bật', !home.featured);
  check('/ không có #bang-gia', !home.bangGia);
  check('/ không có #faq', !home.faq);
  check('/ có h1', home.h1 === 'Bảng tin cộng đồng cầu lông', home.h1);
  check(
    '/ h1 ẩn thị giác',
    home.h1VisibleSize && home.h1VisibleSize.w <= 1 && home.h1VisibleSize.h <= 1,
    JSON.stringify(home.h1VisibleSize),
  );

  /* ---------- 2. Trang /tim-san ---------- */
  await page.goto(`${BASE}/tim-san`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('ket-qua') !== null, {
    timeout: 20000,
  });

  const disc = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const y = (el) => (el ? Math.round(el.getBoundingClientRect().top) : null);
    return {
      searchCount: document.querySelectorAll('[role="search"]').length,
      hero: !!q('.hero'),
      heroH: q('.hero') ? Math.round(q('.hero').getBoundingClientRect().height) : 0,
      // Chiều cao tối thiểu theo CSS — nếu còn `100svh` thì Hero lại cao
      // nguyên 1 màn hình (điều rút gọn cần tránh).
      heroMinHeight: q('.hero') ? getComputedStyle(q('.hero')).minHeight : null,
      viewportH: window.innerHeight,
      heroTop: y(q('.hero')),
      featuredTop: y(q('.featured')),
      pricingTop: y(q('.pricing')),
      citiesTop: y(q('.cities')),
      faqTop: y(q('.faq')),
      resultsTop: y(q('#ket-qua')),
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
      anchors: {
        bangGia: !!document.getElementById('bang-gia'),
        faq: !!document.getElementById('faq'),
        dieuKhoan: !!document.getElementById('dieu-khoan'),
        chinhSach: !!document.getElementById('chinh-sach'),
        ketQua: !!document.getElementById('ket-qua'),
      },
      linksWithoutHash: [...document.querySelectorAll('a[href*="/tim-san"]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => !h.includes('#')),
      // Link nội bộ NẰM TRONG landing section (dưới khối `.cd`) — đây mới là
      // nhóm link phải có hash. Link nav "Tìm sân cầu lông" ở Header/Footer
      // trỏ tới trang (không có hash) là đúng.
      landingLinksWithoutHash: (() => {
        const landing = [...document.querySelectorAll('.hero, .featured, .pricing, .cities, .faq')];
        return landing
          .flatMap((s) => [...s.querySelectorAll('a[href*="/tim-san"]')])
          .map((a) => a.getAttribute('href'))
          .filter((h) => !h.includes('#'));
      })(),
    };
  });

  check('/tim-san đúng 1 công cụ tìm', disc.searchCount === 1, `count=${disc.searchCount}`);
  check('/tim-san có h1', disc.h1 === 'Tìm sân cầu lông', disc.h1);
  check('/tim-san có đủ anchor', Object.values(disc.anchors).every(Boolean), JSON.stringify(disc.anchors));
  check(
    '/tim-san: link trong landing section đều có hash',
    disc.landingLinksWithoutHash.length === 0,
    disc.landingLinksWithoutHash.join(', '),
  );
  check('/tim-san thứ tự: tìm sân → hero → sân nổi bật → bảng giá → thành phố → FAQ',
    disc.resultsTop < disc.heroTop &&
      disc.heroTop < disc.featuredTop &&
      disc.featuredTop < disc.pricingTop &&
      disc.pricingTop < disc.citiesTop &&
      disc.citiesTop < disc.faqTop,
    JSON.stringify({
      results: disc.resultsTop, hero: disc.heroTop, featured: disc.featuredTop,
      pricing: disc.pricingTop, cities: disc.citiesTop, faq: disc.faqTop,
    }),
  );
  check(
    '/tim-san Hero không cao 1 màn hình',
    disc.heroH < disc.viewportH * 0.75,
    `heroH=${disc.heroH} viewportH=${disc.viewportH}`,
  );
  check(
    '/tim-san Hero không có min-height 100svh',
    !String(disc.heroMinHeight).includes('100svh') &&
      !String(disc.heroMinHeight).includes('100vh'),
    `minHeight=${disc.heroMinHeight}`,
  );

  /* ---------- 3. Anchor scroll từ trang chủ ---------- */
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('article').length > 0, {
    timeout: 20000,
  });

  /**
   * Bấm một link rồi chờ CUỘN ỔN ĐỊNH — smooth-scroll trên trang dài mất
   * vài giây, timeout cố định tạo false negative.
   */
  const clickLink = async (label) => {
    await page.evaluate((text) => {
      const link = [...document.querySelectorAll('a')].find(
        (a) => a.textContent.trim() === text,
      );
      if (!link) throw new Error(`không tìm thấy link "${text}"`);
      link.click();
    }, label);
    await waitScrollSettled(page);
    return page.evaluate(() => ({
      url: location.pathname + location.hash,
      scrollY: Math.round(window.scrollY),
    }));
  };

  const afterBangGia = await clickLink('Bảng giá');
  const bangGiaPos = await page.evaluate(() => {
    const el = document.getElementById('bang-gia');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check('Header "Bảng giá" → /tim-san#bang-gia', afterBangGia.url === '/tim-san#bang-gia', afterBangGia.url);
  check('Header "Bảng giá" → cuộn tới #bang-gia', bangGiaPos !== null && bangGiaPos >= 0 && bangGiaPos < 200, `top=${bangGiaPos}`);

  const afterHoTro = await clickLink('Hỗ trợ');
  const faqPos = await page.evaluate(() => {
    const el = document.getElementById('faq');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check('Header "Hỗ trợ" → /tim-san#faq', afterHoTro.url === '/tim-san#faq', afterHoTro.url);
  check('Header "Hỗ trợ" → cuộn tới #faq', faqPos !== null && faqPos >= 0 && faqPos < 200, `top=${faqPos}`);

  /* ---------- 4. Footer anchor ---------- */
  const afterDieuKhoan = await clickLink('Điều khoản');
  const dkPos = await page.evaluate(() => {
    const el = document.getElementById('dieu-khoan');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check('Footer "Điều khoản" → /tim-san#dieu-khoan', afterDieuKhoan.url === '/tim-san#dieu-khoan', afterDieuKhoan.url);
  check('Footer "Điều khoản" → cuộn tới #dieu-khoan', dkPos !== null && dkPos >= 0 && dkPos < 200, `top=${dkPos}`);

  // Anchor nằm gần ĐÁY trang → dễ bị lệch vì trình duyệt không cuộn được
  // tới vị trí `scroll-margin-top` nếu đó vượt quá maxScroll.
  const afterChinhSach = await clickLink('Chính sách');
  const csPos = await page.evaluate(() => {
    const el = document.getElementById('chinh-sach');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check('Footer "Chính sách" → /tim-san#chinh-sach', afterChinhSach.url === '/tim-san#chinh-sach', afterChinhSach.url);
  check('Footer "Chính sách" → cuộn tới #chinh-sach', csPos !== null && csPos >= 0 && csPos < 200, `top=${csPos}`);

  /* ---------- 5. Link trong landing section → #ket-qua ---------- */
  await page.goto(`${BASE}/tim-san`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.getElementById('ket-qua') !== null, {
    timeout: 20000,
  });

  const afterCa = await clickLink('Xem sân theo ca này');
  const ketQuaPos = await page.evaluate(() => {
    const el = document.getElementById('ket-qua');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check('"Xem sân theo ca này" → /tim-san#ket-qua', afterCa.url === '/tim-san#ket-qua', afterCa.url);
  check('"Xem sân theo ca này" → cuộn tới #ket-qua', ketQuaPos !== null && ketQuaPos >= 0 && ketQuaPos < 200, `top=${ketQuaPos}`);

  /* ---------- 6. Bấm lại cùng anchor vẫn cuộn ---------- */
  // Phải CUỘN RA XA trước, nếu không vị trí đích không đổi thì không chứng
  // minh được là effect đã chạy lại.
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));
  const before = await page.evaluate(() => Math.round(window.scrollY));
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find(
      (a) => a.textContent.trim() === 'Xem sân theo ca này',
    );
    link.click();
  });
  await waitScrollSettled(page);
  const after2 = await page.evaluate(() => Math.round(window.scrollY));
  const kqPos2 = await page.evaluate(() => {
    const el = document.getElementById('ket-qua');
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  });
  check(
    'bấm lại cùng anchor vẫn cuộn',
    after2 > before && kqPos2 !== null && kqPos2 >= 0 && kqPos2 < 200,
    `before=${before} after=${after2} ketQuaTop=${kqPos2}`,
  );
} catch (e) {
  check('script không lỗi', false, String(e));
} finally {
  await browser.close();
}

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} pass`);
process.exitCode = failed ? 1 : 0;
