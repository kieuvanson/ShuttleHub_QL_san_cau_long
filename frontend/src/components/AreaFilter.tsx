import { AREAS } from '../data/demoCourts';
import './AreaFilter.css';

type Props = {
  active: string;
  onChange: (id: string) => void;
};

export function AreaFilter({ active, onChange }: Props) {
  return (
    <nav className="filter" aria-label="Lọc theo khu vực">
      <div className="filter__track" role="tablist">
        {AREAS.map((area) => {
          const isActive = area.id === active;
          return (
            <button
              key={area.id}
              role="tab"
              aria-selected={isActive}
              className={`filter__chip ${isActive ? 'filter__chip--active' : ''}`}
              onClick={() => onChange(area.id)}
            >
              {area.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
