import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput, type TextInputProps } from 'react-native-paper';
import { shapes, spacing, useAppTheme } from './theme';

export function Page({ children, footer, keyboard = false }: { children: ReactNode; footer?: ReactNode; keyboard?: boolean }) {
  const theme = useAppTheme();
  const content = <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.scroll}>
    <View style={styles.content}>{children}</View>
  </ScrollView>;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' && keyboard ? 'padding' : undefined} style={[styles.root, { backgroundColor: theme.colors.background }]}>
    {content}{footer}
  </KeyboardAvoidingView>;
}
export function PageSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return <View style={styles.section}>
    <View style={styles.heading}><Text variant="titleMedium" accessibilityRole="header" style={styles.grow}>{title}</Text>{action}</View>
    {children}
  </View>;
}
export function FormField({ label, help, errorText, style, ...props }: TextInputProps & { label: string; help?: string; errorText?: string | null }) {
  const theme = useAppTheme();
  return <View style={styles.field}>
    <TextInput mode="outlined" label={label} outlineColor={theme.colors.outlineVariant} activeOutlineColor={theme.colors.primary}
      textColor={theme.colors.onSurface} style={[styles.input, style]} contentStyle={styles.inputContent}
      outlineStyle={{ borderRadius: shapes.medium }} {...props} />
    <HelperText type={errorText ? 'error' : 'info'} visible={!!(errorText || help)} style={styles.helper}>{errorText || help}</HelperText>
  </View>;
}
export function FormChoice({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const theme = useAppTheme();
  return <Text onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityState={{ selected, disabled }}
    style={[styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface, color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, opacity: disabled ? 0.5 : 1 }]}>
    {label}
  </Text>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.large },
  section: { gap: spacing.md }, heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm }, grow: { flex: 1, minWidth: 120 },
  field: { gap: 2 }, input: { backgroundColor: 'transparent' }, inputContent: { minHeight: spacing.touch }, helper: { paddingHorizontal: spacing.xs },
  choice: { minHeight: spacing.touch, borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, textAlign: 'center', overflow: 'hidden', fontWeight: '500' },
});
