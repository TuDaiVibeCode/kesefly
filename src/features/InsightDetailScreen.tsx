import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Surface, Text } from 'react-native-paper';
import { useFinance } from './FinanceProvider';
import { analyticsModel, formatPercent } from './analytics/model';
import { categoryLabels, money, shapes, spacing, useAppTheme } from '@/shared/theme';
import { DataState } from '@/shared/financial';
import { Page } from '@/shared/page';

export default function InsightDetailScreen() {
  const theme = useAppTheme();
  const { id, month: monthParam } = useLocalSearchParams<{ id: string; month?: string }>();
  const { transactions, budget, loading } = useFinance();
  const [now] = useState(() => new Date());
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const model = useMemo(() => analyticsModel(transactions, month, now, budget), [transactions, month, now, budget]);
  const insight = model.insights.find((item) => item.id === id);
  if (loading) return <Page><View style={styles.state}><Text variant="bodyLarge">Đang tính lại quan sát…</Text></View></Page>;
  if (!insight) return <Page><DataState title="Quan sát này không còn phù hợp" detail="Dữ liệu trong kỳ đã thay đổi hoặc chưa đủ để giữ quan sát này. Quay lại Phân tích để xem các quan sát hiện tại." /><Button mode="contained" buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary} contentStyle={styles.control} onPress={() => router.replace('/analytics')}>Về Phân tích</Button></Page>;
  const section = (title: string, detail: string) => <View style={[styles.section, { borderTopColor: theme.colors.outlineVariant }]}><Text variant="titleSmall" accessibilityRole="header">{title}</Text><Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{detail}</Text></View>;
  return <Page>
    <View style={styles.header}><Text variant="headlineSmall" accessibilityRole="header">{insight.title}</Text><Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{insight.summary}</Text></View>
    {insight.amount != null && <Surface elevation={0} style={[styles.amountSurface, { backgroundColor: theme.colors.elevation.level1 }]}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{insight.id === 'budget' ? 'Đã chi trong kỳ' : 'Số tiền trong kỳ'}</Text>
      <Text variant="headlineMedium" style={styles.amount}>{money(insight.amount)}</Text>
      {insight.previous != null && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>{insight.id === 'budget' ? 'Hạn mức tháng' : 'Kỳ so sánh'}: {money(insight.previous)}</Text>}
      {insight.difference != null && insight.difference !== 0 && <Text variant="bodyLarge" style={{ color: theme.financial.warning }}>{insight.difference > 0 ? 'Tăng' : 'Giảm'} {money(Math.abs(insight.difference))}{insight.percent != null && insight.id !== 'top-category' ? ` (${formatPercent(insight.percent)})` : ''}</Text>}
      {insight.id === 'top-category' && insight.percent != null && <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Chiếm {formatPercent(insight.percent)} tổng chi trong kỳ</Text>}
    </Surface>}
    {insight.category && <Surface elevation={0} style={[styles.categoryTag, { backgroundColor: theme.colors.primaryContainer }]}><Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer }}>Danh mục: {categoryLabels[insight.category]}</Text></Surface>}
    <View style={styles.details}>
      {section('Điều quan sát', insight.summary)}
      {section('Dữ liệu hỗ trợ', insight.evidence)}
      {section('Kỳ so sánh', insight.period)}
      {section('Độ đầy đủ của dữ liệu', insight.complete ? 'Kỳ đang diễn ra; số liệu được tính đến hôm nay và so sánh cùng số ngày với kỳ trước. Giao dịch cần duyệt chưa được tính.' : 'Kỳ đã kết thúc và dùng toàn bộ giao dịch đã xác nhận trong kỳ. Giao dịch cần duyệt chưa được tính.')}
      {section('Vì sao có thể đáng chú ý', insight.relevance)}
      {section('Bạn có thể cân nhắc', insight.action)}
    </View>
    <View style={styles.actions}><Button mode="contained" buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary} contentStyle={styles.control} onPress={() => router.push({ pathname: '/transactions', params: { ...(insight.category ? { category: insight.category } : {}), period: month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` ? 'this' : 'all' } })}>Xem giao dịch liên quan</Button>
      {insight.id === 'budget' && <Button mode="outlined" textColor={theme.colors.primary} contentStyle={styles.control} onPress={() => router.push('/budget')}>Mở Ngân sách</Button>}
      <Button mode="text" textColor={theme.financial.info} contentStyle={styles.control} onPress={() => router.back()}>Quay lại Phân tích</Button></View>
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>Quan sát này được tính từ giao dịch bạn đã ghi trên thiết bị. Đây không phải lời khuyên tài chính và bạn luôn là người quyết định.</Text>
  </Page>;
}
const styles = StyleSheet.create({
  state: { minHeight: 200, alignItems: 'center', justifyContent: 'center' }, header: { gap: spacing.sm },
  amountSurface: { padding: spacing.lg, gap: spacing.xs, borderRadius: shapes.large }, amount: { fontVariant: ['tabular-nums'] },
  categoryTag: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 999 },
  details: { gap: 0 }, section: { paddingVertical: spacing.lg, gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth },
  actions: { gap: spacing.sm }, control: { minHeight: spacing.touch },
});
