/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NODE_ENV: string;
  readonly VITE_LOG_LEVEL: string;
  readonly VITE_ENABLE_POLLING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
