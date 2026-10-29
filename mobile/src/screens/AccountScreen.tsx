import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { api, service } from '../api';
import type { Post, User } from '../api/types';
import { query } from '../api/client';
import { useSession } from '../session/SessionProvider';
import { usePaginated } from '../hooks/useAsync';
import { Button, Empty, Feedback, Field, Pager, Screen, confirm, useMutation } from '../components/UI';
import { PostCard } from '../components/PostCard';
import type { Props } from '../navigation.types';
import { s } from '../theme';

export function AccountScreen({ navigation }: Props<'Account'>) {
  const { user, session } = useSession();
  const [first, setFirst] = useState(user?.first_name || ''); const [last, setLast] = useState(user?.last_name || '');
  const mutation = useMutation(); const list = usePaginated<Post>(query('/posts/', { author: user?.id }));
  if (!user) return null;
  return <Screen onRefresh={() => { void list.refresh(); }} refreshing={list.loading && list.items.length > 0}>
    <Text style={s.label}>Member / {user.username}</Text><Text style={s.title}>MAKE IT\nPERSONAL.</Text><Text style={s.meta}>{user.email}</Text>
    <Feedback message={mutation.error} /><Feedback message={mutation.notice} success />
    <Field label="First name" value={first} onChangeText={setFirst} maxLength={100} /><Field label="Last name" value={last} onChangeText={setLast} maxLength={100} />
    <Text style={s.meta}>Only your first and last names can be changed. Username and email are read-only.</Text>
    <Button title="Save profile" busy={mutation.busy} onPress={() => { void mutation.run(async () => { const changes: Record<string, string> = {}; if (first !== user.first_name) changes.first_name = first.trim(); if (last !== user.last_name) changes.last_name = last.trim(); if (!Object.keys(changes).length) { mutation.setNotice('No changes to save.'); return; } const updated = await api.request<User>('/auth/me/', { method: 'PATCH', body: changes }); session.updateUser(updated); mutation.setNotice('Profile updated.'); }); }} />
    <View style={s.row}><Button title="Write a story" onPress={() => navigation.navigate('Editor')} /><Button title="Library & local drafts" secondary onPress={() => navigation.navigate('Library')} />{user.is_staff && <Button title="Administration" secondary onPress={() => navigation.navigate('Admin')} />}</View>
    <Button title="Manage tags" secondary onPress={() => navigation.navigate('Taxonomy')} />
    <Button title="Sign out" secondary onPress={() => confirm('Sign out?', 'Your local drafts stay on this device. You will need to sign in again.', () => { void session.logout().then(error => { if (error) Alert.alert('Signed out on this device', 'The server could not be reached. The server token may remain valid until your next successful sign out.'); }); }, false)} />
    <View style={s.divider} /><Text style={s.heading}>YOUR STORIES / {list.count}</Text>
    {list.items.map(post => <View key={post.id} style={[s.divider, { gap: 12 }]}><PostCard post={post} onPress={() => navigation.navigate('Detail', { id: post.id })} /><View style={s.row}><Button title="Edit" secondary onPress={() => navigation.navigate('Editor', { id: post.id })} /><Button title="Delete" danger secondary disabled={mutation.busy} onPress={() => confirm('Delete story?', `"${post.title}" will be deleted.`, () => { void mutation.run(async () => { await service.deletePost(post.id); await list.refresh(); }); })} /></View></View>)}
    {!list.loading && !list.error && !list.items.length && <Empty title="Your voice belongs here." text="Publish your first story or save a local draft." />}
    <Pager {...list} onMore={() => { void list.loadMore(); }} onRetry={() => { void list.refresh(); }} />
  </Screen>;
}
