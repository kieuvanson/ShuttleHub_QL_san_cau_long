import { AREAS } from '../data/demoCourts';
import { MapPin, CalendarDays, Search } from 'lucide-react';
import './QuickSearchBar.css';

type Props = {
  city: string;
  date: string;
  onCityChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onViewSchedule: () => void;
};

export function QuickSearchBar({ city, date, onCityChange, onDateChange, onViewSchedule }: Props) {
  const selectedArea = AREAS.find((a) => a.id === city);
  const today = new Date(date);

  return (
    <div className="qsb" role="search" aria-label="Cầu Lông dee — Tìm sân nhanh">
      <div className="qsb__field">
        <span className="qsb__icon" aria-hidden="true">
          <MapPin size={20} strokeWidth={2.2} />
        </span>
        <div className="qsb__field-body">
          <span className="qsb__label">Khu vực</span>
          <select
            className="qsb__select"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            aria-label="Chọn khu vực"
          >
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          <span className="qsb__hint">{selectedArea?.count ?? 0} cụm sân</span>
        </div>
      </div>

      <div className="qsb__divider" aria-hidden="true" />

      <div className="qsb__field">
        <span className="qsb__icon" aria-hidden="true">
          <CalendarDays size={20} strokeWidth={2.2} />
        </span>
        <div className="qsb__field-body">
          <span className="qsb__label">Ngày thi đấu</span>
          <input
            className="qsb__input"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Chọn ngày"
          />
          <span className="qsb__hint">
            {today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
          </span>
        </div>
      </div>

      <button type="button" className="qsb__cta" onClick={onViewSchedule}>
        <Search size={16} strokeWidth={2.5} />
        <span>Xem lịch</span>
      </button>
    </div>
  );
}
