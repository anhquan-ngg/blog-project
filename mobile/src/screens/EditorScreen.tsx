import React, { useEffect, useRef, useState } from 'react';
import { usePreventRemove } from '@react-navigation/native';
import { Alert, Image, Text, View } from 'react-native';
import { api, service } from '../api';
import type { Block, Category, Draft, Tag } from '../api/types';
import { useResource } from '../hooks/useAsync';
import { useSession } from '../session/SessionProvider';
import { authorId, mediaUrl, toBlocks } from '../utils/content';
import { drafts } from '../utils/drafts';
import { pickAndUploadImage } from '../utils/files';
import { Article } from '../components/Article';
import { Button, Chip, Feedback, Field, Loading, Screen, useMutation } from '../components/UI';
import type { Props } from '../navigation.types';
import { colors, s } from '../theme';

type EditableBlock = Block & { id: string };
const newBlockId = () => `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const editableBlocks = (blocks: Block[]): EditableBlock[] => blocks.map(block => ({ ...block, id: typeof block.id === 'string' && block.id ? block.id : newBlockId() }));

export function EditorScreen({ route, navigation }: Props<'Editor'>) {
  const { user } = useSession(); const [postId, setPostId] = useState(route.params?.id);
  const draftKey = useRef(route.params?.draftKey || `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [title, setTitle] = useState(''); const [category, setCategory] = useState<number | null>(null); const [tags, setTags] = useState<number[]>([]);
  const [blocks, setBlocks] = useState<EditableBlock[]>(() => editableBlocks([{ type: 'paragraph', data: { text: '' } }]));
  const [invalidBlocks, setInvalidBlocks] = useState<Record<string, boolean>>({});
  const invalidJson = blocks.some(block => invalidBlocks[block.id!]);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState(''); const [retry, setRetry] = useState(0);
  const [dirty, setDirty] = useState(false); const [preview, setPreview] = useState(false); const [newTag, setNewTag] = useState('');
  const [published, setPublished] = useState<number | null>(null); const mutation = useMutation();
  const categories = useResource<Category[]>('/categories/'); const allTags = useResource<Tag[]>('/tags/');
  const uploadAbort = useRef<AbortController | null>(null);
  usePreventRemove(dirty && !published, ({ data }) => Alert.alert('Leave without saving?', 'Save a local draft before leaving to keep your changes.', [{ text: 'Keep writing', style: 'cancel' }, { text: 'Discard changes', style: 'destructive', onPress: () => navigation.dispatch(data.action) }]));
  useEffect(() => {
    const controller = new AbortController(); let live = true; setLoading(true); setLoadError('');
    async function initialize() {
      if (!user) return;
      if (route.params?.draftKey) {
        const local = (await drafts.list(user.id)).find(draft => draft.key === route.params!.draftKey);
        if (!local) throw new Error('This local draft is no longer available.');
        if (!live) return;
        setPostId(local.postId); setTitle(local.title); setCategory(local.category); setTags(local.tags); setBlocks(editableBlocks(local.content));
      } else if (route.params?.id) {
        const post = await service.post(route.params.id, controller.signal);
        if (authorId(post.author) !== user.id) throw new Error('Only the author can edit this story.');
        if (!live) return;
        setTitle(post.title); setCategory(post.category?.id || null); setTags(post.tags?.map(tag => tag.id) || []); setBlocks(editableBlocks(toBlocks(post.content)));
      }
    }
    initialize().catch(reason => { if (live && !controller.signal.aborted) setLoadError(reason.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; controller.abort(); uploadAbort.current?.abort(); };
  }, [route.params?.id, route.params?.draftKey, user?.id, retry]);
  useEffect(() => { if (published) navigation.replace('Detail', { id: published }); }, [published, navigation]);
  function update(index: number, patch: Partial<Block['data']>) { setBlocks(previous => previous.map((block, i) => i === index ? { ...block, data: { ...block.data, ...patch } } : block)); setDirty(true); }
  function add(type: string) { setBlocks(previous => [...previous, { id: newBlockId(), type, data: type === 'heading' ? { text: '', level: 2 } : { text: '' } }]); setDirty(true); }
  async function upload() {
    await mutation.run(async () => {
      uploadAbort.current = new AbortController();
      const result = await pickAndUploadImage(uploadAbort.current.signal);
      if (!result || uploadAbort.current.signal.aborted) return;
      setBlocks(previous => [...previous, { id: newBlockId(), type: 'image', data: { file_id: result.id, url: result.url, caption: '', alignment: 'center' } }]); setDirty(true);
    });
  }
  async function saveDraft() {
    if (!user) return;
    await mutation.run(async () => {
      const local: Draft = { key: draftKey.current, userId: user.id, postId, title, category, tags, content: blocks, updatedAt: new Date().toISOString() };
      await drafts.save(local); setDirty(false); mutation.setNotice('Draft saved on this device only.');
    });
  }
  async function publish() {
    if (!user) return;
    await mutation.run(async () => {
      if (!title.trim()) throw new Error('Title is required.');
      if (title.trim().length > 200) throw new Error('Title must not exceed 200 characters.');
      if (!category) throw new Error('Choose a category.');
      const content = blocks.filter(block => block.type === 'image' ? Boolean(block.data.file_id) : block.type === 'paragraph' || block.type === 'heading' ? Boolean(block.data.text?.trim()) : true);
      if (!content.length) throw new Error('Add at least one content block.');
      const saved = await service.savePost({ title: title.trim(), category, tags, content }, postId);
      try { await drafts.remove(user.id, draftKey.current); } catch { Alert.alert('Story published', 'The local draft could not be removed. You may delete it from your library.'); }
      setDirty(false); setPublished(saved.id);
    });
  }
  if (loading) return <Screen><Loading /></Screen>;
  if (loadError) return <Screen><Feedback message={loadError} /><Button title="Retry" onPress={() => setRetry(value => value + 1)} /></Screen>;
  return <Screen blocked={mutation.busy}><Text style={s.label}>{postId ? 'Edit your story' : 'Create / Tell it your way'}</Text><Text style={s.title}>WORDS\nTHAT MOVE.</Text>
    <Text style={s.meta}>Live posts publish immediately. Drafts stay only on this device. Paragraphs and headings accept editable HTML, with a native preview below.</Text>
    <Field label={`Title / ${title.length} of 200`} value={title} onChangeText={value => { setTitle(value); setDirty(true); }} maxLength={200} editable={!mutation.busy} />
    <Text style={s.label}>Category / Required</Text><View style={s.row}>{categories.data?.map(item => <Chip key={item.id} title={item.name} selected={category === item.id} onPress={() => { setCategory(item.id); setDirty(true); }} />)}</View>
    {categories.loading && <Loading />}<Feedback message={categories.error} />{categories.error && <Button title="Retry categories" secondary onPress={categories.refresh} />}
    {categories.data?.length === 0 && <Text style={s.meta}>No categories are available. An administrator must create one before you can publish.</Text>}
    <Text style={s.label}>Tags</Text><View style={s.row}>{allTags.data?.map(tag => <Chip key={tag.id} title={`#${tag.name}`} selected={tags.includes(tag.id)} onPress={() => { setTags(previous => previous.includes(tag.id) ? previous.filter(id => id !== tag.id) : [...previous, tag.id]); setDirty(true); }} />)}</View>
    <Feedback message={allTags.error} />{allTags.error && <Button title="Retry tags" secondary onPress={allTags.refresh} />}
    <Field label="Create a tag" value={newTag} onChangeText={setNewTag} editable={!mutation.busy} /><Button title="Add new tag" secondary disabled={!newTag.trim()} busy={mutation.busy} onPress={() => { void mutation.run(async () => { const tag = await api.request<Tag>('/tags/', { method: 'POST', body: { name: newTag.trim() } }); allTags.setData(previous => [...(previous || []), tag]); setTags(previous => [...previous, tag.id]); setNewTag(''); setDirty(true); }); }} />
    <View style={s.divider} /><View style={s.between}><Text style={s.heading}>THE STORY</Text><Button title={preview ? 'Edit blocks' : 'Preview'} secondary disabled={invalidJson || mutation.busy} onPress={() => setPreview(!preview)} /></View>
    {preview ? <Article content={blocks} /> : blocks.map((block, index) => <View key={block.id} style={[s.panel, { borderTopWidth: 2, borderTopColor: colors.ink }]}>
      <Text style={s.label}>{String(index + 1).padStart(2, '0')} / {block.type}</Text>
      {block.type === 'image' ? <>{mediaUrl(block.data.url, api.base) && <Image source={{ uri: mediaUrl(block.data.url, api.base)! }} style={{ width: '100%', aspectRatio: 1.5 }} resizeMode="contain" />}<Field label="Image caption" editable={!mutation.busy} value={block.data.caption || ''} onChangeText={caption => update(index, { caption })} /><View style={s.row}>{['left', 'center', 'right'].map(alignment => <Chip key={alignment} title={alignment} selected={block.data.alignment === alignment} onPress={() => update(index, { alignment })} />)}</View></> : <>
        {['paragraph', 'heading', 'header', 'quote', 'html', 'raw', 'code'].includes(block.type) ? <>
          <Field label={block.type === 'code' ? 'Code' : 'Editable HTML'} multiline value={String(block.data.html ?? block.data.code ?? block.data.text ?? '')} autoCapitalize="none" autoCorrect={false} onChangeText={text => update(index, block.type === 'html' || block.type === 'raw' ? { html: text } : block.type === 'code' ? { code: text } : { text })} editable={!mutation.busy} />
          {block.type !== 'code' && <><Text style={s.meta}>HTML examples: &lt;strong&gt;bold&lt;/strong&gt;, &lt;em&gt;italic&lt;/em&gt;, &lt;a href="https://example.com"&gt;link&lt;/a&gt;.</Text><View style={s.row}><Button title="Bold" secondary onPress={() => update(index, { [block.type === 'raw' || block.type === 'html' ? 'html' : 'text']: `${block.data.html ?? block.data.text ?? ''}<strong>bold text</strong>` })} /><Button title="Italic" secondary onPress={() => update(index, { [block.type === 'raw' || block.type === 'html' ? 'html' : 'text']: `${block.data.html ?? block.data.text ?? ''}<em>italic text</em>` })} /></View></>}
          {(block.type === 'heading' || block.type === 'header') && <View style={s.row}>{[1, 2, 3, 4].map(level => <Chip key={level} title={`H${level}`} selected={block.data.level === level} onPress={() => update(index, { level })} />)}</View>}
        </> : <><Text style={s.meta}>Existing {block.type} block preserved. Edit its JSON data.</Text><JsonBlock value={block.data} disabled={mutation.busy} onValidity={valid => { setInvalidBlocks(previous => ({ ...previous, [block.id!]: !valid })); setDirty(true); }} onChange={data => { setBlocks(previous => previous.map((item, i) => i === index ? { ...item, data } : item)); setDirty(true); }} /></>}
      </>}
      <View style={s.row}><Button title="Move up" secondary disabled={index === 0 || mutation.busy} onPress={() => { setBlocks(previous => { const next = [...previous]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; }); setDirty(true); }} /><Button title="Move down" secondary disabled={index === blocks.length - 1 || mutation.busy} onPress={() => { setBlocks(previous => { const next = [...previous]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; }); setDirty(true); }} /><Button title="Remove" secondary danger disabled={mutation.busy} onPress={() => { setBlocks(previous => previous.filter((_, i) => i !== index)); setDirty(true); }} /></View>
    </View>)}
    {!preview && <View style={s.row}><Button title="+ Paragraph" secondary disabled={mutation.busy} onPress={() => add('paragraph')} /><Button title="+ Heading" secondary disabled={mutation.busy} onPress={() => add('heading')} /><Button title="+ Image" secondary busy={mutation.busy} onPress={() => { void upload(); }} /></View>}
    <Feedback message={invalidJson ? 'Fix invalid JSON blocks before saving or publishing.' : mutation.error} /><Feedback message={mutation.notice} success />
    <View style={s.row}><Button title="Save local draft" secondary busy={mutation.busy} disabled={invalidJson} onPress={() => { void saveDraft(); }} /><Button title={postId ? 'Update story' : 'Publish story'} busy={mutation.busy} disabled={invalidJson || categories.loading || !!categories.error} onPress={() => { void publish(); }} /></View>
  </Screen>;
}
function JsonBlock({ value, onChange, onValidity, disabled }: { value: Block['data']; onChange: (value: Block['data']) => void; onValidity: (valid: boolean) => void; disabled: boolean }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2)); const [error, setError] = useState('');
  return <Field label="Block JSON" value={text} multiline editable={!disabled} error={error} onChangeText={next => { setText(next); try { const parsed = JSON.parse(next); if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Expected a JSON object.'); onChange(parsed); onValidity(true); setError(''); } catch { onValidity(false); setError('Invalid JSON. Correct this block or remove it before saving.'); } }} />;
}
