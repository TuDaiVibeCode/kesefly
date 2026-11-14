import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, BottomNavigation, Menu, Text } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FinanceProvider, useFinance } from './FinanceProvider';
import { AppThemeProvider, useAppearance } from '@/shared/AppThemeProvider';
import { spacing, useAppTheme } from '@/shared/theme';

const destinations = [
  { key: '/', title: 'Tổng quan', focusedIcon: 'view-dashboard', unfocusedIcon: 'view-dashboard-outline' },
  { key: '/transactions', title: 'Giao dịch', focusedIcon: 'receipt-text', unfocusedIcon: 'receipt-text-outline' },
  { key: '/budget', title: 'Ngân sách', focusedIcon: 'wallet', unfocusedIcon: 'wallet-outline' },
  { key: '/settings', title: 'Cài đặt', focusedIcon: 'cog', unfocusedIcon: 'cog-outline' },
] as const;
function Shell() {
  const theme = useAppTheme();
  const path = usePathname();
  const { transactions } = useFinance();
  const { preference, setPreference, storageError } = useAppearance();
  const [menuOpen, setMenuOpen] = useState(false);
  const detail = path === '/add' || path === '/queue' || path === '/analytics' || path.startsWith('/transaction/') || path.startsWith('/insight/');
  const index = Math.max(0, destinations.findIndex((tab) => tab.key === path));
  const title = path === '/add' ? 'Thêm giao dịch' : path === '/queue' ? 'Chờ xử lý' : path === '/analytics' ? 'Phân tích và quan sát' : path.startsWith('/insight/') ? 'Chi tiết quan sát' : path.startsWith('/transaction/') ? 'Chi tiết giao dịch' : destinations[index].title;
  const reviews = transactions.filter((row) => row.status === 'review' && !row.deletedAt).length;
  const routes = destinations.map((tab) => ({ ...tab, badge: tab.key === '/transactions' && reviews ? reviews : undefined, accessibilityLabel: tab.title }));
  return <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
    <StatusBar style={theme.dark ? 'light' : 'dark'} />
    <Appbar.Header statusBarHeight={0} style={{ backgroundColor: theme.colors.background }}>
      {detail && <Appbar.BackAction accessibilityLabel="Quay lại" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />}
      <Appbar.Content title={title} />
      {!detail && <Appbar.Action icon="chart-box-outline" accessibilityLabel="Mở phân tích chi tiêu" onPress={() => router.push('/analytics')} />}
      <Menu visible={menuOpen} onDismiss={() => setMenuOpen(false)} anchor={<Appbar.Action icon="theme-light-dark" accessibilityLabel="Chọn giao diện" onPress={() => setMenuOpen(true)} />}>
        {([{ value: 'system', label: 'Theo hệ thống' }, { value: 'light', label: 'Sáng' }, { value: 'dark', label: 'Tối' }] as const).map((item) => <Menu.Item key={item.value} title={item.label} leadingIcon={preference === item.value ? 'check' : undefined} accessibilityLabel={`${item.label}${preference === item.value ? ', đang chọn' : ''}`} onPress={() => { setPreference(item.value); setMenuOpen(false); }} />)}
      </Menu>
    </Appbar.Header>
    {storageError && <Text accessibilityRole="alert" style={[styles.message, { color: theme.colors.error }]}>{storageError}</Text>}
    <View style={styles.body}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }} />
    </View>
    {!detail && <BottomNavigation.Bar navigationState={{ index, routes }} onTabPress={({ route, preventDefault }) => {
      preventDefault();
      if (route.key !== path) router.navigate(route.key);
    }} activeColor={theme.colors.onPrimaryContainer} inactiveColor={theme.colors.onSurfaceVariant} activeIndicatorStyle={{ backgroundColor: theme.colors.primaryContainer }} style={{ backgroundColor: theme.colors.elevation.level1 }} keyboardHidesNavigationBar />}
    {detail && <SafeAreaView edges={['bottom']} />}
  </SafeAreaView>;
}
export default function AppShell() {
  return <SafeAreaProvider><AppThemeProvider><FinanceProvider><Shell /></FinanceProvider></AppThemeProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, body: { flex: 1 }, message: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm } });
