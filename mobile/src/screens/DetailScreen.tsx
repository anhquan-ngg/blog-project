import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Share, Text, View } from 'react-native';
import { service } from '../api';
import type { Post } from '../api/types';
import { useResource } from '../hooks/useAsync';
import { useSession } from '../session/SessionProvider';
import { authorId, authorName, displayDate } from '../utils/content';
import { Article } from '../components/Article';
import { Comments } from '../components/Comments';
import { PostCard } from '../components/PostCard';
import { Button, Chip, Feedback, Loading, Screen, confirm, useMutation } from '../components/UI';
import type { Props } from '../navigation.types';
import { s } from '../theme';

export function DetailScreen({ route, navigation }: Props<'Detail'>) {
  const id = route.params.id; const resource = useResource<Post>(`/posts/${id}/`); const related = useResource<Post[]>(`/posts/${id}/related/`);
  const { user } = useSession(); const mutation = useMutation();
  useFocusEffect(useCallback(() => { resource.refresh(); }, [id]));
  const post = resource.data;
  const signIn = () => navigation.navigate('Auth');
  return <Screen onRefresh={resource.refresh} refreshing={resource.loading && !!post}>
    {resource.loading && <Loading />}<Feedback message={resource.error} />{resource.error && <Button title="Try again" onPress={resource.refresh} secondary />}
    {post && <><View style={s.row}>{post.category && <Chip title={post.category.name} onPress={() => navigation.navigate('Feed', { category: post.category!.id })} />}<Text style={s.meta}>{displayDate(post.created_at)}</Text></View>
      <Text style={s.title}>{post.title}</Text><Text style={s.label}>By {authorName(post.author)}</Text>
      <Article content={post.content} />
      <View style={s.row}>{post.tags?.map(tag => <Chip key={tag.id} title={`#${tag.name}`} onPress={() => navigation.navigate('Feed', { tag: tag.slug })} />)}</View>
      <Feedback message={mutation.error} />
      <View style={s.row}><Button title={`${post.is_liked ? 'Liked' : 'Like'} / ${post.likes_count}`} secondary={!post.is_liked} busy={mutation.busy} onPress={() => { if (!user) { signIn(); return; } void mutation.run(async () => { const result = await service.like(id); resource.setData(current => current ? { ...current, ...result } : current); }); }} />
        <Button title={`${post.is_bookmarked ? 'Saved' : 'Save'} / ${post.bookmarks_count}`} secondary={!post.is_bookmarked} busy={mutation.busy} onPress={() => { if (!user) { signIn(); return; } void mutation.run(async () => { const result = await service.bookmark(id); resource.setData(current => current ? { ...current, ...result } : current); }); }} />
        <Button title="Share" secondary onPress={() => { void mutation.run(async () => { await Share.share({ message: `${post.title}\nstrideblog://story/${id}` }); }); }} />
      </View>
      {user && <View style={s.row}>{authorId(post.author) === user.id && <Button title="Edit story" secondary onPress={() => navigation.navigate('Editor', { id })} />}{(authorId(post.author) === user.id || user.is_staff) && <Button title="Delete story" danger secondary disabled={mutation.busy} onPress={() => confirm('Delete story?', 'This story will be removed from the feed.', () => { void mutation.run(async () => { await service.deletePost(id); navigation.navigate('Feed'); }); })} />}</View>}
      <View style={s.divider} /><Comments key={`${id}-${user?.id || 'guest'}`} postId={id} onSignIn={signIn} />
      <View style={s.divider} /><Text style={s.heading}>KEEP EXPLORING.</Text>
      {related.data?.map(item => <PostCard key={item.id} post={item} onPress={() => navigation.push('Detail', { id: item.id })} />)}
      {related.loading && <Loading />}<Feedback message={related.error} />{related.error && <Button title="Retry related stories" secondary onPress={related.refresh} />}
    </>}
  </Screen>;
}
