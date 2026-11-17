import {useEffect, useRef, useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {Layout, LayoutContent} from '@astryxdesign/core/Layout';
import {ChevronLeft, ChevronRight, Plus} from 'lucide-react';
import type {ProfileMoment} from '../../data/demoProfile';
import {DEMO_MY_MOMENTS} from '../../data/demoProfile';
import './ProfileMoments.css';

export type ProfileMomentsProps = {
  moments?: ProfileMoment[];
};

/**
 * Tab "Khoảnh khắc" — dải vòng tròn kiểu story của Facebook.
 *
 * ⚠️ Vì sao dạng vòng tròn?
 *   Vòng tròn gợi đúng cảm giác "khoảnh khắc đang chờ xem" mà người dùng
 *   Facebook quen thuộc, và giữ được tiêu đề bên dưới như feed.
 *
 * ⚠️ Giai đoạn 1 chưa có backend upload ảnh → ảnh mới chỉ tồn tại trong
 *   phiên (mất khi F5). Vẫn cho chọn để người dùng thấy được luồng hoạt động.
 */
export function ProfileMoments({moments = DEMO_MY_MOMENTS}: ProfileMomentsProps) {
  const [items, setItems] = useState<ProfileMoment[]>(moments);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /**
   * Giữ các objectURL đã tạo để revoke khi ảnh bị thay thế hoặc khi
   * component unmount — nếu không, mỗi lần chọn ảnh sẽ giữ một blob trong
   * bộ nhớ tới hết phiên.
   */
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const url of objectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      objectUrlsRef.current = [];
    },
    [],
  );

  const handleSelectFile = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    setItems((current) => [
      {
        id: `mm-new-${Date.now()}`,
        image: url,
        caption: 'Khoảnh khắc mới',
        timeLabel: 'Vừa xong',
        place: '',
      },
      ...current,
    ]);
  };

  const selected =
    selectedIndex != null ? items[selectedIndex] ?? null : null;

  const goTo = (delta: number) => {
    if (selectedIndex == null || items.length === 0) return;
    setSelectedIndex((selectedIndex + delta + items.length) % items.length);
  };

  return (
    <>
      <div className="profile-moments">
        <button
          type="button"
          className="profile-moment profile-moment--add"
          aria-label="Thêm khoảnh khắc"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="profile-moment__ring profile-moment__ring--add">
            <Plus size={24} aria-hidden="true" />
          </span>
          <span className="profile-moment__name">Thêm khoảnh khắc</span>
        </button>

        {items.map((moment, index) => (
          <button
            key={moment.id}
            type="button"
            className="profile-moment"
            aria-label={moment.caption}
            onClick={() => setSelectedIndex(index)}
          >
            <span className="profile-moment__ring">
              <img
                src={moment.image}
                alt={moment.caption}
                className="profile-moment__img"
              />
            </span>
            <span className="profile-moment__name">{moment.caption}</span>
          </button>
        ))}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          aria-label="Chọn ảnh khoảnh khắc"
          onChange={(e) => {
            handleSelectFile(e.target.files?.[0]);
            // Cho phép chọn lại cùng một file ngay sau đó.
            e.target.value = '';
          }}
        />
      </div>

      <Dialog
        isOpen={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
        width={620}
        padding={0}
        aria-label="Xem khoảnh khắc"
      >
        {selected ? (
          <Layout
            height="auto"
            header={
              <DialogHeader
                title={selected.caption}
                onOpenChange={(open) => {
                  if (!open) setSelectedIndex(null);
                }}
              />
            }
            content={
              <LayoutContent>
                <div className="profile-moment__viewer">
                  <img
                    src={selected.image}
                    alt={selected.caption}
                    className="profile-moment__full"
                  />
                  <div className="profile-moment__viewer-foot">
                    <span className="profile-moment__viewer-meta">
                      {[selected.timeLabel, selected.place]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <div className="profile-moment__viewer-nav">
                      <Button
                        label="Khoảnh khắc trước"
                        variant="secondary"
                        size="sm"
                        icon={<ChevronLeft size={15} aria-hidden="true" />}
                        onClick={() => goTo(-1)}
                      />
                      <Button
                        label="Khoảnh khắc sau"
                        variant="secondary"
                        size="sm"
                        endContent={<ChevronRight size={15} aria-hidden="true" />}
                        onClick={() => goTo(1)}
                      />
                    </div>
                  </div>
                </div>
              </LayoutContent>
            }
          />
        ) : null}
      </Dialog>
    </>
  );
}
