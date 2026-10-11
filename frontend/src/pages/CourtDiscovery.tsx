import { useMemo, useState } from 'react';
import { TimSanHero } from '../components/TimSanHero';
import { AreaFilter } from '../components/AreaFilter';
import { QuickFilter, QuickFilterValue } from '../components/QuickFilter';
import { CourtCard } from '../components/CourtCard';
import { DEMO_COURTS, Court } from '../data/demoCourts';
import './CourtDiscovery.css';

const DEFAULT_QF: QuickFilterValue = { date: 'today', hour: 'all', price: 'all' };

export function CourtDiscovery() {
  const [activeArea, setActiveArea] = useState<string>('all');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [qf, setQf] = useState<QuickFilterValue>(DEFAULT_QF);

  const visible = useMemo(() => {
    let list = activeArea === 'all' ? DEMO_COURTS : DEMO_COURTS.filter((c) => c.city === activeArea);

    if (qf.price === 'lt100') list = list.filter((c) => c.priceFrom < 100000);
    else if (qf.price === '100_150') list = list.filter((c) => c.priceFrom >= 100000 && c.priceFrom <= 150000);
    else if (qf.price === 'gt150') list = list.filter((c) => c.priceFrom > 150000);

    if (qf.hour !== 'all') {
      list = list.filter((c) => {
        const h = Number(c.nextAvailable.split(':')[0]);
        if (qf.hour === 'morning') return h >= 5 && h < 12;
        if (qf.hour === 'afternoon') return h >= 12 && h < 17;
        if (qf.hour === 'evening') return h >= 17;
        return true;
      });
    }

    return list;
  }, [activeArea, qf]);

  const handleBook = (court: Court) => {
    setSelectedCourt(court);
    // No modal — feedback goes to a confirmation page later.
    // For now: console + visual confirmation via state.
    console.log('[demo] booking intent', court.id);
  };

  return (
    <>
      <TimSanHero />

      <AreaFilter active={activeArea} onChange={setActiveArea} />
      <QuickFilter value={qf} onChange={setQf} />

      <section className="page">
        <div className="page__inner">
          <div className="page__head">
            <h2 className="page__title">Sân còn trống hôm nay</h2>
            <p className="page__sub">
              {visible.length} sân khả dụng • Cập nhật {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="page__empty" role="status">
              <p className="page__empty-title">Chưa có sân nào phù hợp</p>
              <p className="page__empty-sub">Thử đổi bộ lọc hoặc khu vực khác.</p>
              <button
                type="button"
                className="page__empty-cta"
                onClick={() => {
                  setActiveArea('all');
                  setQf(DEFAULT_QF);
                }}
              >
                Xem tất cả sân
              </button>
            </div>
          ) : (
            <ul className="page__list">
              {visible.map((court) => (
                <li key={court.id} className="page__item">
                  <CourtCard court={court} onBook={handleBook} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {selectedCourt && (
        <div className="toast" role="status" aria-live="polite">
          Đã ghi nhận — đang chuyển đến trang đặt sân {selectedCourt.name}…
        </div>
      )}
    </>
  );
}
