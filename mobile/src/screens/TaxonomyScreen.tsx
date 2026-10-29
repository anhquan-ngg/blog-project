import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, service } from '../api';
import type { Category, Tag } from '../api/types';
import { useResource } from '../hooks/useAsync';
import { useSession } from '../session/SessionProvider';
import { Button, Chip, Feedback, Field, Loading, Screen, confirm, useMutation } from '../components/UI';
import { s } from '../theme';

export function TaxonomyScreen() {
  const { user } = useSession(); const [kind, setKind] = useState<'tags' | 'categories'>('tags');
  const resource = useResource<(Category & Partial<Tag>)[]>(`/${kind}/`);
  const [editing, setEditing] = useState<(Category & Partial<Tag>) | null>(null); const [name, setName] = useState(''); const [parent, setParent] = useState<number | null>(null);
  const [filter, setFilter] = useState(''); const mutation = useMutation();
  useFocusEffect(React.useCallback(() => { resource.refresh(); }, [kind]));
  function reset() { setEditing(null); setName(''); setParent(null); }
  if (!user) return null;
  return <Screen onRefresh={resource.refresh} refreshing={resource.loading && !!resource.data}>
    <Text style={s.label}>Organize the conversation</Text><Text style={s.title}>FIND THE\nRIGHT WORDS.</Text>
    <Text style={s.meta}>Tags can be created, renamed, and deleted by signed-in members. Categories are managed by administrators.</Text>
    <View style={s.row}><Chip title="Tags" selected={kind === 'tags'} onPress={() => { setKind('tags'); reset(); }} />{user.is_staff && <Chip title="Categories" selected={kind === 'categories'} onPress={() => { setKind('categories'); reset(); }} />}</View>
    <Feedback message={mutation.error} /><Feedback message={mutation.notice} success />
    <View style={s.panel}><Text style={s.heading}>{editing ? `Rename ${kind === 'tags' ? 'tag' : 'category'}` : `Create ${kind === 'tags' ? 'tag' : 'category'}`}</Text><Field label="Name" value={name} onChangeText={setName} editable={!mutation.busy} />
      {kind === 'categories' && <><Text style={s.label}>Parent category</Text><View style={s.row}><Chip title="None / Root" selected={parent === null} onPress={() => setParent(null)} />{resource.data?.filter(item => item.id !== editing?.id).map(item => <Chip key={item.id} title={item.name} selected={parent === item.id} onPress={() => setParent(item.id)} />)}</View></>}
      <View style={s.row}><Button title={editing ? 'Save changes' : 'Create'} busy={mutation.busy} disabled={!name.trim()} onPress={() => { void mutation.run(async () => {
        if (kind === 'categories') await service.saveCategory(name.trim(), parent, editing?.id);
        else await service.saveTag(name.trim(), editing?.id);
        reset(); resource.refresh(); mutation.setNotice('Saved.');
      }); }} />{editing && <Button title="Cancel" secondary disabled={mutation.busy} onPress={reset} />}</View>
    </View>
    <Field label={`Filter ${kind}`} value={filter} onChangeText={setFilter} />
    {resource.loading && <Loading />}<Feedback message={resource.error} />{resource.error && <Button title="Retry" secondary onPress={resource.refresh} />}
    {resource.data?.filter(item => item.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(item => <View key={item.id} style={[s.divider, { gap: 12 }]}><Text style={s.heading}>{item.name}</Text><Text style={s.meta}>/{item.slug}{kind === 'categories' ? ` / ${item.posts_count ?? 0} stories / parent ${item.parent_id ?? 'none'}` : ''}</Text><View style={s.row}><Button title="Edit" secondary disabled={mutation.busy} onPress={() => { setEditing(item); setName(item.name); setParent(item.parent_id ?? null); }} /><Button title="Delete" secondary danger disabled={mutation.busy} onPress={() => confirm(`Delete ${item.name}?`, 'This changes organization for existing stories. The server may reject categories that are still in use.', () => { void mutation.run(async () => { await api.request(`/${kind}/${item.id}/`, { method: 'DELETE' }); if (editing?.id === item.id) reset(); resource.refresh(); }); })} /></View></View>)}
  </Screen>;
}
