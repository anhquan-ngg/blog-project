import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorId, authorName, blockHtml, displayDate, escapeHtml, mediaUrl, notificationText, toBlocks } from '../src/utils/content';
import { DraftStore, type DraftStorage } from '../src/utils/draftStore';
import { mergeItems, normalizePage } from '../src/utils/pagination';
import type { Block, Draft } from '../src/api/types';

test('author helpers handle nullable, legacy string, and structured author contracts', () => {
  assert.equal(authorName(null), 'Deleted author'); assert.equal(authorName('old-author'), 'old-author'); assert.equal(authorName({ id: 2, username: 'alex' }), 'alex');
  assert.equal(authorId(null), null); assert.equal(authorId('legacy'), null); assert.equal(authorId({ id: 2, username: 'alex' }), 2);
});
test('media paths resolve safely without treating native/private schemes as links', () => {
  assert.equal(mediaUrl('/media/image.jpg', 'https://blog.test/api'), 'https://blog.test/media/image.jpg');
  assert.equal(mediaUrl('https://cdn.test/image.jpg', 'https://blog.test/api'), 'https://cdn.test/image.jpg');
  for (const uri of ['javascript:alert(1)', 'file:///private/data', 'data:image/svg+xml;base64,...', 'https://secret@cdn.test/file']) assert.equal(mediaUrl(uri, 'https://blog.test/api'), null);
  assert.equal(mediaUrl(null, 'https://blog.test/api'), null);
});
test('legacy text is escaped, native HTML stays editable, unknown block fields survive', () => {
  assert.equal(escapeHtml(`<script>"x" & 'y'</script>`), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');
  assert.deepEqual(toBlocks('<b>plain legacy</b>\nnext'), [{ type: 'paragraph', data: { text: '&lt;b&gt;plain legacy&lt;/b&gt;<br>next' } }]);
  const blocks: Block[] = [{ id: 'custom', type: 'widget', data: { unknown: ['retained'] } }]; const cloned = toBlocks(blocks);
  assert.deepEqual(cloned, blocks); assert.notEqual(cloned[0], blocks[0]); assert.notEqual(cloned[0].data, blocks[0].data);
});
test('EditorJS HTML supports headings, rich paragraphs, images, lists and escaped code', () => {
  const base = 'https://blog.test/api';
  assert.equal(blockHtml({ type: 'paragraph', data: { text: '<strong>Move</strong>' } }, base), '<p><strong>Move</strong></p>');
  assert.equal(blockHtml({ type: 'heading', data: { level: 99, text: 'Title' } }, base), '<h6>Title</h6>');
  assert.match(blockHtml({ type: 'image', data: { file_id: 5, url: '/media/img.jpg', caption: '<Trail>' } }, base), /src="https:\/\/blog.test\/media\/img.jpg".*&lt;Trail&gt;/);
  assert.equal(blockHtml({ type: 'image', data: { url: 'file:///private' } }, base), '');
  assert.equal(blockHtml({ type: 'list', data: { style: 'ordered', items: ['one', { content: 'two', items: ['nested'] }] } }, base), '<ol><li>one</li><li>two<ul><li>nested</li></ul></li></ol>');
  assert.equal(blockHtml({ type: 'code', data: { code: '<div>' } }, base), '<pre><code>&lt;div&gt;</code></pre>');
});
test('notification text uses actor_username and deleted actor fallback; dates tolerate invalid data', () => {
  assert.equal(notificationText('liked_post', 'Alex'), 'Alex liked your story.'); assert.equal(notificationText('replied_comment', null), 'Someone replied to your comment.'); assert.equal(displayDate('invalid'), '');
});
test('pagination accepts raw related/taxonomy arrays and standard DRF pages', () => {
  const items = [{ id: 1 }]; assert.deepEqual(normalizePage(items), { count: 1, next: null, previous: null, results: items });
  const page = { count: 2, next: 'https://blog.test/api/posts/?offset=1', previous: null, results: items }; assert.equal(normalizePage(page), page);
  assert.deepEqual(mergeItems([{ id: 1, title: 'before' }], [{ id: 1, title: 'updated' }, { id: 2, title: 'new' }]), [{ id: 1, title: 'updated' }, { id: 2, title: 'new' }]);
});
function storage() {
  const map = new Map<string, string>(); const adapter: DraftStorage = { getItem: async key => map.get(key) ?? null, setItem: async (key, value) => { map.set(key, value); } }; return { map, store: new DraftStore(adapter) };
}
function draft(userId: number, key = 'local-1'): Draft { return { key, userId, title: 'Next story', category: null, tags: [], content: [{ type: 'paragraph', data: { text: 'Hello' } }], updatedAt: new Date().toISOString() }; }
test('drafts are local, account-scoped, persist changes, and do not invent backend status fields', async () => {
  const { store, map } = storage(); await store.save(draft(1)); await store.save(draft(2));
  assert.equal((await store.list(1))[0].userId, 1); assert.equal((await store.list(2))[0].userId, 2); assert.deepEqual(await store.list(3), []);
  await store.save({ ...draft(1), title: 'Updated' }); assert.equal((await store.list(1)).length, 1); assert.equal((await store.list(1))[0].title, 'Updated');
  await store.remove(1, 'local-1'); assert.deepEqual(await store.list(1), []); assert.equal((await store.list(2)).length, 1); assert.equal(map.size, 2);
});
test('parallel draft writes serialize instead of overwriting one another', async () => {
  const { store } = storage(); await Promise.all([store.save(draft(1, 'one')), store.save(draft(1, 'two')), store.save(draft(1, 'three'))]);
  assert.deepEqual((await store.list(1)).map(item => item.key), ['three', 'two', 'one']);
});
test('malformed local storage does not expose another account or crash the editor', async () => {
  const { map, store } = storage(); map.set('stride.drafts.v1.1', JSON.stringify([draft(2), { userId: 1, key: 'invalid', title: '', content: [] }, draft(1)]));
  assert.equal((await store.list(1)).length, 1); map.set('stride.drafts.v1.1', '{bad'); await assert.rejects(store.list(1));
});
