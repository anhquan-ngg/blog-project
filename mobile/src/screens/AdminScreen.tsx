import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api, service } from '../api';
import { errorMessage, query } from '../api/client';
import type { ImportResult, Page, Post, User } from '../api/types';
import { usePaginated, useResource } from '../hooks/useAsync';
import { useSession } from '../session/SessionProvider';
import { importCsv, exportCsv } from '../utils/files';
import { Button, Chip, Empty, Feedback, Field, Loading, Pager, Screen, confirm, useMutation } from '../components/UI';
import { PostCard } from '../components/PostCard';
import { s } from '../theme';
import type { Category } from '../api/types';
import type { Props } from '../navigation.types';

export function AdminScreen({ navigation }: Props<'Admin'>) {
  const { user } = useSession(); const [tab, setTab] = useState('users');
  if (!user?.is_staff) return <Screen><Feedback message="Administrator access is required." /></Screen>;
  return <Screen><Text style={s.label}>Admin / Control room</Text><Text style={s.title}>KEEP IT\nMOVING.</Text><View style={s.row}>{['users', 'posts', 'CSV'].map(value => <Chip key={value} title={value} selected={tab === value} onPress={() => setTab(value)} />)}<Button title="Tags & categories" secondary onPress={() => navigation.navigate('Taxonomy')} /></View>
    {tab === 'users' ? <UserTools /> : tab === 'posts' ? <PostTools onOpen={id => navigation.navigate('Detail', { id })} /> : <CsvTools />}
  </Screen>;
}
function UserTools() {
  const { user } = useSession(); const [input, setInput] = useState(''); const [search, setSearch] = useState(''); const list = usePaginated<User>('/admin/users/');
  const [matches, setMatches] = useState<User[]>([]); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState(''); const [visible, setVisible] = useState(12); const [revision, setRevision] = useState(0); const mutation = useMutation();
  useEffect(() => {
    const controller = new AbortController(); let live = true; setSearchError(''); setMatches([]); setVisible(12);
    if (!search) { setSearching(false); return () => controller.abort(); }
    setSearching(true);
    async function findAll() {
      // The backend user endpoint has no search parameter. Search every page, not only loaded rows.
      const found: User[] = []; let offset = 0; let more = true;
      while (more) {
        const page = await api.request<Page<User>>(query('/admin/users/', { limit: 100, offset }), { signal: controller.signal });
        found.push(...page.results.filter(item => `${item.username} ${item.email} ${item.first_name} ${item.last_name}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
        offset += page.results.length; more = !!page.next && page.results.length > 0;
      }
      if (live) setMatches(found);
    }
    findAll().catch(reason => { if (live && !controller.signal.aborted) setSearchError(errorMessage(reason)); }).finally(() => { if (live) setSearching(false); });
    return () => { live = false; controller.abort(); };
  }, [search, revision]);
  const items = search ? matches.slice(0, visible) : list.items;
  return <><Field label="Search all accounts" value={input} onChangeText={setInput} autoCapitalize="none" onSubmitEditing={() => setSearch(input.trim())} /><View style={s.row}><Button title="Search" secondary onPress={() => setSearch(input.trim())} /><Button title="Reset" secondary onPress={() => { setInput(''); setSearch(''); void list.refresh(); }} /></View>
    <Feedback message={mutation.error} /><Feedback message={searchError} />{searching && <Loading />}
    <Text style={s.label}>{search ? matches.length : list.count} accounts</Text>
    {items.map(item => <View key={item.id} style={s.panel}><Text style={s.heading}>{item.username}</Text><Text style={s.text}>{item.email}</Text><Text style={s.meta}>{item.first_name} {item.last_name} / {item.is_staff ? 'Admin' : 'Member'} / {item.is_active ? 'Active' : 'Banned'}</Text>
      <Button title={item.is_active ? 'Ban account' : 'Unban account'} danger={item.is_active} secondary busy={mutation.busy} disabled={item.id === user?.id || (item.is_active && item.is_staff)} onPress={() => confirm(`${item.is_active ? 'Ban' : 'Unban'} ${item.username}?`, item.is_active ? 'This account will lose access to authenticated features.' : 'This restores access for this account.', () => { void mutation.run(async () => { await service.ban(item.id, !item.is_active); await list.refresh(); setRevision(value => value + 1); }); }, item.is_active)} />
    </View>)}
    {search ? <>{!searching && !searchError && !matches.length && <Empty title="No accounts found." text="Try a username, email, or name." />}{visible < matches.length && <Button title="Load more" secondary onPress={() => setVisible(value => value + 12)} />}{searchError && <Button title="Retry search" secondary onPress={() => setRevision(value => value + 1)} />}</> : <Pager {...list} onMore={() => { void list.loadMore(); }} onRetry={() => { void list.refresh(); }} />}
  </>;
}
function PostTools({ onOpen }: { onOpen: (id: number) => void }) {
  const [input, setInput] = useState(''); const [search, setSearch] = useState(''); const list = usePaginated<Post>(search ? query('/posts/search/', { q: search }) : '/posts/'); const mutation = useMutation();
  return <><Field label="Search stories" value={input} onChangeText={setInput} onSubmitEditing={() => setSearch(input.trim())} /><Button title="Search" secondary onPress={() => setSearch(input.trim())} /><Feedback message={mutation.error} />
    {list.items.map(post => <View key={post.id} style={s.divider}><PostCard post={post} onPress={() => onOpen(post.id)} /><Button title="Delete story" danger secondary busy={mutation.busy} onPress={() => confirm('Delete story?', `Permanently delete "${post.title}"?`, () => { void mutation.run(async () => { await service.deletePost(post.id); await list.refresh(); }); })} /></View>)}
    <Pager {...list} onMore={() => { void list.loadMore(); }} onRetry={() => { void list.refresh(); }} />
  </>;
}
function CsvTools() {
  const [kind, setKind] = useState<'posts' | 'users'>('posts'); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [category, setCategory] = useState<number | null>(null);
  const [active, setActive] = useState(''); const [staff, setStaff] = useState(''); const [report, setReport] = useState<ImportResult | null>(null); const [expanded, setExpanded] = useState(false);
  const categories = useResource<Category[]>('/categories/'); const mutation = useMutation();
  return <><Text style={s.heading}>CSV / IMPORT & EXPORT</Text><Text style={s.meta}>Imports create records and may partially succeed. Existing records are skipped or reported; review every result. Exports are not guaranteed to be re-importable. User exports do not include passwords.</Text>
    <View style={s.row}>{(['posts', 'users'] as const).map(value => <Chip key={value} title={value} selected={kind === value} onPress={() => { if (!mutation.busy) { setKind(value); setReport(null); } }} />)}</View>
    <Text style={s.meta}>Import headers: {kind === 'posts' ? 'title,content,category_name (content is plain text)' : 'username,email,password,first_name,last_name'}. Maximum file size: 10 MB.</Text>
    <Button title={`Import ${kind} CSV`} secondary busy={mutation.busy} onPress={() => confirm(`Import ${kind}?`, 'The selected CSV creates records immediately. This cannot be automatically undone.', () => { void mutation.run(async () => { setReport(null); const result = await importCsv(kind); if (result) setReport(result); }); }, false)} />
    {report && <View style={s.panel}><Text style={s.heading}>IMPORT RESULT</Text><Text style={s.text}>{report.total_rows} rows / {report.imported} imported / {report.skipped} skipped</Text>{report.errors.slice(0, expanded ? undefined : 10).map((item, i) => <Text key={i} selectable style={{ color: '#D30005' }}>Row {item.row}: {errorMessage(item.reason)}</Text>)}{report.errors.length > 10 && <Button title={expanded ? 'Show first 10 errors' : `Show all ${report.errors.length} errors`} secondary onPress={() => setExpanded(!expanded)} />}</View>}
    <View style={s.divider} /><Text style={s.label}>Export filters</Text><Field label="From date / YYYY-MM-DD" value={from} onChangeText={setFrom} autoCapitalize="none" placeholder="2026-01-01" editable={!mutation.busy} /><Field label="Through date / YYYY-MM-DD" value={to} onChangeText={setTo} autoCapitalize="none" placeholder="2026-12-31" editable={!mutation.busy} />
    {kind === 'posts' ? <><Text style={s.label}>Category</Text><View style={s.row}><Chip title="All" selected={category === null} onPress={() => setCategory(null)} />{categories.data?.map(item => <Chip key={item.id} title={item.name} selected={category === item.id} onPress={() => setCategory(item.id)} />)}</View><Feedback message={categories.error} /></> : <><Text style={s.label}>Account status</Text><View style={s.row}>{[['', 'All'], ['true', 'Active'], ['false', 'Banned']].map(([value, label]) => <Chip key={label} title={label} selected={active === value} onPress={() => setActive(value)} />)}</View><Text style={s.label}>Role</Text><View style={s.row}>{[['', 'All'], ['true', 'Admin'], ['false', 'Member']].map(([value, label]) => <Chip key={label} title={label} selected={staff === value} onPress={() => setStaff(value)} />)}</View></>}
    <Feedback message={mutation.error} /><Feedback message={mutation.notice} success /><Button title={`Export & share ${kind} CSV`} busy={mutation.busy} onPress={() => { void mutation.run(async () => {
      for (const value of [from, to]) if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)))) throw new Error('Use valid YYYY-MM-DD dates.');
      if (from && to && from > to) throw new Error('From date must not follow the through date.');
      const filters: Record<string, string> = {}; if (from) filters.from = from; if (to) filters.to = to;
      if (kind === 'posts' && category !== null) filters.category = String(category);
      if (kind === 'users') { if (active) filters.is_active = active; if (staff) filters.is_staff = staff; }
      await exportCsv(kind, filters); mutation.setNotice('CSV handed to the system share sheet.');
    }); }} />
  </>;
}
