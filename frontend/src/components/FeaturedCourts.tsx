import { useNavigate } from 'react-router-dom';
import { DEMO_COURTS, formatPrice } from '../data/demoCourts';
import './FeaturedCourts.css';

export function FeaturedCourts() {
  const navigate = useNavigate();
  const courts = DEMO_COURTS.slice(0, 4);

  return (
    <section className="featured" aria-labelledby="featured-title">
      <div className="featured__inner">
        <div className="featured__head">
          <h2 id="featured-title" className="featured__title">
            Sân nổi bật hôm nay
          </h2>
          <button
            type="button"
            className="featured__more"
            onClick={() => navigate('/tim-san')}
          >
            Xem tất cả <span aria-hidden="true">→</span>
          </button>
        </div>

        <ul className="featured__list">
          {courts.map((court) => (
            <li key={court.id} className="featured__item">
              <button
                type="button"
                className="featured__btn"
                onClick={() => navigate('/tim-san')}
                aria-label={`Đặt sân ${court.name}`}
              >
                <div
                  className="featured__visual"
                  style={{
                    background: `linear-gradient(135deg, ${court.imageGradient[0]} 0%, ${court.imageGradient[1]} 100%)`,
                  }}
                  aria-hidden="true"
                >
                  <span className="featured__badge">
                    {court.courtsCount} sân
                  </span>
                </div>

                <div className="featured__body">
                  <div className="featured__row1">
                    <h3 className="featured__name">{court.name}</h3>
                    <span className="featured__rating" aria-label={`${court.rating} sao`}>
                      {court.rating}★
                    </span>
                  </div>

                  <p className="featured__loc">{court.district}</p>

                  <div className="featured__row2">
                    <span className="featured__avail">
                      Trống lúc {court.nextAvailable}
                    </span>
                    <span className="featured__price">
                      từ {formatPrice(court.priceFrom)}/giờ
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
