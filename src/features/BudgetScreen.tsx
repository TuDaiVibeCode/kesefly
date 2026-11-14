import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Copy, Field, Heading, Screen } from '@/shared/ui';
import { isInMonth, money, monthKey, useTokens } from '@/shared/theme';

export default function BudgetScreen() {
  const { budget, transactions, saveBudget, busy } = useFinance(); const t = useTokens();
  const [draft, setValue] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const value = draft ?? (budget ? String(budget) : '');
  const month = monthKey(); const now = new Date();
  const spent = transactions.reduce((sum, row) => sum + (row.status === 'confirmed' && row.type === 'EXPENSE' && isInMonth(row.date, month) ? row.amount : 0), 0);
  const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  async function submit() {
    const number = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0 || number > 1e15) { setError('Chỉ nhập chữ số nguyên đồng (ví dụ 5000000), lớn hơn 0 và tối đa 1.000.000.000.000.000.'); return; }
    setError(null); if (await saveBudget(number)) setValue(null);
  }
  return <Screen title="Một giới hạn, nhiều chủ động." eyebrow="NGÂN SÁCH HÀNG THÁNG">
    <Copy tone="muted">Áp dụng cùng một giới hạn cho mỗi tháng. Chỉ khoản chi đã xác nhận mới được tính; giao dịch cần duyệt được giữ ngoài ngân sách.</Copy>
    <Card><Heading small>{now.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</Heading><Copy tone="muted">Chi tiêu đã ghi nhận</Copy><Copy style={styles.amount}>{money(spent)}</Copy>
      {budget > 0 ? <><View style={[styles.track, { backgroundColor: t.surfaceAlt }]}><View style={[styles.fill, { backgroundColor: spent > budget ? t.negative : t.positive, width: `${Math.min(100, spent / budget * 100)}%` }]} /></View>
        <Copy tone={spent > budget ? 'negative' : 'positive'}>{spent > budget ? `Đã vượt ${money(spent - budget)}` : `Còn ${money(budget - spent)} trong ngân sách ${money(budget)}`}</Copy>
        <Copy tone="muted">{daysRemaining} ngày còn lại trong tháng · {money(Math.max(0, budget - spent) / daysRemaining)} / ngày nếu giữ đều.</Copy></> : <Copy tone="muted">Bạn chưa đặt giới hạn chi tiêu. Bắt đầu bằng số tiền phù hợp với tháng của bạn.</Copy>}
    </Card>
    <Card><Heading small>Đặt giới hạn chi tiêu</Heading><Field label="Ngân sách hàng tháng (VND)" value={value} onChangeText={setValue} keyboardType="number-pad" inputMode="numeric" placeholder="Nhập số tiền" />
      {error && <Banner danger>{error}</Banner>}<Action label="Lưu ngân sách" disabled={busy} onPress={() => void submit()} />
      {budget > 0 && <Action variant="secondary" label="Bỏ giới hạn ngân sách" disabled={busy} onPress={() => { void saveBudget(0).then((ok) => { if (ok) setValue(null); }); }} />}
    </Card><Banner>Ngân sách là kế hoạch của bạn, không phải tư vấn tài chính. Giá trị chỉ lưu cục bộ và không đồng bộ lên Firebase.</Banner>
  </Screen>;
}
const styles = StyleSheet.create({ amount: { fontSize: 32, lineHeight: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }, track: { height: 10, borderRadius: 8, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 } });
