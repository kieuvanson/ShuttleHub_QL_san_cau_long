import {Tab, TabList} from '@astryxdesign/core/TabList';

export type ProfileTabValue = 'posts' | 'bookings' | 'moments' | 'settings';

const TABS: {value: ProfileTabValue; label: string}[] = [
  {value: 'posts', label: 'Bài viết'},
  {value: 'bookings', label: 'Kèo đã đặt'},
  {value: 'moments', label: 'Khoảnh khắc'},
  {value: 'settings', label: 'Cài đặt'},
];

export type ProfileTabsProps = {
  value: ProfileTabValue;
  onChange: (value: ProfileTabValue) => void;
};

/**
 * Dải 4 tab của trang cá nhân.
 *
 * ⚠️ Vì sao truyền `role="tablist"`?
 *   `TabList` của Astryx hỗ trợ 2 pattern:
 *   - navigation (mặc định) → `<nav>` + `data-tab-value` + `aria-current`;
 *   - tabs → `role="tablist"` + `role="tab"` + `aria-selected` + `panelId`.
 *   Ở đây có 4 panel thật bên dưới nên pattern tabs đúng ngữ nghĩa hơn —
 *   screen reader sẽ đọc "tab 2 trên 4" thay vì coi đây là link điều hướng.
 */
export function ProfileTabs({value, onChange}: ProfileTabsProps) {
  return (
    <TabList
      role="tablist"
      value={value}
      onChange={(next) => onChange(next as ProfileTabValue)}
      aria-label="Nội dung trang cá nhân"
    >
      {TABS.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={tab.label}
          panelId={`profile-panel-${tab.value}`}
        />
      ))}
    </TabList>
  );
}
