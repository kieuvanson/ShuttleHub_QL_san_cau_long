/**
 * Gán ảnh minh hoạ cho các sân demo trong demoCourts.ts.
 * Dùng: node scripts/assign-court-images.mjs
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const FILE = resolve(process.cwd(), 'src/data/demoCourts.ts');

// 4 sân đầu (hiện ở trang chủ) dùng 4 ảnh khác nhau → không ảnh nào lặp
// trong cùng trang. /tim-san phân trang 4/trang nên cũng không lặp trong trang.
const MAP = {
  'c-001': '/img/court-01.jpg',
  'c-002': '/img/court-02.jpg',
  'c-003': '/img/court-03.jpg',
  'c-004': '/img/court-04.jpg',
  'c-005': '/img/court-02.jpg',
  'c-006': '/img/court-03.jpg',
  'c-007': '/img/court-04.jpg',
  'c-008': '/img/court-01.jpg',
};

let src = readFileSync(FILE, 'utf8');
let count = 0;

for (const [id, image] of Object.entries(MAP)) {
  const re = new RegExp(`(id: '${id}',[\\s\\S]*?amenities: \\[[^\\]]*\\],\\n)(\\s*)imageGradient`);
  const before = src;
  src = src.replace(re, (_m, head, indent) => {
    count += 1;
    return `${head}${indent}image: '${image}',\n${indent}imageGradient`;
  });
  if (before === src) console.log(`[warn] không khớp: ${id}`);
}

writeFileSync(FILE, src, 'utf8');
console.log(`Đã gán ${count}/${Object.keys(MAP).length} ảnh.`);
