import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { QueuedAlert, Transaction } from '@/types/transaction';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Choice, Copy, Empty, Feedback, Field, Heading, Row } from '@/shared/ui';
import { categoryLabels, money, useTokens } from '@/shared/theme';

const TransactionRow = memo(function TransactionRow({ row }: { row: Transaction }) {
  const t = useTokens();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${row.merchant}, ${money(row.amount)}, ${row.status === 'review' ? 'cần duyệt' : 'đã xác nhận'}. Mở để sửa.`} onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: row.id } })}
    style={({ pressed }) => [styles.transaction, { backgroundColor: t.surface, borderColor: t.border, opacity: pressed ? 0.7 : 1 }]}>
    <View style={[styles.direction, { backgroundColor: row.type === 'INCOME' ? t.positiveSoft : t.primarySoft }]}><Copy tone={row.type === 'INCOME' ? 'positive' : 'primary'} style={{ fontSize: 22 }}>{row.type === 'INCOME' ? '+' : '−'}</Copy></View>
    <View style={{ flex: 1, gap: 3 }}><Copy style={{ fontWeight: '700' }} numberOfLines={2}>{row.merchant}</Copy><Copy tone="muted" style={styles.small}>{categoryLabels[row.category]} · {new Date(row.date).toLocaleDateString('vi-VN')}</Copy><Copy tone={row.status === 'review' ? 'warning' : 'muted'} style={styles.small}>{row.status === 'review' ? 'Cần duyệt · chưa vào tổng' : 'Đã xác nhận'} · {row.source === 'image' ? 'Ảnh' : row.source === 'notification' ? 'Thông báo' : 'Nhập tay / dán'}</Copy></View>
    <Copy tone={row.type === 'INCOME' ? 'positive' : 'text'} style={styles.amount}>{row.type === 'INCOME' ? '+' : '−'}{money(row.amount)}</Copy>
  </Pressable>;
});
function QueueItem({ item }: { item: QueuedAlert }) {
  const { discardQueue, busy } = useFinance(); const [confirm, setConfirm] = useState(false);
  return <Card><Copy style={{ fontWeight: '700' }}>{item.imageUri ? 'Ảnh hóa đơn' : item.source === 'notification' ? 'Thông báo ngân hàng' : 'Nội dung đã dán'}</Copy>
    <Copy tone="muted" style={styles.small}>{new Date(item.receivedAt).toLocaleString('vi-VN')}{item.sourcePackage ? ` · ${item.sourcePackage}` : ''}</Copy>
    {!!item.text && <Copy numberOfLines={3}>{item.text}</Copy>}
    <Copy tone={item.error ? 'negative' : 'muted'}>{item.error || 'Đang chờ mô hình sẵn sàng và ứng dụng được mở.'}</Copy>
    {confirm ? <><Banner danger>Xóa vĩnh viễn nội dung gốc và ảnh của mục này? Không thể hoàn tác.</Banner><Row><Action compact variant="danger" label="Xóa mục này" disabled={busy} onPress={() => void discardQueue(item.id)} /><Action compact variant="secondary" label="Giữ lại" onPress={() => setConfirm(false)} /></Row></> : <Action compact variant="secondary" label="Bỏ mục khỏi hàng đợi" onPress={() => setConfirm(true)} />}
  </Card>;
}
export default function TransactionsScreen() {
  const { transactions, queue, retryQueue, refresh, run, busy, processing, model, loading } = useFinance();
  const t = useTokens(); const [filter, setFilter] = useState<'all' | 'review' | 'confirmed'>('all'); const [search, setSearch] = useState(''); const [showQueue, setShowQueue] = useState(false);
  const data = useMemo(() => transactions.filter((row) => (filter === 'all' || row.status === filter) && `${row.merchant} ${categoryLabels[row.category]}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))), [transactions, filter, search]);
  const renderItem = useCallback(({ item }: { item: Transaction }) => <TransactionRow row={item} />, []);
  return <View style={[styles.root, { backgroundColor: t.background }]}><FlatList
    data={data} keyExtractor={(item) => item.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={() => { void run(refresh); }}
    ListHeaderComponent={<View style={styles.header}>
      <Copy tone="primary" style={styles.eyebrow}>SỔ TIỀN CỦA BẠN</Copy><Heading>Mỗi khoản, một dòng rõ ràng.</Heading><Feedback />
      <Row><Action compact label="+ Thêm giao dịch" onPress={() => router.push('/add')} /><Action compact variant="secondary" label={`Hàng đợi (${queue.length})`} onPress={() => setShowQueue(!showQueue)} /></Row>
      {showQueue && <View style={{ gap: 12 }}><Heading small>Hàng đợi riêng trên thiết bị</Heading><Copy tone="muted">Nội dung gốc hết hạn sau 7 ngày, được dọn khi ứng dụng hoạt động và xóa sau xử lý. Kết quả luôn cần bạn xác nhận.</Copy>
        {queue.length === 0 ? <Empty title="Không còn mục đang chờ" detail="Dán nội dung hoặc chọn ảnh ở màn Thêm mới để phân tích trên thiết bị." /> : <><Action label={processing ? 'Đang phân tích…' : 'Thử phân tích lại hàng đợi'} disabled={busy || processing || model.phase !== 'ready'} onPress={() => void retryQueue()} />{model.phase !== 'ready' && <Action variant="secondary" label="Chuẩn bị mô hình trong Cài đặt" onPress={() => router.push('/settings')} />}{queue.map((item) => <QueueItem key={item.id} item={item} />)}</>}
      </View>}
      <Field label="Tìm giao dịch" value={search} onChangeText={setSearch} placeholder="Tên đối tác hoặc danh mục" />
      <Row><Choice label="Tất cả" selected={filter === 'all'} onPress={() => setFilter('all')} /><Choice label={`Cần duyệt (${transactions.filter((row) => row.status === 'review').length})`} selected={filter === 'review'} onPress={() => setFilter('review')} /><Choice label="Đã xác nhận" selected={filter === 'confirmed'} onPress={() => setFilter('confirmed')} /></Row>
      <Copy tone="muted">{data.length} giao dịch · Chạm một dòng để kiểm tra, sửa hoặc xóa.</Copy>
    </View>}
    ListEmptyComponent={<Empty title={search ? 'Không tìm thấy giao dịch' : filter === 'review' ? 'Sổ đã được kiểm tra' : 'Sổ đang trống'} detail={search ? 'Thử từ khóa khác hoặc xóa nội dung tìm kiếm.' : 'Ghi giao dịch thủ công hoặc nhập nội dung của bạn. Không có dữ liệu mẫu trong sổ.'} />}
  /></View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, list: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 24, paddingBottom: 40 }, header: { gap: 20, paddingBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 }, transaction: { padding: 16, borderWidth: 1, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  direction: { width: 38, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, small: { fontSize: 12, lineHeight: 18 }, amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
