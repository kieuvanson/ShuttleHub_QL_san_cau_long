import { Court, formatPrice } from '../data/demoCourts';
import './CourtCard.css';

type Props = {
  court: Court;
  onBook: (court: Court) => void;
};

export function CourtCard({ court, onBook }: Props) {
  const locLine = `${court.district} • ${court.rating.toFixed(1)}★ (128 đánh giá)`;

  // Phân loại badge: nếu nextAvailable là giờ thấp điểm (sáng sớm 5-7h hoặc tối 22-24h) → "Giờ vàng"
  const isGoldenHour = (() => {
    const [h] = court.nextAvailable.split(':').map(Number);
    return h >= 5 && h <= 7;
  })();

  return (
    <article className="card">
      {/* Media — bên trái */}
      <div
        className="card__media"
        style={{
          background: `linear-gradient(135deg, ${court.imageGradient[0]} 0%, ${court.imageGradient[1]} 100%)`,
        }}
        aria-hidden="true"
      >
        {/* Court floor pattern */}
        <svg className="card__floor" viewBox="0 0 320 180" preserveAspectRatio="none">
          <line x1="160" y1="20" x2="160" y2="160" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <rect x="40" y="20" width="240" height="140" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <line x1="40" y1="90" x2="280" y2="90" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        </svg>
      </div>

      {/* Body — bên phải */}
      <div className="card__body">
        <div className="card__head">
          <div className="card__badges">
            <span className={`card__badge ${isGoldenHour ? 'card__badge--gold' : 'card__badge--ok'}`}>
              {isGoldenHour ? 'Giờ vàng' : 'Sân trống'}
            </span>
            <span className="card__courts">{court.courtsCount} sân</span>
          </div>
          <h3 className="card__name">{court.name}</h3>
          <p className="card__loc">{locLine}</p>
        </div>

        <div className="card__amenities">
          {court.amenities.slice(0, 3).map((a) => (
            <span key={a} className="card__amenity">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {a}
            </span>
          ))}
        </div>

        <div className="card__foot">
          <div className="card__time">
            <span className="card__time-label">Trống lúc</span>
            <span className="card__time-value">{court.nextAvailable}</span>
          </div>
          <div className="card__price">
            <span className="card__price-value">{formatPrice(court.priceFrom)}</span>
            <span className="card__price-unit">/giờ</span>
          </div>
          <button
            type="button"
            className="card__cta"
            onClick={() => onBook(court)}
            aria-label={`Đặt sân ${court.name}`}
          >
            Đặt sân
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
