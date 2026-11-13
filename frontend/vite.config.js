import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Vite tự nhảy sang port trống (5173 → 5174 → …) khi port đã bị chiếm.
  // Điều này rất dễ xảy ra khi mở thêm 1 tab `npm run dev` mà quên tắt
  // tab cũ → trang chạy ở 5174, nhưng backend chỉ CORS cho 5173 → mọi
  // request API bị browser chặn với lỗi "CORS policy".
  //
  // `strictPort: false` (mặc định) = để Vite nhảy port. Ta GIỮ nguyên
  // hành vi này, chỉ thêm `host` để log ra địa chỉ đầy đủ cho dễ đọc.
  server: {
    host: 'localhost',
    port: 5173,
  },
  preview: {
    host: 'localhost',
    port: 4173,
  },
})
