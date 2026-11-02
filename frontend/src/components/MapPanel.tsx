import { useState } from 'react';
import { Court } from '../data/demoCourts';
import { MapPin, Search, Navigation, Phone, X } from 'lucide-react';
import './MapPanel.css';

type Props = {
  courts: Court[];
  selectedId?: string;
  onSelect?: (id: string) => void;
};

export function MapPanel({ courts, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const selected = courts.find((c) => c.id === selectedId);

  return (
    <aside className="mp" aria-label="Bản đồ sân">
      <div className="mp__viewport">
        {/* Lưới + đường giả */}
        <div className="mp__grid" aria-hidden="true" />
        <svg className="mp__roads" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M0 120 Q 200 100 400 140 T 800 100" stroke="#cbd5e1" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M0 260 Q 220 280 400 240 T 800 280" stroke="#cbd5e1" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M120 0 L 160 420" stroke="#cbd5e1" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M380 0 L 420 420" stroke="#cbd5e1" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M620 0 L 660 420" stroke="#cbd5e1" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Sông / mảng xanh */}
          <path d="M0 380 Q 200 360 400 400 T 800 380" stroke="#86efac" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.6" />
        </svg>

        {/* Marker sân */}
        {courts.map((c, i) => {
          const cols = 3;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = 100 + col * 220 + (i % 4) * 30;
          const y = 80 + row * 100 + (i % 3) * 20;
          const isActive = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              className={`mp__pin ${isActive ? 'mp__pin--active' : ''}`}
              style={{ left: `${x}px`, top: `${y}px` }}
              onClick={() => onSelect?.(c.id)}
              aria-label={`Xem vị trí ${c.name}`}
            >
              <span className="mp__pin-dot" />
              <span className="mp__pin-label">{formatPrice(c.priceFrom)}</span>
            </button>
          );
        })}

        {/* Legend */}
        <div className="mp__legend" aria-hidden="true">
          <span className="mp__legend-dot" />
          <span><strong>{courts.length}</strong> sân khả dụng</span>
        </div>

        {/* Search bar nổi */}
        <div className="mp__search">
          <Search size={16} strokeWidth={2.2} />
          <input
            type="text"
            placeholder="Tìm quận, khu vực…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mp__search-input"
            aria-label="Tìm khu vực trên bản đồ"
          />
          {query && (
            <button
              type="button"
              className="mp__search-clear"
              onClick={() => setQuery('')}
              aria-label="Xóa"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Recenter FAB */}
        <button type="button" className="mp__fab" aria-label="Về trung tâm">
          <Navigation size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* Card preview sân đang chọn */}
      {selected && (
        <div className="mp__card" role="status">
          <button
            type="button"
            className="mp__card-close"
            onClick={() => onSelect?.(undefined as unknown as string)}
            aria-label="Đóng"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
          <div className="mp__card-icon" aria-hidden="true">
            <MapPin size={18} strokeWidth={2.2} />
          </div>
          <div className="mp__card-body">
            <h4 className="mp__card-title">{selected.name}</h4>
            <p className="mp__card-sub">{selected.district} · {formatPrice(selected.priceFrom)}/giờ</p>
          </div>
          <button type="button" className="mp__card-cta" aria-label="Gọi điện">
            <Phone size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}
    </aside>
  );
}

function formatPrice(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}
