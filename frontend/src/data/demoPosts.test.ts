import {describe, expect, it} from 'vitest';
import {
  DEMO_PLAYERS,
  DEMO_POSTS,
  DEMO_STORIES,
  DEMO_SUGGESTED,
  POST_CATEGORY_LABEL,
} from './demoPosts';

describe('dữ liệu demo feed', () => {
  it('có đúng 8 bài viết', () => {
    expect(DEMO_POSTS).toHaveLength(8);
  });

  it('mỗi bài có id duy nhất', () => {
    const ids = DEMO_POSTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mỗi bài có nhãn tiếng Việt cho loại của nó', () => {
    for (const post of DEMO_POSTS) {
      expect(POST_CATEGORY_LABEL[post.category]).toBeTruthy();
      expect(POST_CATEGORY_LABEL[post.category].length).toBeGreaterThan(0);
    }
  });

  it('có đủ 4 loại bài, mỗi loại ít nhất 1 bài', () => {
    const kinds = new Set(DEMO_POSTS.map((p) => p.category));
    expect(kinds.size).toBe(4);
  });

  it('mọi bài đều có nội dung không rỗng và số đếm không âm', () => {
    for (const post of DEMO_POSTS) {
      expect(post.content.trim().length).toBeGreaterThan(0);
      expect(post.likeCount).toBeGreaterThanOrEqual(0);
      expect(post.commentCount).toBeGreaterThanOrEqual(0);
      expect(post.shareCount).toBeGreaterThanOrEqual(0);
    }
  });

  it('bài có ảnh thì phải có alt text mô tả ảnh', () => {
    for (const post of DEMO_POSTS) {
      if (post.image) {
        expect(post.imageAlt?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it('story đầu tiên là ô thêm khoảnh khắc', () => {
    expect(DEMO_STORIES[0]?.isAdd).toBe(true);
    expect(DEMO_STORIES).toHaveLength(5);
  });

  it('sidebar có 4 người đang tuyển và 3 gợi ý', () => {
    expect(DEMO_PLAYERS).toHaveLength(4);
    expect(DEMO_SUGGESTED).toHaveLength(3);
  });
});
