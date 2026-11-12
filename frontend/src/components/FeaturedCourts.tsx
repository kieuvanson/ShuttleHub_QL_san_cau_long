import { Link } from 'react-router-dom';
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
 */
export function FeaturedCourts() {
  const courts = DEMO_COURTS.slice(0, 4);

  return (
    <section className="featured" aria-labelledby="featured-title">
      <div className="featured__inner">
        <div className="featured__head">
          <div className="featured__head-text">
            <Heading level={2} id="featured-title">
              Sân cầu lông nổi bật hôm nay
            </Heading>
            <Text type="supporting" color="secondary">
              4 cụm sân có lượt đặt nhiều nhất trong ngày.
            </Text>
          </div>
          <Link to="/tim-san" className="featured__more">
            Xem tất cả <span aria-hidden="true">→</span>
          </Link>
        </div>

        <Grid columns={{minWidth: 250, max: 4}} gap={4} className="featured__grid">
          {courts.map((court) => (
            <ClickableCard
              key={court.id}
              label={`Đặt sân ${court.name}`}
              href="/tim-san"
              padding={0}
              className="featured__card"
            >
              <AspectRatio ratio={16 / 10} fit="cover" className="featured__media">
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
                <HStack gap={2} align="start">
                  <Heading level={3} maxLines={1} className="featured__name">
                    {court.name}
                  </Heading>
                  <Text
                    type="supporting"
                    weight="bold"
                    color="teal"
                    className="featured__rating"
                  >
                    {court.rating}★
                  </Text>
                </HStack>

                <Text type="supporting" maxLines={1}>
                  {court.district}
                </Text>

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

                <Badge variant="teal" label={`${court.courtsCount} sân`} />
              </VStack>
            </ClickableCard>
          ))}
        </Grid>
      </div>
    </section>
  );
}
