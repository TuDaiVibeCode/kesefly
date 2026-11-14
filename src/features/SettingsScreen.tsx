import { useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { configureCapture, DEFAULT_BANK_PACKAGES, isCaptureAvailable, openBatterySettings, openCaptureSettings } from '@/core/ingestion/nativeCapture';
import { discardCapturedAlerts } from '@/core/ingestion/pipeline';
import { isFirebaseConfigured, signIn, signOut, signUp } from '@/core/firebase/cloud';
import { setSetting } from '@/core/database/repository';
import { AI_CONSENT_VERSION } from '@/types/ai';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Choice, Copy, Field, Heading, Row, Screen } from '@/shared/ui';
import { useTokens } from '@/shared/theme';

export default function SettingsScreen() {
  const { aiConsent, aiConfigured, setAIConsent, capture, run, busy, user, cloudSync, setCloudSync, sync, refresh } = useFinance(); const t = useTokens();
  const [packageDraft, setPackages] = useState<string | null>(null);
  const [consentDraft, setConsent] = useState<boolean | null>(null);
  const packages = packageDraft ?? (capture?.packages.length ? capture.packages : DEFAULT_BANK_PACKAGES).join('\n');
  const consent = consentDraft ?? capture?.consent ?? false;
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn'); const [authError, setAuthError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
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
  return <Screen title="Riêng tư là mặc định." eyebrow="CÀI ĐẶT & QUYỀN KIỂM SOÁT">
    <Banner>Sổ thủ công hoạt động ngoại tuyến, không cần tài khoản. AI là tùy chọn trực tuyến: khi bạn chọn và xác nhận gửi, nội dung thô / ảnh đi qua Firebase đến OpenAI. Đồng ý AI và đồng bộ giao dịch là hai quyền riêng biệt. Mỗi kết quả AI cần duyệt trước khi tính vào tổng.</Banner>
    <Card><Heading small>ChatGPT / OpenAI · phân tích qua đám mây</Heading>
      <Banner>QUAN TRỌNG — Dữ liệu gửi gồm nội dung thông báo / văn bản gốc, ảnh hóa đơn nếu có và thời điểm nhận. Dữ liệu rời thiết bị, đi qua Firebase đến OpenAI để phân tích. Không gửi mật khẩu, mã PIN hoặc OTP. Không thể rút lại yêu cầu đang gửi bằng cách tắt công tắc, đăng xuất hay xóa hàng đợi. Không có phân tích AI khi mất mạng; bạn vẫn nhập tay được.</Banner>
      <Copy tone={aiConsent ? 'positive' : 'muted'}>{aiConsent ? 'Tài khoản hiện tại đã đồng ý AI' : 'Chưa đồng ý AI cho tài khoản hiện tại'} · Phiên bản công bố {AI_CONSENT_VERSION}</Copy>
      {!aiConfigured && <Copy tone="warning">AI chưa được cấu hình cho bản dựng này. Nhóm phát triển cần cấu hình Firebase và triển khai hàm phân tích an toàn; khóa OpenAI chỉ đặt ở máy chủ.</Copy>}
      {!user && <Copy tone="muted">Đăng nhập ở phần tài khoản bên dưới trước khi bật quyền này. Bạn vẫn lưu nội dung trong hàng đợi trên thiết bị mà không cần đăng nhập.</Copy>}
      <View style={styles.switchRow}><View style={{ flex: 1, gap: 6 }}><Copy style={{ fontWeight: '700' }}>Tôi đồng ý gửi nội dung gốc / ảnh qua Firebase đến OpenAI</Copy><Copy tone="muted">Chỉ áp dụng cho tài khoản hiện tại và phiên bản công bố trên. Không đồng nghĩa với cho phép đồng bộ.</Copy></View><Switch accessibilityLabel="Tôi đồng ý gửi nội dung gốc và ảnh qua Firebase đến OpenAI" value={aiConsent} disabled={busy || !user || (!aiConfigured && !aiConsent)} onValueChange={(enabled) => void setAIConsent(enabled)} trackColor={{ false: t.border, true: t.primary }} /></View>
      <Copy tone="muted">Bật quyền không tự gửi. Trong Sổ giao dịch, mở hàng đợi, chọn mục rồi xác nhận gửi đến OpenAI. Ứng dụng không tự gửi khi mở lại, dán văn bản hoặc chọn ảnh. Lỗi gửi giữ nội dung trên thiết bị để bạn thử lại. Tắt quyền ngăn lần gửi tiếp theo, không thu hồi dữ liệu đã gửi.</Copy>
    </Card>
    <Card><Heading small>Thu nhận thông báo ngân hàng</Heading>
      {nativeCapture ? <>
        <Copy tone="positive">{capture?.enabled && capture?.consent ? 'Đang cho phép thu nhận' : 'Chưa bật thu nhận'} · {capture?.pending ?? 0} mục chờ từ Android</Copy>
        <Banner>QUAN TRỌNG — Quyền truy cập thông báo cho phép dịch vụ Android nhìn thấy thông báo ứng dụng. Kesefly chỉ lưu tiêu đề/nội dung từ các package bạn cho phép chính xác bên dưới; bỏ qua ứng dụng khác. Có thể chứa thông tin tài chính cá nhân. Không đọc SMS, không chủ đích lưu OTP. Thu nhận lưu trên thiết bị và có thể tiếp tục khi giao diện đóng; không tự tải lên. Nếu đăng nhập, đồng ý AI riêng và chọn/xác nhận gửi, nội dung thô được chuyển qua Firebase đến OpenAI. Đồng ý thu nhận không phải đồng ý AI hoặc đồng bộ. Nội dung chờ hết hạn sau 7 ngày, xóa trên thiết bị sau xử lý hoặc khi thu hồi đồng ý thu nhận; Android có thể trì hoãn xóa vật lý khi ứng dụng bị dừng. Xóa cục bộ không rút lại yêu cầu đã gửi.</Banner>
        <Field label="Danh sách package được phép" help="Mỗi dòng một package Android chính xác. Kiểm tra tên trong thông tin ứng dụng ngân hàng; danh sách mặc định không bảo đảm bao gồm ngân hàng của bạn. Không cho phép theo tên hiển thị hay ký tự đại diện." value={packages} onChangeText={(value) => { setPackages(value); setConsent(false); }} multiline autoCapitalize="none" autoCorrect={false} textAlignVertical="top" style={{ minHeight: 150 }} />
        <Choice label={consent ? 'Tôi đã hiểu và đồng ý thu nhận theo danh sách này' : 'Tôi đồng ý thu nhận thông báo theo công bố trên'} selected={consent} onPress={() => setConsent(!consent)} />
        {captureError && <Banner danger>{captureError}</Banner>}
        <Action label="Lưu đồng ý & danh sách được phép" disabled={busy} onPress={() => void saveCapture()} />
        <Action variant="secondary" label="Mở quyền truy cập thông báo Android" disabled={busy} onPress={() => void run(openCaptureSettings)} />
        <Action variant="secondary" label="Kiểm tra lại quyền hệ thống" disabled={busy} onPress={() => void run(refresh)} />
        <Copy tone="muted">Nếu Android chặn hoạt động nền, bạn có thể kiểm tra tối ưu pin. Kesefly không tự tắt tối ưu pin hoặc tự cấp quyền.</Copy>
        <Action variant="secondary" label="Mở cài đặt pin Android" disabled={busy} onPress={() => void run(openBatterySettings)} />
        {confirmRevoke ? <><Banner danger>Ngừng thu nhận và xóa mọi nội dung thông báo đang chờ trên thiết bị? Giao dịch đã lưu không bị xóa. Không thể rút lại yêu cầu AI đã gửi. Bạn có thể tắt thêm quyền hệ thống trong cài đặt Android.</Banner><Row><Action compact variant="danger" label="Thu hồi & xóa nội dung chờ" disabled={busy} onPress={() => void revoke()} /><Action compact variant="secondary" label="Giữ cài đặt" onPress={() => setConfirmRevoke(false)} /></Row></> : capture?.consent && <Action variant="danger" label="Thu hồi đồng ý & ngừng thu nhận" disabled={busy} onPress={() => setConfirmRevoke(true)} />}
      </> : <Copy tone="muted">{Platform.OS === 'android' ? 'Thu nhận cần bản dựng phát triển Android có module Kesefly; không có trong Expo Go.' : 'Thu nhận thông báo của ứng dụng khác chỉ hỗ trợ Android. Trên nền tảng này, hãy nhập thủ công hoặc dán nội dung của bạn.'}</Copy>}
    </Card>
    <Card><Heading small>Tài khoản & bản sao đám mây</Heading>
      {!cloudAvailable ? <Copy tone="muted">Firebase chưa được cấu hình cho bản dựng này. Nhóm phát triển cần thiết lập biến môi trường Firebase, bật Email/Password, triển khai hàm AI và Firestore Rules. Sổ cục bộ vẫn hoạt động; AI và đồng bộ chưa khả dụng.</Copy> : user ? <>
        <Copy style={{ fontWeight: '700' }}>{user.email || 'Tài khoản đã đăng nhập'}</Copy>
        <View style={styles.switchRow}><View style={{ flex: 1, gap: 6 }}><Copy style={{ fontWeight: '700' }}>Cho phép đồng bộ giao dịch</Copy><Copy tone="muted">Không bao gồm thông báo gốc, ảnh, ngân sách hoặc kết quả chưa duyệt.</Copy></View><Switch accessibilityLabel="Cho phép đồng bộ giao dịch" value={cloudSync} disabled={busy} onValueChange={(enabled) => void setCloudSync(enabled)} trackColor={{ false: t.border, true: t.primary }} /></View>
        <Copy tone="muted">Bật công tắc không tự tải lên. Nhấn Đồng bộ ngay để gửi các trường giao dịch đã xác nhận và dấu xóa, nhận dữ liệu từ tài khoản này. Quyền đồng bộ độc lập với AI; không đồng bộ nội dung thô hoặc ảnh.</Copy>
        <Banner>Kho dữ liệu trên thiết bị gắn cố định với UID đầu tiên sử dụng AI hoặc đồng bộ, để tránh gửi dữ liệu của một người sang tài khoản khác. Đăng xuất không xóa sổ, ảnh, hàng đợi hoặc tắt thu nhận Android. Đổi email / tài khoản không đổi chủ sở hữu kho; tài khoản UID khác không thể dùng AI hay đồng bộ kho này.</Banner>
        <Action label="Đồng bộ ngay" disabled={busy || !cloudSync} onPress={() => void sync()} />
        {confirmLogout ? <><Banner danger>Đăng xuất và tắt quyền AI / đồng bộ? Sổ, ảnh, hàng đợi và cấu hình thu nhận Android vẫn được giữ trên thiết bị; thu nhận có thể tiếp tục. Yêu cầu AI đã gửi không thể rút lại. Đăng nhập lại cùng UID vẫn cần bật đồng ý AI lần nữa. Tài khoản khác không thể đổi chủ sở hữu kho này.</Banner><Row><Action compact variant="danger" label="Xác nhận đăng xuất" disabled={busy} onPress={() => void run(async () => { await setSetting('cloudSync', 'false'); await signOut(); setConfirmLogout(false); }, 'Đã đăng xuất và tắt quyền AI / đồng bộ. Dữ liệu và cấu hình thu nhận cục bộ vẫn được giữ; yêu cầu AI đã gửi không thể rút lại.')} /><Action compact variant="secondary" label="Giữ đăng nhập" onPress={() => setConfirmLogout(false)} /></Row></> : <Action variant="secondary" label="Đăng xuất & tắt quyền AI / đồng bộ" disabled={busy} onPress={() => setConfirmLogout(true)} />}
      </> : <>
        <Copy tone="muted">Đăng nhập là tùy chọn cho sổ thủ công. AI cần đồng ý riêng và xác nhận từng lần gửi; đồng bộ cũng cần bật riêng. Tạo tài khoản không tự gửi giao dịch hay nội dung gốc.</Copy>
        <Banner>Đăng xuất giữ nguyên sổ và hàng đợi; thu nhận Android có thể tiếp tục. Kho cục bộ gắn với UID đầu tiên dùng AI hoặc đồng bộ. Nếu kho đã có chủ sở hữu, đăng nhập UID khác không cho phép gửi kho đó đến AI hoặc đồng bộ.</Banner>
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
const styles = StyleSheet.create({ switchRow: { flexDirection: 'row', gap: 16, alignItems: 'center' } });
