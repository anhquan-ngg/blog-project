import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { isAborted, query } from '../api/client';
import type { Page } from '../api/types';

import { mergeItems, normalizePage } from '../utils/pagination';
export { normalizePage } from '../utils/pagination';
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    api.request<T>(path, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(reason => { if (!controller.signal.aborted && !isAborted(reason)) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, revision]);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  return { data, setData, error, loading, refresh };
}
export function usePaginated<T extends { id: number }>(path: string, focusRefresh = true) {
  const [items, setItems] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const offset = useRef(0);
  const more = useRef(false);
  const load = useCallback(async (reset = false) => {
    if (!reset && (busy.current || !more.current)) return;
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    busy.current = true; setLoading(true); setError('');
    if (reset) { offset.current = 0; more.current = false; setItems([]); setCount(0); setHasMore(false); }
    try {
      const page = normalizePage(await api.request<Page<T> | T[]>(query(path, { limit: 12, offset: offset.current }), { signal: controller.signal }));
      if (controller.signal.aborted) return;
      offset.current += page.results.length;
      more.current = Boolean(page.next) && page.results.length > 0;
      setCount(page.count); setHasMore(more.current);
      setItems(previous => mergeItems(reset ? [] : previous, page.results));
    } catch (reason) { if (!controller.signal.aborted && !isAborted(reason)) setError(reason instanceof Error ? reason.message : 'Unable to load results.'); }
    finally { if (!controller.signal.aborted) { busy.current = false; setLoading(false); } }
  }, [path]);
  useEffect(() => { if (!focusRefresh) void load(true); return () => { active.current?.abort(); busy.current = false; }; }, [load, focusRefresh]);
  useFocusEffect(useCallback(() => {
    if (focusRefresh) void load(true);
    return () => { active.current?.abort(); busy.current = false; };
  }, [load, focusRefresh]));
  return { items, setItems, count, hasMore, loading, error, refresh: () => load(true), loadMore: () => load(false) };
}
