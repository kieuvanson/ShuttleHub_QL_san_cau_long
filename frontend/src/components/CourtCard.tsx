import { Court, formatPrice } from '../data/demoCourts';
import { Star, MapPin, Check, ArrowRight, Zap, Flame, Sparkles, Clock, Users } from 'lucide-react';
import './CourtCard.css';

type Props = {
  court: Court;
  onBook: (court: Court) => void;
};

export function CourtCard({ court, onBook }: Props) {
  const isGoldenHour = (() => {
    const [h] = court.nextAvailable.split(':').map(Number);
    return h >= 5 && h <= 7;
  })();

  const ratingLabel = court.rating >= 4.7 ? 'Tuyệt vời' : court.rating >= 4.4 ? 'Rất tốt' : 'Tốt';

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
        <svg className="card__floor" viewBox="0 0 320 180" preserveAspectRatio="none">
          <line x1="160" y1="20" x2="160" y2="160" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <rect x="40" y="20" width="240" height="140" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <line x1="40" y1="90" x2="280" y2="90" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        </svg>

        <div className="card__media-tags">
          {court.isHot && (
            <span className="card__tag card__tag--hot">
              <Flame size={11} strokeWidth={2.5} />
              Hot
            </span>
          )}
          {court.isNew && (
            <span className="card__tag card__tag--new">
              <Sparkles size={11} strokeWidth={2.5} />
              Mới
            </span>
          )}
          {isGoldenHour && (
            <span className="card__tag card__tag--gold">
              <Zap size={11} strokeWidth={2.5} />
              Giờ vàng
            </span>
          )}
        </div>

        <div className="card__media-rating">
          <Star size={13} strokeWidth={0} fill="#facc15" />
          <strong>{court.rating.toFixed(1)}</strong>
        </div>
      </div>

      {/* Body — bên phải */}
      <div className="card__body">
        <div className="card__head">
          <h3 className="card__name">{court.name}</h3>
          <div className="card__loc">
            <span className="card__loc-icon"><MapPin size={13} strokeWidth={2.2} /></span>
            <span className="card__loc-text">{court.district}</span>
            <span className="card__loc-sep">·</span>
            <span className="card__rating-chip">
              <span className="card__rating-text">{ratingLabel}</span>
              <strong>{court.rating.toFixed(1)}</strong>
            </span>
          </div>
        </div>

        <div className="card__meta">
          <div className="card__meta-item">
            <span className="card__meta-icon"><Users size={13} strokeWidth={2.2} /></span>
            <span><strong>{court.courtsCount}</strong> sân</span>
          </div>
          <div className="card__meta-item">
            <span className="card__meta-icon"><Clock size={13} strokeWidth={2.2} /></span>
            <span>Trống <strong>{court.nextAvailable}</strong></span>
          </div>
        </div>

        <div className="card__amenities">
          {court.amenities.slice(0, 3).map((a) => (
            <span key={a} className="card__amenity">
              <Check size={11} strokeWidth={3} />
              {a}
            </span>
          ))}
          {court.amenities.length > 3 && (
            <span className="card__amenity card__amenity--more">
              +{court.amenities.length - 3}
            </span>
          )}
        </div>

        <div className="card__foot">
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
            <span>Đặt sân</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}
