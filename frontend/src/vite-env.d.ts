/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL gốc của backend, VD: http://localhost:8080 */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
