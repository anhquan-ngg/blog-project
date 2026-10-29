import type { Draft } from '../api/types';
export interface DraftStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> }
export class DraftStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: DraftStorage) {}
  private key(userId: number) { return `stride.drafts.v1.${userId}`; }
  async list(userId: number): Promise<Draft[]> {
    const raw = await this.storage.getItem(this.key(userId));
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error('Local drafts could not be read.');
    return value.filter((item): item is Draft => item && typeof item === 'object' && item.userId === userId && typeof item.key === 'string' && typeof item.title === 'string'
      && (item.category === null || Number.isSafeInteger(item.category)) && Array.isArray(item.tags) && item.tags.every(Number.isSafeInteger)
      && typeof item.updatedAt === 'string' && (item.postId === undefined || Number.isSafeInteger(item.postId))
      && Array.isArray(item.content) && item.content.every((block: unknown) => block && typeof block === 'object' && 'type' in block && typeof block.type === 'string' && 'data' in block && block.data && typeof block.data === 'object' && !Array.isArray(block.data)));
  }
  private enqueue<T>(action: () => Promise<T>): Promise<T> { const next = this.queue.catch(() => {}).then(action); this.queue = next; return next; }
  save(draft: Draft) { return this.enqueue(async () => { const items = await this.list(draft.userId); await this.storage.setItem(this.key(draft.userId), JSON.stringify([draft, ...items.filter(item => item.key !== draft.key)])); }); }
  remove(userId: number, key: string) { return this.enqueue(async () => { const items = await this.list(userId); await this.storage.setItem(this.key(userId), JSON.stringify(items.filter(item => item.key !== key))); }); }
}
