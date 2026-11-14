import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useNetworkState } from 'expo-network';
import { ActivityIndicator, Button, Divider, FAB, IconButton, Surface, Text } from 'react-native-paper';
import { useFinance } from './FinanceProvider';
import { dashboardModel, calendarKey, monthLabel, shiftMonth, shortDate } from './dashboard/model';
import { sampleAsOf, sampleTransactions } from './dashboard/sample';
import { CategorySpending, DataState, Money, SectionTitle, TransactionRow } from '@/shared/financial';
import { money, shapes, spacing, useAppTheme } from '@/shared/theme';

export default function DashboardScreen() {
  const finance = useFinance();
  const theme = useAppTheme();
  const network = useNetworkState();
  const params = useLocalSearchParams<{ sample?: string }>();
  const [sample, setSample] = useState(params.sample === '1');
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState(() => calendarKey(params.sample === '1' ? sampleAsOf : new Date()).slice(0, 7));
  const [refreshing, setRefreshing] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const { fontScale } = useWindowDimensions();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') setNow(new Date()); });
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);
  const referenceDate = sample ? sampleAsOf : now;
  const currentMonth = calendarKey(referenceDate).slice(0, 7);
  const model = useMemo(() => dashboardModel(sample ? sampleTransactions : finance.transactions, month, referenceDate), [sample, finance.transactions, month, referenceDate]);
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const loading = !sample && (finance.loading || refreshing);
  const error = !sample ? retryError || finance.error : null;
  const comparison = model.comparison;
  const reviews = finance.transactions.filter((row) => row.status === 'review' && row.deletedAt == null).length;
  function toggleSample() {
    const next = !sample;
    setSample(next);
    setMonth(calendarKey(next ? sampleAsOf : now).slice(0, 7));
    AccessibilityInfo.announceForAccessibility(next ? 'Đang xem dữ liệu minh họa, không phải chi tiêu của bạn.' : 'Đã về sổ chi tiêu của bạn.');
  }
  async function retry() {
    setRefreshing(true); setRetryError(null);
    try { await finance.refresh(); finance.dismissError(); }
    catch { setRetryError('Không mở được dữ liệu trên thiết bị. Hãy thử lại hoặc mở lại ứng dụng.'); }
    finally { setRefreshing(false); }
  }
  return <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
    {sample && <View style={{ backgroundColor: theme.financial.infoContainer }}>
      <View style={styles.samplePinned}>
        <Text accessibilityLiveRegion="polite" variant="bodyMedium" style={[styles.grow, { color: theme.financial.onInfoContainer }]}>Dữ liệu minh họa, không phải chi tiêu của bạn.</Text>
        <Button onPress={toggleSample} textColor={theme.financial.info} contentStyle={styles.control}>Về sổ của tôi</Button>
      </View>
    </View>}
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <Text variant="bodyLarge">Chào bạn, cùng xem chi tiêu nhé.</Text>
        {!sample && <View style={[styles.sample, { backgroundColor: theme.colors.elevation.level1 }]}>
          <Text variant="bodyMedium" style={[styles.grow, { color: theme.colors.onSurfaceVariant }]}>Khám phá cách theo dõi chi tiêu.</Text>
          <Button onPress={toggleSample} textColor={theme.financial.info} contentStyle={styles.control}>Xem minh họa</Button>
        </View>}
        {offline && <Text accessibilityLiveRegion="polite" variant="bodyMedium" style={{ color: theme.financial.warning }}>Không có mạng. Bạn vẫn xem và thêm giao dịch được.</Text>}
        <View style={styles.period}>
          <IconButton icon="chevron-left" size={24} style={styles.icon} accessibilityLabel="Tháng trước" onPress={() => setMonth(shiftMonth(month, -1))} />
          <Text variant="titleMedium" accessibilityLiveRegion="polite" style={styles.periodTitle}>{monthLabel(month)}</Text>
          <IconButton icon="chevron-right" size={24} style={styles.icon} accessibilityLabel="Tháng sau" disabled={month >= currentMonth} onPress={() => setMonth(shiftMonth(month, 1))} />
        </View>
        {loading ? <View style={styles.loading}><ActivityIndicator accessibilityLabel="Đang tải tổng quan" /><Text>Đang mở sổ chi tiêu…</Text></View> : error ? <DataState title="Chưa tải được tổng quan" detail="Không tải được chi tiêu. Vui lòng thử lại." onRetry={() => void retry()} /> : <>
          <Surface elevation={0} style={[styles.summary, { backgroundColor: theme.colors.elevation.level1 }]}>
            <Text variant="titleMedium" accessibilityRole="header">Đã chi trong tháng</Text>
            <Money amount={model.spending} prominent />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{model.range.split(' / ').map(shortDate).join(' đến ')}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.stat}><Text variant="bodyMedium">Thu nhập</Text><Money amount={model.income} /></View>
              <View style={styles.stat}><Text variant="bodyMedium">Chênh lệch thu − chi</Text><Money amount={model.income - model.spending} /></View>
            </View>
            <Divider />
            <Text variant="titleSmall">So với cùng kỳ tháng trước</Text>
            {comparison.available ? <>
              <Text variant="bodyLarge">{comparison.difference === 0 ? 'Không đổi' : `${comparison.difference > 0 ? 'Tăng' : 'Giảm'} ${money(Math.abs(comparison.difference))}`}{comparison.percent != null ? ` (${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Math.abs(comparison.percent))}%)` : '. Kỳ trước chưa có khoản chi.'}</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{shortDate(comparison.currentStart)} đến {shortDate(comparison.currentEnd)} so với {shortDate(comparison.previousStart)} đến {shortDate(comparison.previousEnd)}</Text>
            </> : <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Chưa đủ dữ liệu để so sánh.</Text>}
          </Surface>
          {!model.rows.length && <DataState title="Chưa có giao dịch trong tháng này" detail="Thêm khoản chi đầu tiên để bắt đầu theo dõi." />}
          <View style={styles.section}>
            <SectionTitle>Chi tiêu theo danh mục</SectionTitle>
            {model.breakdown.length ? model.breakdown.map((row, index) => <CategorySpending key={row.category} {...row} total={model.spending} color={theme.chart[index]} />) : <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Chưa có khoản chi trong tháng này.</Text>}
          </View>
          <View style={styles.section}>
            <SectionTitle action={!sample && <Button textColor={theme.financial.info} onPress={() => router.push('/transactions')} contentStyle={styles.control}>Xem tất cả</Button>}>Giao dịch gần đây</SectionTitle>
            {model.recent.map((transaction) => <View key={transaction.id}><TransactionRow transaction={transaction} onPress={sample ? undefined : () => router.push({ pathname: '/transaction/[id]', params: { id: transaction.id } })} /><Divider /></View>)}
            {!model.recent.length && <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Giao dịch của tháng được chọn sẽ hiện ở đây.</Text>}
          </View>
          {!sample && <View style={styles.section}>
            {(reviews > 0 || finance.queue.length > 0) && <Button icon="clipboard-check-outline" textColor={theme.financial.info} contentStyle={styles.control} onPress={() => router.push('/transactions')}>{reviews} cần duyệt, {finance.queue.length} mục chờ</Button>}
            <SectionTitle>Ngân sách</SectionTitle>
            <Text variant="bodyMedium">{finance.budget > 0 ? `Hạn mức hiện tại ${money(finance.budget)}. ${model.spending > finance.budget ? 'Vượt' : 'Còn'} ${money(Math.abs(finance.budget - model.spending))}.` : 'Chưa đặt hạn mức chi tiêu.'}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Hạn mức này áp dụng cho mọi tháng.</Text>
            <Button textColor={theme.financial.info} contentStyle={styles.control} onPress={() => router.push('/budget')}>Xem ngân sách</Button>
          </View>}
        </>}
      </View>
    </ScrollView>
    <View style={styles.fabArea}>
      <FAB icon="plus" label={fontScale < 1.5 ? 'Thêm khoản chi' : undefined} accessibilityLabel="Thêm khoản chi vào sổ của tôi" color={theme.colors.onPrimary} style={{ backgroundColor: theme.colors.primary }} onPress={() => router.push('/add')} />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, scroll: { flexGrow: 1 }, content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: spacing.lg, gap: spacing.lg },
  grow: { flex: 1, minWidth: 180 }, sample: { padding: spacing.md, borderRadius: shapes.medium, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  samplePinned: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  period: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, periodTitle: { flex: 1, textAlign: 'center' }, icon: { width: spacing.touch, height: spacing.touch, margin: 0 },
  summary: { padding: spacing.lg, gap: spacing.md, borderRadius: shapes.large }, summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  stat: { flex: 1, minWidth: 132, gap: spacing.xs }, section: { gap: spacing.md, paddingTop: spacing.sm }, loading: { minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  fabArea: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }, control: { minHeight: spacing.touch },
});
