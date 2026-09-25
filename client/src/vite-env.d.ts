/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Leave empty to use same-origin requests (the dev server proxies /api). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
