import { Grid } from '@astryxdesign/core/Grid';
import { VStack } from '@astryxdesign/core/VStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { AREAS } from '../data/demoCourts';
import './CitiesSection.css';

const CITY_BLURBS: Record<string, { count: string; tag: string }> = {
  hanoi:    { count: '120+ sân',  tag: 'Trung tâm & ngoại thành' },
  hcm:      { count: '180+ sân',  tag: 'Quận trung tâm' },
  danang:   { count: '40+ sân',   tag: 'View biển Đà Nẵng' },
  haiphong: { count: '30+ sân',   tag: 'Hải Phòng' },
  cantho:   { count: '20+ sân',   tag: 'Miền Tây' },
};

/**
 * `AREAS` là `as const` nên phần tử 'all' không có `image`. TypeScript không
 * tự thu hẹp union sau `filter`, nên ta khai báo kiểu rõ ràng cho nhánh còn lại.
 */
type City = { id: string; label: string; count: number; image: string };

export function CitiesSection() {
  const cities = AREAS.filter((a) => a.id !== 'all') as ReadonlyArray<City>;

  return (
    <section className="cities" aria-labelledby="cities-title">
      <div className="cities__inner">
        <div className="cities__head">
          <Heading level={2} id="cities-title">
            Sân cầu lông ở Hà Nội, TP.HCM và Đà Nẵng
          </Heading>
          <Text type="supporting" color="secondary">
            Chọn khu vực để xem sân trống ngay.
          </Text>
        </div>

        <Grid columns={{minWidth: 190, max: 5}} gap={4}>
          {cities.map((city) => {
            const blurb = CITY_BLURBS[city.id];
            return (
              <ClickableCard
                key={city.id}
                label={`Tìm sân ở ${city.label}`}
                href="/tim-san"
                padding={0}
                className="cities__card"
              >
                <AspectRatio ratio={3 / 2} fit="cover" className="cities__media">
                  <img
                    src={city.image}
                    alt={`Sân cầu lông tại ${city.label}`}
                    width={960}
                    height={640}
                    loading="lazy"
                  />
                </AspectRatio>
                <VStack gap={1} className="cities__body">
                  <Text type="body" weight="semibold">{city.label}</Text>
                  {blurb && (
                    <Text type="supporting">{blurb.count} · {blurb.tag}</Text>
                  )}
                </VStack>
              </ClickableCard>
            );
          })}
        </Grid>
      </div>
    </section>
  );
}
