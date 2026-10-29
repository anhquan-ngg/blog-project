import assert from 'node:assert/strict';
import { ApiClient } from '../src/api/client';
import { createService } from '../src/api';
import type { Page, Post, Tag, User } from '../src/api/types';

async function main() {
  const base = process.env.MOBILE_SMOKE_API_URL;
  if (!base) throw new Error('Set MOBILE_SMOKE_API_URL to an isolated test backend.');
  const client = new ApiClient(base); const service = createService(client);
  assert.ok(Array.isArray((await client.request<Page<Post>>('/posts/?limit=1')).results));
  assert.ok(Array.isArray(await client.request('/categories/')));
  assert.ok(Array.isArray(await client.request('/tags/')));
  console.log('PASS live guest feed and taxonomy contracts.');
  if (process.env.MOBILE_SMOKE_MUTATIONS !== '1') return;
  // Opt-in mutations leave a test account in the explicitly selected disposable backend.
  const suffix = Date.now().toString(36); const username = `mobile_${suffix}`; const password = `Smoke-${suffix}-9#Read`;
  const registered = await client.request<User>('/auth/register/', { method: 'POST', token: null, body: { username, email: `${username}@example.invalid`, password, password_confirm: password, first_name: 'Mobile', last_name: 'Smoke' } });
  assert.equal(registered.username, username);
  const auth = await client.request<{ token: string }>('/auth/login/', { method: 'POST', token: null, body: { username, password } }); client.token = auth.token;
  let tag: Tag | null = null;
  try {
    assert.equal((await client.request<User>('/auth/me/')).id, registered.id);
    assert.equal((await client.request<User>('/auth/me/', { method: 'PATCH', body: { first_name: 'Native' } })).first_name, 'Native');
    tag = await service.saveTag(`Mobile Smoke ${suffix}`);
    assert.equal((await service.saveTag(`Mobile Verified ${suffix}`, tag.id)).name, `Mobile Verified ${suffix}`);
    for (const route of ['/me/liked/', '/me/bookmarks/', '/notifications/']) assert.ok(Array.isArray((await client.request<Page<{ id: number }>>(route)).results));
  } finally {
    if (tag) await client.request(`/tags/${tag.id}/`, { method: 'DELETE' });
    await client.request('/auth/logout/', { method: 'POST' });
  }
  await assert.rejects(client.request('/auth/me/'), (error: unknown) => !!error && typeof error === 'object' && 'status' in error && error.status === 401);
  console.log(`PASS live registration, Token login/me/profile, member tag CRUD, libraries/inbox, logout/revocation. Disposable test user ID: ${registered.id}`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
