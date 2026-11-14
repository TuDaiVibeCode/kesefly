import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Icon, IconButton, ProgressBar, Surface, Text, TouchableRipple } from 'react-native-paper';
import { useFinance } from './FinanceProvider';
import { analyticsModel, formatPercent, type Insight } from './analytics/model';
import { calendarKey, monthLabel, shiftMonth } from './dashboard/model';
import { categoryLabels, money, shapes, spacing, useAppTheme } from '@/shared/theme';
import { DataState } from '@/shared/financial';
import { Page, PageSection } from '@/shared/page';

function InsightCard({ insight, onPress }: { insight: Insight; onPress: () => void }) {
  const theme = useAppTheme();
  const tone = insight.severity === 'warning' ? { background: theme.financial.warningContainer, foreground: theme.financial.onWarningContainer } : insight.severity === 'error' ? { background: theme.colors.errorContainer, foreground: theme.colors.onErrorContainer } : { background: theme.colors.primaryContainer, foreground: theme.colors.onPrimaryContainer };
  return <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={`${insight.title}. ${insight.summary} Mở chi tiết.`} borderless>
    <Surface elevation={0} style={[styles.insight, { backgroundColor: tone.background }]}>
      <View style={styles.insightHeading}><Icon source={insight.severity === 'info' ? 'lightbulb-outline' : 'alert-outline'} size={22} color={tone.foreground} /><Text variant="titleSmall" style={{ flex: 1, color: tone.foreground }}>{insight.title}</Text><Icon source="chevron-right" size={22} color={tone.foreground} /></View>
      <Text variant="bodyMedium" style={{ color: tone.foreground }}>{insight.summary}</Text>
      <Text variant="labelMedium" style={{ color: tone.foreground }}>Xem cách tính và kỳ dữ liệu</Text>
    </Surface>
  </TouchableRipple>;
}
export default function AnalyticsScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ month?: string }>();
  const { transactions, budget, loading, error, refresh } = useFinance();
  const [now] = useState(() => new Date());
  const [month, setMonth] = useState(params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : calendarKey(now).slice(0, 7));
  const currentMonth = calendarKey(now).slice(0, 7);
  const model = useMemo(() => analyticsModel(transactions, month, now, budget), [transactions, month, now, budget]);
  const hasSpending = model.spending > 0 || model.comparison.previousSpending > 0;
  return <Page>
    <View style={styles.period}><IconButton icon="chevron-left" accessibilityLabel="Tháng trước" size={24} style={styles.icon} onPress={() => setMonth(shiftMonth(month, -1))} /><Text variant="titleMedium" accessibilityLiveRegion="polite" style={styles.periodTitle}>{monthLabel(month)}</Text><IconButton icon="chevron-right" accessibilityLabel="Tháng sau" size={24} style={styles.icon} disabled={month >= currentMonth} onPress={() => setMonth(shiftMonth(month, 1))} /></View>
    {loading ? <View style={styles.loading}><ActivityIndicator accessibilityLabel="Đang tải phân tích" /><Text>Đang tính từ sổ trên thiết bị…</Text></View> : error ? <DataState title="Chưa tải được phân tích" detail="Không mở được dữ liệu trên thiết bị. Thử lại sau." onRetry={() => void refresh()} /> : <>
      <Surface elevation={0} style={[styles.hero, { backgroundColor: theme.colors.elevation.level1 }]}>
        <Text variant="titleMedium" accessibilityRole="header">Chi tiêu trong kỳ</Text>
        <Text variant="headlineLarge" style={styles.amount}>{money(model.spending)}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{model.period}{model.ongoing ? ' · Kỳ đang diễn ra' : ' · Kỳ đã kết thúc'}</Text>
        {model.comparison.available ? <Surface elevation={0} style={[styles.comparison, { backgroundColor: theme.colors.surface }]}>
          <Text variant="bodyLarge">{model.comparison.difference === 0 ? 'Tổng chi không đổi' : `Tổng chi ${model.comparison.difference > 0 ? 'tăng' : 'giảm'} ${money(Math.abs(model.comparison.difference))}${model.comparison.percent != null ? ` (${formatPercent(model.comparison.percent)})` : ''}`}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Kỳ trước: {money(model.comparison.previousSpending)} · {model.previousPeriod}</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>So sánh cùng số ngày để tránh sai lệch khi tháng chưa kết thúc.</Text>
        </Surface> : <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Chưa đủ dữ liệu ở kỳ trước để so sánh. Không hiển thị phần trăm khi không có mốc so sánh.</Text>}
      </Surface>
      {!hasSpending ? <DataState title="Chưa có khoản chi để phân tích" detail="Thêm giao dịch đã xác nhận trong tháng này để xem so sánh, xu hướng và quan sát." /> : <>
        <PageSection title="Điều đáng chú ý" action={<Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{model.insights.length} quan sát</Text>}>
          {model.insights.length ? <View style={styles.insights}>{model.insights.map((insight) => <InsightCard key={insight.id} insight={insight} onPress={() => router.push({ pathname: '/insight/[id]', params: { id: insight.id, month } })} />)}</View>
            : <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Chưa có thay đổi đủ rõ để nêu thành quan sát. Bạn vẫn có thể xem chi tiết bên dưới.</Text>}
        </PageSection>
        <PageSection title="So sánh theo danh mục">
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Số tiền kỳ này và kỳ trước; phần trăm chỉ hiện khi kỳ trước có chi tiêu trong danh mục.</Text>
          {model.categories.length ? <View style={styles.categoryList}>{model.categories.map((row) => {
            const max = model.maxCategory || 1;
            return <View key={row.category} style={[styles.category, { borderBottomColor: theme.colors.outlineVariant }]}>
              <View style={styles.categoryHeading}><Text variant="bodyLarge" style={{ flex: 1 }}>{categoryLabels[row.category]}</Text><Text variant="titleSmall" style={styles.amount}>{money(row.current)}</Text></View>
              <View style={styles.bars}>
                <View style={styles.barRow}><Text variant="labelSmall" style={styles.barLabel}>Kỳ này</Text><ProgressBar progress={row.current / max} color={theme.chart[0]} style={[styles.bar, { backgroundColor: theme.colors.surfaceVariant }]} /><Text variant="labelSmall" style={styles.barValue}>{money(row.current)}</Text></View>
                <View style={styles.barRow}><Text variant="labelSmall" style={styles.barLabel}>Kỳ trước</Text><ProgressBar progress={row.previous / max} color={theme.chart[1]} style={[styles.bar, { backgroundColor: theme.colors.surfaceVariant }]} /><Text variant="labelSmall" style={styles.barValue}>{money(row.previous)}</Text></View>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{row.previous === 0 ? 'Kỳ trước chưa có khoản chi trong danh mục này.' : row.difference === 0 ? 'Không đổi so với kỳ trước.' : `${row.difference > 0 ? 'Tăng' : 'Giảm'} ${money(Math.abs(row.difference))}${row.percent != null ? ` (${formatPercent(row.percent)})` : ''} so với kỳ trước.`}</Text>
            </View>;
          })}</View> : <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Chưa có khoản chi theo danh mục trong kỳ.</Text>}
        </PageSection>
        <PageSection title="Xu hướng 6 tháng">
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Các tháng gần nhất tính đến tháng đang chọn. Tháng hiện tại chỉ tính đến hôm nay.</Text>
          <View style={styles.trends}>{model.trends.map((point) => <View key={point.month} style={styles.trendRow} accessible accessibilityLabel={`${monthLabel(point.month)}, chi ${money(point.amount)}`}>
            <Text variant="labelLarge" style={[styles.trendLabel, point.selected && { color: theme.colors.primary }]}>{point.label}</Text>
            <ProgressBar progress={model.maxTrend ? point.amount / model.maxTrend : 0} color={point.selected ? theme.chart[0] : theme.chart[1]} style={[styles.trend, { backgroundColor: theme.colors.surfaceVariant }]} />
            <Text variant="bodyMedium" style={[styles.amount, styles.trendValue]}>{money(point.amount)}</Text>
          </View>)}</View>
        </PageSection>
      </>}
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>Phân tích chỉ dùng giao dịch đã xác nhận trên thiết bị này. Đây là quan sát từ dữ liệu đã ghi, không phải lời khuyên tài chính.</Text>
    </>}
  </Page>;
}
const styles = StyleSheet.create({
  period: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, periodTitle: { flex: 1, textAlign: 'center' }, icon: { width: spacing.touch, height: spacing.touch, margin: 0 },
  hero: { padding: spacing.lg, gap: spacing.md, borderRadius: shapes.large }, amount: { fontVariant: ['tabular-nums'] },
  comparison: { padding: spacing.md, borderRadius: shapes.medium, gap: spacing.xs }, insights: { gap: spacing.md },
  insight: { padding: spacing.lg, borderRadius: shapes.medium, gap: spacing.sm }, insightHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  categoryList: { gap: 0 }, category: { paddingVertical: spacing.lg, gap: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth }, categoryHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  bars: { gap: spacing.xs }, barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }, barLabel: { width: 58 }, bar: { flex: 1, minWidth: 100, height: 8, borderRadius: 4 }, barValue: { minWidth: 92, textAlign: 'right', fontVariant: ['tabular-nums'] },
  trends: { gap: spacing.sm }, trendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }, trendLabel: { width: 30 }, trend: { flex: 1, minWidth: 90, height: 10, borderRadius: 5 }, trendValue: { minWidth: 96, textAlign: 'right' },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
