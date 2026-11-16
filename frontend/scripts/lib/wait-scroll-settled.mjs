/**
 * Helper dùng chung cho các script kiểm tra bằng puppeteer.
 */

/**
 * Chờ cuộn trang ỔN ĐỊNH.
 *
 * `scrollIntoView({behavior: 'smooth'})` trên trang dài (~7000px) mất vài
 * giây mới tới đích. Timeout cố định (1200ms, 1400ms) là chưa đủ và tạo
 * false negative — script báo FAIL dù hành vi thực tế đúng.
 *
 * Ta poll `scrollY` cho tới khi nó không đổi trong 2 lần liên tiếp
 * (tối đa 8 giây).
 */
export async function waitScrollSettled(page, { timeoutMs = 8000 } = {}) {
  let last = null;
  let stable = 0;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) {
      stable++;
      if (stable >= 2) return;
    } else {
      stable = 0;
      last = y;
    }
  }
}
