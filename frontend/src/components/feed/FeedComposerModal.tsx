import {useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {RadioList, RadioListItem} from '@astryxdesign/core/RadioList';
import {TextArea} from '@astryxdesign/core/TextArea';
import {characterCount} from '@astryxdesign/core/utils';
import type {FeedPost, PostCategory} from '../../data/demoPosts';
import {POST_CATEGORY_LABEL} from '../../data/demoPosts';
import {createPost} from './feedUtils';
import './FeedComposerModal.css';

/** Giới hạn 500 ký tự — khớp với bộ đếm của `TextArea`. */
const MAX_CONTENT_LENGTH = 500;

const CATEGORY_ORDER: PostCategory[] = ['challenge', 'recruit', 'thought', 'court'];

export type FeedComposerModalProps = {
  isOpen: boolean;
  initialCategory: PostCategory;
  authorName: string;
  onClose: () => void;
  onSubmit: (post: FeedPost) => void;
};

/**
 * Modal đăng bài: chọn loại bài + nhập nội dung.
 *
 * Loại bài chọn được vẫn dùng `RadioList` của Astryx (render radio thật) để
 * bàn phím/screen reader làm việc đúng; `POST_CATEGORY_LABEL` hiển thị nhãn
 * tiếng Việt.
 */
export function FeedComposerModal({
  isOpen,
  initialCategory,
  authorName,
  onClose,
  onSubmit,
}: FeedComposerModalProps) {
  const [category, setCategory] = useState<PostCategory>(initialCategory);
  const [content, setContent] = useState('');

  const isTooLong = characterCount(content) > MAX_CONTENT_LENGTH;
  const canSubmit = content.trim() !== '' && !isTooLong;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(
      createPost({
        category,
        content,
        authorName,
        id: `p-${Date.now()}`,
      }),
    );
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={520}
      padding={0}
      aria-label="Đăng bài"
    >
      <Layout
        height="auto"
        header={
          <DialogHeader
            title="Đăng bài"
            onOpenChange={(open) => {
              if (!open) onClose();
            }}
          />
        }
        content={
          <LayoutContent>
            <div className="feed-composer-modal">
              <RadioList
                label="Loại bài viết"
                value={category}
                onChange={(next) => setCategory(next as PostCategory)}
                orientation="horizontal"
                size="sm"
              >
                {CATEGORY_ORDER.map((value) => (
                  <RadioListItem
                    key={value}
                    value={value}
                    label={POST_CATEGORY_LABEL[value]}
                  />
                ))}
              </RadioList>

              <TextArea
                label="Nội dung bài viết"
                value={content}
                rows={5}
                maxLength={MAX_CONTENT_LENGTH}
                placeholder="Chia sẻ tin rủ đánh, sân trống hay cảm nghĩ của bạn..."
                onChange={(next) => setContent(next)}
              />

              {isTooLong ? (
                <p className="feed-composer-modal__error">
                  Nội dung vượt quá {MAX_CONTENT_LENGTH} ký tự.
                </p>
              ) : null}

              <div className="feed-composer-modal__footer">
                <Button label="Huỷ" variant="secondary" onClick={onClose} />
                <Button
                  label="Đăng bài"
                  variant="primary"
                  isDisabled={!canSubmit}
                  onClick={handleSubmit}
                />
              </div>
            </div>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
