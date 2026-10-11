import { useEffect, useState } from 'react';
import './BookingHeader.css';

type Props = {
  onViewSchedule?: () => void;
};

const SLIDES = [
  '/banner_tim san.jpg',
  '/banner_tim_san2.jpg',
];

const INTERVAL_MS = 2200; // 2.2 giây — nhanh hơn, không lờ mờ

/**
 * Banner slideshow — tự động đổi 1 ảnh sau mỗi 3.5s,
 * fade nhẹ giữa các slide, chiều ngang phủ kín viewport.
 */
export function BookingHeader(_: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bh" aria-label="Banner tìm sân">
      <div className="bh__track" aria-hidden="true">
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className={`bh__slide ${i === index ? 'bh__slide--active' : ''}`}
            style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
          />
        ))}
      </div>

      {/* Dots indicator */}
      <div className="bh__dots" role="tablist" aria-label="Chuyển slide">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}`}
            className={`bh__dot ${i === index ? 'bh__dot--active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
