import { memo, useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Chip, FAB, Icon, Searchbar, Surface, Text, TouchableRipple } from 'react-native-paper';
import { CATEGORIES, type Category, type Transaction } from '@/types/transaction';
import { parseDateOnly } from '@/shared/dates';
import { categoryLabels, localDate, money, shapes, spacing, useAppTheme } from '@/shared/theme';
import { userError } from '@/shared/userError';
import { DataState } from '@/shared/financial';
import { useFinance } from './FinanceProvider';

const icons: Record<Category, string> = { 'Food & Drink': 'food-outline', Bills: 'home-outline', Shopping: 'shopping-outline', Transport: 'car-outline', Transfer: 'bank-transfer', Salary: 'cash', Other: 'dots-horizontal' };
type Period = 'all' | 'this' | 'last';
const dateKey = (row: Transaction) => { const date = parseDateOnly(row.date); return date ? localDate(date) : null; };
const TransactionRow = memo(function TransactionRow({ row }: { row: Transaction }) {
  const theme = useAppTheme();
  const date = parseDateOnly(row.date);
  const income = row.type === 'INCOME';
  const review = row.status === 'review';
  return <TouchableRipple borderless onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: row.id } })}
    accessibilityRole="button" accessibilityLabel={`${row.merchant}, ${income ? 'thu' : 'chi'} ${money(row.amount)}, ${categoryLabels[row.category]}, ${date ? date.toLocaleDateString('vi-VN') : row.date}${review ? ', cần duyệt' : ''}. Mở để sửa.`}>
    <View style={[styles.row, { borderBottomColor: theme.colors.outlineVariant }]}>
      <Surface elevation={0} style={[styles.icon, { backgroundColor: income ? theme.financial.incomeContainer : theme.colors.elevation.level1 }]}>
        <Icon source={icons[row.category]} size={22} color={income ? theme.financial.onIncomeContainer : theme.colors.onSurfaceVariant} />
      </Surface>
      <View style={styles.copy}><Text variant="bodyLarge" numberOfLines={2}>{row.merchant}</Text><Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{categoryLabels[row.category]} · {income ? 'Thu' : 'Chi'}{review ? ' · Cần duyệt' : ''}</Text></View>
      <View style={styles.amount}><Text variant="titleMedium" style={{ color: income ? theme.financial.income : theme.colors.onSurface, fontVariant: ['tabular-nums'] }}>{income ? '+' : '−'}{money(row.amount)}</Text>{review && <Text variant="labelSmall" style={{ color: theme.financial.warning }}>Chưa vào tổng</Text>}</View>
    </View>
  </TouchableRipple>;
});
export default function TransactionsScreen() {
  const params = useLocalSearchParams<{ category?: string; period?: string }>();
  const initialCategory = CATEGORIES.includes(params.category as Category) ? params.category as Category : 'all';
  const initialPeriod: Period = params.period === 'this' || params.period === 'last' ? params.period : 'all';
  const theme = useAppTheme();
  const { transactions, loading, error, notice, dismissError, refresh, queue } = useFinance();
  const { fontScale } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>(initialCategory);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [refreshing, setRefreshing] = useState(false);
  const [now] = useState(() => new Date());
  const thisMonth = localDate(now).slice(0, 7);
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = localDate(last).slice(0, 7);
  const rows = useMemo(() => transactions.filter((row) => {
    if (category !== 'all' && row.category !== category) return false;
    const day = dateKey(row);
    if (!day) return false;
    if (period === 'this' && !day.startsWith(thisMonth)) return false;
    if (period === 'last' && !day.startsWith(lastMonth)) return false;
    const haystack = `${row.merchant} ${categoryLabels[row.category]}`.toLocaleLowerCase('vi');
    return haystack.includes(search.trim().toLocaleLowerCase('vi'));
  }).sort((a, b) => (dateKey(b) ?? '').localeCompare(dateKey(a) ?? '') || b.updatedAt - a.updatedAt), [transactions, category, period, search, thisMonth, lastMonth]);
  const sections = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const row of rows) { const key = dateKey(row)!; groups.set(key, [...(groups.get(key) ?? []), row]); }
    const today = localDate(now), yesterday = localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    return [...groups].map(([key, data]) => {
      const date = parseDateOnly(key)!;
      const title = key === today ? 'Hôm nay' : key === yesterday ? 'Hôm qua' : date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
      return { key, title, data, total: data.reduce((sum, row) => sum + (row.type === 'EXPENSE' ? row.amount : 0), 0) };
    });
  }, [rows, now]);
  const activeFilter = category !== 'all' || period !== 'all' || !!search;
  const reviews = rows.filter((row) => row.status === 'review').length;
  async function retry() { setRefreshing(true); try { await refresh(); dismissError(); } finally { setRefreshing(false); } }
  return <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
    <SectionList
      sections={loading || error ? [] : sections} keyExtractor={(item) => item.id} renderItem={({ item }) => <TransactionRow row={item} />}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.list}
      refreshing={loading || refreshing} onRefresh={() => void retry()}
      renderSectionHeader={({ section }) => <Surface elevation={0} style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>{section.title}</Text>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Chi {money(section.total)}</Text>
      </Surface>}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.heading}><View style={{ flex: 1, gap: spacing.xs }}><Text variant="headlineSmall" accessibilityRole="header">Giao dịch</Text><Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{transactions.length} giao dịch trên thiết bị{queue.length ? ` · ${queue.length} mục đang chờ` : ''}</Text></View>
          {queue.length > 0 && <Chip icon="clipboard-check-outline" onPress={() => router.push('/queue')}>{queue.length} chờ</Chip>}</View>
        {loading ? <Surface elevation={0} style={[styles.state, { backgroundColor: theme.colors.elevation.level1 }]}><ActivityIndicator accessibilityLabel="Đang mở sổ" /><Text variant="bodyMedium">Đang mở sổ…</Text></Surface>
          : error ? <DataState title="Chưa tải được giao dịch" detail={userError(error)} onRetry={() => void retry()} /> : null}
        {!loading && !error && (error || notice) && <Surface elevation={0} style={[styles.notice, { backgroundColor: theme.colors.elevation.level1 }]}><Text accessibilityRole="alert" variant="bodyMedium">{userError(error || notice)}</Text></Surface>}
        {(!!error || !!notice) && <Chip icon="close" onPress={dismissError}>Đóng thông báo</Chip>}
        <Searchbar value={search} onChangeText={setSearch} placeholder="Tìm mô tả hoặc danh mục" accessibilityLabel="Tìm giao dịch" style={{ backgroundColor: theme.colors.surfaceVariant }} inputStyle={{ minHeight: spacing.touch, fontSize: 16 }} iconColor={theme.colors.onSurfaceVariant} />
        <View style={styles.filters}><Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Thời gian</Text>
          <View style={styles.chips}>{(['all', 'this', 'last'] as const).map((value) => <Chip key={value} selected={period === value} showSelectedCheck={false} onPress={() => setPeriod(value)} style={period === value ? { backgroundColor: theme.colors.primaryContainer } : undefined} textStyle={period === value ? { color: theme.colors.onPrimaryContainer } : undefined}>{value === 'all' ? 'Mọi lúc' : value === 'this' ? 'Tháng này' : 'Tháng trước'}</Chip>)}</View>
        </View>
        <View style={styles.filters}><Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip selected={category === 'all'} showSelectedCheck={false} onPress={() => setCategory('all')} style={category === 'all' ? { backgroundColor: theme.colors.primaryContainer } : undefined}>Tất cả</Chip>
            {CATEGORIES.map((value) => <Chip key={value} selected={category === value} showSelectedCheck={false} onPress={() => setCategory(value)} style={category === value ? { backgroundColor: theme.colors.primaryContainer } : undefined}>{categoryLabels[value]}</Chip>)}
          </ScrollView>
        </View>
        <View style={styles.meta}><Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{rows.length} giao dịch{reviews ? ` · ${reviews} cần duyệt` : ''}</Text>{activeFilter && <Chip compact icon="filter-off-outline" onPress={() => { setSearch(''); setCategory('all'); setPeriod('all'); }}>Xóa bộ lọc</Chip>}</View>
      </View>}
      ListEmptyComponent={!loading && !error ? <DataState title={transactions.length ? 'Không có giao dịch phù hợp' : 'Sổ đang trống'} detail={transactions.length ? 'Thử từ khóa, danh mục hoặc khoảng thời gian khác.' : 'Thêm khoản chi đầu tiên để bắt đầu theo dõi. Giao dịch được lưu trên thiết bị này.'} /> : undefined}
      ListFooterComponent={<View style={{ height: 88 }} />}
    />
    <View style={styles.fab}><FAB icon="plus" label={fontScale < 1.5 ? 'Thêm giao dịch' : undefined} accessibilityLabel="Thêm giao dịch mới" style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} onPress={() => router.push('/add')} /></View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, list: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.large },
  header: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md }, heading: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md },
  state: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderRadius: shapes.medium }, notice: { padding: spacing.md, borderRadius: shapes.medium, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  filters: { gap: spacing.sm }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingRight: spacing.md }, meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  sectionHeader: { paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  row: { minHeight: 76, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: shapes.medium, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 150, gap: 2 },
  amount: { alignItems: 'flex-end', maxWidth: '100%', gap: 2 }, fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
