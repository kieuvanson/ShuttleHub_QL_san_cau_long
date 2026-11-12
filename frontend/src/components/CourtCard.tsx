import { Card } from '@astryxdesign/core/Card';
import { Badge } from '@astryxdesign/core/Badge';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { AspectRatio } from '@astryxdesign/core/AspectRatio';
import { Court, formatPrice } from '../data/demoCourts';
import './CourtCard.css';

type Props = {
  court: Court;
  onBook: (court: Court) => void;
};

export function CourtCard({ court, onBook }: Props) {
  const isGoldenHour = (() => {
    const [h] = court.nextAvailable.split(':').map(Number);
    return h >= 5 && h <= 7;
  })();

  return (
    <Card className="card">
      <AspectRatio ratio={16 / 10} fit="cover" className="card__media">
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

      <VStack gap={3} className="card__body">
        <VStack gap={1}>
          <Heading level={3} maxLines={1}>{court.name}</Heading>
          <Text type="supporting" maxLines={1}>{court.district}</Text>
        </VStack>

        <HStack gap={2} align="start">
          <Badge variant="teal" label={`${court.rating.toFixed(1)}★`} />
          {court.isHot && <Badge variant="orange" label="Hot" />}
          {court.isNew && <Badge variant="blue" label="Mới" />}
          {isGoldenHour && <Badge variant="yellow" label="Giờ vàng" />}
        </HStack>

        <HStack gap={3} justify="between" className="card__meta">
          <Text type="supporting"><strong>{court.courtsCount}</strong> sân</Text>
          <Text type="supporting">Trống <strong>{court.nextAvailable}</strong></Text>
        </HStack>

        <Text type="supporting" maxLines={2}>
          {court.amenities.slice(0, 3).join(' · ')}
        </Text>

        <HStack gap={3} justify="between" className="card__foot">
          <VStack gap={0}>
            <Text type="body" weight="bold">{formatPrice(court.priceFrom)}</Text>
            <Text type="supporting">/giờ</Text>
          </VStack>
          <Button
            label="Đặt sân"
            variant="primary"
            onClick={() => onBook(court)}
          />
        </HStack>
      </VStack>
    </Card>
  );
}
