import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { Category, Page, Post, Tag } from '../api/types';
import { query } from '../api/client';
import { usePaginated, useResource, normalizePage } from '../hooks/useAsync';
import { Button, Chip, Empty, Feedback, Field, Pager, Screen } from '../components/UI';
import { PostCard } from '../components/PostCard';
import type { Props } from '../navigation.types';
import { colors, s } from '../theme';

export function FeedScreen({ navigation, route }: Props<'Feed'>) {
  const [input, setInput] = useState(''); const [search, setSearch] = useState('');
  const [category, setCategory] = useState<number | undefined>(route.params?.category);
  const [tag, setTag] = useState(route.params?.tag || ''); const [ordering, setOrdering] = useState('-created_at');
  useEffect(() => { setCategory(route.params?.category); setTag(route.params?.tag || ''); }, [route.params]);
  const categories = useResource<Category[] | Page<Category>>('/categories/');
  const tags = useResource<Tag[] | Page<Tag>>('/tags/');
  // Search supports q/category only; tag and ordering are available on the standard feed.
  const path = query(search ? '/posts/search/' : '/posts/', search ? { q: search, category } : { category, tag, ordering });
  const list = usePaginated<Post>(path);
  const width = useWindowDimensions().width; const columns = width >= 900 ? 3 : width >= 650 ? 2 : 1;
  const first = !search && !category && !tag ? list.items[0] : null;
  const rest = first ? list.items.slice(1) : list.items;
  return <Screen refreshing={list.loading && list.items.length > 0} onRefresh={() => { void list.refresh(); }}>
    <Text style={s.label}>Independent voices / Everyday momentum</Text>
    <Text style={[s.title, { fontSize: width < 380 ? 49 : 62, lineHeight: width < 380 ? 48 : 59 }]}>STORIES.{ '\n' }NOT NOISE.</Text>
    <Text style={s.text}>Fresh perspectives. Find your next obsession.</Text>
    <Field label="Search stories" value={input} onChangeText={setInput} placeholder="What moves you?" returnKeyType="search" onSubmitEditing={() => setSearch(input.trim())} />
    <View style={s.row}><Button title="Search" onPress={() => setSearch(input.trim())} />{(search || category || tag) ? <Button title="Reset" secondary onPress={() => { setInput(''); setSearch(''); setCategory(undefined); setTag(''); navigation.setParams({ category: undefined, tag: undefined }); }} /> : null}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}><Chip title="All stories" selected={!category} onPress={() => setCategory(undefined)} />{categories.data && normalizePage(categories.data).results.map(item => <Chip key={item.id} title={item.name} selected={category === item.id} onPress={() => setCategory(item.id)} />)}</ScrollView>
    {categories.error ? <><Feedback message={categories.error} /><Button title="Retry categories" secondary onPress={categories.refresh} /></> : null}
    {!search ? <><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{tags.data && normalizePage(tags.data).results.map(item => <Chip key={item.id} title={`#${item.name}`} selected={tag === item.slug} onPress={() => setTag(tag === item.slug ? '' : item.slug)} />)}</ScrollView><View style={s.row}>{[['-created_at', 'Latest'], ['-likes_count', 'Most liked'], ['-bookmarks_count', 'Most saved']].map(([value, title]) => <Chip key={value} title={title} selected={ordering === value} onPress={() => setOrdering(value)} />)}</View></> : <Text style={s.meta}>Search results use relevance ranking; category filtering is supported.</Text>}
    {tags.error ? <Button title="Retry tags" secondary onPress={tags.refresh} /> : null}
    <View style={[s.between, { borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: 20 }]}><Text style={s.label}>{search ? `Results for "${search}"` : 'The latest drop'}</Text><Text style={s.meta}>{list.count} stories</Text></View>
    {first && <PostCard post={first} featured onPress={() => navigation.navigate('Detail', { id: first.id })} />}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>{rest.map(post => <View key={post.id} style={{ width: columns === 1 ? '100%' : columns === 2 ? '48%' : '31%' }}><PostCard post={post} onPress={() => navigation.navigate('Detail', { id: post.id })} /></View>)}</View>
    {!list.loading && !list.error && !list.items.length && <Empty title="Nothing here. Yet." text="Try another search or clear your filters." />}
    <Pager {...list} onMore={() => { void list.loadMore(); }} onRetry={() => { void list.refresh(); }} />
  </Screen>;
}
