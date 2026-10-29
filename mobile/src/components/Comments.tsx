import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { api, service } from '../api';
import type { Comment } from '../api/types';
import { usePaginated } from '../hooks/useAsync';
import { useSession } from '../session/SessionProvider';
import { authorId, authorName, displayDate, mediaUrl } from '../utils/content';
import { pickAndUploadImage } from '../utils/files';
import { Button, Empty, Feedback, Field, Pager, confirm, useMutation } from './UI';
import { s } from '../theme';

export function Comments({ postId, onSignIn }: { postId: number; onSignIn: () => void }) {
  const { user } = useSession(); const list = usePaginated<Comment>(`/posts/${postId}/comments/`);
  const [text, setText] = useState(''); const [editing, setEditing] = useState<Comment | null>(null); const [reply, setReply] = useState<Comment | null>(null);
  const [fileId, setFileId] = useState<number | null | undefined>(undefined); const [image, setImage] = useState<string | null>(null);
  const mutation = useMutation(); const revision = useRef(0); const uploadController = useRef<AbortController | null>(null);
  useEffect(() => () => { revision.current++; uploadController.current?.abort(); }, []);
  function reset() { revision.current++; setText(''); setEditing(null); setReply(null); setFileId(undefined); setImage(null); }
  function edit(comment: Comment) { if (mutation.busy) return; revision.current++; setEditing(comment); setReply(null); setText(comment.content); setFileId(undefined); setImage(comment.image_url); }
  function respond(comment: Comment) { if (mutation.busy) return; reset(); setReply(comment); }
  const upload = () => { const current = revision.current; void mutation.run(async () => { uploadController.current = new AbortController(); const result = await pickAndUploadImage(uploadController.current.signal); if (result && current === revision.current) { setFileId(result.id); setImage(result.url); } }); };
  function commentRow(comment: Comment, root?: Comment): React.ReactNode {
    const own = user && authorId(comment.author) === user.id; const uri = mediaUrl(comment.image_url, api.base);
    return <View key={comment.id} style={[s.divider, { gap: 10, marginLeft: root ? 20 : 0 }]}>
      <View style={s.between}><Text style={s.label}>{authorName(comment.author)}</Text><Text style={s.meta}>{displayDate(comment.created_at)}</Text></View>
      <Text selectable style={s.text}>{comment.content}</Text>{uri && <Image source={{ uri }} style={{ width: '100%', aspectRatio: 1.5 }} resizeMode="contain" accessibilityLabel="Comment attachment" />}
      {user && <View style={s.row}><Button title="Reply" secondary disabled={mutation.busy} onPress={() => respond(root || comment)} />{own && <Button title="Edit" secondary disabled={mutation.busy} onPress={() => edit(comment)} />}{(own || user.is_staff) && <Button title="Delete" danger secondary disabled={mutation.busy} onPress={() => confirm('Delete comment?', 'This comment will be removed.', () => { void mutation.run(async () => { await service.deleteComment(comment.id); if (editing?.id === comment.id) reset(); await list.refresh(); }); })} />}</View>}
      {!root && comment.replies?.map(child => commentRow(child, comment))}
    </View>;
  }
  return <View style={{ gap: 18 }}><Text style={s.heading}>THE CONVERSATION / {list.count}</Text>
    {user ? <View style={s.panel}><Text style={s.label}>{editing ? 'Edit your comment' : reply ? `Reply to ${authorName(reply.author)}` : 'Add your perspective'}</Text><Field label="Comment" value={text} onChangeText={setText} multiline editable={!mutation.busy} />
      {image && mediaUrl(image, api.base) ? <><Image source={{ uri: mediaUrl(image, api.base)! }} style={{ height: 160, width: '100%' }} resizeMode="contain" /><Button title="Remove image" secondary disabled={mutation.busy} onPress={() => { setFileId(null); setImage(null); }} /></> : null}
      <View style={s.row}><Button title="Attach image" secondary busy={mutation.busy} onPress={upload} /><Button title={editing ? 'Save comment' : reply ? 'Post reply' : 'Post comment'} busy={mutation.busy} disabled={!text.trim()} onPress={() => { void mutation.run(async () => { await service.comment(postId, { content: text.trim(), ...(fileId !== undefined ? { file_id: fileId } : {}), ...(!editing && reply ? { parent_id: reply.id } : {}) }, editing?.id); reset(); await list.refresh(); }); }} />{(editing || reply) && <Button title="Cancel" secondary disabled={mutation.busy} onPress={reset} />}</View><Feedback message={mutation.error} /></View> : <Button title="Sign in to comment" secondary onPress={onSignIn} />}
    {list.items.map(comment => commentRow(comment))}
    {!list.items.length && !list.loading && !list.error && <Empty title="Start a conversation." text="Be the first to share a thought." />}
    <Pager {...list} onMore={() => { void list.loadMore(); }} onRetry={() => { void list.refresh(); }} />
    {editing || reply ? <Text style={s.meta}>Your comment editor is at the top of this section.</Text> : null}
  </View>;
}
