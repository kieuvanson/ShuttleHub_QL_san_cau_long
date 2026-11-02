import './Pagination.css';

type Props = {
  current: number;
  total: number;
  onChange: (page: number) => void;
};

export function Pagination({ current, total, onChange }: Props) {
  if (total <= 1) return null;

  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <nav className="pg" aria-label="Phân trang">
      <button
        type="button"
        className="pg__btn pg__btn--nav"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        aria-label="Trang trước"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pg__btn ${p === current ? 'pg__btn--active' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === current ? 'page' : undefined}
          aria-label={`Trang ${p}`}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pg__btn pg__btn--nav"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        aria-label="Trang sau"
      >
        ›
      </button>
    </nav>
  );
}
