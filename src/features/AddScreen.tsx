import { useState } from 'react';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { TransactionForm } from './TransactionForm';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Choice, Copy, Field, Heading, Row, Screen } from '@/shared/ui';

export default function AddScreen() {
  const { addText, addImage, busy, run, model } = useFinance();
  const [mode, setMode] = useState<'manual' | 'import'>('manual');
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  async function submitText() {
    setLocalError(null);
    if (!text.trim()) { setLocalError('Dán nội dung giao dịch trước khi thêm vào hàng đợi.'); return; }
    if (await addText(text.trim())) { setText(''); router.push('/transactions'); }
  }
  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      if (await addImage(result.assets[0].uri)) router.push('/transactions');
    }
  }
  return <Screen title="Ghi thêm, nhẹ đầu hơn." eyebrow="THÊM GIAO DỊCH">
    <Row><Choice label="Nhập thủ công" selected={mode === 'manual'} onPress={() => setMode('manual')} /><Choice label="Nhập bằng AI cục bộ" selected={mode === 'import'} onPress={() => setMode('import')} /></Row>
    {mode === 'manual' ? <><Copy tone="muted">Ghi ngay trên thiết bị. Không cần tài khoản, mạng hay mô hình AI.</Copy><TransactionForm onSaved={() => router.push('/transactions')} /></> : <>
      <Banner>Nội dung và ảnh chỉ được phân tích trên thiết bị. Mỗi kết quả đều nằm ở mục Cần duyệt, không tự động tính vào sổ. Không nhập mật khẩu, mã PIN hoặc OTP.</Banner>
      {model.phase !== 'ready' && <Card><Heading small>{model.phase === 'unsupported' ? 'AI chưa hỗ trợ nền tảng này' : 'Mô hình chưa sẵn sàng'}</Heading><Copy tone="muted">{model.phase === 'unsupported' ? 'Bạn vẫn có thể nhập thủ công đầy đủ. Phân tích cần ứng dụng di động với bản dựng native được hỗ trợ.' : 'Nội dung dán sẽ lưu vào hàng đợi riêng. Mở Cài đặt để tải mô hình; ứng dụng chỉ phân tích khi đang mở.'}</Copy>{model.phase !== 'unsupported' && <Action variant="secondary" label="Mở cài đặt mô hình" onPress={() => router.push('/settings')} />}</Card>}
      <Card><Heading small>Dán nội dung giao dịch</Heading>
        <Field label="Nội dung thông báo hoặc hóa đơn" multiline numberOfLines={6} textAlignVertical="top" style={{ minHeight: 160 }} value={text} onChangeText={setText} placeholder="Dán nội dung của bạn tại đây…" help="Lưu tối đa 7 ngày nếu chưa xử lý; nội dung gốc được xóa sau khi phân tích thành công." />
        {localError && <Banner danger>{localError}</Banner>}
        <Action label={busy ? 'Đang lưu…' : 'Đưa nội dung vào hàng đợi'} disabled={busy} onPress={() => void submitText()} />
      </Card>
      <Card><Heading small>Ảnh hóa đơn</Heading><Copy tone="muted">Chọn một ảnh rõ nét. Bản sao được giữ trong vùng riêng của ứng dụng đến khi xử lý xong hoặc bạn xóa mục.</Copy>
        {Platform.OS === 'web' ? <Copy tone="muted">Nhập ảnh bền vững và mô hình thị giác chỉ dùng trên ứng dụng di động. Trên web, hãy ghi thủ công.</Copy> : <Action variant="secondary" label="Chọn ảnh hóa đơn" disabled={busy} onPress={() => { void pickImage().catch((cause: unknown) => { void run(async () => { throw cause; }); }); }} />}
      </Card>
    </>}
  </Screen>;
}
