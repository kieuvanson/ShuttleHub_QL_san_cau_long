import {useState} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {Plus} from 'lucide-react';
import type {FeedStory} from '../../data/demoPosts';
import {DEMO_STORIES} from '../../data/demoPosts';
import './FeedStories.css';

export type FeedStoriesProps = {
  onUnavailableFeature: (featureName: string) => void;
};

/**
 * Dải "khoảnh khắc" ở đầu feed — mô phỏng stories của Facebook.
 *
 * Ô đầu tiên là "Thêm khoảnh khắc" (bấm sẽ gọi `onUnavailableFeature` vì
 * giai đoạn 1 chưa có backend upload ảnh). Các ô còn lại bấm vào sẽ mở
 * overlay xem ảnh to.
 */
export function FeedStories({onUnavailableFeature}: FeedStoriesProps) {
  const [selectedStory, setSelectedStory] = useState<FeedStory | null>(null);

  return (
    <>
      <Card variant="default" padding={0} className="feed-stories">
        <div className="feed-stories__row">
          {DEMO_STORIES.map((story) => (
            <button
              key={story.id}
              type="button"
              className={
                story.isAdd ? 'feed-story feed-story--add' : 'feed-story'
              }
              onClick={() => {
                if (story.isAdd) {
                  onUnavailableFeature('Thêm khoảnh khắc');
                  return;
                }
                setSelectedStory(story);
              }}
            >
              <span className="feed-story__frame">
                <img src={story.image} alt={story.name} className="feed-story__img" />
                {story.isAdd ? (
                  <span className="feed-story__add" aria-hidden="true">
                    <Plus size={18} />
                  </span>
                ) : null}
              </span>
              <span className="feed-story__name">{story.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Dialog
        isOpen={selectedStory != null}
        onOpenChange={(open) => {
          if (!open) setSelectedStory(null);
        }}
        width={560}
        padding={0}
        aria-label="Xem khoảnh khắc"
      >
        {selectedStory ? (
          <Layout
            height="auto"
            header={
              <DialogHeader
                title={selectedStory.name}
                onOpenChange={(open) => {
                  if (!open) setSelectedStory(null);
                }}
              />
            }
            content={
              <LayoutContent>
                <img
                  src={selectedStory.image}
                  alt={selectedStory.name}
                  className="feed-story__full"
                />
              </LayoutContent>
            }
          />
        ) : null}
      </Dialog>
    </>
  );
}
