import { describe, expect, it } from 'vitest';
import { shortDisplayName } from './displayName';

describe('shortDisplayName', () => {
  it('"Kieu Van Son" → "Son" (lấy từ cuối)', () => {
    expect(shortDisplayName('Kieu Van Son')).toBe('Son');
  });

  it('"Nguyễn Văn A" → "A"', () => {
    expect(shortDisplayName('Nguyễn Văn A')).toBe('A');
  });

  it('tên chỉ 1 từ → giữ nguyên', () => {
    expect(shortDisplayName('Son')).toBe('Son');
  });

  it('tên null → null', () => {
    expect(shortDisplayName(null)).toBeNull();
  });

  it('tên undefined → null', () => {
    expect(shortDisplayName(undefined)).toBeNull();
  });

  it('tên chỉ khoảng trắng → null', () => {
    expect(shortDisplayName('   ')).toBeNull();
  });

  it('tên nhiều khoảng trắng giữa → vẫn lấy đúng từ cuối', () => {
    expect(shortDisplayName('  Kieu   Van   Son  ')).toBe('Son');
  });
});
