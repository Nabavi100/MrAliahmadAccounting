/**
 * Server-side accounting data service.
 *
 * The application stores the whole bookkeeping dataset as one JSON document
 * (exactly the same shape as the built-in backup export). This service talks to
 * the server API that persists it, so the data no longer lives only inside one
 * browser profile.
 *
 * Endpoints (see server.ts):
 *   GET    /api/app/status        — is a dataset present? is the API protected?
 *   GET    /api/app/data          — read the dataset
 *   PUT    /api/app/data          — write the dataset (conflict aware)
 *   GET    /api/app/backups       — list automatic server backups
 *   GET    /api/app/backups/:file — read one automatic server backup
 */

export interface AppDataMeta {
  version: string | null;
  revision: number;
  updatedAt: string | null;
  updatedBy?: string | null;
}

export interface LoadResult {
  data: Record<string, any> | null;
  meta: AppDataMeta;
}

export interface SaveResult {
  ok: boolean;
  revision?: number;
  /** Timestamp of the successful save (also reported on conflicts). */
  serverUpdatedAt?: string | null;
  /** Timestamp returned by the API after a successful save. */
  updatedAt?: string | null;
  conflict?: boolean;
  serverRevision?: number;
  serverUpdatedBy?: string | null;
  error?: string;
}

export interface ServerBackupInfo {
  file: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ServerStatus {
  ok: boolean;
  protected: boolean;
  hasData: boolean;
  revision: number;
  updatedAt: string | null;
  updatedBy: string | null;
  backupCount: number;
  lastBackupAt: string | null;
  serverTime: string;
  storagePath?: string;
}

export type ServerConnectionState =
  | 'unknown'          // not checked yet
  | 'connected'        // last sync succeeded
  | 'unreachable'      // network/server error — local data still safe
  | 'unauthorized'     // access key missing or wrong
  | 'conflict';        // a newer version exists on the server

const META_NAME = 'app-data-key';
const STORAGE_KEY = 'hesabdar_server_app_key_v1';
const REQUEST_TIMEOUT_MS = 20000;

const safeGetItem = (key: string): string => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable — the key simply will not be remembered */
  }
};

/** Access key resolution order: saved override → injected meta tag → URL param. */
export const getAccessKey = (): string => {
  const override = safeGetItem(STORAGE_KEY);
  if (override) return override;

  try {
    const meta = document.querySelector<HTMLMetaElement>(`meta[name="${META_NAME}"]`);
    if (meta?.content) return meta.content.trim();
  } catch {
    /* ignore */
  }

  try {
    const fromUrl = new URLSearchParams(window.location.search).get('key');
    if (fromUrl) return fromUrl.trim();
  } catch {
    /* ignore */
  }

  return '';
};

/** Allows the administrator to override the access key from the UI. */
export const setAccessKeyOverride = (key: string) => safeSetItem(STORAGE_KEY, key.trim());
export const clearAccessKeyOverride = () => safeSetItem(STORAGE_KEY, '');

const buildHeaders = (extra?: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(extra || {}) };
  const key = getAccessKey();
  if (key) headers['x-app-key'] = key;
  return headers;
};

/**
 * API base URL. Empty in the browser (relative requests), and overridable so the
 * service can also be exercised from Node-based integration tests.
 */
const getApiBaseUrl = (): string => {
  try {
    const injected = (globalThis as any)?.window?.__APP_API_BASE__;
    return typeof injected === 'string' ? injected : '';
  } catch {
    return '';
  }
};

async function request<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T | null; error?: string }> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const response = await fetch(`${getApiBaseUrl()}${url}`, {
      ...init,
      headers: buildHeaders(init?.headers as Record<string, string> | undefined),
      signal: controller?.signal,
    });
    let body: any = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      body,
      error: body?.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: err?.name === 'AbortError' ? 'مهلت ارتباط با سرور به پایان رسید.' : 'ارتباط با سرور برقرار نشد.',
    };
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

/** Lightweight connectivity probe used by the status panel. */
export async function getServerStatus(): Promise<ServerStatus | null> {
  const res = await request<ServerStatus>('/api/app/status');
  if (!res.ok || !res.body) return null;
  return res.body;
}

/** Reads the stored dataset. Returns `data: null` when the server has none yet. */
export async function loadAppData(): Promise<LoadResult & { error?: string; unauthorized?: boolean }> {
  const res = await request<{ data: Record<string, any> | null; revision?: number; version?: string | null; updatedAt?: string | null; updatedBy?: string | null }>(
    '/api/app/data'
  );
  if (res.status === 401) {
    return { data: null, meta: { version: null, revision: 0, updatedAt: null }, unauthorized: true, error: res.error };
  }
  if (!res.ok || !res.body) {
    return { data: null, meta: { version: null, revision: 0, updatedAt: null }, error: res.error || 'خواندن اطلاعات از سرور ناموفق بود.' };
  }
  return {
    data: res.body.data ?? null,
    meta: {
      version: res.body.version ?? null,
      revision: res.body.revision ?? 0,
      updatedAt: res.body.updatedAt ?? null,
      updatedBy: res.body.updatedBy ?? null,
    },
  };
}

/** Writes the dataset. Pass `clientRevision = 0` to force (restore/override). */
export async function saveAppData(
  data: Record<string, any>,
  clientRevision: number,
  updatedBy: string,
  version: string
): Promise<SaveResult> {
  const res = await request<SaveResult>('/api/app/data', {
    method: 'PUT',
    body: JSON.stringify({ data, clientRevision, updatedBy, version }),
  });

  const status = res.status;
  if (status === 409) {
    return {
      ok: false,
      conflict: true,
      serverRevision: res.body?.serverRevision,
      serverUpdatedAt: res.body?.serverUpdatedAt,
      serverUpdatedBy: res.body?.serverUpdatedBy,
      error: res.error,
    };
  }
  if (status === 401) {
    return { ok: false, error: res.error || 'کلید دسترسی به سرور نامعتبر است.' };
  }
  if (!res.ok || !res.body?.ok) {
    return { ok: false, error: res.error || 'ذخیره اطلاعات روی سرور ناموفق بود.' };
  }
  return { ok: true, revision: res.body.revision, serverUpdatedAt: res.body.updatedAt ?? null };
}

export async function listServerBackups(): Promise<ServerBackupInfo[]> {
  const res = await request<{ backups: ServerBackupInfo[] }>('/api/app/backups');
  if (!res.ok || !res.body) return [];
  return res.body.backups || [];
}

export async function getServerBackup(file: string): Promise<Record<string, any> | null> {
  const res = await request<{ data?: Record<string, any> }>(`/api/app/backups/${encodeURIComponent(file)}`);
  if (!res.ok || !res.body) return null;
  return res.body.data || null;
}

/** Human readable byte size, used in the backup list. */
export const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 بایت';
  const units = ['بایت', 'کیلوبایت', 'مگابایت'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

/** Formats an ISO timestamp as a Persian (Jalali) date + time, falling back to ISO. */
export const formatTimestamp = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};
