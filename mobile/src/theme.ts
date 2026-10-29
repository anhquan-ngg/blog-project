import { StyleSheet } from 'react-native';
export const colors = { ink: '#111111', paper: '#FFFFFF', muted: '#68686B', line: '#E5E5E5', wash: '#F5F5F5', red: '#D30005', green: '#007D48' };
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 20, paddingBottom: 48, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: colors.ink, fontFamily: 'BarlowCondensed_800ExtraBold', fontSize: 58, lineHeight: 56, letterSpacing: -0.8, textTransform: 'uppercase' },
  heading: { color: colors.ink, fontFamily: 'BarlowCondensed_700Bold', fontSize: 30, lineHeight: 34, letterSpacing: -0.4 },
  text: { color: colors.ink, fontFamily: 'Manrope_400Regular', fontSize: 16, lineHeight: 25 },
  meta: { color: colors.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  label: { color: colors.ink, fontFamily: 'Manrope_600SemiBold', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  input: { backgroundColor: colors.wash, borderWidth: 1, borderColor: colors.line, borderRadius: 4, color: colors.ink, fontFamily: 'Manrope_400Regular', padding: 14, fontSize: 16, minHeight: 50 },
  divider: { borderBottomColor: colors.line, borderBottomWidth: 1, paddingBottom: 20 },
  panel: { padding: 18, backgroundColor: colors.wash, gap: 12 },
});
