import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import type { Category, Transaction } from '@/types/transaction';
import { categoryLabels, money, spacing, useAppTheme } from './theme';

export function Money({ amount, prominent = false }: { amount: number; prominent?: boolean }) {
  return <Text variant={prominent ? 'headlineLarge' : 'titleMedium'} selectable style={styles.amount}>{money(amount)}</Text>;
}
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.heading}><Text variant="titleMedium" accessibilityRole="header" style={styles.grow}>{children}</Text>{action}</View>;
}
const icons: Record<Category, string> = { 'Food & Drink': 'food-outline', Bills: 'home-outline', Shopping: 'shopping-outline', Transport: 'car-outline', Transfer: 'bank-transfer', Salary: 'cash', Other: 'dots-horizontal' };
export function CategorySpending({ category, amount, total, color }: { category: Category; amount: number; total: number; color: string }) {
  const theme = useAppTheme();
  const percent = total > 0 ? amount / total : 0;
  const label = `${categoryLabels[category]}, ${money(amount)}, ${new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(percent)}`;
  return <View accessible accessibilityLabel={label} style={styles.category}>
    <View style={styles.row}><Icon source={icons[category]} size={24} color={theme.colors.onSurfaceVariant} /><Text variant="bodyLarge" style={styles.grow}>{categoryLabels[category]}</Text><Money amount={amount} /></View>
    <ProgressBar progress={percent} color={color} style={styles.track} />
    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(percent)}</Text>
  </View>;
}
export function TransactionRow({ transaction, onPress }: { transaction: Transaction; onPress?: () => void }) {
  const theme = useAppTheme();
  const label = transaction.type === 'EXPENSE' ? 'Chi' : 'Thu';
  const date = new Date(transaction.date).toLocaleDateString('vi-VN');
  const contents = <View style={styles.transaction}>
    <Icon source={icons[transaction.category]} size={24} color={theme.colors.onSurfaceVariant} />
    <View style={styles.transactionCopy}><Text variant="bodyLarge">{transaction.merchant}</Text><Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{categoryLabels[transaction.category]} • {date}</Text></View>
    <View style={styles.transactionValue}><Text variant="labelLarge" style={{ color: transaction.type === 'INCOME' ? theme.financial.income : theme.colors.onSurfaceVariant }}>{label}</Text><Money amount={transaction.amount} /></View>
  </View>;
  const description = `${transaction.merchant}, ${label} ${money(transaction.amount)}, ${categoryLabels[transaction.category]}, ${date}`;
  return onPress ? <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={description}>{contents}</TouchableRipple> : <View accessible accessibilityLabel={description}>{contents}</View>;
}
export function DataState({ title, detail, onRetry }: { title: string; detail: string; onRetry?: () => void }) {
  const theme = useAppTheme();
  return <View style={styles.state} accessibilityRole={onRetry ? 'alert' : undefined}>
    <Text variant="titleMedium" accessibilityRole="header">{title}</Text><Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{detail}</Text>
    {onRetry && <Button onPress={onRetry} mode="outlined" textColor={theme.financial.info} contentStyle={styles.control}>Thử lại</Button>}
  </View>;
}
const styles = StyleSheet.create({
  amount: { fontVariant: ['tabular-nums'], flexShrink: 1 }, heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  grow: { flex: 1, minWidth: 80 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  category: { gap: spacing.xs }, track: { height: 8, borderRadius: 4 },
  transaction: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.lg, minHeight: 72 },
  transactionCopy: { flex: 1, minWidth: 140 }, transactionValue: { alignItems: 'flex-end', maxWidth: '100%', gap: spacing.xs },
  state: { gap: spacing.md, paddingVertical: spacing.lg }, control: { minHeight: spacing.touch },
});
