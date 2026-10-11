import { useMemo, useState } from 'react';
import { BookingHeader } from '../components/BookingHeader';
import { QuickSearchBar } from '../components/QuickSearchBar';
import { FilterPanel, FilterState, DEFAULT_FILTER } from '../components/FilterPanel';
import { MapPanel } from '../components/MapPanel';
import { CourtCard } from '../components/CourtCard';
import { Pagination } from '../components/Pagination';
import { DEMO_COURTS, Court } from '../data/demoCourts';
import './CourtDiscovery.css';

const PER_PAGE = 4;

export function CourtDiscovery() {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | undefined>();

  // BookingHeader state
  const [city, setCity] = useState<string>('all');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // FilterPanel state
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  // Pagination
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = city === 'all' ? DEMO_COURTS : DEMO_COURTS.filter((c) => c.city === city);

    if (filter.priceMax > 0) {
      list = list.filter((c) => c.priceFrom <= filter.priceMax);
    }

    if (filter.amenities.length > 0) {
      list = list.filter((c) => {
        const a = c.amenities;
        if (filter.amenities.includes('ac') && !a.some((x) => x.includes('Máy lạnh'))) return false;
        if (filter.amenities.includes('parking') && !a.some((x) => x.includes('Đỗ xe'))) return false;
        if (filter.amenities.includes('rental') && !a.some((x) => x.includes('vợt'))) return false;
        if (filter.amenities.includes('canteen') && !a.some((x) => x.includes('Căng-tin'))) return false;
        return true;
      });
    }

    if (filter.courtCount !== 'any') {
      list = list.filter((c) => {
        if (filter.courtCount === '1-3') return c.courtsCount <= 3;
        if (filter.courtCount === '3-5') return c.courtsCount >= 3 && c.courtsCount <= 5;
        if (filter.courtCount === '5+') return c.courtsCount > 5;
        return true;
      });
    }

    if (filter.hours.length > 0) {
      list = list.filter((c) => {
        const h = Number(c.nextAvailable.split(':')[0]);
        return filter.hours.some((slot) => {
          if (slot === 'morning') return h >= 5 && h < 12;
          if (slot === 'afternoon') return h >= 12 && h < 17;
          if (slot === 'evening') return h >= 17;
          return false;
        });
      });
    }

    return list;
  }, [city, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleBook = (court: Court) => {
    setSelectedCourt(court);
    console.log('[demo] booking intent', court.id);
  };

  const handleFilterChange = (next: FilterState) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <>
      <BookingHeader />

      <div className="cd">
        <div className="cd__inner">
          {/* Quick search bar nổi lên — nằm ngay dưới banner, đè vào mép banner một chút */}
          <div className="cd__search-wrap">
            <QuickSearchBar
              city={city}
              date={date}
              onCityChange={(c) => { setCity(c); setPage(1); }}
              onDateChange={setDate}
              onViewSchedule={() => console.log('[demo] open schedule', date)}
            />
          </div>

          {/* Breadcrumb */}
          <nav className="cd__crumbs" aria-label="Đường dẫn">
            <a href="/">Trang chủ</a>
            <span className="cd__crumbs-sep" aria-hidden="true">/</span>
            <span aria-current="page">Tìm sân</span>
          </nav>

          {/* Bộ lọc nằm NGANG phía trên */}
          <FilterPanel
            value={filter}
            onChange={handleFilterChange}
            totalCourts={filtered.length}
          />

          {/* List sân — full width */}
          <section className="cd__results">
            <div className="cd__results-head">
              <h2 className="cd__results-title">Sân cầu lông phù hợp</h2>
              <p className="cd__results-sub">
                {filtered.length} sân • Cập nhật {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {pageItems.length === 0 ? (
              <div className="cd__empty" role="status">
                <p className="cd__empty-title">Chưa có sân nào phù hợp</p>
                <p className="cd__empty-sub">Thử điều chỉnh bộ lọc hoặc chọn khu vực khác.</p>
                <button
                  type="button"
                  className="cd__empty-cta"
                  onClick={() => {
                    setCity('all');
                    setFilter(DEFAULT_FILTER);
                  }}
                >
                  Xem tất cả sân
                </button>
              </div>
            ) : (
              <ul className="cd__list">
                {pageItems.map((court) => (
                  <li key={court.id} className="cd__item">
                    <CourtCard court={court} onBook={handleBook} />
                  </li>
                ))}
              </ul>
            )}

            <Pagination current={page} total={totalPages} onChange={setPage} />
          </section>

          {/* Bản đồ — đặt ở DƯỚI cùng, full width */}
          <section className="cd__map" aria-label="Bản đồ sân">
            <div className="cd__map-head">
              <h2 className="cd__map-title">Bản đồ sân</h2>
              <p className="cd__map-sub">
                Nhấp vào pin để xem chi tiết sân.
              </p>
            </div>
            <MapPanel
              courts={filtered}
              selectedId={selectedMapId}
              onSelect={setSelectedMapId}
            />
          </section>
        </div>
      </div>

      {selectedCourt && (
        <div className="toast" role="status" aria-live="polite">
          Đã ghi nhận — đang chuyển đến trang đặt sân {selectedCourt.name}…
        </div>
      )}
    </>
  );
}
