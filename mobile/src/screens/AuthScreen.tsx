import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useSession } from '../session/SessionProvider';
import { Button, Feedback, Field, Screen } from '../components/UI';
import type { Props } from '../navigation.types';
import { s } from '../theme';

export function AuthScreen({ route }: Props<'Auth'>) {
  const { session } = useSession(); const [register, setRegister] = useState(!!route.params?.register);
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [email, setEmail] = useState(''); const [first, setFirst] = useState(''); const [last, setLast] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [fields, setFields] = useState<Record<string, string[]>>({});
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) return; submitting.current = true; setBusy(true); setError(''); setNotice(''); setFields({});
    try {
      if (register) {
        await api.request('/auth/register/', { method: 'POST', token: null, body: { username: username.trim(), email: email.trim(), password, password_confirm: confirmation, first_name: first, last_name: last } });
        setRegister(false); setPassword(''); setConfirmation(''); setNotice('Account created. Sign in to continue.');
      } else { await session.login(username.trim(), password); }
    } catch (reason) {
      if (reason instanceof ApiError && reason.details && typeof reason.details === 'object') setFields(reason.details as Record<string, string[]>);
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally { submitting.current = false; setBusy(false); }
  }
  return <Screen><Text style={s.label}>Your next chapter</Text><Text style={s.title}>{register ? 'JOIN THE\nCONVERSATION.' : 'WELCOME\nBACK.'}</Text><Text style={s.text}>Read with curiosity. Write with purpose.</Text>
    <Feedback message={notice} success /><Feedback message={error} />
    <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" error={fields.username?.join(' ')} />
    {register && <><Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={fields.email?.join(' ')} /><Field label="First name" value={first} onChangeText={setFirst} maxLength={100} /><Field label="Last name" value={last} onChangeText={setLast} maxLength={100} /></>}
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={register ? 'new-password' : 'current-password'} error={fields.password?.join(' ')} />
    {register && <><Text style={s.meta}>8-50 characters, including a letter and a number.</Text><Field label="Confirm password" value={confirmation} onChangeText={setConfirmation} secureTextEntry error={fields.password_confirm?.join(' ')} /></>}
    <Button title={register ? 'Create account' : 'Sign in'} busy={busy} onPress={() => { void submit(); }} />
    <View style={s.divider} /><Button title={register ? 'Already a member? Sign in' : 'New here? Join us'} secondary disabled={busy} onPress={() => { setRegister(!register); setError(''); setFields({}); }} />
  </Screen>;
}
