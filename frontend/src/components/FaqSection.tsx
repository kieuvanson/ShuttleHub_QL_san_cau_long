import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Collapsible, CollapsibleGroup } from '@astryxdesign/core/Collapsible';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
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
  return (
    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="faq__inner">
        <Grid columns={{minWidth: 300, max: 2}} gap={8} align="start">
          <VStack gap={5}>
            <div className="faq__head">
              <Heading level={2} id="faq-title">
                Cách đặt sân, đổi lịch và hoàn tiền
              </Heading>
              <Text type="supporting" color="secondary">
                Giải đáp nhanh những gì khách hỏi nhiều nhất.
              </Text>
            </div>

            {/* `defaultValue` mở sẵn câu đầu — `defaultIsOpen` trên Collapsible
                bị group bỏ qua khi `value` được bind. */}
            <CollapsibleGroup
              type="single"
              hasDividers
              defaultValue={FAQS[0].q}
            >
              {FAQS.map((item) => (
                <Collapsible
                  key={item.q}
                  value={item.q}
                  trigger={
                    <Text type="body" weight="semibold">
                      {item.q}
                    </Text>
                  }
                >
                  <Text type="supporting" className="faq__a">
                    {item.a}
                  </Text>
                </Collapsible>
              ))}
            </CollapsibleGroup>

            <div className="faq__terms" id="dieu-khoan">
              <Heading level={3}>Điều khoản đặt sân</Heading>
              <Text type="supporting">
                Giá hiển thị là giá theo giờ và chưa gồm phí dịch vụ. Khung giờ đặt sân giữ nguyên
                trong vòng 15 phút sau giờ bắt đầu. Nếu sân bị đóng hoặc không thể phục vụ vì lý do
                bất khả kháng, bạn được hoàn lại toàn bộ số tiền đã thanh toán trong 24 giờ.
              </Text>
            </div>

            <div className="faq__terms" id="chinh-sach">
              <Heading level={3}>Chính sách bảo mật</Heading>
              <Text type="supporting">
                Cầu Lông dee chỉ dùng thông tin bạn cung cấp để xác nhận đặt sân và gửi thông báo
                liên quan. Mật khẩu được lưu ở dạng mã hóa và không bao giờ chia sẻ cho chủ sân.
                Bạn có thể yêu cầu xoá tài khoản bất kỳ lúc nào qua mục Hỗ trợ.
              </Text>
            </div>

            <Button label="Tìm sân trống" variant="primary" href="/tim-san#ket-qua" />
          </VStack>

          <div className="faq__media">
            <AspectRatio ratio={3 / 4} fit="cover">
              <img
                src="/img/court-04.jpg"
                alt="Sân cầu lông trong nhà thi đấu"
                width={960}
                height={1280}
                loading="lazy"
              />
            </AspectRatio>
          </div>
        </Grid>
      </div>
    </section>
  );
}
