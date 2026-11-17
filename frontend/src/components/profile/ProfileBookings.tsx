import {Badge} from '@astryxdesign/core/Badge';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Heading, Text} from '@astryxdesign/core/Text';
import {CalendarDays, MapPin, Users, Zap} from 'lucide-react';
import type {ProfileBooking, ProfileBookingType} from '../../data/demoProfile';
import {DEMO_MY_BOOKINGS} from '../../data/demoProfile';
import './ProfileBookings.css';

/** Nhãn + màu badge phân biệt 3 loại kèo. */
const TYPE_BADGE: Record<
  ProfileBookingType,
  {label: string; variant: 'blue' | 'purple' | 'orange'; icon: typeof Zap}
> = {
  booking: {label: 'Đã đặt sân', variant: 'blue', icon: CalendarDays},
  challenge: {label: 'Xét kèo', variant: 'purple', icon: Zap},
  recruit: {label: 'Tuyển người đánh', variant: 'orange', icon: Users},
};

export type ProfileBookingsProps = {
  bookings?: ProfileBooking[];
  onUnavailableFeature: (featureName: string) => void;
};

/**
 * Tab "Kèo đã đặt" — lịch đặt sân, kèo xét và kèo tuyển người của user.
 *
 * ⚠️ Giai đoạn 1 dùng dữ liệu demo; hành động (hủy kèo, xem lại) chưa có
 *   backend nên chỉ báo "giai đoạn sau" qua `onUnavailableFeature`.
 */
export function ProfileBookings({
  bookings = DEMO_MY_BOOKINGS,
  onUnavailableFeature,
}: ProfileBookingsProps) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="Chưa có kèo nào"
        description="Khi bạn đặt sân hoặc rủ người đánh, các kèo sẽ hiện ở đây."
      />
    );
  }

  return (
    <div className="profile-bookings">
      {bookings.map((booking) => {
        const typeBadge = TYPE_BADGE[booking.type];
        const TypeIcon = typeBadge.icon;
        const isDone = booking.status === 'done';

        return (
          <article
            key={booking.id}
            className={`profile-booking ${isDone ? 'profile-booking--done' : ''}`}
          >
            <Card variant="default" padding={0}>
              {/* Padding nằm ở wrapper vì `Card` của Astryx áp padding bằng
                  StyleX (thắng mọi rule trong `@layer app`). */}
              <div className="profile-booking__body">
                <div className="profile-booking__head">
                  <Badge
                    variant={typeBadge.variant}
                    label={typeBadge.label}
                    icon={<TypeIcon size={13} aria-hidden="true" />}
                  />
                  {isDone ? (
                    <Badge variant="neutral" label="Đã hoàn thành" />
                  ) : null}
                </div>

                <Heading level={3} className="profile-booking__title">
                  {booking.title}
                </Heading>

                <div className="profile-booking__meta">
                  <span className="profile-booking__meta-item">
                    <CalendarDays size={14} aria-hidden="true" />
                    {booking.timeLabel}
                  </span>
                  <span className="profile-booking__meta-item">
                    <MapPin size={14} aria-hidden="true" />
                    {booking.area}
                  </span>
                </div>

                <div className="profile-booking__foot">
                  <Text type="supporting" className="profile-booking__price">
                    {booking.priceLabel}
                  </Text>
                  {booking.note ? (
                    <Text type="supporting" className="profile-booking__note">
                      {booking.note}
                    </Text>
                  ) : null}
                </div>

                <Button
                  label={isDone ? 'Xem lại' : 'Hủy kèo'}
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onUnavailableFeature(isDone ? 'Xem lại' : 'Hủy kèo')
                  }
                  className="profile-booking__action"
                />
              </div>
            </Card>
          </article>
        );
      })}
    </div>
  );
}
