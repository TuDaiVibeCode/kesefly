import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CATEGORIES, type Category, type Direction, type ParsedTransaction, type Transaction } from '@/types/transaction';
import { findDuplicateCandidates } from '@/core/ingestion/deduplicator';
import { Action, Banner, Card, Choice, Copy, Field, Row } from '@/shared/ui';
import { categoryLabels, localDate, money } from '@/shared/theme';
import { useFinance } from './FinanceProvider';

export function TransactionForm({ existing, onSaved }: { existing?: Transaction; onSaved: () => void }) {
  const { save, busy, transactions } = useFinance();
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [merchant, setMerchant] = useState(existing?.merchant ?? '');
  const [date, setDate] = useState(existing ? localDate(new Date(existing.date)) : localDate());
  const [type, setType] = useState<Direction>(existing?.type ?? 'EXPENSE');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Other');
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const candidates = useMemo(() => {
    const candidateDate = new Date(`${date}T12:00:00`);
    if (Number.isNaN(candidateDate.getTime()) || localDate(candidateDate) !== date) return [];
    const draftDate = existing && localDate(new Date(existing.date)) === date ? existing.date : candidateDate.toISOString();
    const draft: ParsedTransaction = { amount: Number(amount), currency: 'VND', merchant, date: draftDate, type, category, confidence: existing?.confidence ?? 1 };
    return findDuplicateCandidates(draft, transactions).filter((row) => row.id !== existing?.id);
  }, [amount, merchant, date, type, category, existing, transactions]);
  async function submit() {
    setError(null);
    const number = Number(amount);
    if (!/^\d+$/.test(amount) || !Number.isSafeInteger(number) || number <= 0 || number > 1e15) { setError('Chỉ nhập chữ số VND nguyên đồng (ví dụ 50000), lớn hơn 0 và tối đa 1.000.000.000.000.000.'); return; }
    if (!merchant.trim() || merchant.trim().length > 160) { setError('Tên đối tác cần từ 1 đến 160 ký tự.'); return; }
    const parsedDate = new Date(`${date}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || localDate(parsedDate) !== date) { setError('Ngày không hợp lệ. Nhập theo định dạng YYYY-MM-DD.'); return; }
    if (existing?.status === 'review' && !reviewed) { setError('Hãy kiểm tra số tiền, thu/chi, ngày, đối tác và danh mục rồi đánh dấu xác nhận.'); return; }
    const value: ParsedTransaction = { amount: number, currency: 'VND', merchant: merchant.trim(), date: existing && localDate(new Date(existing.date)) === date ? existing.date : parsedDate.toISOString(), type, category, confidence: existing?.confidence ?? 1 };
    if (await save(value, existing)) onSaved();
  }
  return <Card>
    {existing?.status === 'review' && <Banner>OpenAI có thể đọc sai. Kiểm tra từng trường bên dưới trước khi xác nhận đưa vào tổng thu chi. Độ tin cậy do AI báo cáo: {Math.round(existing.confidence * 100)}%.</Banner>}
    {candidates.length > 0 && <Banner>Có {candidates.length} giao dịch gần nhau trong 5 phút, cùng số tiền và chiều thu/chi: {candidates.slice(0, 3).map((row) => `${row.merchant} (${money(row.amount)})`).join('; ')}. Đây chỉ là gợi ý trùng, không bị xóa tự động. Nếu cùng một giao dịch, quay lại và xóa một bản; nếu khác nhau, xác nhận bình thường.</Banner>}
    <Row><Choice label="Khoản chi" selected={type === 'EXPENSE'} onPress={() => { setType('EXPENSE'); setReviewed(false); }} /><Choice label="Khoản thu" selected={type === 'INCOME'} onPress={() => { setType('INCOME'); setReviewed(false); }} /></Row>
    <Field label="Số tiền (VND)" value={amount} keyboardType="number-pad" inputMode="numeric" onChangeText={(v) => { setAmount(v); setReviewed(false); }} placeholder="0" help="Chỉ nhập số nguyên đồng, ví dụ 50000." />
    <Field label="Đối tác / nội dung giao dịch" value={merchant} maxLength={160} onChangeText={(v) => { setMerchant(v); setReviewed(false); }} placeholder="Tên cửa hàng, người nhận…" />
    <Field label="Ngày giao dịch" value={date} onChangeText={(v) => { setDate(v); setReviewed(false); }} autoCapitalize="none" placeholder="YYYY-MM-DD" help="Định dạng năm-tháng-ngày." />
    <Copy style={{ fontWeight: '600' }}>Danh mục</Copy>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{CATEGORIES.map((item) => <Choice key={item} label={categoryLabels[item]} selected={category === item} onPress={() => { setCategory(item); setReviewed(false); }} />)}</View>
    {existing?.status === 'review' && <Choice label={reviewed ? 'Đã kiểm tra tất cả thông tin' : 'Tôi đã kiểm tra tất cả thông tin trên'} selected={reviewed} onPress={() => setReviewed(!reviewed)} />}
    {error && <Banner danger>{error}</Banner>}
    <Action label={busy ? 'Đang lưu…' : existing?.status === 'review' ? 'Xác nhận & ghi vào sổ' : 'Lưu giao dịch'} onPress={() => void submit()} disabled={busy} />
  </Card>;
}
