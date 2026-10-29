export function errorText(value: unknown, prefix = ''): string {
  if (typeof value === 'string') return prefix ? `${prefix}: ${value}` : value;
  if (Array.isArray(value)) return value.map(v => errorText(v, prefix)).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).map(([key, v]) =>
    errorText(v, key === 'detail' || key === 'non_field_errors' ? prefix : prefix ? `${prefix}.${key}` : key)).join('\n');
  return value == null ? '' : `${prefix ? prefix + ': ' : ''}${String(value)}`;
}
export function errorMessage(value: unknown): string { return value instanceof Error ? value.message : errorText(value) || 'Something went wrong.'; }
export class ApiError extends Error {
  constructor(public status: number, public details: unknown) { super(errorText(details) || `Request failed (${status}).`); this.name = 'ApiError'; }
}
export function apiBase(raw: string): string {
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('API URL must be a plain HTTP(S) URL.');
  return `${url.origin}${url.pathname.replace(/\/+$/, '').replace(/\/api$/, '')}/api`;
}
export function query(path: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const parts = Object.entries(params).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return `${path}${parts.length ? (path.includes('?') ? '&' : '?') + parts.join('&') : ''}`;
}
export function isAborted(error: unknown): boolean { return error instanceof Error && error.name === 'AbortError'; }
export interface RequestOptions { method?: string; body?: unknown; signal?: AbortSignal; token?: string | null; text?: boolean }
export class ApiClient {
  token: string | null = null;
  onUnauthorized: (token: string) => void = () => {};
  readonly base: string;
  constructor(base: string, private transport: typeof fetch = fetch) { this.base = apiBase(base); }
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) throw new Error('Only relative API paths are allowed.');
    const token = options.token === undefined ? this.token : options.token;
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', abort);
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
    const headers: Record<string, string> = { Accept: options.text ? '*/*' : 'application/json' };
    if (token) headers.Authorization = `Token ${token}`;
    const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    try {
      const response = await this.transport(this.base + path, {
        method: options.method || 'GET', headers, signal: controller.signal,
        body: options.body === undefined ? undefined : multipart ? options.body as FormData : JSON.stringify(options.body),
      });
      const text = await response.text();
      if (controller.signal.aborted || (options.token === undefined && token !== this.token)) {
        const cancelled = new Error('Request cancelled because the session or screen changed.'); cancelled.name = 'AbortError'; throw cancelled;
      }
      let data: unknown;
      try { data = text ? JSON.parse(text) : undefined; } catch { data = { detail: response.ok ? 'Invalid JSON response from server.' : `Server error (${response.status}).` }; }
      if (!response.ok) {
        // A late response from a previous account must not sign out the current account.
        if (response.status === 401 && token && token === this.token) this.onUnauthorized(token);
        throw new ApiError(response.status, data);
      }
      if (options.text) return text as T;
      if (text && data && typeof data === 'object' && 'detail' in data && (data as { detail: string }).detail === 'Invalid JSON response from server.') throw new ApiError(502, data);
      return data as T;
    } catch (error) {
      if (timedOut) throw new ApiError(0, { detail: 'Request timed out. Check your connection and try again.' });
      if (isAborted(error) || error instanceof ApiError) throw error;
      throw new ApiError(0, { detail: 'Cannot reach the server. Check your connection and API URL.' });
    } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
  }
}
