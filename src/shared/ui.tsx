import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type ViewProps } from 'react-native';
import { useTokens } from './theme';
import { useFinance } from '@/features/FinanceProvider';

export function Copy({ style, tone = 'text', ...props }: TextProps & { tone?: 'text' | 'muted' | 'positive' | 'negative' | 'primary' | 'warning' }) {
  const t = useTokens(); return <Text {...props} style={[styles.copy, { color: t[tone] }, style]} />;
}
export function Heading({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return <Copy accessibilityRole="header" style={small ? styles.section : styles.heading}>{children}</Copy>;
}
export function Card({ style, ...props }: ViewProps) {
  const t = useTokens(); return <View {...props} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]} />;
}
export function Row({ children }: { children: ReactNode }) { return <View style={styles.row}>{children}</View>; }
export function Action({ label, onPress, variant = 'primary', disabled = false, compact = false }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; compact?: boolean;
}) {
  const t = useTokens();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? t.negativeSoft : t.surfaceAlt;
  const color = variant === 'primary' ? t.onPrimary : variant === 'danger' ? t.negative : t.text;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, compact && styles.compact, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }]}>
    <Text style={[styles.actionText, { color }]}>{label}</Text>
  </Pressable>;
}
export function Field({ label, help, style, ...props }: TextInputProps & { label: string; help?: string }) {
  const t = useTokens(); return <View style={styles.field}>
    <Copy style={styles.label}>{label}</Copy>
    <TextInput accessibilityLabel={label} placeholderTextColor={t.muted} selectionColor={t.primary} {...props}
      style={[styles.input, { color: t.text, backgroundColor: t.surface, borderColor: t.border }, style]} />
    {help && <Copy tone="muted" style={styles.small}>{help}</Copy>}
  </View>;
}
export function Choice({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const t = useTokens(); return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.choice, { borderColor: selected ? t.primary : t.border, backgroundColor: selected ? t.primarySoft : t.surface, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}>
    <Copy tone={selected ? 'primary' : 'muted'} style={styles.label}>{label}</Copy>
  </Pressable>;
}
export function Banner({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  const t = useTokens(); return <View accessibilityRole={danger ? 'alert' : undefined} style={[styles.banner, { backgroundColor: danger ? t.negativeSoft : t.primarySoft }]}>
    <Copy tone={danger ? 'negative' : 'primary'}>{children}</Copy>
  </View>;
}
export function Feedback() {
  const { error, notice, dismissError, loading, processing } = useFinance();
  return <>
    {loading && <Row><ActivityIndicator /><Copy tone="muted">Đang mở sổ…</Copy></Row>}
    {processing && <Copy tone="primary">Đang gửi các mục đã chọn qua Firebase đến OpenAI. Không thể rút lại yêu cầu đã gửi; kết quả vẫn cần bạn duyệt.</Copy>}
    {(error || notice) && <View style={styles.feedback}><Banner danger={!!error}>{error || notice}</Banner><Action compact variant="secondary" label="Đóng thông báo" onPress={dismissError} /></View>}
  </>;
}
export function Screen({ title, eyebrow, children, scroll = true }: { title: string; eyebrow?: string; children: ReactNode; scroll?: boolean }) {
  const t = useTokens();
  const content = <View style={styles.content}>
    {eyebrow && <Copy tone="primary" style={styles.eyebrow}>{eyebrow}</Copy>}
    <Heading>{title}</Heading><Feedback />{children}
  </View>;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.flex, { backgroundColor: t.background }]}>
    {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
  </KeyboardAvoidingView>;
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return <Card><Heading small>{title}</Heading><Copy tone="muted">{detail}</Copy></Card>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, scroll: { flexGrow: 1, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 24, gap: 20, flexGrow: 1 },
  copy: { fontSize: 15, lineHeight: 23 }, heading: { fontSize: 31, lineHeight: 39, fontWeight: '700', letterSpacing: -0.8 },
  section: { fontSize: 19, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, gap: 14 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  action: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  compact: { alignSelf: 'flex-start' }, actionText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  field: { gap: 7 }, label: { fontSize: 14, lineHeight: 21, fontWeight: '600' }, small: { fontSize: 12, lineHeight: 19 },
  input: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  choice: { minHeight: 46, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderRadius: 10, justifyContent: 'center' },
  banner: { padding: 16, borderRadius: 12 }, feedback: { gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
});
