import {useCallback, useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Card} from '@astryxdesign/core/Card';
import {Heading, Text} from '@astryxdesign/core/Text';
import {useToast} from '@astryxdesign/core/Toast';
import {AppLink} from '../components/AppLink';
import {
  DEMO_MY_BOOKINGS,
  DEMO_MY_MOMENTS,
  DEMO_MY_POSTS,
} from '../data/demoProfile';
import {useAuth} from '../context/AuthContext';
import {ProfileBookings} from '../components/profile/ProfileBookings';
import {ProfileHeader} from '../components/profile/ProfileHeader';
import {ProfileMoments} from '../components/profile/ProfileMoments';
import {ProfilePosts} from '../components/profile/ProfilePosts';
import {ProfileSettings} from '../components/profile/ProfileSettings';
import {
  ProfileTabs,
  type ProfileTabValue,
} from '../components/profile/ProfileTabs';
import './AccountPage.css';

const TAB_VALUES: ProfileTabValue[] = [
  'posts',
  'bookings',
  'moments',
  'settings',
];

const TAB_LABEL: Record<ProfileTabValue, string> = {
  posts: 'Bài viết',
  bookings: 'Kèo đã đặt',
  moments: 'Khoảnh khắc',
  settings: 'Cài đặt',
};

/**
 * AccountPage — trang cá nhân phong cách Facebook.
 *
 * ⚠️ Vì sao lưu tab trong URL (`?tab=`)?
 *   F5 hoặc chia sẻ link sẽ giữ được tab đang xem, đúng như Facebook.
 *   Giá trị rác trong query → rơi về tab `posts` chứ không render trang trắng.
 *
 * ⚠️ Vì sao state ảnh preview nằm ở cấp trang chứ không nằm trong tab?
 *   Ảnh đã chọn phải sống qua việc chuyển tab (đổi tab rồi quay lại vẫn
 *   thấy ảnh mới) → state phải ở trên cao hơn các panel.
 */
export function AccountPage() {
  const {user, isLoading} = useAuth();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  /**
   * Giữ objectURL hiện tại để revoke trước khi thay thế và khi unmount —
   * nếu không, mỗi lần chọn ảnh sẽ giữ một blob trong bộ nhớ tới hết phiên.
   */
  const avatarUrlRef = useRef<string | null>(null);
  const coverUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    },
    [],
  );

  const rawTab = searchParams.get('tab');
  const activeTab: ProfileTabValue = TAB_VALUES.includes(
    rawTab as ProfileTabValue,
  )
    ? (rawTab as ProfileTabValue)
    : 'posts';

  const handleTabChange = useCallback(
    (next: ProfileTabValue) => {
      setSearchParams({tab: next});
    },
    [setSearchParams],
  );

  const applyAvatarPreview = useCallback((file: File | undefined) => {
    if (!file) return;
    if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current);
    const url = URL.createObjectURL(file);
    avatarUrlRef.current = url;
    setAvatarPreviewUrl(url);
  }, []);

  const applyCoverPreview = useCallback((file: File | undefined) => {
    if (!file) return;
    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    const url = URL.createObjectURL(file);
    coverUrlRef.current = url;
    setCoverPreviewUrl(url);
  }, []);

  const handleUnavailableFeature = useCallback(
    (featureName: string) => {
      showToast({body: `Tính năng "${featureName}" sẽ có ở giai đoạn sau`});
    },
    [showToast],
  );

  const handleEditProfile = useCallback(() => {
    handleTabChange('settings');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, [handleTabChange]);

  // Chờ `isLoading` kết thúc trước khi render — nếu không, lúc F5 sẽ thấy
  // trang "Vui lòng đăng nhập" nháy qua trước khi user được đọc từ storage.
  if (isLoading) {
    return (
      <section className="account">
        <Text type="supporting">Đang tải hồ sơ…</Text>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="account">
        <Card variant="default" padding={0}>
          <div className="account__empty">
            <Heading level={1} className="account__empty-title">
              Trang cá nhân
            </Heading>
            <Text type="supporting" className="account__empty-sub">
              Vui lòng đăng nhập để xem trang cá nhân của bạn.
            </Text>
            <AppLink to="/dang-nhap" className="account__login-link">
              Đăng nhập
            </AppLink>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="account">
      <ProfileHeader
        user={user}
        avatarPreviewUrl={avatarPreviewUrl}
        coverPreviewUrl={coverPreviewUrl}
        stats={{
          posts: DEMO_MY_POSTS.length,
          bookings: DEMO_MY_BOOKINGS.length,
          moments: DEMO_MY_MOMENTS.length,
        }}
        onEditProfile={handleEditProfile}
        onPickAvatar={() => avatarInputRef.current?.click()}
        onPickCover={() => coverInputRef.current?.click()}
      />

      <div className="account__tabs">
        <ProfileTabs value={activeTab} onChange={handleTabChange} />
      </div>

      {/*
        ⚠️ Vì sao render CẢ 4 panel thay vì chỉ panel đang chọn?
          `aria-controls` của mỗi tab trỏ tới id của panel. Nếu chỉ render
          panel đang chọn thì 3 tab còn lại trỏ tới id KHÔNG tồn tại →
          `aria-controls` là giá trị không hợp lệ (WCAG / axe
          `aria-valid-attr-value`) và screen reader không tìm được panel mà
          tab điều khiển.
          Render cả 4 rồi ẩn bằng `hidden` → mọi id tồn tại, tab không chọn
          vẫn bị loại khỏi cây truy cập (đúng pattern tabs của WAI-ARIA).
          State của từng panel (bài đã thích, khoảnh khắc đã thêm…) sống
          riêng → đổi tab không mất dữ liệu.
      */}
      {TAB_VALUES.map((tab) => (
        <div
          key={tab}
          className="account__panel"
          id={`profile-panel-${tab}`}
          role="tabpanel"
          aria-label={TAB_LABEL[tab]}
          hidden={tab !== activeTab}
        >
          {tab === 'posts' && <ProfilePosts user={user} />}
          {tab === 'bookings' && (
            <ProfileBookings onUnavailableFeature={handleUnavailableFeature} />
          )}
          {tab === 'moments' && <ProfileMoments />}
          {tab === 'settings' && (
            <ProfileSettings
              user={user}
              avatarPreviewUrl={avatarPreviewUrl}
              onPickAvatar={() => avatarInputRef.current?.click()}
              onPickCover={() => coverInputRef.current?.click()}
            />
          )}
        </div>
      ))}

      {/* File picker ẩn — nút trong header và tab Cài đặt đều kích hoạt nó. */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        hidden
        aria-label="Chọn ảnh đại diện"
        onChange={(e) => {
          applyAvatarPreview(e.target.files?.[0]);
          // Cho phép chọn lại cùng một file ngay sau đó.
          e.target.value = '';
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        aria-label="Chọn ảnh bìa"
        onChange={(e) => {
          applyCoverPreview(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </section>
  );
}
