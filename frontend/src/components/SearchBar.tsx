import { useState } from 'react';
import { AREAS } from '../data/demoCourts';
import './SearchBar.css';

export function SearchBar() {
  const [city, setCity] = useState<string>('all');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>('18:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Future: navigate to /tim-san?city=...&date=...&time=...
    console.log('[search]', { city, date, time });
  };

  return (
    <section className="search" aria-label="Tìm sân nhanh">
      <div className="search__inner">
        <form className="search__form" onSubmit={handleSubmit} role="search">
          <div className="search__field">
            <label className="search__label" htmlFor="search-city">
              Khu vực
            </label>
            <select
              id="search-city"
              className="search__input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="search__sep" aria-hidden="true" />

          <div className="search__field">
            <label className="search__label" htmlFor="search-date">
              Ngày
            </label>
            <input
              id="search-date"
              className="search__input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="search__sep" aria-hidden="true" />

          <div className="search__field">
            <label className="search__label" htmlFor="search-time">
              Giờ
            </label>
            <input
              id="search-time"
              className="search__input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <button className="search__submit" type="submit">
            Tìm sân
          </button>
        </form>
      </div>
    </section>
  );
}
