import { Court } from '../data/demoCourts';
import { RotateCcw, Sparkles, X } from 'lucide-react';
import './FilterPanel.css';

export type FilterState = {
  dates: string[]; // id: 'today' | 'tomorrow' | 'weekend'
  hours: string[]; // 'morning' | 'afternoon' | 'evening'
  type: string; // 'all' | 'indoor' | 'outdoor'
  amenities: string[]; // 'ac' | 'parking' | 'rental' | 'locker' | 'shower' | 'canteen'
  courtCount: string; // 'any' | '1-3' | '3-5' | '5+'
  priceMax: number; // 0 = không giới hạn
};

export const DEFAULT_FILTER: FilterState = {
  dates: [],
  hours: [],
  type: 'all',
  amenities: [],
  courtCount: 'any',
  priceMax: 200000,
};

type Props = {
  value: FilterState;
  onChange: (next: FilterState) => void;
  totalCourts: number;
};

const DATES = [
  { id: 'today', label: 'Hôm nay', count: 8 },
  { id: 'tomorrow', label: 'Ngày mai', count: 12 },
  { id: 'weekend', label: 'Cuối tuần', count: 18 },
] as const;

const HOURS = [
  { id: 'morning', label: 'Sáng (5-12h)', count: 5 },
  { id: 'afternoon', label: 'Chiều (12-17h)', count: 7 },
  { id: 'evening', label: 'Tối (17-24h)', count: 9 },
] as const;

const TYPES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'indoor', label: 'Trong nhà' },
  { id: 'outdoor', label: 'Ngoài trời' },
] as const;

const AMENITIES = [
  { id: 'ac', label: 'Máy lạnh' },
  { id: 'parking', label: 'Bãi đỗ xe' },
  { id: 'rental', label: 'Thuê vợt' },
  { id: 'locker', label: 'Tủ đồ' },
  { id: 'shower', label: 'Phòng tắm' },
  { id: 'canteen', label: 'Căng-tin' },
] as const;

const COURT_COUNTS = [
  { id: 'any', label: 'Tất cả' },
  { id: '1-3', label: '1 – 3 sân' },
  { id: '3-5', label: '3 – 5 sân' },
  { id: '5+', label: '5+ sân' },
] as const;

const PRICE_MARKS = [0, 50000, 100000, 150000, 200000];
const PRICE_LABELS = ['0', '50K', '100K', '150K', '200K+'];

export function FilterPanel({ value, onChange, totalCourts }: Props) {
  const toggleArr = (key: 'dates' | 'hours' | 'amenities', id: string) => {
    const list = value[key];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    onChange({ ...value, [key]: next });
  };

  const activeCount =
    value.dates.length +
    value.hours.length +
    value.amenities.length +
    (value.type !== 'all' ? 1 : 0) +
    (value.courtCount !== 'any' ? 1 : 0) +
    (value.priceMax > 0 && value.priceMax < 200000 ? 1 : 0);

  return (
    <div className="fp" role="group" aria-label="Bộ lọc sân">
      <div className="fp__head">
        <div className="fp__head-left">
          <div className="fp__head-icon" aria-hidden="true">
            <Sparkles size={14} strokeWidth={2.5} />
          </div>
          <div className="fp__head-titles">
            <span className="fp__title">Bộ lọc thông minh</span>
            <span className="fp__sub">{totalCourts} sân phù hợp · {activeCount} đang lọc</span>
          </div>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            className="fp__reset"
            onClick={() => onChange(DEFAULT_FILTER)}
            aria-label="Đặt lại bộ lọc"
          >
            <RotateCcw size={12} strokeWidth={2.5} />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      <div className="fp__groups">
        <Group icon="📅" title="Ngày thi đấu">
          {DATES.map((d) => (
            <Pill
              key={d.id}
              label={d.label}
              count={d.count}
              active={value.dates.includes(d.id)}
              onClick={() => toggleArr('dates', d.id)}
            />
          ))}
        </Group>

        <Group icon="🕐" title="Khung giờ">
          {HOURS.map((h) => (
            <Pill
              key={h.id}
              label={h.label}
              count={h.count}
              active={value.hours.includes(h.id)}
              onClick={() => toggleArr('hours', h.id)}
            />
          ))}
        </Group>

        <Group icon="🏸" title="Thể loại sân">
          {TYPES.map((t) => (
            <Pill
              key={t.id}
              label={t.label}
              active={value.type === t.id}
              onClick={() => onChange({ ...value, type: t.id })}
            />
          ))}
        </Group>

        <Group icon="✨" title="Tiện ích">
          {AMENITIES.map((a) => (
            <Pill
              key={a.id}
              label={a.label}
              active={value.amenities.includes(a.id)}
              onClick={() => toggleArr('amenities', a.id)}
            />
          ))}
        </Group>

        <Group icon="#️⃣" title="Số sân / cụm">
          {COURT_COUNTS.map((c) => (
            <Pill
              key={c.id}
              label={c.label}
              active={value.courtCount === c.id}
              onClick={() => onChange({ ...value, courtCount: c.id })}
            />
          ))}
        </Group>

        <Group icon="💰" title="Khoảng giá / giờ">
          <div className="fp__price">
            <div className="fp__price-track">
              <input
                type="range"
                min={0}
                max={200000}
                step={10000}
                value={value.priceMax}
                onChange={(e) => onChange({ ...value, priceMax: Number(e.target.value) })}
                className="fp__range"
                aria-label="Giá tối đa mỗi giờ"
                style={{ ['--p' as string]: `${(value.priceMax / 200000) * 100}%` }}
              />
            </div>
            <div className="fp__price-row">
              {PRICE_MARKS.map((m, i) => (
                <span key={m} className="fp__price-mark" data-active={m <= value.priceMax}>
                  {PRICE_LABELS[i]}
                </span>
              ))}
            </div>
          </div>
        </Group>
      </div>
    </div>
  );
}

function Group({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="fp__group">
      <h3 className="fp__group-title">
        <span className="fp__group-emoji" aria-hidden="true">{icon}</span>
        <span>{title}</span>
      </h3>
      <div className="fp__group-body">{children}</div>
    </div>
  );
}

function Pill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`fp__pill ${active ? 'fp__pill--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="fp__pill-label">{label}</span>
      {count !== undefined && <span className="fp__pill-count">{count}</span>}
      {active && (
        <span className="fp__pill-x" aria-hidden="true">
          <X size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
