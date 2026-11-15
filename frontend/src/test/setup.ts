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
});

afterEach(() => {
  cleanup();
});
