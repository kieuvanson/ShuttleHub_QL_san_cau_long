import {Card} from '@astryxdesign/core/Card';
import {Tab, TabList} from '@astryxdesign/core/TabList';
import type {FeedFilter} from './feedUtils';
import './FeedTabs.css';

/**
 * 4 tab lọc bài theo loại.
 *
 * Bài loại "Sân cầu lông" (`court`) chỉ hiện ở tab "Tất cả" — không thêm tab
 * thứ 5 vì sẽ làm tràn ngang trên mobile.
 */
const TABS: {value: FeedFilter; label: string}[] = [
  {value: 'all', label: 'Tất cả'},
  {value: 'recruit', label: 'Tuyển người đánh'},
  {value: 'challenge', label: 'Xét kèo'},
  {value: 'thought', label: 'Cảm nghĩ'},
];

export type FeedTabsProps = {
  value: FeedFilter;
  onChange: (filter: FeedFilter) => void;
};

export function FeedTabs({value, onChange}: FeedTabsProps) {
  return (
    <Card variant="transparent" padding={0} className="feed-tabs">
      <TabList
        value={value}
        onChange={(next) => onChange(next as FeedFilter)}
        aria-label="Lọc bài viết"
      >
        {TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </TabList>
    </Card>
  );
}
