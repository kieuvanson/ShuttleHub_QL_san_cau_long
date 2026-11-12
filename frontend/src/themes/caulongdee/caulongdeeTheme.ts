import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/**
 * Theme Cầu Lông dee — fork từ Neutral, phủ bộ nhận diện cam (accent) + teal (nhấn).
 *
 * Quy tắc: theme là nguồn sự thật của mọi token Astryx. Token trùng tên trong
 * `src/styles/tokens.css` chỉ là dự phòng cho lúc theme chưa load.
 */
export const caulongdeeTheme = defineTheme({
  name: 'caulongdee',

  // Kế thừa toàn bộ token, component override, icon registry của Neutral rồi
  // phủ lại bằng bộ nhận diện Cầu Lông dee.
  extends: neutralTheme,

  typography: {
    scale: {base: 16, ratio: 1.2},
    body: {
      family: 'Inter',
      fallbacks: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    heading: {
      family: 'Bricolage Grotesque',
      fallbacks: 'Inter, -apple-system, sans-serif',
      weights: {1: 'bold', 2: 'bold'},
    },
    code: {family: 'JetBrains Mono', fallbacks: 'ui-monospace, monospace'},
  },

  radius: {base: 6, multiplier: 1.6},

  motion: {fast: 150, medium: 320, slow: 700, ratio: 0.75},

  // Token riêng của brand — không bị validate theo danh sách token chuẩn.
  localTokens: {
    '--cl-teal': '#0f766e',
    '--cl-teal-hover': '#115e59',
  },

  tokens: {
    '--color-accent': ['#c2410c', '#fb923c'],
    '--color-on-accent': ['#ffffff', '#1c1917'],
    '--color-background-body': ['#ffffff', '#111112'],
    '--color-background-surface': ['#f8f9fc', '#1a1a1c'],
    '--color-background-muted': ['#eef0f6', '#26262a'],
    '--color-text-primary': ['#0f172a', '#f5f5f6'],
    '--color-text-secondary': ['#475569', '#a1a1aa'],
    '--color-text-disabled': ['#94a3b8', '#71717a'],
    '--color-border': ['#e5e7eb', '#3f3f46'],
    '--focus-outline-color': 'var(--color-accent)',
  },

  components: {
    // Màu nhấn teal của brand dùng cho điểm đánh giá, khung giờ trống,
    // và các nhãn "số liệu" — cam accent không đủ tương phản trên nền trắng.
    text: {
      'color:teal': {color: 'var(--cl-teal)'},
    },
    button: {
      base: {
        borderRadius: 'var(--radius-full)',
        fontWeight: 'var(--font-weight-semibold)',
      },
      'variant:primary': {
        backgroundColor: 'var(--color-accent)',
        color: 'var(--color-on-accent)',
        ':hover': {backgroundColor: '#9a3412'},
      },
    },
    card: {
      base: {
        borderRadius: 'var(--radius-container)',
      },
    },
    'clickable-card': {
      base: {borderRadius: 'var(--radius-container)'},
    },
    badge: {
      base: {borderRadius: 'var(--radius-full)'},
    },
  },
});
