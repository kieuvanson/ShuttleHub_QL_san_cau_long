import { motion, type Variants } from 'framer-motion';
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
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
        <Grid columns={{minWidth: 320, max: 2}} gap={6} align="center">
          <VStack gap={4} className="hero__copy">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
              <Badge variant="teal" label="Cầu Lông dee" />
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
              <Heading level={1} type="display-2" textWrap="balance">
                Đặt sân cầu lông trong 30 giây
              </Heading>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2}>
              <Text type="large" color="secondary" textWrap="pretty">
                Tìm sân trống gần bạn, xem giá và khung giờ, đặt ngay. Không gọi điện, không chờ tin nhắn.
              </Text>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
              <HStack gap={3} className="hero__actions">
                <Button label="Tìm sân trống" variant="primary" href="/tim-san" />
                <Button label="Xem bảng giá" variant="secondary" href="/#bang-gia" />
              </HStack>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
              <HStack gap={5} className="hero__stats">
                {HERO_STATS.map((s) => (
                  <VStack key={s.label} gap={0} className="hero__stat">
                    <Text type="large" weight="bold">{s.value}</Text>
                    <Text type="supporting">{s.label}</Text>
                  </VStack>
                ))}
              </HStack>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
              <SearchBar />
            </motion.div>
          </VStack>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="hero__media"
          >
            <AspectRatio ratio={4 / 3} fit="cover">
              <img
                src="/banner_hero2.jpg"
                alt="Sân cầu lông trong nhà tại Cầu Lông dee"
                width={1200}
                height={900}
              />
            </AspectRatio>
          </motion.div>
        </Grid>
      </div>
    </Section>
  );
}
