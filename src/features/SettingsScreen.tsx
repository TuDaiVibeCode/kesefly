import { useState } from 'react';
import Constants from 'expo-constants';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { configureCapture, DEFAULT_BANK_PACKAGES, isCaptureAvailable, openBatterySettings, openCaptureSettings } from '@/core/ingestion/nativeCapture';
import { discardCapturedAlerts } from '@/core/ingestion/pipeline';
import { isFirebaseConfigured, signIn, signOut, signUp } from '@/core/firebase/cloud';
import { setSetting } from '@/core/database/repository';
import { useFinance } from './FinanceProvider';
import { Action, Banner, Card, Choice, Copy, Field, Heading, Row, Screen } from '@/shared/ui';
import { useAppearance } from '@/shared/AppThemeProvider';
import { useTokens } from '@/shared/theme';

const bankApps = [
  { name: 'Vietcombank', packageName: 'com.VCB' },
  { name: 'BIDV', packageName: 'com.vnpay.bidv' },
  { name: 'MB Bank', packageName: 'com.mbmobile' },
  { name: 'Techcombank', packageName: 'com.techcombank.retail' },
  { name: 'VietinBank', packageName: 'com.vietinbank.ipay' },
] as const;
const curatedPackages = new Set<string>(bankApps.map((bank) => bank.packageName));

