import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Icon, Portal, ProgressBar, Surface, Text } from 'react-native-paper';
import { CATEGORIES, type Category } from '@/types/transaction';
import { parseDateOnly } from '@/shared/dates';
import { categoryLabels, localDate, money, shapes, spacing, useAppTheme } from '@/shared/theme';
import { FormField, Page, PageSection } from '@/shared/page';
import { useFinance } from './FinanceProvider';

const icons: Record<Category, string> = { 'Food & Drink': 'food-outline', Bills: 'home-outline', Shopping: 'shopping-outline', Transport: 'car-outline', Transfer: 'bank-transfer', Salary: 'cash', Other: 'dots-horizontal' };
function validAmount(value: string) { const number = Number(value); return /^\d+$/.test(value) && Number.isSafeInteger(number) && number > 0 && number <= 1e15; }
export default function BudgetScreen() {
  const theme = useAppTheme();
  const { budget, categoryBudgets, transactions, saveBudget, saveCategoryBudget, busy, error, notice, dismissError } = useFinance();
  const [now] = useState(() => new Date());
  const month = localDate(now).slice(0, 7);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate() + 1;
  const [overallOpen, setOverallOpen] = useState(false);
  const [overallDraft, setOverallDraft] = useState('');
  const [overallError, setOverallError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<Category>('Food & Drink');
  const [categoryAmount, setCategoryAmount] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const spent = useMemo(() => transactions.reduce((sum, row) => {
    const date = parseDateOnly(row.date);
    return row.status === 'confirmed' && row.deletedAt == null && row.type === 'EXPENSE' && date && localDate(date).startsWith(month) && localDate(date) <= localDate(now) ? sum + row.amount : sum;
  }, 0), [transactions, month, now]);
  const byCategory = useMemo(() => {
    const map = new Map<Category, number>();
    for (const row of transactions) {
      const date = parseDateOnly(row.date);
      if (row.status !== 'confirmed' || row.deletedAt != null || row.type !== 'EXPENSE' || !date) continue;
      if (!localDate(date).startsWith(month) || localDate(date) > localDate(now)) continue;
      map.set(row.category, (map.get(row.category) ?? 0) + row.amount);
    }
    return map;
  }, [transactions, month, now]);
  const visibleCategories = CATEGORIES.filter((category) => (byCategory.get(category) ?? 0) > 0 || (categoryBudgets[category] ?? 0) > 0);
  const remaining = budget - spent;
  const ratio = budget > 0 ? spent / budget : 0;
  const overallStatus = budget <= 0 ? 'Chưa đặt hạn mức' : ratio > 1 ? 'Đã vượt hạn mức' : ratio >= 0.8 ? 'Sắp chạm hạn mức' : 'Trong hạn mức';
  function openOverall() { setOverallDraft(budget ? String(budget) : ''); setOverallError(null); setOverallOpen(true); }
  async function submitOverall() {
    if (!validAmount(overallDraft)) { setOverallError('Nhập số tiền VND nguyên dương, ví dụ 5000000.'); return; }
    if (await saveBudget(Number(overallDraft))) setOverallOpen(false);
  }
  function openCategory(category?: Category) {
    const next = category ?? CATEGORIES.find((item) => !(categoryBudgets[item] ?? 0)) ?? 'Other';
    setCategoryDraft(next); setCategoryAmount(String(categoryBudgets[next] ?? '')); setCategoryError(null); setCategoryOpen(true);
  }
  async function submitCategory() {
    if (!validAmount(categoryAmount)) { setCategoryError('Nhập hạn mức VND nguyên dương, hoặc dùng nút bỏ hạn mức.'); return; }
    if (await saveCategoryBudget(categoryDraft, Number(categoryAmount))) setCategoryOpen(false);
  }
  async function removeCategory() {
    if (await saveCategoryBudget(categoryDraft, 0)) setCategoryOpen(false);
  }
  return <Page footer={<View style={{ height: spacing.sm }} />}>
    {!!(error || notice) && <Surface elevation={0} style={[styles.notice, { backgroundColor: theme.colors.elevation.level1 }]}><Text accessibilityRole="alert" variant="bodyMedium" style={{ flex: 1 }}>{error || notice}</Text><Button compact onPress={dismissError}>Đóng</Button></Surface>}
    <Surface elevation={0} style={[styles.hero, { backgroundColor: theme.colors.elevation.level1 }]}>
      <View style={styles.heroHeading}><View style={{ flex: 1, gap: spacing.xs }}><Text variant="titleMedium" accessibilityRole="header">Ngân sách tháng {now.getMonth() + 1}</Text><Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{spent.toLocaleString('vi-VN')} ₫ đã chi · {daysRemaining} ngày còn lại</Text></View><Button mode="text" onPress={openOverall} textColor={theme.financial.info} contentStyle={styles.control}>{budget ? 'Sửa' : 'Đặt ngân sách'}</Button></View>
      <Text variant="headlineMedium" style={styles.amount}>{money(spent)}</Text>
      <Text variant="bodyLarge" style={{ color: ratio >= 0.8 ? theme.financial.warning : theme.colors.onSurfaceVariant }}>{budget > 0 ? `${money(budget)} hạn mức · ${overallStatus}` : 'Chưa có hạn mức chi tiêu. Bạn vẫn có thể xem chi tiêu thực tế bên dưới.'}</Text>
      {budget > 0 && <>
        <ProgressBar progress={Math.min(1, ratio)} color={ratio >= 0.8 ? theme.financial.warning : theme.colors.primary} style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]} />
        <View style={styles.heroStats}><View style={styles.stat}><Text variant="bodyMedium" style={styles.muted}>Còn lại</Text><Text variant="titleMedium" style={[styles.amount, remaining < 0 && { color: theme.financial.warning }]}>{money(Math.max(0, remaining))}</Text></View><View style={styles.stat}><Text variant="bodyMedium" style={styles.muted}>Mỗi ngày còn lại</Text><Text variant="titleMedium" style={styles.amount}>{money(Math.max(0, remaining) / daysRemaining)}</Text></View></View>
        <Text variant="bodyMedium" style={[styles.muted, remaining < 0 && { color: theme.financial.warning }]}>{remaining < 0 ? `Đã vượt ${money(Math.abs(remaining))} so với hạn mức. Đây là tín hiệu để rà soát, không phải đánh giá chi tiêu của bạn.` : `Bạn còn ${money(remaining)} trong hạn mức tháng này.`}</Text>
      </>}
    </Surface>
    <PageSection title="Ngân sách theo danh mục" action={<Button compact mode="text" textColor={theme.financial.info} onPress={() => openCategory()} contentStyle={styles.control}>Thêm danh mục</Button>}>
      <Text variant="bodyMedium" style={styles.muted}>Hạn mức danh mục được lưu trên thiết bị này và chỉ so với khoản chi đã xác nhận trong tháng hiện tại.</Text>
      {visibleCategories.length === 0 ? <Surface elevation={0} style={[styles.empty, { backgroundColor: theme.colors.elevation.level1 }]}><Icon source="wallet-outline" size={28} color={theme.colors.onSurfaceVariant} /><Text variant="titleMedium" accessibilityRole="header">Chưa có ngân sách danh mục</Text><Text variant="bodyMedium" style={styles.muted}>Đặt hạn mức cho những danh mục bạn muốn theo dõi. Không cần đặt cho mọi danh mục.</Text><Button mode="contained" buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary} contentStyle={styles.control} onPress={() => openCategory()}>Tạo ngân sách danh mục</Button></Surface>
        : <View style={styles.list}>{visibleCategories.map((category) => {
          const limit = categoryBudgets[category] ?? 0;
          const used = byCategory.get(category) ?? 0;
          const categoryRatio = limit > 0 ? used / limit : 0;
          const over = limit > 0 && used > limit;
          const near = limit > 0 && !over && categoryRatio >= 0.8;
          return <Surface key={category} elevation={0} style={[styles.category, { backgroundColor: theme.colors.elevation.level1 }]}>
            <View style={styles.categoryRow}><Surface elevation={0} style={[styles.icon, { backgroundColor: theme.colors.surfaceVariant }]}><Icon source={icons[category]} size={22} color={theme.colors.onSurfaceVariant} /></Surface>
              <View style={{ flex: 1, gap: 2 }}><Text variant="bodyLarge">{categoryLabels[category]}</Text><Text variant="bodyMedium" style={[styles.muted, (over || near) && { color: theme.financial.warning }]}>{limit > 0 ? `${money(used)} / ${money(limit)} · ${over ? 'Đã vượt' : near ? 'Sắp chạm' : 'Trong hạn mức'}` : `${money(used)} · Chưa đặt hạn mức`}</Text></View>
              <Button compact mode="text" textColor={theme.financial.info} contentStyle={styles.smallControl} onPress={() => openCategory(category)}>{limit ? 'Sửa' : 'Đặt'}</Button></View>
            {limit > 0 && <><ProgressBar progress={Math.min(1, categoryRatio)} color={over || near ? theme.financial.warning : theme.colors.primary} style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]} /><Text variant="bodyMedium" style={[styles.muted, (over || near) && { color: theme.financial.warning }]}>{over ? `Vượt ${money(used - limit)}` : `Còn ${money(limit - used)}`}</Text></>}
          </Surface>;
        })}</View>}
    </PageSection>
    <Text variant="bodySmall" style={[styles.muted, { textAlign: 'center' }]}>Ngân sách tháng áp dụng cho mọi tháng và được lưu trên thiết bị này. Giao dịch cần duyệt không được tính vào ngân sách.</Text>
    <Portal>
      <Dialog visible={overallOpen} dismissable={!busy} onDismiss={() => setOverallOpen(false)} style={{ borderRadius: shapes.dialog, backgroundColor: theme.colors.surface }}>
        <Dialog.Title>{budget ? 'Sửa ngân sách tháng' : 'Đặt ngân sách tháng'}</Dialog.Title>
        <Dialog.Content style={{ gap: spacing.md }}><Text variant="bodyMedium" style={styles.muted}>Hạn mức dùng chung cho mỗi tháng. Chỉ khoản chi đã xác nhận mới được tính.</Text>
          <FormField label="Hạn mức hàng tháng (VND)" value={overallDraft} onChangeText={setOverallDraft} keyboardType="number-pad" inputMode="numeric" errorText={overallError} placeholder="5000000" />
          {budget > 0 && <Button mode="text" textColor={theme.colors.error} onPress={() => { setOverallDraft('0'); setOverallError(null); }}>Bỏ hạn mức tháng</Button>}
        </Dialog.Content>
        <Dialog.Actions><Button onPress={() => setOverallOpen(false)}>Hủy</Button><Button textColor={theme.colors.primary} loading={busy} disabled={busy} onPress={() => overallDraft === '0' ? void saveBudget(0).then((ok) => { if (ok) setOverallOpen(false); }) : void submitOverall()}>Lưu</Button></Dialog.Actions>
      </Dialog>
      <Dialog visible={categoryOpen} dismissable={!busy} onDismiss={() => setCategoryOpen(false)} style={{ borderRadius: shapes.dialog, backgroundColor: theme.colors.surface }}>
        <Dialog.Title>Ngân sách danh mục</Dialog.Title>
        <Dialog.Content style={{ gap: spacing.md }}>
          <Text variant="labelLarge">Danh mục</Text>
          <View style={styles.chips}>{CATEGORIES.map((category) => <Button key={category} compact mode={categoryDraft === category ? 'contained' : 'outlined'} buttonColor={categoryDraft === category ? theme.colors.primary : undefined} textColor={categoryDraft === category ? theme.colors.onPrimary : theme.colors.primary} onPress={() => { setCategoryDraft(category); setCategoryAmount(String(categoryBudgets[category] ?? '')); }}>{categoryLabels[category]}</Button>)}</View>
          <FormField label="Hạn mức (VND)" value={categoryAmount} onChangeText={setCategoryAmount} keyboardType="number-pad" inputMode="numeric" errorText={categoryError} placeholder="1500000" />
        </Dialog.Content>
        <Dialog.Actions>{!!categoryBudgets[categoryDraft] && <Button textColor={theme.colors.error} onPress={() => void removeCategory()}>Bỏ hạn mức</Button>}<Button onPress={() => setCategoryOpen(false)}>Hủy</Button><Button textColor={theme.colors.primary} loading={busy} disabled={busy} onPress={() => void submitCategory()}>Lưu</Button></Dialog.Actions>
      </Dialog>
    </Portal>
  </Page>;
}
const styles = StyleSheet.create({
  hero: { padding: spacing.lg, gap: spacing.md, borderRadius: shapes.large }, heroHeading: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.sm },
  amount: { fontVariant: ['tabular-nums'] }, muted: { color: undefined }, control: { minHeight: spacing.touch }, smallControl: { minHeight: spacing.touch, minWidth: spacing.touch },
  track: { height: 8, borderRadius: 4 }, heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, stat: { flex: 1, minWidth: 128, gap: 2 },
  list: { gap: spacing.md }, category: { padding: spacing.md, gap: spacing.sm, borderRadius: shapes.medium }, categoryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  icon: { width: 44, height: 44, borderRadius: shapes.medium, alignItems: 'center', justifyContent: 'center' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { padding: spacing.lg, gap: spacing.md, alignItems: 'flex-start', borderRadius: shapes.medium }, notice: { padding: spacing.md, borderRadius: shapes.medium, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  small: { fontSize: 12 },
});
