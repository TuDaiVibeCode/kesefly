import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Divider, Portal, SegmentedButtons, Surface, Text, TextInput } from 'react-native-paper';
import { CATEGORIES, type Category, type Direction, type ParsedTransaction, type Transaction } from '@/types/transaction';
import { findDuplicateCandidates } from '@/core/ingestion/deduplicator';
import { categoryLabels, localDate, money, shapes, spacing, useAppTheme } from '@/shared/theme';
import { parseDateOnly } from '@/shared/dates';
import { FormField } from '@/shared/page';
import { useFinance } from './FinanceProvider';

function displayDate(value: string) {
  const date = parseDateOnly(value) ?? new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}
function parseDisplayDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}
export function TransactionForm({ existing, onSaved }: { existing?: Transaction; onSaved: () => void }) {
  const theme = useAppTheme();
  const { save, busy, transactions, error: savedError } = useFinance();
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [merchant, setMerchant] = useState(existing?.merchant ?? '');
  const [date, setDate] = useState(existing ? displayDate(existing.date) : displayDate(localDate()));
  const [type, setType] = useState<Direction>(existing?.type ?? 'EXPENSE');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Other');
  const [reviewed, setReviewed] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; merchant?: string; date?: string; general?: string }>({});
  const [pending, setPending] = useState<ParsedTransaction | null>(null);
  const parsedDate = parseDisplayDate(date);
  const candidates = useMemo(() => {
    if (!parsedDate || !/^\d+$/.test(amount)) return [];
    const draft: ParsedTransaction = { amount: Number(amount), currency: 'VND', merchant: merchant.trim(), date: parsedDate.toISOString(), type, category, confidence: existing?.confidence ?? 1 };
    return findDuplicateCandidates(draft, transactions).filter((row) => row.id !== existing?.id);
  }, [amount, merchant, parsedDate, type, category, existing, transactions]);
  const preview = /^\d+$/.test(amount) && Number(amount) > 0 ? money(Number(amount)) : null;
  function setQuickDate(offset: number) {
    const now = new Date();
    setDate(displayDate(localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset))));
    setErrors((value) => ({ ...value, date: undefined }));
  }
  function prepare() {
    const next: typeof errors = {};
    const number = Number(amount);
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(number) || number <= 0 || number > 1e15) next.amount = 'Nhập số tiền VND nguyên dương, ví dụ 50000.';
    if (!merchant.trim() || merchant.trim().length > 160) next.merchant = 'Mô tả cần từ 1 đến 160 ký tự.';
    if (!parsedDate) next.date = 'Nhập ngày theo định dạng dd/MM/yyyy.';
    if (existing?.status === 'review' && !reviewed) next.general = 'Hãy kiểm tra số tiền, thu/chi, ngày, mô tả và danh mục rồi xác nhận.';
    setErrors(next);
    if (Object.keys(next).length || !parsedDate) return;
    setPending({ amount: number, currency: 'VND', merchant: merchant.trim(), date: parsedDate.toISOString(), type, category, confidence: existing?.confidence ?? 1 });
  }
  async function confirmSave() {
    if (!pending) return;
    setPending(null);
    if (await save(pending, existing)) onSaved();
  }
  return <Surface elevation={0} style={[styles.card, { backgroundColor: theme.colors.elevation.level1 }]}>
    {existing?.status === 'review' && <Surface elevation={0} style={[styles.notice, { backgroundColor: theme.financial.warningContainer }]}>
      <Text variant="bodyMedium" style={{ color: theme.financial.onWarningContainer }}>Giao dịch do AI đọc có thể sai. Kiểm tra lại toàn bộ thông tin trước khi đưa vào tổng. Độ tin cậy: {Math.round(existing.confidence * 100)}%.</Text>
    </Surface>}
    {candidates.length > 0 && <Surface elevation={0} style={[styles.notice, { backgroundColor: theme.colors.secondaryContainer }]}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>Có {candidates.length} giao dịch gần giống trong 5 phút qua. Đây chỉ là gợi ý, không tự động xóa. Nếu là cùng một giao dịch, hãy kiểm tra lại sổ trước khi lưu.</Text>
    </Surface>}
    <Text variant="titleMedium" accessibilityRole="header">Loại giao dịch</Text>
    <SegmentedButtons value={type} onValueChange={(value) => { setType(value as Direction); setReviewed(false); }} buttons={[{ value: 'EXPENSE', label: 'Khoản chi', icon: 'arrow-up' }, { value: 'INCOME', label: 'Khoản thu', icon: 'arrow-down' }]} />
    <FormField label="Số tiền (VND)" value={amount} onChangeText={(value) => { setAmount(value.replace(/[^0-9]/g, '')); setReviewed(false); setErrors((current) => ({ ...current, amount: undefined })); }}
      keyboardType="number-pad" inputMode="numeric" placeholder="0" errorText={errors.amount} help={preview ? `Sẽ lưu ${preview}` : 'Chỉ nhập số nguyên đồng.'} right={<TextInput.Affix text="₫" />} />
    <FormField label="Mô tả" value={merchant} onChangeText={(value) => { setMerchant(value); setReviewed(false); setErrors((current) => ({ ...current, merchant: undefined })); }}
      maxLength={160} placeholder="Ví dụ: Đi chợ, tiền điện, lương tháng 11" errorText={errors.merchant} />
    <View style={styles.dateBlock}>
      <FormField label="Ngày giao dịch" value={date} onChangeText={(value) => { setDate(value); setReviewed(false); setErrors((current) => ({ ...current, date: undefined })); }}
        placeholder="dd/MM/yyyy" keyboardType="numbers-and-punctuation" errorText={errors.date} help="Dùng ngày bạn thực sự chi hoặc nhận tiền." />
      <View style={styles.quickRow}><Chip compact onPress={() => setQuickDate(0)}>Hôm nay</Chip><Chip compact onPress={() => setQuickDate(-1)}>Hôm qua</Chip></View>
    </View>
    <Divider />
    <Text variant="titleMedium" accessibilityRole="header">Danh mục</Text>
    <View style={styles.chips}>{CATEGORIES.map((item) => <Chip key={item} selected={category === item} showSelectedCheck={false} onPress={() => { setCategory(item); setReviewed(false); }} style={category === item ? { backgroundColor: theme.colors.primaryContainer } : undefined} textStyle={category === item ? { color: theme.colors.onPrimaryContainer } : undefined}>{categoryLabels[item]}</Chip>)}</View>
    {existing?.status === 'review' && <Chip icon={reviewed ? 'check-circle' : 'circle-outline'} selected={reviewed} onPress={() => setReviewed(!reviewed)} style={{ alignSelf: 'flex-start' }}>Tôi đã kiểm tra tất cả thông tin</Chip>}
    {errors.general && <Text accessibilityRole="alert" variant="bodyMedium" style={{ color: theme.colors.error }}>{errors.general}</Text>}
    {savedError && <Text accessibilityRole="alert" variant="bodyMedium" style={{ color: theme.colors.error }}>{savedError}</Text>}
    <Button mode="contained" buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary} contentStyle={styles.primary} disabled={busy} loading={busy} onPress={prepare}>{existing ? 'Lưu thay đổi' : 'Thêm giao dịch'}</Button>
    <Portal>
      <Dialog visible={!!pending} dismissable={!busy} onDismiss={() => setPending(null)} style={{ borderRadius: shapes.dialog, backgroundColor: theme.colors.surface }}>
        <Dialog.Title>Xác nhận giao dịch</Dialog.Title>
        <Dialog.Content style={{ gap: spacing.sm }}>
          <Text variant="headlineSmall" style={styles.amount}>{pending ? `${pending.type === 'INCOME' ? '+' : '−'}${money(pending.amount)}` : ''}</Text>
          <Text variant="bodyLarge">{pending?.merchant}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{pending && categoryLabels[pending.category]} · {pending ? displayDate(pending.date) : ''}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{pending?.type === 'INCOME' ? 'Khoản thu' : 'Khoản chi'} · Lưu trên thiết bị này.</Text>
        </Dialog.Content>
        <Dialog.Actions><Button onPress={() => setPending(null)}>Sửa lại</Button><Button textColor={theme.colors.primary} loading={busy} disabled={busy} onPress={() => void confirmSave()}>Xác nhận lưu</Button></Dialog.Actions>
      </Dialog>
    </Portal>
  </Surface>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: shapes.large }, notice: { padding: spacing.md, borderRadius: shapes.medium },
  dateBlock: { gap: spacing.sm }, quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: -spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, primary: { minHeight: spacing.touch },
  amount: { fontVariant: ['tabular-nums'], fontWeight: '700' },
});