export default function SettingsScreen() {
  const { aiConsent, aiConfigured, setAIConsent, capture, run, busy, user, cloudSync, setCloudSync, sync, refresh } = useFinance(); const t = useTokens();
  const { preference, setPreference, storageError: appearanceError } = useAppearance();
  const [packageDraft, setPackageDraft] = useState<string[] | null>(null);
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [consentDraft, setConsent] = useState<boolean | null>(null);
  const savedPackages = capture?.packages.length ? capture.packages : DEFAULT_BANK_PACKAGES;
  const chosenPackages = packageDraft ?? savedPackages;
  const customValue = customDraft ?? chosenPackages.filter((name) => !curatedPackages.has(name)).join('\n');
  const customPackages = customValue.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  const allowedPackages = Array.from(new Set([...chosenPackages.filter((name) => curatedPackages.has(name)), ...customPackages]));
  const showCustom = customOpen || customPackages.length > 0;
  const consent = consentDraft ?? capture?.consent ?? false;
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn'); const [authError, setAuthError] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const nativeCapture = isCaptureAvailable(); const cloudAvailable = isFirebaseConfigured();
  function toggleBank(packageName: string) {
    const current = packageDraft ?? savedPackages;
    setPackageDraft(current.includes(packageName) ? current.filter((entry) => entry !== packageName) : [...current, packageName]);
    setConsent(false);
  }
  async function saveCapture() {
    setCaptureError(null);
    if (!consent) { setCaptureError('Cần đánh dấu đồng ý trước khi bật đọc thông báo.'); return; }
    if (!allowedPackages.length) { setCaptureError('Chọn ít nhất một ngân hàng hoặc nhập mã ứng dụng khác.'); return; }
    if (allowedPackages.some((name) => !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(name))) { setCaptureError('Mã ứng dụng chưa đúng. Mã có dạng com.ten.nganhang, mỗi dòng một mã.'); return; }
    const ok = await run(() => configureCapture(true, allowedPackages), 'Đã lưu lựa chọn. Bạn vẫn cần cho phép Kesefly đọc thông báo trong cài đặt Android.');
    if (ok) { setPackageDraft(null); setCustomDraft(null); setConsent(null); }
  }
  async function revoke() {
    const ok = await run(async () => { await configureCapture(false, capture?.packages ?? []); await discardCapturedAlerts(); }, 'Đã tắt đọc thông báo và xóa các mục đang chờ. Giao dịch đã ghi vẫn còn trong sổ.');
    if (ok) { setConsent(false); setConfirmRevoke(false); }
  }
  async function authenticate() {
    setAuthError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setAuthError('Nhập địa chỉ email hợp lệ.'); return; }
    if (password.length < 6) { setAuthError('Mật khẩu cần ít nhất 6 ký tự.'); return; }
    const ok = await run(() => authMode === 'signIn' ? signIn(email.trim(), password) : signUp(email.trim(), password), authMode === 'signIn' ? 'Đã đăng nhập. Đồng bộ vẫn do bạn kiểm soát.' : 'Đã tạo tài khoản. Chưa gửi giao dịch lên đám mây.');
    if (ok) setPassword('');
  }
  return <Screen title="Tùy chọn của bạn">
    <Banner>Bạn có thể ghi chi tiêu không cần tài khoản. Các tính năng bên dưới chỉ bật khi bạn chọn.</Banner>
    <Card><Heading small>Giao diện</Heading>
      <Copy tone="muted">Chọn cách Kesefly hiển thị. Thay đổi được áp dụng ngay và ghi nhớ cho lần mở sau.</Copy>
      <Row><Choice label="Theo hệ thống" selected={preference === 'system'} onPress={() => setPreference('system')} /><Choice label="Sáng" selected={preference === 'light'} onPress={() => setPreference('light')} /><Choice label="Tối" selected={preference === 'dark'} onPress={() => setPreference('dark')} /></Row>
      {appearanceError && <Banner danger>{appearanceError}</Banner>}
    </Card>
    <Card><Heading small>Đọc hóa đơn tự động</Heading>
      {!aiConfigured && !aiConsent ? <Copy tone="muted">Tính năng này chưa khả dụng. Bạn vẫn có thể nhập giao dịch bằng tay.</Copy> : <>
      <Banner>Khi bạn xác nhận gửi, nội dung và ảnh được chuyển qua máy chủ Express của nhóm phát triển đến OpenAI để đọc giao dịch. Cần có mạng. Không gửi mật khẩu, PIN hay OTP. Bạn kiểm tra kết quả trước khi ghi sổ.</Banner>
      <Copy tone={aiConsent ? 'positive' : 'muted'}>{aiConsent ? 'Đã cho phép đọc tự động' : 'Chưa cho phép đọc tự động'}</Copy>
      {!user && <Copy tone="muted">Đăng nhập để bật tính năng này.</Copy>}
      <View style={styles.switchRow}><View style={{ flex: 1, gap: 6 }}><Copy style={{ fontWeight: '700' }}>Cho phép đọc nội dung và ảnh</Copy><Copy tone="muted">Chỉ áp dụng cho tài khoản này. Đồng bộ giao dịch được bật riêng.</Copy></View><Switch accessibilityLabel="Cho phép đọc nội dung và ảnh" value={aiConsent} disabled={busy || !user || (!aiConfigured && !aiConsent)} onValueChange={(enabled) => void setAIConsent(enabled)} trackColor={{ false: t.border, true: t.primary }} /></View>
      <Copy tone="muted">Kesefly không tự gửi. Mở Giao dịch, vào Chờ xử lý, chọn mục rồi xác nhận. Tắt tùy chọn này sẽ ngăn lần gửi tiếp theo.</Copy>
      </>}
    </Card>
    <Card><Heading small>Đọc thông báo ngân hàng</Heading>
      {nativeCapture ? <>
        <Copy tone={capture?.enabled && capture?.consent ? 'positive' : 'muted'}>{capture?.enabled && capture?.consent ? 'Đang đọc thông báo' : 'Chưa bật đọc thông báo'}{capture?.pending ? ` · ${capture.pending} mục đang chờ` : ''}</Copy>
        <Banner>Android cho phép Kesefly xem thông báo. Kesefly chỉ lưu thông báo từ các ứng dụng bạn chọn bên dưới; ứng dụng khác bị bỏ qua. Nội dung có thể chứa số tiền và số tài khoản. Không đọc SMS hay OTP. Mục đang chờ được giữ trên máy tối đa 7 ngày và chỉ gửi đi khi bạn tự chọn.</Banner>
        <Copy style={styles.label}>Ngân hàng đang dùng</Copy>
        <Row>{bankApps.map((bank) => <Choice key={bank.packageName} label={bank.name} selected={chosenPackages.includes(bank.packageName)} disabled={busy} onPress={() => toggleBank(bank.packageName)} />)}</Row>
        <Copy tone="muted" style={styles.small}>Chỉ thông báo từ các ứng dụng này được đọc. Đổi danh sách sẽ cần xác nhận đồng ý lại.</Copy>
        {showCustom ? <>
          <Field label="Mã ứng dụng của ngân hàng khác" help="Chỉ dùng khi ngân hàng chưa có ở trên. Mã có dạng com.ten.nganhang, mỗi dòng một mã." value={customValue} onChangeText={(value) => { setCustomDraft(value); setConsent(false); }} multiline autoCapitalize="none" autoCorrect={false} textAlignVertical="top" style={{ minHeight: 100 }} />
          {!customDraft && !customPackages.length && <Action variant="secondary" label="Ẩn phần nhập mã" onPress={() => setCustomOpen(false)} />}
        </> : <Action variant="secondary" label="Thêm ngân hàng khác" onPress={() => setCustomOpen(true)} />}
        <Choice label="Tôi đồng ý cho Kesefly đọc thông báo của các ứng dụng đã chọn" selected={consent} onPress={() => setConsent(!consent)} />
        {captureError && <Banner danger>{captureError}</Banner>}
        <Action label="Lưu lựa chọn" disabled={busy} onPress={() => void saveCapture()} />
        <Action variant="secondary" label="Mở quyền đọc thông báo" disabled={busy} onPress={() => void run(openCaptureSettings)} />
        <Action variant="secondary" label="Kiểm tra lại" disabled={busy} onPress={() => void run(refresh)} />
        <Copy tone="muted" style={styles.small}>Nếu thông báo không đến khi ứng dụng đóng, kiểm tra tối ưu pin. Kesefly không tự tắt tối ưu pin hoặc tự cấp quyền.</Copy>
        <Action variant="secondary" label="Mở cài đặt pin" disabled={busy} onPress={() => void run(openBatterySettings)} />
        {confirmRevoke ? <><Banner danger>Tắt đọc thông báo và xóa các mục đang chờ? Giao dịch đã ghi vẫn còn. Yêu cầu đã gửi không thể thu hồi.</Banner><Row><Action compact variant="danger" label="Tắt và xóa mục chờ" disabled={busy} onPress={() => void revoke()} /><Action compact variant="secondary" label="Giữ cài đặt" onPress={() => setConfirmRevoke(false)} /></Row></> : capture?.consent && <Action variant="danger" label="Tắt đọc thông báo" disabled={busy} onPress={() => setConfirmRevoke(true)} />}
      </> : <Copy tone="muted">{Platform.OS === 'android' ? 'Tính năng đọc thông báo chỉ có trong bản cài đặt Android của Kesefly. Bạn vẫn có thể nhập giao dịch bằng tay.' : 'Tính năng đọc thông báo chỉ có trên Android. Trên nền tảng này, bạn hãy nhập thủ công hoặc dán nội dung.'}</Copy>}
    </Card>
    <Card><Heading small>Tài khoản và đồng bộ</Heading>
      {!cloudAvailable ? <Copy tone="muted">Đăng nhập và đồng bộ chưa khả dụng. Bạn vẫn có thể ghi chi tiêu bình thường.</Copy> : user ? <>
        <Copy style={{ fontWeight: '700' }}>{user.email || 'Tài khoản đã đăng nhập'}</Copy>
        <View style={styles.switchRow}><View style={{ flex: 1, gap: 6 }}><Copy style={{ fontWeight: '700' }}>Đồng bộ giao dịch đã xác nhận</Copy><Copy tone="muted">Không gửi nội dung gốc, ảnh, ngân sách hay kết quả chưa duyệt.</Copy></View><Switch accessibilityLabel="Đồng bộ giao dịch đã xác nhận" value={cloudSync} disabled={busy} onValueChange={(enabled) => void setCloudSync(enabled)} trackColor={{ false: t.border, true: t.primary }} /></View>
        <Copy tone="muted">Bật công tắc chưa tự gửi. Nhấn Đồng bộ ngay để cập nhật, kể cả giao dịch đã xóa. Đồng bộ độc lập với đọc hóa đơn.</Copy>
        <Banner>Sổ trên máy này gắn với tài khoản đầu tiên dùng đọc hóa đơn hoặc đồng bộ. Đăng xuất không xóa sổ, ảnh hay hàng đợi. Tài khoản khác không dùng chung sổ này.</Banner>
        <Action label="Đồng bộ ngay" disabled={busy || !cloudSync} onPress={() => void sync()} />
        {confirmLogout ? <><Banner danger>Đăng xuất và tắt đọc hóa đơn, đồng bộ? Sổ, ảnh và hàng đợi vẫn ở trên máy. Yêu cầu đã gửi không thể thu hồi.</Banner><Row><Action compact variant="danger" label="Xác nhận đăng xuất" disabled={busy} onPress={() => void run(async () => { await setSetting('cloudSync', 'false'); await signOut(); setConfirmLogout(false); }, 'Đã đăng xuất. Sổ và hàng đợi vẫn ở trên máy.')} /><Action compact variant="secondary" label="Giữ đăng nhập" onPress={() => setConfirmLogout(false)} /></Row></> : <Action variant="secondary" label="Đăng xuất" disabled={busy} onPress={() => setConfirmLogout(true)} />}
      </> : <>
        <Copy tone="muted">Đăng nhập để dùng đọc hóa đơn và đồng bộ. Ghi chi tiêu bằng tay vẫn không cần tài khoản.</Copy>
        <Banner>Sổ trên máy này sẽ gắn với tài khoản đầu tiên đăng nhập. Sau đó tài khoản khác không dùng chung sổ này.</Banner>
        <Row><Choice label="Đăng nhập" selected={authMode === 'signIn'} onPress={() => setAuthMode('signIn')} /><Choice label="Tạo tài khoản" selected={authMode === 'signUp'} onPress={() => setAuthMode('signUp')} /></Row>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" inputMode="email" autoCapitalize="none" autoComplete="email" />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'} help="Ít nhất 6 ký tự. Bạn có thể dán từ trình quản lý mật khẩu." />
        {authError && <Banner danger>{authError}</Banner>}
        <Action label={authMode === 'signIn' ? 'Đăng nhập bằng email' : 'Tạo tài khoản bằng email'} disabled={busy} onPress={() => void authenticate()} />
      </>}
    </Card>
    <Card><Heading small>Ứng dụng</Heading>
      <Copy style={{ fontWeight: '700' }}>Kesefly {Constants.expoConfig?.version ?? '1.0.0'}</Copy>
      <Copy tone="muted">Ứng dụng quản lý chi tiêu cá nhân và hộ gia đình. Giao diện tiếng Việt, đơn vị VND.</Copy>
      <Copy tone="muted">Sổ giao dịch, ngân sách và tùy chọn giao diện được lưu trên thiết bị này. Đồng bộ đám mây chỉ chạy khi bạn đăng nhập, bật đồng bộ và tự nhấn Đồng bộ ngay.</Copy>
      <Copy tone="muted">Nền tảng hiện tại: {Platform.OS === 'android' ? `Android ${Platform.Version}` : Platform.OS}. Không gửi dữ liệu đến dịch vụ khác nếu bạn không chủ động xác nhận.</Copy>
    </Card>
    <Copy tone="muted" style={{ textAlign: 'center', fontSize: 12 }}>Kesefly · Chi tiêu rõ ràng hơn</Copy>
  </Screen>;
}
const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  label: { fontSize: 14, lineHeight: 21, fontWeight: '600' },
  small: { fontSize: 12, lineHeight: 19 },
});
