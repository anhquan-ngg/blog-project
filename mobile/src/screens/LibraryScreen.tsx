import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Text, View } from 'react-native';
import type { Draft, Post } from '../api/types';
import { usePaginated } from '../hooks/useAsync';
import { useSession } from '../session/SessionProvider';
import { drafts } from '../utils/drafts';
import { displayDate } from '../utils/content';
import { Button, Chip, Empty, Feedback, Pager, Screen, confirm, useMutation } from '../components/UI';
import { PostCard } from '../components/PostCard';
import type { Props } from '../navigation.types';
import { s } from '../theme';

export function LibraryScreen({ navigation }: Props<'Library'>) {
  const [tab, setTab] = useState<'bookmarks' | 'liked' | 'drafts'>('bookmarks');
  const [localDrafts, setDrafts] = useState<Draft[]>([]); const mutation = useMutation(); const { user } = useSession();
  const list = usePaginated<Post>(tab === 'liked' ? '/me/liked/' : '/me/bookmarks/');
  const loadDrafts = useCallback(async () => { if (user) { try { setDrafts(await drafts.list(user.id)); } catch (reason) { mutation.setError(reason instanceof Error ? reason.message : 'Cannot read local drafts.'); } } }, [user?.id]);
  useFocusEffect(useCallback(() => { void loadDrafts(); }, [loadDrafts]));
  return <Screen onRefresh={() => { if (tab === 'drafts') void loadDrafts(); else void list.refresh(); }} refreshing={tab !== 'drafts' && list.loading && list.items.length > 0}>
    <Text style={s.label}>Keep what moves you</Text><Text style={s.title}>YOUR\nCOLLECTION.</Text>
    <View style={s.row}>{(['bookmarks', 'liked', 'drafts'] as const).map(value => <Chip key={value} title={value === 'drafts' ? 'Local drafts' : value === 'liked' ? 'Liked' : 'Saved'} selected={tab === value} onPress={() => setTab(value)} />)}</View>
    <Feedback message={mutation.error} />
    {tab === 'drafts' ? <><Text style={s.meta}>Drafts are stored only on this device, separated by account. They are not published or synced. Clearing app storage deletes them.</Text>{localDrafts.map(draft => <View key={draft.key} style={[s.panel, s.divider]}><Text style={s.heading}>{draft.title || 'Untitled draft'}</Text><Text style={s.meta}>LOCAL ONLY / {displayDate(draft.updatedAt)}</Text><View style={s.row}><Button title="Continue writing" onPress={() => navigation.navigate('Editor', { draftKey: draft.key })} /><Button title="Delete" secondary danger onPress={() => confirm('Delete local draft?', 'This cannot be undone.', () => { void mutation.run(async () => { await drafts.remove(draft.userId, draft.key); await loadDrafts(); }); })} /></View></View>)}{!localDrafts.length && <Empty title="Room for your next idea." text="Save a draft from the story editor." />}<Button title="Start writing" onPress={() => navigation.navigate('Editor')} /></> : <>{list.items.map(post => <PostCard key={post.id} post={post} onPress={() => navigation.navigate('Detail', { id: post.id })} />)}{!list.loading && !list.error && !list.items.length && <Empty title="Build your reading list." text="Like or save stories to find them here." />}<Pager {...list} onMore={() => { void list.loadMore(); }} onRetry={() => { void list.refresh(); }} /></>}
  </Screen>;
}
