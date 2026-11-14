import { Link, Slot, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FinanceProvider, useFinance } from './FinanceProvider';
import { useTokens } from '@/shared/theme';
import { Copy } from '@/shared/ui';

const tabs = [
  { href: '/', label: 'Tổng quan' }, { href: '/transactions', label: 'Sổ giao dịch' },
  { href: '/add', label: 'Thêm mới' }, { href: '/budget', label: 'Ngân sách' }, { href: '/settings', label: 'Cài đặt' },
] as const;
function Shell() {
  const t = useTokens(); const path = usePathname(); const { transactions, cloudSync } = useFinance();
  const reviews = transactions.filter((row) => row.status === 'review').length;
  return <SafeAreaView style={[styles.root, { backgroundColor: t.background }]}>
    <View style={[styles.masthead, { borderColor: t.border, backgroundColor: t.surface }]}>
      <View style={styles.mastheadContent}>
        <View style={styles.brandRow}><View style={[styles.brandMark, { backgroundColor: t.primary }]}><Text style={[styles.brandInitial, { color: t.onPrimary }]}>k.</Text></View>
          <Text style={[styles.brand, { color: t.text }]}>kesefly<Text style={{ color: t.primary }}> / </Text><Text style={styles.brandSuffix}>sổ tiền riêng</Text></Text>
        </View>
        <Copy tone="positive" style={styles.private}>{cloudSync ? 'Đồng bộ do bạn kiểm soát' : 'Lưu riêng trên máy'}</Copy>
      </View>
    </View>
    <View style={styles.body}><Slot /></View>
    <View style={[styles.navigation, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.navigationInner}>{tabs.map((tab) => {
        const selected = path === tab.href || (tab.href === '/transactions' && path.startsWith('/transaction/'));
        return <Link key={tab.href} href={tab.href} asChild style={[styles.tab, { backgroundColor: selected ? t.primarySoft : t.surface }]}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected }} android_ripple={{ color: t.primarySoft }}>
            <Text style={[styles.tabText, { color: selected ? t.primary : t.muted }]}>{tab.label}</Text>
            {tab.href === '/transactions' && reviews > 0 && <Text style={[styles.badge, { color: t.warning }]}>{reviews} cần duyệt</Text>}
          </Pressable>
        </Link>;
      })}</View>
    </View>
  </SafeAreaView>;
}
export default function AppShell() { return <FinanceProvider><Shell /></FinanceProvider>; }
const styles = StyleSheet.create({
  root: { flex: 1 }, body: { flex: 1 }, masthead: { borderBottomWidth: 1 },
  mastheadContent: { maxWidth: 960, width: '100%', alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandMark: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandInitial: { fontWeight: '800', fontSize: 24 }, brand: { fontSize: 19, fontWeight: '800', letterSpacing: -0.6 }, brandSuffix: { fontSize: 12, fontWeight: '500', letterSpacing: 0 }, private: { fontSize: 11, fontWeight: '600' },
  navigation: { borderTopWidth: 1 }, navigationInner: { maxWidth: 960, width: '100%', alignSelf: 'center', flexDirection: 'row', padding: 8, gap: 4 },
  tab: { flex: 1, minHeight: 56, paddingHorizontal: 3, paddingVertical: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 2 },
  tabText: { fontSize: 11, fontWeight: '700', textAlign: 'center' }, badge: { fontSize: 9, fontWeight: '600' },
});
