import { motion, type Variants } from 'framer-motion';
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Section } from '@astryxdesign/core/Section';
import { SearchBar } from './SearchBar';
import './Hero.css';

const HERO_STATS = [
  { value: '500+', label: 'sân đối tác' },
  { value: '30 giây', label: 'xác nhận' },
  { value: '4.8★', label: 'đánh giá trung bình' },
];

/**
 * Biến chuyển dùng chung cho các khối trong hero — vào lần lượt với độ trễ
 * tăng dần tạo cảm giác "gõ dần" thay vì mọi thứ nhảy cùng lúc.
 *
 * `custom` truyền chỉ số thứ tự vào hàm `show` để tính độ trễ.
 */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function Hero() {
  return (
    <Section variant="transparent" padding={0} className="hero">
      <div className="hero__inner">
        <Grid columns={{minWidth: 320, max: 2}} gap={6} align="center" className="hero__grid">
          <VStack gap={4} className="hero__copy">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="hero__badge">
              <Badge variant="teal" label="Cầu Lông dee" />
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="hero__title">
              <Heading level={1} type="display-2" textWrap="balance">
                Đặt sân cầu lông trong 30 giây
              </Heading>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="hero__lede">
              <Text type="large" color="secondary" textWrap="pretty">
                Tìm sân trống gần bạn, xem giá và khung giờ, đặt ngay. Không gọi điện, không chờ tin nhắn.
              </Text>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="hero__cta">
              <HStack gap={3} className="hero__actions">
                <Button label="Tìm sân trống" variant="primary" href="/tim-san" />
                <Button label="Xem bảng giá" variant="secondary" href="/#bang-gia" />
              </HStack>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="hero__facts">
              <HStack gap={5} className="hero__stats">
                {HERO_STATS.map((s) => (
                  <VStack key={s.label} gap={0} className="hero__stat">
                    <Text type="large" weight="bold">{s.value}</Text>
                    <Text type="supporting">{s.label}</Text>
                  </VStack>
                ))}
              </HStack>
            </motion.div>
          </VStack>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="hero__media"
          >
            {/* Khung ảnh dùng `aspect-ratio` thuần thay cho `AspectRatio` của
                Astryx: cần đổi tỉ lệ theo viewport (vuông ở desktop, 16:9 ở
                tablet) để hero lấp đầy màn hình, không để lại khoảng trống
                lớn ở giữa (check `empty-area`, `section-gaps`). */}
            <div className="hero__frame">
              <img
                src="/banner_hero2.jpg"
                alt="Sân cầu lông trong nhà tại Cầu Lông dee"
                width={1200}
                height={738}
              />
            </div>
          </motion.div>
        </Grid>

        {/* Thanh tìm kiếm nằm DƯỚI cả hai cột, chạy trọn chiều rộng.
            Nếu để trong cột chữ thì cột ảnh bị trống bên dưới, hero rỗng
            hơn 200px ở giữa và khoảng hở giữa các section lệch so với
            các section khác (check `section-gaps` và `empty-area`). */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={5}
          className="hero__search"
        >
          <SearchBar />
        </motion.div>
      </div>
    </Section>
  );
}
