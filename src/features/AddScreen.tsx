import { useState } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { TransactionForm } from './TransactionForm';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Choice, Copy, Field, Heading, Row, Screen } from '@/shared/ui';

export default function AddScreen() {
  const { addText, addImage, busy, run, aiConsent, aiConfigured, user } = useFinance();
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
    <Row><Choice label="Nhập thủ công" selected={mode === 'manual'} onPress={() => setMode('manual')} /><Choice label="Chuẩn bị nội dung cho AI" selected={mode === 'import'} onPress={() => setMode('import')} /></Row>
    {mode === 'manual' ? <><Copy tone="muted">Ghi ngay trên thiết bị. Không cần tài khoản hay kết nối mạng.</Copy><TransactionForm onSaved={() => router.push('/transactions')} /></> : <>
      <Banner>Dán nội dung hoặc chọn ảnh chỉ lưu vào hàng đợi trên thiết bị, chưa tải lên. Khi bạn chọn mục và xác nhận gửi, nội dung thô / ảnh được gửi qua máy chủ Express của nhóm phát triển đến OpenAI qua mạng. Không nhập mật khẩu, mã PIN hoặc OTP. Kết quả AI cần duyệt và chưa tính vào tổng cho đến khi xác nhận.</Banner>
      {(!aiConfigured || !user || !aiConsent) && <Card><Heading small>Chưa bật gửi đến OpenAI</Heading><Copy tone="muted">Bạn vẫn có thể lưu nội dung vào hàng đợi không cần tài khoản. Để phân tích, cần bản dựng đã cấu hình AI, đăng nhập, mạng và đồng ý AI riêng trong Cài đặt. Bật đồng ý không tự gửi dữ liệu.</Copy><Action variant="secondary" label="Mở cài đặt AI & quyền riêng tư" onPress={() => router.push('/settings')} /></Card>}
      <Card><Heading small>Dán nội dung giao dịch</Heading>
        <Field label="Nội dung thông báo hoặc hóa đơn" multiline numberOfLines={6} textAlignVertical="top" style={{ minHeight: 160 }} value={text} onChangeText={setText} placeholder="Dán nội dung của bạn tại đây…" help="Lưu tối đa 7 ngày nếu chưa xử lý; nội dung gốc được xóa sau khi phân tích thành công." />
        {localError && <Banner danger>{localError}</Banner>}
        <Action label={busy ? 'Đang lưu…' : 'Đưa nội dung vào hàng đợi'} disabled={busy} onPress={() => void submitText()} />
      </Card>
      <Card><Heading small>Ảnh hóa đơn</Heading><Copy tone="muted">Chọn một ảnh rõ nét. Bản sao được giữ trong vùng riêng của ứng dụng đến khi xử lý xong hoặc bạn xóa mục.</Copy>
        <Action variant="secondary" label="Chọn ảnh hóa đơn" disabled={busy} onPress={() => { void pickImage().catch((cause: unknown) => { void run(async () => { throw cause; }); }); }} />
      </Card>
    </>}
  </Screen>;
}
