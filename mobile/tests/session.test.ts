import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionController, type SessionApi, type TokenStorage } from '../src/session/controller';
import type { User } from '../src/api/types';

const user: User = { id: 7, username: 'runner', email: 'runner@example.com', first_name: '', last_name: '', is_active: true, is_staff: false, date_joined: '' };
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function harness(token: string | null = null) {
  let stored = token;
  const storage: TokenStorage = { get: async () => stored, set: async value => { stored = value; }, remove: async () => { stored = null; } };
  const respond = { value: async (path: string, _options?: Parameters<SessionApi['request']>[1]): Promise<unknown> => path === '/auth/login/' ? { token: 'new-token' } : path === '/auth/me/' ? user : undefined };
  const api: SessionApi = { token: null, request: async <T>(path: string, options?: Parameters<SessionApi['request']>[1]) => await respond.value(path, options) as T };
  const session = new SessionController(api, storage); return { api, storage, session, respond, stored: () => stored };
}
test('guest hydration never exposes private state or sends me request', async () => {
  const h = harness(); h.respond.value = async () => { throw new Error('should not request'); };
  await h.session.hydrate(); assert.deepEqual(h.session.snapshot(), { status: 'ready', user: null, error: null });
});
test('stored token is verified with me before user becomes visible', async () => {
  const h = harness('stored'); const me = deferred<User>(); h.respond.value = async (path, options) => { assert.equal(path, '/auth/me/'); assert.equal(options?.token, 'stored'); return me.promise; };
  const restoring = h.session.hydrate(); await tick(); assert.equal(h.session.state.user, null); assert.equal(h.session.state.status, 'loading');
  me.resolve(user); await restoring; assert.equal(h.session.snapshot().user?.id, user.id);
});
test('invalid hydration token is removed, network failures remain a guarded retry state', async () => {
  const invalid = harness('expired'); invalid.respond.value = async () => { throw Object.assign(new Error('expired'), { status: 401 }); };
  await invalid.session.hydrate(); assert.equal(invalid.stored(), null); assert.equal(invalid.api.token, null); assert.equal(invalid.session.state.status, 'ready');
  const offline = harness('valid'); offline.respond.value = async () => { throw new Error('Network unavailable'); };
  await offline.session.hydrate(); assert.equal(offline.session.state.status, 'offline'); assert.equal(offline.session.state.user, null); assert.equal(offline.stored(), 'valid');
  offline.respond.value = async () => user; await offline.session.hydrate(); assert.equal(offline.session.snapshot().user?.id, user.id);
});
test('login uses unauthenticated token exchange, verifies identity and persists before auth', async () => {
  const h = harness(); const saved = deferred<void>(); h.storage.set = async () => saved.promise;
  h.respond.value = async (path, options) => {
    if (path === '/auth/login/') { assert.equal(options?.token, null); assert.deepEqual(options?.body, { username: 'runner', password: 'password1' }); return { token: 'new-token' }; }
    assert.equal(path, '/auth/me/'); assert.equal(options?.token, 'new-token'); return user;
  };
  const login = h.session.login('runner', 'password1'); await tick(); assert.equal(h.session.state.user, null); assert.equal(h.api.token, null);
  saved.resolve(); await login; assert.equal(h.api.token, 'new-token'); assert.equal(h.session.snapshot().user?.id, 7);
});
test('failed secure persistence never authenticates a private navigator', async () => {
  const h = harness(); h.storage.set = async () => { throw new Error('Keystore unavailable'); };
  await assert.rejects(h.session.login('runner', 'password1')); assert.equal(h.api.token, null); assert.equal(h.session.state.user, null);
});
test('logout removes identity immediately even while remote revocation is unavailable', async () => {
  const h = harness('token'); await h.session.hydrate(); const remote = deferred<unknown>();
  h.respond.value = async (path, options) => { assert.equal(path, '/auth/logout/'); assert.equal(options?.token, 'token'); return remote.promise; };
  const logout = h.session.logout(); assert.equal(h.api.token, null); assert.equal(h.session.state.user, null);
  remote.reject(new Error('Offline')); const error = await logout; assert.equal(error?.message, 'Offline'); assert.equal(h.stored(), null); assert.equal(h.session.state.status, 'ready');
});
test('late hydration cannot resurrect a logged out account', async () => {
  const h = harness('old'); const me = deferred<User>(); h.respond.value = async () => me.promise;
  const restoring = h.session.hydrate(); await tick(); await h.session.clear(); me.resolve(user); await restoring;
  assert.equal(h.session.state.user, null); assert.equal(h.api.token, null); assert.equal(h.stored(), null);
});
test('queued secure writes ensure logout wins against in-flight login', async () => {
  const h = harness(); const setGate = deferred<void>(); const originalSet = h.storage.set;
  h.storage.set = async token => { await setGate.promise; await originalSet(token); };
  const login = h.session.login('runner', 'password1'); await tick(); const logout = h.session.clear();
  setGate.resolve(); await Promise.all([login, logout]); assert.equal(h.stored(), null); assert.equal(h.api.token, null); assert.equal(h.session.state.user, null);
});
test('a slow previous clear cannot overwrite a newer successful login', async () => {
  const h = harness('old'); const removeGate = deferred<void>(); const originalRemove = h.storage.remove;
  h.storage.remove = async () => { await removeGate.promise; await originalRemove(); };
  const clearing = h.session.clear(); await tick(); const login = h.session.login('runner', 'password1'); await tick(); removeGate.resolve();
  await Promise.all([clearing, login]); assert.equal(h.stored(), 'new-token'); assert.equal(h.api.token, 'new-token'); assert.equal(h.session.state.user?.id, 7);
});
test('storage removal failure cannot rehydrate the token that user asked to discard', async () => {
  const h = harness('old'); let attempts = 0; const originalRemove = h.storage.remove;
  h.storage.remove = async () => { attempts++; if (attempts === 1) throw new Error('locked'); await originalRemove(); };
  await h.session.clear(); assert.equal(h.session.state.status, 'offline');
  h.respond.value = async () => { throw new Error('must not request me'); };
  await h.session.hydrate(); assert.equal(attempts, 2); assert.equal(h.session.state.status, 'ready'); assert.equal(h.session.state.user, null); assert.equal(h.stored(), null);
});
test('profile updates only touch the current account and subscriptions unsubscribe', async () => {
  const h = harness('token'); let notifications = 0; const unsubscribe = h.session.subscribe(() => notifications++);
  await h.session.hydrate(); h.session.updateUser({ ...user, id: 99 }); assert.equal(h.session.state.user?.id, 7);
  h.session.updateUser({ ...user, first_name: 'New' }); assert.equal(h.session.state.user?.first_name, 'New'); const count = notifications;
  unsubscribe(); await h.session.clear(); assert.equal(notifications, count);
});
