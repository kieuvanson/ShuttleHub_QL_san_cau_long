import {describe, expect, it} from 'vitest';
import {
  DEMO_MY_BOOKINGS,
  DEMO_MY_MOMENTS,
  DEMO_MY_POSTS,
  DEMO_SKILL_LEVEL,
  PROFILE_ROLE_LABEL,
} from './demoProfile';

describe('demoProfile', () => {
  it('có bài viết của tôi, mỗi bài có id khác nhau', () => {
    expect(DEMO_MY_POSTS.length).toBeGreaterThan(0);
    expect(new Set(DEMO_MY_POSTS.map((p) => p.id)).size).toBe(DEMO_MY_POSTS.length);
  });

  it('bài của tôi có đủ 4 loại bài', () => {
    const categories = new Set(DEMO_MY_POSTS.map((p) => p.category));
    expect(categories.size).toBe(4);
  });

  it('có cả 3 loại kèo và cả 2 trạng thái', () => {
    expect(new Set(DEMO_MY_BOOKINGS.map((b) => b.type)).size).toBe(3);
    expect(new Set(DEMO_MY_BOOKINGS.map((b) => b.status)).size).toBe(2);
  });

  it('kèo sắp tới đứng trước kèo đã hoàn thành', () => {
    const firstDone = DEMO_MY_BOOKINGS.findIndex((b) => b.status === 'done');
    const lastUpcoming = DEMO_MY_BOOKINGS.map((b) => b.status).lastIndexOf('upcoming');
    expect(lastUpcoming).toBeLessThan(firstDone);
  });

  it('mọi khoảnh khắc có ảnh và ghi chú', () => {
    for (const m of DEMO_MY_MOMENTS) {
      expect(m.image).toMatch(/^\/img\//);
      expect(m.caption.length).toBeGreaterThan(0);
    }
  });

  it('có nhãn vai trò cho CUSTOMER / ADMIN / EMPLOYEE', () => {
    expect(PROFILE_ROLE_LABEL.CUSTOMER).toBe('Khách');
    expect(PROFILE_ROLE_LABEL.ADMIN).toBe('Chủ sân');
    expect(PROFILE_ROLE_LABEL.EMPLOYEE).toBe('Nhân viên');
  });

  it('trình độ là chuỗi không rỗng', () => {
    expect(DEMO_SKILL_LEVEL.length).toBeGreaterThan(0);
  });
});
