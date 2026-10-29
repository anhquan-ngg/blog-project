import type { User } from '../api/types';
export interface TokenStorage { get(): Promise<string | null>; set(token: string): Promise<void>; remove(): Promise<void> }
export interface SessionState { status: 'loading' | 'ready' | 'offline'; user: User | null; error: string | null }
export interface SessionApi {
  token: string | null;
  request<T>(path: string, options?: { method?: string; body?: unknown; token?: string | null }): Promise<T>;
}
export class SessionController {
  state: SessionState = { status: 'loading', user: null, error: null };
  private generation = 0;
  private pendingClear = false;
  private writes: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(private api: SessionApi, private storage: TokenStorage) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  snapshot = () => this.state;
  private emit(state: SessionState) { this.state = state; this.listeners.forEach(fn => fn()); }
  private persist(action: () => Promise<void>) {
    const next = this.writes.catch(() => {}).then(action); this.writes = next; return next;
  }
  async hydrate() {
    if (this.pendingClear) { await this.clear(); return; }
    const generation = ++this.generation;
    this.emit({ status: 'loading', user: null, error: null });
    try {
      const token = await this.storage.get();
      if (generation !== this.generation) return;
      this.api.token = token;
      if (!token) { this.emit({ status: 'ready', user: null, error: null }); return; }
      const user = await this.api.request<User>('/auth/me/', { token });
      if (generation === this.generation) this.emit({ status: 'ready', user, error: null });
    } catch (error) {
      if (generation !== this.generation) return;
      if ((error as { status?: number }).status === 401) { await this.clear(); return; }
      this.emit({ status: 'offline', user: null, error: error instanceof Error ? error.message : 'Unable to restore your session.' });
    }
  }
  async login(username: string, password: string) {
    const generation = ++this.generation;
    const result = await this.api.request<{ token: string }>('/auth/login/', { method: 'POST', body: { username, password }, token: null });
    const user = await this.api.request<User>('/auth/me/', { token: result.token });
    if (generation !== this.generation) return;
    await this.persist(() => this.storage.set(result.token));
    if (generation !== this.generation) return;
    this.api.token = result.token;
    this.emit({ status: 'ready', user, error: null });
  }
  updateUser(user: User) { if (this.state.user?.id === user.id) this.emit({ ...this.state, user }); }
  async clear() {
    const generation = ++this.generation;
    this.pendingClear = true;
    this.api.token = null;
    // Private screens disappear immediately, before network or storage operations complete.
    this.emit({ status: 'loading', user: null, error: null });
    try {
      await this.persist(() => this.storage.remove());
      this.pendingClear = false;
      if (generation === this.generation) this.emit({ status: 'ready', user: null, error: null });
    } catch {
      if (generation === this.generation) this.emit({ status: 'offline', user: null, error: 'Could not clear secure storage. Retry sign out before continuing.' });
    }
  }
  async logout() {
    const token = this.api.token;
    const remote = token ? this.api.request('/auth/logout/', { method: 'POST', token }).then(() => null, error => error as Error) : Promise.resolve(null);
    await this.clear();
    return remote;
  }
}
