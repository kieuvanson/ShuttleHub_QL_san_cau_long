import './QuickFilter.css';

export type QuickFilterValue = {
  date: string;
  hour: string;
  price: string;
};

type Props = {
  value: QuickFilterValue;
  onChange: (next: QuickFilterValue) => void;
};

const DATES = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'tomorrow', label: 'Ngày mai' },
  { id: 'weekend', label: 'Cuối tuần' },
] as const;

const HOURS = [
  { id: 'all', label: 'Cả ngày' },
  { id: 'morning', label: 'Sáng' },
  { id: 'afternoon', label: 'Chiều' },
  { id: 'evening', label: 'Tối' },
] as const;

const PRICES = [
  { id: 'all', label: 'Mọi giá' },
  { id: 'lt100', label: 'Dưới 100K' },
  { id: '100_150', label: '100K – 150K' },
  { id: 'gt150', label: 'Trên 150K' },
] as const;

export function QuickFilter({ value, onChange }: Props) {
  const update = (key: keyof QuickFilterValue) => (id: string) =>
    onChange({ ...value, [key]: id });

  return (
    <div className="qf" aria-label="Lọc nhanh">
      <Group title="Ngày" items={DATES} active={value.date} onPick={update('date')} />
      <Group title="Giờ" items={HOURS} active={value.hour} onPick={update('hour')} />
      <Group title="Giá" items={PRICES} active={value.price} onPick={update('price')} />
    </div>
  );
}

function Group<T extends { id: string; label: string }>({
  title,
  items,
  active,
  onPick,
}: {
  title: string;
  items: readonly T[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="qf__group">
      <span className="qf__title">{title}</span>
      <div className="qf__chips">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`qf__chip ${active === item.id ? 'qf__chip--active' : ''}`}
            onClick={() => onPick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
