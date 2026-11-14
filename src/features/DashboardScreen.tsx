import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Copy, Empty, Heading, Row, Screen } from '@/shared/ui';
import { categoryLabels, isInMonth, money, monthKey, useTokens } from '@/shared/theme';
import { CATEGORIES } from '@/types/transaction';

export default function DashboardScreen() {
  const { transactions, queue, budget, loading } = useFinance(); const t = useTokens();
  const [month, setMonth] = useState(monthKey());
  const rows = useMemo(() => transactions.filter((row) => row.status === 'confirmed' && isInMonth(row.date, month)), [transactions, month]);
  const income = rows.reduce((sum, row) => sum + (row.type === 'INCOME' ? row.amount : 0), 0);
  const expense = rows.reduce((sum, row) => sum + (row.type === 'EXPENSE' ? row.amount : 0), 0);
  const reviews = transactions.filter((row) => row.status === 'review').length;
  const categories = CATEGORIES.map((category) => ({ category, amount: rows.reduce((sum, row) => sum + (row.category === category && row.type === 'EXPENSE' ? row.amount : 0), 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  function shiftMonth(delta: number) { const [year, monthNumber] = month.split('-').map(Number); setMonth(monthKey(new Date(year, monthNumber - 1 + delta, 1))); }
  const monthTitle = new Date(`${month}-01T12:00:00`).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  return <Screen title="Tiền rõ ràng. Tâm an hơn." eyebrow="TỔNG QUAN CỦA BẠN">
    <Row><Action compact variant="secondary" label="‹ Tháng trước" onPress={() => shiftMonth(-1)} /><Copy style={{ fontWeight: '700', flexGrow: 1 }}>{monthTitle}</Copy><Action compact variant="secondary" label="Tháng sau ›" onPress={() => shiftMonth(1)} /></Row>
    <View style={[styles.ledger, { backgroundColor: t.ledger }]}>
      <Text style={[styles.ledgerLabel, { color: t.ledgerMuted }]}>CHÊNH LỆCH THU − CHI</Text>
      <Text selectable style={[styles.balance, { color: t.onLedger }]}>{money(income - expense)}</Text>
      <Text style={[styles.ledgerNote, { color: t.ledgerMuted }]}>Trong tháng đã chọn · chỉ giao dịch đã xác nhận</Text>
      <View style={[styles.ledgerColumns, { borderColor: t.ledgerMuted }]}>
        <View style={styles.stat}><Text style={[styles.ledgerLabel, { color: t.ledgerMuted }]}>THU NHẬP</Text><Text selectable style={[styles.statValue, { color: t.onLedger }]}>+{money(income)}</Text></View>
        <View style={styles.stat}><Text style={[styles.ledgerLabel, { color: t.ledgerMuted }]}>CHI TIÊU</Text><Text selectable style={[styles.statValue, { color: t.onLedger }]}>−{money(expense)}</Text></View>
      </View>
    </View>
    <Action label="+ Ghi một giao dịch" onPress={() => router.push('/add')} />
    {(reviews > 0 || queue.length > 0) && <Card><Heading small>Chờ bạn kiểm tra</Heading><Copy tone="muted">{reviews} giao dịch cần duyệt · {queue.length} nội dung trong hàng đợi. Chưa tính vào số liệu hay ngân sách.</Copy><Action variant="secondary" label="Mở sổ & hàng đợi" onPress={() => router.push('/transactions')} /></Card>}
    {!loading && rows.length === 0 && <Empty title="Một trang sổ mới" detail="Chưa có giao dịch đã xác nhận trong tháng này. Ghi thu chi thủ công ngay, không cần tài khoản hay kết nối mạng." />}
    <View style={styles.columns}>
      <Card style={styles.column}>
        <Heading small>Chi tiêu theo danh mục</Heading>
        {categories.length === 0 ? <Copy tone="muted">Danh mục sẽ hiện khi bạn xác nhận khoản chi đầu tiên.</Copy> : categories.map((item) => <View key={item.category} style={{ gap: 7 }}>
          <Row><Copy style={{ flexGrow: 1 }}>{categoryLabels[item.category]}</Copy><Copy style={{ fontWeight: '700' }}>{money(item.amount)}</Copy></Row>
          <View style={[styles.track, { backgroundColor: t.surfaceAlt }]}><View style={[styles.fill, { backgroundColor: t.primary, width: `${Math.round(item.amount / expense * 100)}%` }]} /></View>
        </View>)}
      </Card>
      <Card style={styles.column}>
        <Heading small>Nhịp ngân sách</Heading>
        {budget > 0 ? <><Copy tone="muted">Đã chi {money(expense)} / {money(budget)}</Copy><Copy style={styles.budgetValue} tone={expense > budget ? 'negative' : 'positive'}>{expense > budget ? 'Vượt ' : 'Còn '}{money(Math.abs(budget - expense))}</Copy>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: budget, now: Math.min(expense, budget) }} style={[styles.track, { backgroundColor: t.surfaceAlt }]}><View style={[styles.fill, { backgroundColor: expense > budget ? t.negative : t.positive, width: `${Math.min(100, expense / budget * 100)}%` }]} /></View>
        </> : <Copy tone="muted">Đặt giới hạn chi tiêu hàng tháng. Ngân sách chỉ lưu trên thiết bị, không đưa lên đám mây.</Copy>}
        <Action variant="secondary" label={budget > 0 ? 'Điều chỉnh ngân sách' : 'Đặt ngân sách'} onPress={() => router.push('/budget')} />
      </Card>
    </View>
    <Banner>Không đọc SMS. Nhập tay dùng ngoại tuyến, không cần tài khoản. AI chỉ gửi nội dung thô / ảnh qua Firebase đến OpenAI sau khi đăng nhập, đồng ý riêng và xác nhận các mục đã chọn. Bạn duyệt kết quả trước khi ghi vào tổng.</Banner>
  </Screen>;
}
const styles = StyleSheet.create({
  ledger: { padding: 28, borderRadius: 24, gap: 12 }, ledgerLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  balance: { fontSize: 40, fontWeight: '700', letterSpacing: -1.3, fontVariant: ['tabular-nums'] }, ledgerNote: { fontSize: 12, lineHeight: 19 },
  ledgerColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingTop: 22, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  stat: { gap: 8, flex: 1, minWidth: 110 }, statValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, column: { flex: 1, minWidth: 240 },
  track: { height: 7, borderRadius: 8, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 }, budgetValue: { fontSize: 25, lineHeight: 34, fontWeight: '700' },
});
