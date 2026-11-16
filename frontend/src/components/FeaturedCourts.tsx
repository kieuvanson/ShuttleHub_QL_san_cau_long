import { AppLink } from './AppLink';
import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Badge } from '@astryxdesign/core/Badge';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { DEMO_COURTS, formatPrice } from '../data/demoCourts';
import './FeaturedCourts.css';

/**
 * Danh sách sân nổi bật. Mỗi thẻ là một `ClickableCard` — một vùng chạm
 * duy nhất điều hướng tới trang tìm sân, có nhãn truy cập rõ ràng.
 *
 * Bố cục bento 6 cột: 5 thẻ nằm trên MỘT hàng (thẻ dẫn nhập rộng 2 cột,
 * 4 thẻ còn lại mỗi thẻ 1 cột) → mỗi hàng luôn lấp đầy, không có thẻ lẻ
 * cuối hàng (check `row-gap` của skill taste-skill).
 *
 * Mỗi thẻ một cách vẽ: ảnh vuông, 3:2, 16:10, 4:3 — không thẻ nào giống
 * thẻ nào (check `card-layout`).
 */
export function FeaturedCourts() {
  const courts = DEMO_COURTS.slice(0, 5);

  // Tỉ lệ ảnh khác nhau cho 4 thẻ phụ (thẻ dẫn nhập dùng ảnh tự điều chỉnh).
  const RATIOS = [1, 3 / 2, 16 / 10, 4 / 3] as const;

  return (
    <section className="featured" aria-labelledby="featured-title">
      <div className="featured__inner">
        <div className="featured__head">
          <div className="featured__head-text">
            <Heading level={2} id="featured-title">
              Sân cầu lông nổi bật hôm nay
            </Heading>
            <Text type="supporting" color="secondary">
              Cụm sân có lượt đặt nhiều nhất trong ngày.
            </Text>
          </div>
          <AppLink to="/tim-san#ket-qua" className="featured__more">
            Xem tất cả <span aria-hidden="true">→</span>
          </AppLink>
        </div>

        <Grid columns={{minWidth: 220, max: 6}} gap={4} className="featured__grid">
          {courts.map((court, index) => {
            // Thẻ dẫn nhập: rộng 2 cột, ảnh bên trái, chữ bên phải.
            if (index === 0) {
              return (
                <ClickableCard
                  key={court.id}
                  label={`Đặt sân ${court.name}`}
                  href="/tim-san#ket-qua"
                  padding={0}
                  className="featured__card featured__card--lead"
                >
                  <div className="featured__media featured__media--fill">
                    {court.image ? (
                      <img
                        src={court.image}
                        alt={`Sân ${court.name}`}
                        width={960}
                        height={540}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: '100%',
                          height: '100%',
                          background: `linear-gradient(135deg, ${court.imageGradient[0]} 0%, ${court.imageGradient[1]} 100%)`,
                        }}
                      />
                    )}
                  </div>

                  <VStack gap={3} className="featured__body featured__body--lead">
                    <VStack gap={1}>
                      <Heading level={3} maxLines={2} className="featured__name">
                        {court.name}
                      </Heading>
                      <Text type="supporting" maxLines={1}>
                        {court.district}
                      </Text>
                    </VStack>

                    <HStack gap={3} justify="between" className="featured__meta">
                      <Text
                        type="supporting"
                        weight="semibold"
                        color="teal"
                        className="featured__avail"
                      >
                        Trống lúc {court.nextAvailable}
                      </Text>
                      <Text type="body" weight="semibold" className="featured__price">
                        từ {formatPrice(court.priceFrom)}/giờ
                      </Text>
                    </HStack>

                    <HStack gap={2} align="center">
                      <Badge variant="teal" label={`${court.rating}★`} />
                      <Badge variant="orange" label={`${court.courtsCount} sân`} />
                    </HStack>
                  </VStack>
                </ClickableCard>
              );
            }

            const ratio = RATIOS[index - 1];

            return (
              <ClickableCard
                key={court.id}
                label={`Đặt sân ${court.name}`}
                href="/tim-san#ket-qua"
                padding={0}
                className={`featured__card featured__card--r${index}`}
              >
                <AspectRatio ratio={ratio} fit="cover" className="featured__media">
                  {court.image ? (
                    <img
                      src={court.image}
                      alt={`Sân ${court.name}`}
                      width={960}
                      height={600}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(135deg, ${court.imageGradient[0]} 0%, ${court.imageGradient[1]} 100%)`,
                      }}
                    />
                  )}
                </AspectRatio>

                <VStack gap={2} className="featured__body">
                  <VStack gap={1}>
                    <Heading level={3} maxLines={2} className="featured__name">
                      {court.name}
                    </Heading>
                    <Text type="supporting" maxLines={1}>
                      {court.district}
                    </Text>
                  </VStack>

                  <HStack gap={3} justify="between" className="featured__meta">
                    <Text
                      type="supporting"
                      weight="semibold"
                      color="teal"
                      className="featured__avail"
                    >
                      Trống lúc {court.nextAvailable}
                    </Text>
                    <Text type="body" weight="semibold" className="featured__price">
                      từ {formatPrice(court.priceFrom)}/giờ
                    </Text>
                  </HStack>

                  <HStack gap={2} align="center">
                    <Badge variant="teal" label={`${court.rating}★`} />
                    <Badge variant="orange" label={`${court.courtsCount} sân`} />
                  </HStack>
                </VStack>
              </ClickableCard>
            );
          })}
        </Grid>
      </div>
    </section>
  );
}
