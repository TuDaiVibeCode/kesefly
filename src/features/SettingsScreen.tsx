import { useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { prepareModel, unloadModel } from '@/core/ai/engine';
import { configureCapture, DEFAULT_BANK_PACKAGES, isCaptureAvailable, openBatterySettings, openCaptureSettings } from '@/core/ingestion/nativeCapture';
import { discardCapturedAlerts } from '@/core/ingestion/pipeline';
import { isFirebaseConfigured, signIn, signOut, signUp } from '@/core/firebase/cloud';
import { setSetting } from '@/core/database/repository';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Choice, Copy, Field, Heading, Row, Screen } from '@/shared/ui';
import { useTokens } from '@/shared/theme';

const phaseLabels = { idle: 'Chưa tải', downloading: 'Đang tải mô hình', loading: 'Đang mở mô hình', ready: 'Sẵn sàng · chạy trên thiết bị', error: 'Chưa sẵn sàng', unsupported: 'Không hỗ trợ nền tảng này' };
export default function SettingsScreen() {
  const { model, capture, run, busy, processing, user, cloudSync, setCloudSync, sync, refresh } = useFinance(); const t = useTokens();
  const [packageDraft, setPackages] = useState<string | null>(null);
  const [consentDraft, setConsent] = useState<boolean | null>(null);
  const packages = packageDraft ?? (capture?.packages.length ? capture.packages : DEFAULT_BANK_PACKAGES).join('\n');
  const consent = consentDraft ?? capture?.consent ?? false;
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn'); const [authError, setAuthError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const nativeCapture = isCaptureAvailable(); const cloudAvailable = isFirebaseConfigured();
  const allowedPackages = Array.from(new Set(packages.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)));
  async function saveCapture() {
    setCaptureError(null);
    const list = allowedPackages;
    if (!consent) { setCaptureError('Cần chủ động đồng ý nội dung công bố bên trên trước khi bật thu thập.'); return; }
    if (!list.length || list.some((name) => !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(name))) { setCaptureError('Nhập ít nhất một package Android hợp lệ, mỗi dòng một tên chính xác. Không dùng ký tự đại diện.'); return; }
    const ok = await run(() => configureCapture(true, list), 'Đã lưu đồng ý và danh sách chính xác. Bạn vẫn cần cấp quyền truy cập thông báo trong cài đặt Android.');
    if (ok) { setPackages(null); setConsent(null); }
  }
  async function revoke() {
    const ok = await run(async () => { await configureCapture(false, capture?.packages ?? []); await discardCapturedAlerts(); }, 'Đã thu hồi đồng ý, ngừng thu thập và xóa hàng đợi thông báo. Giao dịch đã ghi vẫn ở trong sổ. Tắt quyền hệ thống ở Android nếu không dùng nữa.');
    if (ok) { setConsent(false); setConfirmRevoke(false); }
  }
  async function authenticate() {
    setAuthError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setAuthError('Nhập địa chỉ email hợp lệ.'); return; }
    if (password.length < 6) { setAuthError('Mật khẩu cần ít nhất 6 ký tự.'); return; }
    const ok = await run(() => authMode === 'signIn' ? signIn(email.trim(), password) : signUp(email.trim(), password), authMode === 'signIn' ? 'Đã đăng nhập. Đồng bộ vẫn do bạn kiểm soát.' : 'Đã tạo tài khoản. Chưa gửi giao dịch lên đám mây.');
    if (ok) setPassword('');
  }
  const modelBusy = model.phase === 'downloading' || model.phase === 'loading';
  const progress = Math.max(0, Math.min(100, Math.round(model.progress * 100)));
  return <Screen title="Riêng tư là mặc định." eyebrow="CÀI ĐẶT & QUYỀN KIỂM SOÁT">
    <Banner>Không cần tài khoản để dùng sổ. Nội dung thông báo, ảnh và suy luận AI ở trên thiết bị. Chỉ các trường giao dịch đã xác nhận được đồng bộ khi bạn đăng nhập, bật cho phép và nhấn đồng bộ.</Banner>
    <Card><Heading small>Mô hình AI trên thiết bị</Heading><Copy tone={model.phase === 'ready' ? 'positive' : 'muted'} style={{ fontWeight: '700' }}>{phaseLabels[model.phase]}</Copy>
      <Copy tone="muted">Gemma 4 E2B cần tải khoảng 2,59 GB qua internet và đủ dung lượng trống/RAM khả dụng. Sau đó, phân tích diễn ra cục bộ khi ứng dụng đang mở. Tất cả kết quả đều cần bạn duyệt.</Copy>
      {modelBusy && <><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={[styles.track, { backgroundColor: t.surfaceAlt }]}><View style={[styles.fill, { backgroundColor: t.primary, width: `${progress}%` }]} /></View><Copy tone="primary">{model.phase === 'downloading' ? `${progress}% đã tải` : 'Đang khởi tạo, vui lòng giữ ứng dụng mở…'}</Copy></>}
      {model.error && <Banner danger>{model.error}</Banner>}
      {model.phase === 'unsupported' ? <Copy tone="muted">AI cần bản dựng native tương thích LiteRT-LM; không chạy trong trình duyệt hoặc Expo Go. Chức năng nhập tay, sổ và ngân sách vẫn dùng được.</Copy> : model.phase === 'ready' ? <Action variant="secondary" label="Đóng mô hình, giải phóng RAM" disabled={busy || processing} onPress={() => { unloadModel(); }} /> : <Action label={modelBusy ? 'Đang chuẩn bị…' : model.phase === 'error' ? 'Thử chuẩn bị lại mô hình' : 'Tải & mở mô hình AI'} disabled={busy || modelBusy} onPress={() => void run(prepareModel, 'Mô hình đã sẵn sàng. Nội dung đang chờ sẽ được phân tích khi ứng dụng mở.')} />}
      <Copy tone="muted">Máy ít RAM: đóng ứng dụng nặng, phân tích từng hóa đơn và đóng mô hình sau khi dùng. Nếu thiếu bộ nhớ, dùng nhập tay; không có suy luận giả hay tự chuyển dữ liệu lên máy chủ.</Copy>
    </Card>
    <Card><Heading small>Thu nhận thông báo ngân hàng</Heading>
      {nativeCapture ? <>
        <Copy tone="positive">{capture?.enabled && capture?.consent ? 'Đang cho phép thu nhận' : 'Chưa bật thu nhận'} · {capture?.pending ?? 0} mục chờ từ Android</Copy>
        <Banner>QUAN TRỌNG — Quyền truy cập thông báo cho phép dịch vụ Android nhìn thấy thông báo ứng dụng. Kesefly chỉ lưu tiêu đề/nội dung từ các package bạn cho phép chính xác bên dưới; bỏ qua ứng dụng khác. Có thể chứa thông tin tài chính cá nhân. Không đọc SMS, không chủ đích lưu OTP, không gửi nội dung thô lên đám mây. Thu nhận có thể tiếp tục khi giao diện đóng; AI chỉ chạy khi bạn mở ứng dụng. Nội dung chờ hết hạn sau 7 ngày, xóa sau xử lý hoặc khi bạn thu hồi đồng ý; Android có thể trì hoãn xóa vật lý khi ứng dụng bị dừng.</Banner>
        <Field label="Danh sách package được phép" help="Mỗi dòng một package Android chính xác. Kiểm tra tên trong thông tin ứng dụng ngân hàng; danh sách mặc định không bảo đảm bao gồm ngân hàng của bạn. Không cho phép theo tên hiển thị hay ký tự đại diện." value={packages} onChangeText={(value) => { setPackages(value); setConsent(false); }} multiline autoCapitalize="none" autoCorrect={false} textAlignVertical="top" style={{ minHeight: 150 }} />
        <Choice label={consent ? 'Tôi đã hiểu và đồng ý thu nhận theo danh sách này' : 'Tôi đồng ý thu nhận thông báo theo công bố trên'} selected={consent} onPress={() => setConsent(!consent)} />
        {captureError && <Banner danger>{captureError}</Banner>}
        <Action label="Lưu đồng ý & danh sách được phép" disabled={busy} onPress={() => void saveCapture()} />
        <Action variant="secondary" label="Mở quyền truy cập thông báo Android" disabled={busy} onPress={() => void run(openCaptureSettings)} />
        <Action variant="secondary" label="Kiểm tra lại quyền hệ thống" disabled={busy} onPress={() => void run(refresh)} />
        <Copy tone="muted">Nếu Android chặn hoạt động nền, bạn có thể kiểm tra tối ưu pin. Kesefly không tự tắt tối ưu pin hoặc tự cấp quyền.</Copy>
        <Action variant="secondary" label="Mở cài đặt pin Android" disabled={busy} onPress={() => void run(openBatterySettings)} />
        {confirmRevoke ? <><Banner danger>Ngừng thu nhận và xóa mọi nội dung thông báo đang chờ? Giao dịch đã lưu không bị xóa. Bạn có thể tắt thêm quyền hệ thống trong cài đặt Android.</Banner><Row><Action compact variant="danger" label="Thu hồi & xóa nội dung chờ" disabled={busy} onPress={() => void revoke()} /><Action compact variant="secondary" label="Giữ cài đặt" onPress={() => setConfirmRevoke(false)} /></Row></> : capture?.consent && <Action variant="danger" label="Thu hồi đồng ý & ngừng thu nhận" disabled={busy} onPress={() => setConfirmRevoke(true)} />}
      </> : <Copy tone="muted">{Platform.OS === 'android' ? 'Thu nhận cần bản dựng phát triển Android có module Kesefly; không có trong Expo Go.' : 'Thu nhận thông báo của ứng dụng khác chỉ hỗ trợ Android. Trên nền tảng này, hãy nhập thủ công hoặc dán nội dung của bạn.'}</Copy>}
    </Card>
    <Card><Heading small>Tài khoản & bản sao đám mây</Heading>
      {!cloudAvailable ? <Copy tone="muted">Firebase chưa được cấu hình cho bản dựng này. Nhóm phát triển cần thiết lập biến môi trường Firebase, bật Email/Password và triển khai Firestore Rules. Sổ cục bộ vẫn hoạt động; không gửi dữ liệu đi.</Copy> : user ? <>
        <Copy style={{ fontWeight: '700' }}>{user.email || 'Tài khoản đã đăng nhập'}</Copy>
        <View style={styles.switchRow}><View style={{ flex: 1, gap: 6 }}><Copy style={{ fontWeight: '700' }}>Cho phép đồng bộ giao dịch</Copy><Copy tone="muted">Không bao gồm thông báo gốc, ảnh, ngân sách hoặc kết quả chưa duyệt.</Copy></View><Switch accessibilityLabel="Cho phép đồng bộ giao dịch" value={cloudSync} disabled={busy} onValueChange={(enabled) => void setCloudSync(enabled)} trackColor={{ false: t.border, true: t.primary }} /></View>
        <Copy tone="muted">Bật công tắc không tự tải lên. Nhấn Đồng bộ ngay để gửi thay đổi đã xác nhận và dấu xóa, nhận dữ liệu từ tài khoản này. Kho dữ liệu cục bộ gắn với tài khoản đồng bộ đầu tiên để tránh gửi nhầm sang tài khoản khác.</Copy>
        <Action label="Đồng bộ ngay" disabled={busy || !cloudSync} onPress={() => void sync()} />
        <Action variant="secondary" label="Đăng xuất & tắt đồng bộ" disabled={busy} onPress={() => void run(async () => { await setSetting('cloudSync', 'false'); await signOut(); }, 'Đã đăng xuất và tắt đồng bộ. Dữ liệu cục bộ vẫn được giữ.')} />
      </> : <>
        <Copy tone="muted">Đăng nhập là tùy chọn. Bạn vẫn phải bật đồng bộ riêng; tạo tài khoản không gửi giao dịch đi.</Copy>
        <Row><Choice label="Đăng nhập" selected={authMode === 'signIn'} onPress={() => setAuthMode('signIn')} /><Choice label="Tạo tài khoản" selected={authMode === 'signUp'} onPress={() => setAuthMode('signUp')} /></Row>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" inputMode="email" autoCapitalize="none" autoComplete="email" />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'} help="Ít nhất 6 ký tự. Cho phép dán và trình quản lý mật khẩu." />
        {authError && <Banner danger>{authError}</Banner>}
        <Action label={authMode === 'signIn' ? 'Đăng nhập bằng email' : 'Tạo tài khoản bằng email'} disabled={busy} onPress={() => void authenticate()} />
      </>}
    </Card>
    <Copy tone="muted" style={{ textAlign: 'center', fontSize: 12 }}>Kesefly · Sổ tài chính riêng của bạn{ '\n' }Sáng / tối theo thiết bị. Không dùng dữ liệu mẫu.</Copy>
  </Screen>;
}
const styles = StyleSheet.create({ track: { height: 8, borderRadius: 8, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 8 }, switchRow: { flexDirection: 'row', gap: 16, alignItems: 'center' } });
