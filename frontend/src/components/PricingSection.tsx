import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import './PricingSection.css';

type Slot = {
  id: string;
  name: string;
  range: string;
  price: string;
  perks: string[];
  badge?: string;
};

/**
 * Khoảng giá bám sát min/max của dataset `DEMO_COURTS` (55.000 → 120.000đ),
 * không bịa thêm mức nào ngoài dữ liệu thật.
 */
const SLOTS: Slot[] = [
  {
    id: 'morning',
    name: 'Ca sáng',
    range: '5:00 – 12:00',
    price: '55.000đ – 80.000đ',
    perks: ['Sân trống nhiều, ít kẹt', 'Phù hợp tập buổi sớm', 'Giá rẻ nhất trong ngày'],
  },
  {
    id: 'afternoon',
    name: 'Ca chiều',
    range: '12:00 – 17:00',
    price: '70.000đ – 100.000đ',
    perks: ['Ánh sáng tự nhiên', 'Hợp đặt cụm sân giữa tuần'],
    badge: 'Phổ biến',
  },
  {
    id: 'evening',
    name: 'Ca tối',
    range: '17:00 – 24:00',
    price: '90.000đ – 120.000đ',
    perks: ['Khung giờ được đặt nhiều nhất', 'Có sân trong nhà máy lạnh', 'Giá cao nhất trong ngày'],
  },
];

export function PricingSection() {
  return (
    <section className="pricing" id="bang-gia" aria-labelledby="pricing-title">
      <div className="pricing__inner">
        <div className="pricing__head">
          <Heading level={2} id="pricing-title">
            Bảng giá đặt sân theo khung giờ
          </Heading>
          <Text type="supporting" color="secondary">
            Giá tính theo giờ, mỗi cụm sân có thể có mức khác nhau.
          </Text>
        </div>

        <Grid columns={{minWidth: 220, max: 3}} gap={4}>
          {SLOTS.map((slot) => (
            <Card key={slot.id} className="pricing__card">
              <VStack gap={3}>
                <div className="pricing__card-head">
                  <VStack gap={0}>
                    <Heading level={3}>{slot.name}</Heading>
                    <Text type="supporting">{slot.range}</Text>
                  </VStack>
                  {slot.badge && <Badge variant="orange" label={slot.badge} />}
                </div>

                <Text type="display-3" weight="bold" color="teal" className="pricing__price">
                  {slot.price}
                </Text>

                <ul className="pricing__perks">
                  {slot.perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>

                <Button label="Xem sân theo ca này" variant="secondary" href="/tim-san" />
              </VStack>
            </Card>
          ))}
        </Grid>
      </div>
    </section>
  );
}
