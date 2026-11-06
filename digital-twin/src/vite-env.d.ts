/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the shared Express API (see src/data/remote/apiClient.ts). Defaults to http://localhost:5000/api when unset. */
  readonly VITE_API_BASE_URL?: string;
  /** Dev server only: set to '0' to disable the automatic demo-account sign-in (src/auth/AuthContext.tsx). */
  readonly VITE_DEV_AUTO_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
