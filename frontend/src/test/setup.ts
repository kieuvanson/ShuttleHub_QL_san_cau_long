import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach, beforeAll} from 'vitest';

beforeAll(() => {
  // jsdom chưa implement `HTMLDialogElement.showModal/close` — component `Dialog`
  // của Astryx gọi thẳng 2 API này nên sẽ ném lỗi khi render trong test.
  // Polyfill tối thiểu: bật/tắt thuộc tính `open` đúng như trình duyệt.
  const proto = globalThis.HTMLDialogElement?.prototype as
    | (HTMLDialogElement & {showModal?: () => void; close?: () => void})
    | undefined;

  if (proto && !proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }
  if (proto && !proto.close) {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  }

  // jsdom chưa implement `Element.scrollIntoView` — `AppLink` và deep-link của
  // feed gọi nó để cuộn tới anchor → `TypeError` làm hỏng test. Polyfill tối
  // thiểu: hàm rỗng (test chỉ cần biết có gọi được).
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }

  // jsdom chưa implement `Window.scrollTo` — trang cá nhân gọi nó khi bấm
  // "Chỉnh sửa hồ sơ" để cuộn lên đầu trang. Không polyfill thì jsdom in
  // cảnh báo "Not implemented" làm output test lẫn xô.
  window.scrollTo = function scrollTo() {};
});

afterEach(() => {
  cleanup();
});
