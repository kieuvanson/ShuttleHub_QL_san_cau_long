/**
 * Bọc CSS legacy của project vào `@layer app`.
 *
 * Lý do: Astryx đặt style component trong layer `astryx-base` (cao hơn).
 * CSS legacy nếu để unlayered sẽ thắng mọi named layer → xoá style của
 * Button/Card/Badge. Đưa vào `app` để thua `astryx-base`.
 *
 * Chạy: node scripts/wrap-legacy-css-in-app-layer.mjs
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const ROOT = resolve(process.cwd());

const FILES = [
  'src/components/Layout.css',
  'src/components/Header.css',
  'src/components/Footer.css',
  'src/components/Hero.css',
  'src/components/SearchBar.css',
  'src/components/FeaturedCourts.css',
  'src/components/CitiesSection.css',
  'src/components/FaqSection.css',
  'src/components/CourtCard.css',
  'src/components/QuickSearchBar.css',
  'src/components/FilterPanel.css',
  'src/components/Pagination.css',
  'src/components/MapPanel.css',
  'src/components/OtpInput.css',
  'src/components/BookingHeader.css',
  'src/pages/Home.css',
  'src/pages/CourtDiscovery.css',
  'src/pages/AuthLayout.css',
  'src/pages/OAuthCallbackPage.css',
  'src/pages/FacebookCompletePage.css',
];

let changed = 0;
let skipped = 0;

for (const rel of FILES) {
  const abs = resolve(ROOT, rel);
  let css;
  try {
    css = readFileSync(abs, 'utf8');
  } catch {
    console.log(`[skip] không tồn tại: ${rel}`);
    skipped += 1;
    continue;
  }

  if (/@layer\s+app\s*\{/.test(css)) {
    console.log(`[skip] đã bọc layer: ${rel}`);
    skipped += 1;
    continue;
  }

  // Tách comment đầu file (nếu có) ra ngoài @layer để dễ đọc.
  const commentMatch = css.match(/^\s*\/\*[\s\S]*?\*\/\s*/);
  const header = commentMatch ? commentMatch[0] : '';
  const body = commentMatch ? css.slice(commentMatch[0].length) : css;

  const wrapped = `${header}@layer app {\n${body.trimEnd()}\n}\n`;
  writeFileSync(abs, wrapped, 'utf8');
  console.log(`[ok] bọc layer app: ${rel}`);
  changed += 1;
}

console.log(`\nXong: ${changed} file bọc, ${skipped} file bỏ qua.`);
