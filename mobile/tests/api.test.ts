import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiError, apiBase, errorText, query } from '../src/api/client';
import { createService } from '../src/api';

function client(response: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return new ApiClient('https://blog.test/api/', (async (url, init) => response(String(url), init!)) as typeof fetch);
}
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
test('normalizes API origin and optional deployment prefix without duplicate api', () => {
  assert.equal(apiBase('https://blog.test/'), 'https://blog.test/api');
  assert.equal(apiBase('https://blog.test/api///'), 'https://blog.test/api');
  assert.equal(apiBase('https://blog.test/blog/api'), 'https://blog.test/blog/api');
  for (const input of ['file:///private', 'https://token@blog.test', 'https://blog.test/?token=x']) assert.throws(() => apiBase(input));
});
test('query preserves false and zero, encodes Vietnamese/search text, omits empty filters', () => {
  assert.equal(query('/posts/?limit=12', { q: 'hello & chao', offset: 0, empty: '', nil: null, bool: false }), '/posts/?limit=12&q=hello%20%26%20chao&offset=0&bool=false');
});
test('authenticated JSON uses Token and actual content type, never Bearer', async () => {
  const api = client((url, init) => {
    assert.equal(url, 'https://blog.test/api/posts/');
    assert.equal((init.headers as Record<string, string>).Authorization, 'Token secret');
    assert.equal((init.headers as Record<string, string>)['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body as string), { title: 'Story' }); return json({ id: 1 });
  }); api.token = 'secret'; assert.deepEqual(await api.request('/posts/', { method: 'POST', body: { title: 'Story' } }), { id: 1 });
});
test('explicit null token keeps register and login unauthenticated', async () => {
  const api = client((_url, init) => { assert.equal((init.headers as Record<string, string>).Authorization, undefined); return json({ token: 'new' }); });
  api.token = 'old'; await api.request('/auth/login/', { method: 'POST', token: null });
});
test('multipart leaves boundary Content-Type to fetch', async () => {
  const body = new FormData(); body.append('image', new Blob(['image']), 'image.jpg');
  const api = client((_url, init) => { assert.equal(init.body, body); assert.equal((init.headers as Record<string, string>)['Content-Type'], undefined); return json({ id: 1 }); });
  await api.request('/files/upload/', { method: 'POST', body });
});
test('204 delete and empty logout are valid', async () => {
  assert.equal(await client(() => new Response(null, { status: 204 })).request('/auth/logout/', { method: 'POST' }), undefined);
});
test('field/nested validation errors are readable and retained', async () => {
  const details = { title: ['Required.'], tags: { 0: ['Invalid id.'] }, non_field_errors: ['Try again.'] };
  assert.equal(errorText(details), 'title: Required.\ntags.0: Invalid id.\nTry again.');
  await assert.rejects(client(() => json(details, 400)).request('/posts/'), (error: unknown) => error instanceof ApiError && error.status === 400 && error.message.includes('tags.0: Invalid id.') && !!error.details);
});
test('CSV uses wildcard Accept for JSON-renderer DRF negotiation, authenticates, and returns text', async () => {
  const api = client((url, init) => { assert.equal(url, 'https://blog.test/api/admin/users/export/?is_active=false'); assert.equal((init.headers as Record<string, string>).Accept, '*/*'); assert.equal((init.headers as Record<string, string>).Authorization, 'Token admin'); return new Response('username,email\nalex,a@example.com'); });
  api.token = 'admin'; const service = createService(api);
  assert.equal(await service.exportCsv('users', { is_active: 'false' }), 'username,email\nalex,a@example.com');
});
test('401 clears only the currently captured token', async () => {
  let calls = 0; const api = client(() => json({ detail: 'Invalid token.' }, 401)); api.token = 'active'; api.onUnauthorized = token => { assert.equal(token, 'active'); calls++; };
  await assert.rejects(api.request('/auth/me/'), ApiError); assert.equal(calls, 1);
  await assert.rejects(api.request('/auth/login/', { token: null }), ApiError); assert.equal(calls, 1);
});
test('late old-account response cannot invalidate or populate new-account state', async () => {
  let release!: (value: Response) => void; let invalidations = 0;
  const api = client(() => new Promise(resolve => { release = resolve; })); api.token = 'old'; api.onUnauthorized = () => invalidations++;
  const result = api.request('/notifications/'); api.token = 'new'; release(json({ detail: 'Expired' }, 401));
  await assert.rejects(result, (error: unknown) => error instanceof Error && error.name === 'AbortError'); assert.equal(invalidations, 0); assert.equal(api.token, 'new');
});
test('cancelled requests suppress even transports that ignore abort', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(client(() => json({ results: [] })).request('/posts/', { signal: controller.signal }), (error: unknown) => error instanceof Error && error.name === 'AbortError');
});
test('network and malformed JSON failures have actionable API errors', async () => {
  await assert.rejects(client(() => { throw new TypeError('network unavailable'); }).request('/posts/'), (error: unknown) => error instanceof ApiError && error.status === 0 && error.message.includes('Cannot reach'));
  await assert.rejects(client(() => new Response('<html>proxy error</html>')).request('/posts/'), (error: unknown) => error instanceof ApiError && error.status === 502);
});
test('absolute and protocol relative endpoint inputs cannot receive a token', async () => {
  let calls = 0; const api = client(() => { calls++; return json({}); }); api.token = 'secret';
  for (const path of ['https://other.test/api/', '//other.test/api/']) await assert.rejects(api.request(path)); assert.equal(calls, 0);
});
test('taxonomy contracts use explicit parent null and PUT for categories, PATCH for tags', async () => {
  const calls: { url: string; method: string; body: unknown }[] = [];
  const service = createService(client((url, init) => { calls.push({ url, method: init.method!, body: JSON.parse(init.body as string) }); return json({ id: 5 }); }));
  await service.saveCategory('Root', null); await service.saveCategory('Child', 2, 5); await service.saveTag('Running'); await service.saveTag('Moving', 8);
  assert.deepEqual(calls, [
    { url: 'https://blog.test/api/categories/', method: 'POST', body: { name: 'Root', parent_id: null } },
    { url: 'https://blog.test/api/categories/5/', method: 'PUT', body: { name: 'Child', parent_id: 2 } },
    { url: 'https://blog.test/api/tags/', method: 'POST', body: { name: 'Running' } },
    { url: 'https://blog.test/api/tags/8/', method: 'PATCH', body: { name: 'Moving' } },
  ]);
});
test('post payload stays EditorJS blocks, comment omit versus null image is preserved', async () => {
  const calls: { url: string; method: string; body: Record<string, unknown> }[] = [];
  const service = createService(client((url, init) => { calls.push({ url, method: init.method!, body: init.body ? JSON.parse(init.body as string) : {} }); return json({ id: 1 }); }));
  const content = [{ type: 'image', data: { file_id: 11, caption: 'Trail' } }];
  await service.savePost({ title: 'Go', content, category: 2, tags: [3] }, 7);
  await service.comment(7, { content: 'Keep image' }, 12); await service.comment(7, { content: 'Remove image', file_id: null }, 12);
  await service.comment(7, { content: 'Reply', file_id: 11, parent_id: 12 }); await service.read(20);
  assert.equal(calls[0].method, 'PATCH'); assert.equal(calls[0].url, 'https://blog.test/api/posts/7/'); assert.deepEqual(calls[0].body.content, content); assert.equal('status' in calls[0].body, false);
  assert.equal('file_id' in calls[1].body, false); assert.equal(calls[2].body.file_id, null); assert.equal(calls[3].body.parent_id, 12);
  assert.equal(calls[4].url, 'https://blog.test/api/notifications/20/read/'); assert.equal(calls[4].method, 'PATCH');
});
