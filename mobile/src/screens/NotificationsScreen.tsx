import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Notification } from '../api/types';
import { service } from '../api';
import { usePaginated } from '../hooks/useAsync';
import { Button, Empty, Feedback, Pager, Screen, useMutation } from '../components/UI';
import { displayDate, notificationText } from '../utils/content';
import { colors, s } from '../theme';
import type { Props } from '../navigation.types';

export function NotificationsScreen({ navigation }: Props<'Notifications'>) {
  const list = usePaginated<Notification>('/notifications/'); const mutation = useMutation(); const [read, setRead] = useState<Set<number>>(new Set());
  async function mark(item: Notification, open = false) {
    await mutation.run(async () => {
      if (!item.is_read && !read.has(item.id)) { await service.read(item.id); setRead(previous => new Set(previous).add(item.id)); }
      if (open && item.post_id) navigation.navigate('Detail', { id: item.post_id });
    });
  }
  return <Screen onRefresh={() => { void list.refresh(); }} refreshing={list.loading && list.items.length > 0}><Text style={s.label}>Your people / Your stories</Text><Text style={s.title}>STAY IN\nTHE LOOP.</Text><Feedback message={mutation.error} />
    {list.items.map(item => <View key={item.id} style={[s.panel, { borderLeftWidth: item.is_read || read.has(item.id) ? 1 : 5, borderLeftColor: colors.ink }]}>
      <Text style={s.label}>{item.is_read || read.has(item.id) ? 'Read' : 'New'} / {displayDate(item.created_at)}</Text>
      <Pressable accessibilityRole="button" disabled={mutation.busy || !item.post_id} onPress={() => { void mark(item, true); }}><Text style={s.heading}>{notificationText(item.type, item.actor_username)}</Text></Pressable>
      {!item.post_id && <Text style={s.meta}>The original story is no longer available.</Text>}
      <View style={s.row}>{!item.is_read && !read.has(item.id) && <Button title="Mark read" secondary busy={mutation.busy} onPress={() => { void mark(item); }} />}{!!item.post_id && <Button title="View story" secondary busy={mutation.busy} onPress={() => { void mark(item, true); }} />}</View>
    </View>)}
    {!list.loading && !list.error && !list.items.length && <Empty title="All quiet. For now." text="Likes, comments and replies will appear here." />}
    <Pager {...list} onMore={() => { void list.loadMore(); }} onRetry={() => { void list.refresh(); }} />
  </Screen>;
}
