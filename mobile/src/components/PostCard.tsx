import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { Post } from '../api/types';
import { api } from '../api';
import { authorName, displayDate, mediaUrl } from '../utils/content';
import { colors, s } from '../theme';

export function PostCard({ post, onPress, featured = false }: { post: Post; onPress: () => void; featured?: boolean }) {
  const image = mediaUrl(post.thumbnail, api.base);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Read ${post.title}`} onPress={onPress} style={{ gap: 12, marginBottom: 8 }}>
    {image ? <Image source={{ uri: image }} accessibilityLabel={post.title} style={{ width: '100%', aspectRatio: featured ? 1.2 : 1.5, backgroundColor: colors.wash }} resizeMode="cover" /> : <View style={{ width: '100%', aspectRatio: featured ? 1.8 : 2.6, backgroundColor: colors.wash, padding: 24, justifyContent: 'flex-end' }}><Text style={{ color: '#D8D8D8', fontSize: featured ? 72 : 48, fontWeight: '900', letterSpacing: -4 }}>STORY.</Text></View>}
    <View style={{ gap: 5 }}><Text style={s.label}>{post.category?.name || 'Uncategorized'}</Text><Text style={[featured ? s.title : s.heading, !featured && { fontSize: 24 }]}>{post.title}</Text><Text style={s.meta}>{authorName(post.author)} / {displayDate(post.created_at)}</Text><Text style={s.meta}>{post.likes_count || 0} likes / {post.bookmarks_count || 0} saved</Text></View>
  </Pressable>;
}
