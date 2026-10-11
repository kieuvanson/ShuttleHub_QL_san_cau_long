import './TimSanHero.css';

/**
 * TimSanHero — banner nhỏ + heading "Tìm sân cầu lông".
 * Nằm ngay dưới Header, phía trên filter chips.
 */
export function TimSanHero() {
  return (
    <section className="tsh" aria-label="Tìm sân cầu lông">
      <div className="tsh__banner" role="img" aria-label="Sân cầu lông">
        <div className="tsh__banner-img" />
        <div className="tsh__banner-overlay" />
        <div className="tsh__banner-inner">
          <h1 className="tsh__title">
            Tìm <span className="tsh__title-accent">sân cầu lông</span>
          </h1>
          <p className="tsh__sub">
            Hơn 1.200 sân trên toàn quốc — đặt chỗ trong 30 giây.
          </p>
        </div>
      </div>
    </section>
  );
}
