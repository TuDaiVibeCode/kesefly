import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
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
function QueueItem({ item, selected, onSelect }: { item: QueuedAlert; selected: boolean; onSelect: () => void }) {
  const { discardQueue, busy, processing } = useFinance(); const [confirm, setConfirm] = useState(false); const [preview, setPreview] = useState(false);
  return <Card><Copy style={{ fontWeight: '700' }}>{item.imageUri ? 'Ảnh hóa đơn' : item.source === 'notification' ? 'Thông báo ngân hàng' : 'Nội dung đã dán'}</Copy>
    <Copy tone="muted" style={styles.small}>{new Date(item.receivedAt).toLocaleString('vi-VN')}{item.sourcePackage ? ` · ${item.sourcePackage}` : ''}</Copy>
    <Choice label={selected ? 'Đã chọn để gửi đến OpenAI' : 'Chọn mục này để gửi đến OpenAI'} selected={selected} disabled={busy || processing} onPress={onSelect} />
    {!!item.text && <Copy numberOfLines={preview ? undefined : 3}>{item.text}</Copy>}
    {preview && item.imageUri && <Image source={{ uri: item.imageUri }} style={{ width: '100%', height: 260 }} contentFit="contain" cachePolicy="none" accessibilityLabel="Ảnh hóa đơn lưu trên thiết bị sẽ được gửi nếu bạn chọn và xác nhận" />}
    <Action compact variant="secondary" label={preview ? 'Thu gọn nội dung gốc' : 'Xem nội dung gốc / ảnh'} onPress={() => setPreview(!preview)} />
    <Copy tone={item.error ? 'negative' : 'muted'}>{item.error || 'Lưu trên thiết bị. Chỉ gửi khi bạn chọn và xác nhận.'}</Copy>
    {!!item.error && <Copy tone="muted">Nội dung lỗi vẫn ở trên thiết bị. Chọn lại và xác nhận để thử gửi; cần kết nối mạng.</Copy>}
    {confirm ? <><Banner danger>Xóa vĩnh viễn nội dung gốc và ảnh của mục này? Không thể hoàn tác. Xóa trên thiết bị không rút lại dữ liệu đã gửi đến OpenAI.</Banner><Row><Action compact variant="danger" label="Xóa mục này" disabled={busy || processing} onPress={() => void discardQueue(item.id)} /><Action compact variant="secondary" label="Giữ lại" onPress={() => setConfirm(false)} /></Row></> : <Action compact variant="secondary" label="Bỏ mục khỏi hàng đợi" disabled={busy || processing} onPress={() => setConfirm(true)} />}
  </Card>;
}
function TransactionsContent() {
  const { transactions, queue, retryQueue, refresh, run, busy, processing, aiConsent, aiConfigured, user, loading } = useFinance();
  const t = useTokens(); const [filter, setFilter] = useState<'all' | 'review' | 'confirmed'>('all'); const [search, setSearch] = useState(''); const [showQueue, setShowQueue] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBatch, setConfirmBatch] = useState<{ ids: string[]; uid: string } | null>(null);
  const selected = queue.filter((item) => selectedIds.includes(item.id));
  const selectedImages = selected.filter((item) => !!item.imageUri).length;
  const canSend = aiConfigured && !!user && aiConsent;
  const validConfirmation = !!confirmBatch && canSend && confirmBatch.uid === user?.uid && confirmBatch.ids.every((id) => queue.some((item) => item.id === id));
  function toggleSelected(id: string) {
    setConfirmBatch(null);
    setSelectedIds((ids) => ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]);
  }
  async function sendSelected() {
    if (!validConfirmation || !confirmBatch) return;
    const ids = confirmBatch.ids;
    setConfirmBatch(null);
    if (await retryQueue(ids)) setSelectedIds([]);
  }
  const data = useMemo(() => transactions.filter((row) => (filter === 'all' || row.status === filter) && `${row.merchant} ${categoryLabels[row.category]}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))), [transactions, filter, search]);
  const renderItem = useCallback(({ item }: { item: Transaction }) => <TransactionRow row={item} />, []);
  return <View style={[styles.root, { backgroundColor: t.background }]}><FlatList
    data={data} keyExtractor={(item) => item.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={() => { void run(refresh); }}
    ListHeaderComponent={<View style={styles.header}>
      <Copy tone="primary" style={styles.eyebrow}>SỔ TIỀN CỦA BẠN</Copy><Heading>Mỗi khoản, một dòng rõ ràng.</Heading><Feedback />
      <Row><Action compact label="+ Thêm giao dịch" onPress={() => router.push('/add')} /><Action compact variant="secondary" label={`Hàng đợi (${queue.length})`} onPress={() => setShowQueue(!showQueue)} /></Row>
      {showQueue && <View style={{ gap: 12 }}><Heading small>Hàng đợi trên thiết bị</Heading><Copy tone="muted">Nội dung gốc hết hạn sau 7 ngày, được dọn khi ứng dụng hoạt động và xóa trên thiết bị sau xử lý thành công. Mục lỗi vẫn được giữ để thử lại. Kết quả AI luôn ở mục Cần duyệt, chưa tính vào tổng cho đến khi bạn xác nhận.</Copy>
        {queue.length === 0 ? <Empty title="Không còn mục đang chờ" detail="Dán nội dung hoặc chọn ảnh ở màn Thêm mới để lưu vào hàng đợi. Chưa gửi dữ liệu khi thêm mục." /> : <>
          <Banner>Gửi AI sẽ chuyển nội dung thô / ảnh của các mục đã chọn qua máy chủ Express của nhóm phát triển đến OpenAI. Cần đăng nhập, đồng ý AI riêng và mạng. Không thể rút lại yêu cầu đang gửi; tắt đồng ý chỉ ngăn lần gửi tiếp theo.</Banner>
          <Row><Action compact variant="secondary" label="Chọn tất cả mục hiện có" disabled={busy || processing} onPress={() => { setConfirmBatch(null); setSelectedIds(queue.map((item) => item.id)); }} /><Action compact variant="secondary" label="Bỏ chọn tất cả" disabled={busy || processing} onPress={() => { setConfirmBatch(null); setSelectedIds([]); }} /></Row>
          <Copy tone="muted">Đã chọn {selected.length} mục: {selected.length - selectedImages} nội dung văn bản, {selectedImages} ảnh hóa đơn. Xem nội dung gốc từng mục trước khi gửi.</Copy>
          <Action label={processing ? 'Đang gửi các mục đã chọn…' : `Gửi ${selected.length} mục đã chọn đến OpenAI`} disabled={busy || processing || !canSend || !selected.length} onPress={() => { if (user) setConfirmBatch({ ids: selected.map((item) => item.id), uid: user.uid }); }} />
          {!canSend && <><Copy tone="warning">Chưa thể gửi: cần cấu hình AI, đăng nhập và đồng ý riêng. Lưu hàng đợi và nhập tay vẫn dùng không cần tài khoản.</Copy><Action variant="secondary" label="Mở Cài đặt AI & tài khoản" onPress={() => router.push('/settings')} /></>}
          {confirmBatch && <Card><Heading small>Xác nhận gửi đến OpenAI</Heading><Banner>Bạn sắp gửi nội dung thô / ảnh của {confirmBatch.ids.length} mục đã chọn qua máy chủ Express của nhóm phát triển đến OpenAI bằng tài khoản {user?.email || user?.uid || 'đã đăng xuất'}. Yêu cầu đã gửi không thể thu hồi. Không gửi mật khẩu, PIN hoặc OTP. Kết quả cần duyệt trước khi vào tổng.</Banner>{!validConfirmation && <Banner danger>Tài khoản, đồng ý hoặc hàng đợi đã thay đổi. Hủy và chọn lại các mục trước khi gửi.</Banner>}<Row><Action compact label={`Xác nhận gửi ${confirmBatch.ids.length} mục`} disabled={busy || processing || !validConfirmation} onPress={() => void sendSelected()} /><Action compact variant="secondary" label="Hủy, chưa gửi" onPress={() => setConfirmBatch(null)} /></Row></Card>}
          {queue.map((item) => <QueueItem key={item.id} item={item} selected={selectedIds.includes(item.id)} onSelect={() => toggleSelected(item.id)} />)}
        </>}
      </View>}
      <Field label="Tìm giao dịch" value={search} onChangeText={setSearch} placeholder="Tên đối tác hoặc danh mục" />
      <Row><Choice label="Tất cả" selected={filter === 'all'} onPress={() => setFilter('all')} /><Choice label={`Cần duyệt (${transactions.filter((row) => row.status === 'review').length})`} selected={filter === 'review'} onPress={() => setFilter('review')} /><Choice label="Đã xác nhận" selected={filter === 'confirmed'} onPress={() => setFilter('confirmed')} /></Row>
      <Copy tone="muted">{data.length} giao dịch · Chạm một dòng để kiểm tra, sửa hoặc xóa.</Copy>
    </View>}
    ListEmptyComponent={<Empty title={search ? 'Không tìm thấy giao dịch' : filter === 'review' ? 'Sổ đã được kiểm tra' : 'Sổ đang trống'} detail={search ? 'Thử từ khóa khác hoặc xóa nội dung tìm kiếm.' : 'Ghi giao dịch thủ công hoặc nhập nội dung của bạn. Không có dữ liệu mẫu trong sổ.'} />}
  /></View>;
}
export default function TransactionsScreen() {
  const { user, aiConsent } = useFinance();
  return <TransactionsContent key={`${user?.uid ?? 'signed-out'}:${aiConsent}`} />;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, list: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 24, paddingBottom: 40 }, header: { gap: 20, paddingBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8 }, transaction: { padding: 16, borderWidth: 1, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  direction: { width: 38, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, small: { fontSize: 12, lineHeight: 18 }, amount: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
