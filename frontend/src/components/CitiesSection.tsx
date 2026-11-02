import { useNavigate } from 'react-router-dom';
import { AREAS } from '../data/demoCourts';
import './CitiesSection.css';

const CITY_BLURBS: Record<string, { count: string; tag: string }> = {
  hanoi:    { count: '120+ sân',  tag: 'Trung tâm & ngoại thành' },
  hcm:      { count: '180+ sân',  tag: 'Quận trung tâm' },
  danang:   { count: '40+ sân',   tag: 'View biển Đà Nẵng' },
  haiphong: { count: '30+ sân',   tag: 'Hải Phòng' },
  cantho:   { count: '20+ sân',   tag: 'Miền Tây' },
};

export function CitiesSection() {
  const navigate = useNavigate();
  const cities = AREAS.filter((a) => a.id !== 'all');

  return (
    <section className="cities" aria-labelledby="cities-title">
      <div className="cities__inner">
        <div className="cities__head">
          <h2 id="cities-title" className="cities__title">
            Tìm theo thành phố
          </h2>
        </div>

        <ul className="cities__list">
          {cities.map((city) => {
            const blurb = CITY_BLURBS[city.id];
            return (
              <li key={city.id} className="cities__item">
                <button
                  type="button"
                  className="cities__btn"
                  onClick={() => navigate('/tim-san')}
                >
                  <span className="cities__name">{city.label}</span>
                  {blurb && (
                    <span className="cities__tag">{blurb.count} · {blurb.tag}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
