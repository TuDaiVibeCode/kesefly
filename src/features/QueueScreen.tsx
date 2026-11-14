import { useState } from 'react';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import type { QueuedAlert } from '@/types/transaction';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Choice, Copy, Empty, Heading, Row, Screen } from '@/shared/ui';

function QueueItem({ item, selected, onSelect }: { item: QueuedAlert; selected: boolean; onSelect: () => void }) {
  const { discardQueue, busy, processing } = useFinance();
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState(false);
  return <Card>
    <Copy style={{ fontWeight: '700' }}>{item.imageUri ? 'Ảnh hóa đơn' : item.source === 'notification' ? 'Thông báo ngân hàng' : 'Nội dung đã dán'}</Copy>
    <Copy tone="muted" style={{ fontSize: 12, lineHeight: 18 }}>{new Date(item.receivedAt).toLocaleString('vi-VN')}</Copy>
    <Choice label={selected ? 'Đã chọn để gửi' : 'Chọn mục này để gửi'} selected={selected} disabled={busy || processing} onPress={onSelect} />
    {!!item.text && <Copy numberOfLines={preview ? undefined : 3}>{item.text}</Copy>}
    {preview && item.imageUri && <Image source={{ uri: item.imageUri }} style={{ width: '100%', height: 260 }} contentFit="contain" cachePolicy="none" accessibilityLabel="Ảnh hóa đơn lưu trên thiết bị" />}
    <Action compact variant="secondary" label={preview ? 'Thu gọn nội dung gốc' : 'Xem nội dung gốc / ảnh'} onPress={() => setPreview(!preview)} />
    <Copy tone={item.error ? 'negative' : 'muted'}>{item.error || 'Lưu trên thiết bị. Chỉ gửi khi bạn chọn và xác nhận.'}</Copy>
    {confirm ? <><Banner danger>Xóa vĩnh viễn nội dung gốc và ảnh của mục này? Không thể hoàn tác.</Banner><Row><Action compact variant="danger" label="Xóa mục này" disabled={busy || processing} onPress={() => void discardQueue(item.id)} /><Action compact variant="secondary" label="Giữ lại" onPress={() => setConfirm(false)} /></Row></> : <Action compact variant="secondary" label="Bỏ mục khỏi hàng đợi" disabled={busy || processing} onPress={() => setConfirm(true)} />}
  </Card>;
}

export default function QueueScreen() {
  const { queue, retryQueue, run, busy, processing, aiConsent, aiConfigured, user, refresh } = useFinance();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBatch, setConfirmBatch] = useState<{ ids: string[]; uid: string } | null>(null);
  const selected = queue.filter((item) => selectedIds.includes(item.id));
  const selectedImages = selected.filter((item) => !!item.imageUri).length;
  const canSend = aiConfigured && !!user && aiConsent;
  const validConfirmation = !!confirmBatch && canSend && confirmBatch.uid === user?.uid && confirmBatch.ids.every((id) => queue.some((item) => item.id === id));
  function toggleSelected(id: string) { setConfirmBatch(null); setSelectedIds((ids) => ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]); }
  async function sendSelected() {
    if (!validConfirmation || !confirmBatch) return;
    const ids = confirmBatch.ids; setConfirmBatch(null);
    if (await retryQueue(ids)) setSelectedIds([]);
  }
  return <Screen title="Chờ xử lý">
    <Copy tone="muted">Nội dung gốc hết hạn sau 7 ngày, được dọn khi ứng dụng hoạt động và xóa trên thiết bị sau xử lý thành công. Kết quả AI luôn ở mục Cần duyệt, chưa tính vào tổng cho đến khi bạn xác nhận.</Copy>
    <Row><Action compact variant="secondary" label="Kiểm tra lại" disabled={busy} onPress={() => void run(refresh)} /></Row>
    {queue.length === 0 ? <Empty title="Không còn mục đang chờ" detail="Dán nội dung hoặc chọn ảnh ở màn Thêm mới để lưu vào hàng đợi. Chưa gửi dữ liệu khi thêm mục." /> : <>
      <Banner>Gửi AI sẽ chuyển nội dung thô / ảnh của các mục đã chọn qua máy chủ Express của nhóm phát triển đến OpenAI. Cần đăng nhập, đồng ý AI riêng và mạng. Không thể rút lại yêu cầu đang gửi.</Banner>
      <Row><Action compact variant="secondary" label="Chọn tất cả" disabled={busy || processing} onPress={() => { setConfirmBatch(null); setSelectedIds(queue.map((item) => item.id)); }} /><Action compact variant="secondary" label="Bỏ chọn" disabled={busy || processing} onPress={() => { setConfirmBatch(null); setSelectedIds([]); }} /></Row>
      <Copy tone="muted">Đã chọn {selected.length} mục: {selected.length - selectedImages} nội dung văn bản, {selectedImages} ảnh hóa đơn.</Copy>
      <Action label={processing ? 'Đang gửi các mục đã chọn…' : `Gửi ${selected.length} mục đã chọn`} disabled={busy || processing || !canSend || !selected.length} onPress={() => { if (user) setConfirmBatch({ ids: selected.map((item) => item.id), uid: user.uid }); }} />
      {!canSend && <><Copy tone="warning">Chưa thể đọc tự động. Mở Cài đặt để kiểm tra tính năng và quyền cho phép. Bạn vẫn có thể nhập bằng tay.</Copy><Action variant="secondary" label="Mở cài đặt" onPress={() => router.push('/settings')} /></>}
      {confirmBatch && <Card><Heading small>Xác nhận gửi</Heading><Banner>Bạn sắp gửi nội dung thô / ảnh của {confirmBatch.ids.length} mục qua máy chủ Express của nhóm phát triển đến OpenAI bằng tài khoản {user?.email || 'hiện tại'}. Yêu cầu đã gửi không thể thu hồi.</Banner>{!validConfirmation && <Banner danger>Tài khoản, đồng ý hoặc hàng đợi đã thay đổi. Hủy và chọn lại trước khi gửi.</Banner>}<Row><Action compact label={`Xác nhận gửi ${confirmBatch.ids.length} mục`} disabled={busy || processing || !validConfirmation} onPress={() => void sendSelected()} /><Action compact variant="secondary" label="Hủy" onPress={() => setConfirmBatch(null)} /></Row></Card>}
      {queue.map((item) => <QueueItem key={item.id} item={item} selected={selectedIds.includes(item.id)} onSelect={() => toggleSelected(item.id)} />)}
    </>}
  </Screen>;
}
