import type { Page } from '../api/types';
export function normalizePage<T>(value: Page<T> | T[]): Page<T> {
  return Array.isArray(value) ? { count: value.length, next: null, previous: null, results: value } : value;
}
export function mergeItems<T extends { id: number }>(previous: T[], incoming: T[]): T[] {
  return Array.from(new Map([...previous, ...incoming].map(item => [item.id, item])).values());
}
