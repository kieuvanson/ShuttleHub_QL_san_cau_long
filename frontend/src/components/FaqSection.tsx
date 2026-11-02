import { useState } from 'react';
import './FaqSection.css';

const FAQS = [
  {
    q: 'Làm sao đặt sân trên Cầu Lông dee?',
    a: 'Chọn khu vực, ngày, giờ ở thanh tìm kiếm → chọn sân trống → điền thông tin → thanh toán online. Xác nhận trong vòng 30 giây.',
  },
  {
    q: 'Có thể hủy hoặc đổi lịch không?',
    a: 'Có. Hủy miễn phí trước 4 giờ so với giờ đã đặt. Đổi lịch 1 lần cho mỗi booking, không phụ thu.',
  },
  {
    q: 'Hình thức thanh toán nào được hỗ trợ?',
    a: 'VNPay, MoMo, thẻ ATM nội địa, Visa/Master và thanh toán tiền mặt tại sân (tùy chủ sân).',
  },
  {
    q: 'Sân có sẵn cho khách vãng lai không?',
    a: 'Tất cả sân trên Cầu Lông dee đều nhận khách vãng lai. Bạn chỉ cần tài khoản Cầu Lông dee để xác nhận đặt sân.',
  },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="faq" aria-labelledby="faq-title">
      <div className="faq__inner">
        <div className="faq__head">
          <h2 id="faq-title" className="faq__title">
            Câu hỏi thường gặp
          </h2>
        </div>

        <ul className="faq__list">
          {FAQS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <li
                key={idx}
                className={`faq__item${isOpen ? ' faq__item--open' : ''}`}
              >
                <button
                  type="button"
                  className="faq__q"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span className="faq__qtext">{item.q}</span>
                  <span className="faq__icon" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen && (
                  <p className="faq__a">{item.a}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
