import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle, RefreshControl } from 'react-native';
import { colors, s } from '../theme';

export function Button({ title, onPress, secondary = false, danger = false, disabled = false, busy = false }: { title: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean; busy?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} onPress={onPress} disabled={disabled || busy}
    style={({ pressed }) => ({ paddingVertical: 13, paddingHorizontal: 21, borderRadius: 40, minHeight: 48, borderWidth: 1, borderColor: danger ? colors.red : secondary ? '#CACACB' : colors.ink, backgroundColor: secondary ? colors.paper : danger ? colors.red : colors.ink, opacity: disabled || busy ? 0.45 : pressed ? 0.7 : 1, alignItems: 'center', justifyContent: 'center' })}>
    {busy ? <ActivityIndicator color={secondary ? colors.ink : colors.paper} /> : <Text style={{ color: secondary ? danger ? colors.red : colors.ink : colors.paper, fontSize: 14, fontWeight: '700' }}>{title}</Text>}
  </Pressable>;
}
export function Chip({ title, selected = false, onPress }: { title: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={{ borderWidth: 1, borderColor: selected ? colors.ink : '#CACACB', borderRadius: 24, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: selected ? colors.ink : colors.paper }}><Text style={{ color: selected ? colors.paper : colors.ink, fontWeight: '600', fontSize: 13 }}>{title}</Text></Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={{ gap: 7 }}><Text style={s.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} accessibilityLabel={label} {...props} style={[s.input, props.multiline && { minHeight: 120, textAlignVertical: 'top' }, error ? { borderColor: colors.red } : {}, props.style]} />{error ? <Text style={{ color: colors.red }}>{error}</Text> : null}</View>;
}
export function Feedback({ message, success = false }: { message?: string | null; success?: boolean }) {
  return message ? <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.wash, borderLeftWidth: 3, borderLeftColor: success ? colors.green : colors.red, padding: 14 }}><Text selectable style={[s.text, { color: success ? colors.green : colors.red }]}>{message}</Text></View> : null;
}
export function Loading() { return <ActivityIndicator style={{ padding: 28 }} color={colors.ink} accessibilityLabel="Loading" />; }
export function Empty({ title, text }: { title: string; text?: string }) { return <View style={[s.panel, { paddingVertical: 32 }]}><Text style={s.heading}>{title}</Text>{text ? <Text style={s.meta}>{text}</Text> : null}</View>; }
export function Screen({ children, refreshing, onRefresh, style, blocked = false }: { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; style?: StyleProp<ViewStyle>; blocked?: boolean }) {
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}><ScrollView pointerEvents={blocked ? 'none' : 'auto'} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, style]} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.ink} /> : undefined}>{children}</ScrollView></KeyboardAvoidingView>;
}
export function Pager({ loading, error, hasMore, onMore, onRetry }: { loading: boolean; error: string; hasMore: boolean; onMore: () => void; onRetry: () => void }) {
  return <><Feedback message={error} />{loading ? <Loading /> : error ? <Button title="Try again" secondary onPress={onRetry} /> : hasMore ? <Button title="Load more" secondary onPress={onMore} /> : null}</>;
}
export function confirm(title: string, message: string, action: () => void, destructive = true) {
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: destructive ? 'destructive' : 'default', onPress: action }]);
}
export function useMutation() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const locked = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async (action: () => Promise<void>) => { if (locked.current || !mounted.current) return; locked.current = true; setBusy(true); setError(''); setNotice(''); try { await action(); } catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Something went wrong.'); } finally { locked.current = false; if (mounted.current) setBusy(false); } };
  return { busy, error, notice, setError, setNotice, run };
}
