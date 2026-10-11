import { useEffect, useState } from 'react';
import './Hero.css';

const BANNERS = [
  { src: '/banner_hero1.jpg', alt: 'Cầu lông — Cầu Lông dee' },
  { src: '/banner_hero2.jpg', alt: 'Sân cầu lông — Cầu Lông dee' },
];

export function Hero() {
  const [idx, setIdx] = useState(0);

  // Auto-rotate banner mỗi 5s
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="hero" aria-label="Đặt sân nhanh">
      <div className="hero__slider" aria-hidden="true">
        {BANNERS.map((b, i) => (
          <div
            key={b.src}
            className={`hero__slide ${i === idx ? 'hero__slide--active' : ''}`}
            style={{ backgroundImage: `url(${b.src})` }}
            role="img"
            aria-label={b.alt}
          />
        ))}
        {/* Lớp phủ tối + gradient để chữ nổi */}
        <div className="hero__overlay" />
      </div>

      <div className="hero__inner">
        <div className="hero__copy">
          <span className="hero__eyebrow">Cầu Lông dee</span>
          <h1 className="hero__title">
            Đặt sân cầu lông với Cầu Lông dee
            <br />
            <span className="hero__title-accent">mọi lúc mọi nơi</span>
          </h1>
          <p className="hero__sub">
            Tìm sân trống gần bạn trong 30 giây. Cầu Lông dee — xác nhận tức thì, không gọi điện, không chờ tin nhắn.
            không chờ đợi.
          </p>
        </div>

        <div className="hero__trust">
          <span className="hero__trust-item">
            <strong>500+</strong> sân đối tác
          </span>
          <span className="hero__trust-sep" aria-hidden="true">·</span>
          <span className="hero__trust-item">
            <strong>30 giây</strong> xác nhận
          </span>
          <span className="hero__trust-sep" aria-hidden="true">·</span>
          <span className="hero__trust-item">
            <strong>4.8★</strong> đánh giá trung bình
          </span>
        </div>

        {/* Dots chỉ báo 2 banner */}
        <div className="hero__dots" role="tablist" aria-label="Chọn banner">
          {BANNERS.map((b, i) => (
            <button
              key={b.src}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Banner ${i + 1}`}
              className={`hero__dot ${i === idx ? 'hero__dot--active' : ''}`}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
