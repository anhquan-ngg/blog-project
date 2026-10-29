import type { Author, Block } from '../api/types';
export function mediaUrl(value: unknown, base: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try { const url = new URL(value, base + '/'); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function authorName(author: Author | string | null | undefined): string { return typeof author === 'string' ? author : author?.username || 'Deleted author'; }
export function authorId(author: Author | string | null | undefined): number | null { return typeof author === 'object' && author ? author.id : null; }
export function escapeHtml(text: string): string { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
export function toBlocks(content: Block[] | string | null | undefined): Block[] {
  if (Array.isArray(content)) return content.map(block => ({ ...block, data: { ...block.data } }));
  return content ? [{ type: 'paragraph', data: { text: escapeHtml(content).replace(/\n/g, '<br>') } }] : [];
}
function listItem(item: unknown): string {
  if (typeof item === 'string') return `<li>${item}</li>`;
  if (item && typeof item === 'object') {
    const entry = item as { content?: string; items?: unknown[] };
    return `<li>${entry.content || ''}${entry.items?.length ? `<ul>${entry.items.map(listItem).join('')}</ul>` : ''}</li>`;
  }
  return '';
}
export function blockHtml(block: Block, base: string): string {
  const data = block.data || {};
  switch (block.type) {
    case 'paragraph': return `<p>${data.text || ''}</p>`;
    case 'heading': case 'header': { const level = Math.min(6, Math.max(1, Number(data.level) || 2)); return `<h${level}>${data.text || ''}</h${level}>`; }
    case 'html': case 'raw': return String(data.html || data.text || '');
    case 'quote': return `<blockquote>${data.text || ''}<p>${escapeHtml(data.caption || '')}</p></blockquote>`;
    case 'list': { const tag = data.style === 'ordered' ? 'ol' : 'ul'; return `<${tag}>${(data.items || []).map(listItem).join('')}</${tag}>`; }
    case 'code': return `<pre><code>${escapeHtml(String(data.code || data.text || ''))}</code></pre>`;
    case 'delimiter': return '<hr>';
    case 'image': { const url = mediaUrl(data.url, base); return url ? `<figure><img src="${escapeHtml(url)}" /><figcaption>${escapeHtml(data.caption || '')}</figcaption></figure>` : ''; }
    default: return data.text ? `<p>${data.text}</p>` : '';
  }
}
export function displayDate(value: string): string { const date = new Date(value); return Number.isNaN(date.valueOf()) ? '' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
export function notificationText(type: string, actor?: string | null): string {
  const name = actor || 'Someone';
  return `${name} ${type === 'liked_post' ? 'liked your story' : type === 'commented_post' ? 'commented on your story' : type === 'replied_comment' ? 'replied to your comment' : 'sent a notification'}.`;
}
