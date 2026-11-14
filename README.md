# Kesefly

Ứng dụng theo dõi chi tiêu **offline-first**, Expo SDK 58 / React Native / SQLite. Gemma 4 E2B qua LiteRT-LM phân tích thông báo và ảnh **trên thiết bị**. Firebase chỉ đồng bộ field giao dịch đã xác nhận khi người dùng chủ động bật và bấm đồng bộ.

## Chạy ngay cho cả đội

Yêu cầu Node **22.19.0**, npm. Repository dùng `package-lock.json`, không dùng Bun/Yarn.

```bash
npm ci
npm run web
```

Web dùng SQLite thật: thêm/sửa/xóa giao dịch VND, tổng hợp chi tiêu, ngân sách. Không cần Firebase hay model để nhập tay. Web không có LiteRT-LM và không thể capture notification Android. Không có giao dịch giả tự seed.

Trên Windows PowerShell, cấu hình Firebase tùy chọn:

```powershell
Copy-Item .env.example .env
```

Điền config client rồi restart Metro. `EXPO_PUBLIC_*` được đóng vào bundle, **không phải secret store**. Không điền service account, token Hugging Face hoặc private signed URL.

## Android: notification capture + inference thật

**Không chạy bằng Expo Go.** LiteRT/Nitro và local Expo module cần development build ARM. Thiết bị Android thật được khuyến nghị; x86_64 emulator không chạy inference.

Local build cần Android SDK/JDK21, bật USB debugging và kiểm tra `adb devices`:

```bash
npm run android
```

Không có môi trường build native thì dùng EAS; người sở hữu đăng nhập Expo và liên kết project trước:

```bash
npx eas-cli login
npx eas-cli init
npm run build:android:dev
```

Cài APK, chạy `npx expo start --dev-client`. Profile `preview` tạo APK internal chạy không cần Metro (`npm run build:android:preview`). Firebase env cần cấu hình trong Expo project environment tương ứng hoặc file `.env` theo quy trình build của đội; thay biến trong development không cập nhật APK preview đã build.

Trong Cài đặt của app:

1. Đọc disclosure, chỉnh **package ID chính xác** của ngân hàng cài trên máy; danh sách gợi ý không phải cam kết mọi phiên bản bank app đều dùng cùng ID.
2. Bật consent capture rồi cấp Notification access trong Settings hệ thống. Không cần READ_SMS.
3. Tải/mở model qua Wi-Fi: **2,588,147,712 bytes (~2.59 GB)**, cần đủ storage và RAM khả dụng. Progress/hash verification có sẵn; model load có thể bị từ chối trên máy thiếu RAM.
4. Notification được ghi vào SQLite native ngay cả khi JS không chạy. Mở app để import và phân tích theo lô; không tự load model nhiều GB trong background service.
5. Kết quả nằm trong **cần kiểm tra**; sửa/xác nhận trước khi đưa vào tổng tiền hay cloud. Cảnh báo nghi trùng không tự xóa giao dịch.

Model pin revision/SHA-256 trong `src/core/ai/engine.ts`. Để đổi artifact, đặt đồng thời `EXPO_PUBLIC_MODEL_URL` HTTPS và `EXPO_PUBLIC_MODEL_SHA256` đã xác minh. Không commit weights; native ModelRegistry tải/cache và resume. Cache có thể bị OS dọn.

## iOS

Build qua macOS/Xcode (`npm run ios`) hoặc `npx eas-cli build --platform ios --profile development`. Signing cần Apple account/provisioning; model >2GB dùng entitlement extended virtual addressing đã khai báo, thư viện yêu cầu paid Apple Developer provisioning cho entitlement này. Kiểm tra support trên thiết bị thật trước cuộc thi.

iOS **không** đọc notification ngân hàng app khác. App có nhập văn bản và chọn ảnh giao dịch để phân tích local. Không có Shortcuts App Intent, email IMAP/webhook hoặc share extension trong bản này; không quảng cáo những đường đó như đã triển khai. iOS privacy helper loại private app data khỏi backup và yêu cầu native build.

## Firebase tùy chọn

1. Tạo Firebase project, đăng ký **Web app** và điền 4 biến bắt buộc API_KEY/AUTH_DOMAIN/PROJECT_ID/APP_ID trong `.env` theo template.
2. Authentication → Sign-in method → bật Email/Password. Đặt authorized domains nếu chạy web.
3. Tạo default Cloud Firestore database, **production mode**, chọn region cho đội.
4. Deploy rules trước khi demo sync:

```bash
npx firebase-tools login
npx firebase-tools deploy --project YOUR_PROJECT_ID --only firestore
```

5. Đăng ký/đăng nhập trong app, bật đồng bộ rồi bấm **Đồng bộ ngay**. Không tự upload khi app mở. Mỗi account chỉ đọc/ghi `users/{uid}/transactions/{id}`.

Không cần Firebase Storage cho model mặc định. `storage.rules` deny all, không upload receipt. Nếu đã provision Storage, deploy riêng `--only storage`. Không mở rules kiểu `allow read, write: if true`.

Local database gắn UID đầu tiên được sync. Đổi account không được tự upload dữ liệu account cũ: đăng nhập lại account đầu tiên hoặc xóa app data để dùng account khác. Logout không xóa giao dịch local; cloud admin vẫn có thể đọc giao dịch đã sync. Chưa có account-deletion/password-reset UI, App Check hay end-to-end encryption.

## Cấu trúc

```text
src/app/                         Expo Router route wrappers, layout
src/features/                    Screens, forms, FinanceProvider
src/shared/                      Theme tokens, accessible UI primitives
src/types/transaction.ts         Shared data contract
src/core/ai/                     Gemma lifecycle, prompt/schema, validation
src/core/ingestion/              Filter, durable import, queue processing, dedupe candidates
src/core/database/               SQLite schema/repository, tombstones, settings
src/core/firebase/               Persistent auth, allowlisted cloud DTO, LWW sync
modules/bank-notifications/      Native Kotlin capture queue + Swift backup exclusion
plugins/                        CNG backup configuration
tests/                          Deterministic financial/privacy edge cases
.github/workflows/checks.yml     Lint + typecheck + tests
```

Không tạo `App.tsx`/`RootNavigator.tsx` trong `src/app`: mọi file ở đó là route. Native root `android/`, `ios/` được generate, không sửa tay; config plugins/local modules là nguồn chuẩn.

## Kiểm tra và demo

```bash
npm run lint
npm run typecheck
npm test
# hoặc
npm run check
```

Demo không phụ thuộc model: thêm giao dịch chi VND → dashboard → tạo ngân sách → sửa/xóa → reload để kiểm tra persistence. Demo AI thật phải dùng ARM development build, tải model rồi paste notification tổng hợp có amount/direction/merchant hoặc chọn ảnh. Không đánh đồng UI web hoạt động với inference/listener native đã được kiểm chứng.

Web SQLite cần COOP/COEP headers (`metro.config.js`); hosting production cũng phải gửi hai headers đó. `expo-router` plugin đã cấu hình header cho Expo Hosting; nếu host static khác, tự thêm headers của host.

## Đưa lên GitHub

Code/config/lockfile có thể push; `.env`, service accounts, model weights và generated native directories đã ignore. Tạo repo/remote và invite đội bằng tài khoản của bạn, không có remote được tự tạo hay push bởi setup này.

Đọc [quy trình cả đội](docs/TEAM.md) và [kiến trúc/giới hạn riêng tư](docs/ARCHITECTURE.md) trước khi thay đổi capture/sync. Đây là nền tảng chạy được cho đội phát triển, **không phải chứng nhận production/Play policy**. Trước phát hành công khai cần kiểm thử device/OEM, disclosure và privacy policy, audit backup/encryption/account deletion, xác minh policy Play/Apple hiện hành và license model.

Kết quả kiểm tra setup và các phần chưa được chứng minh trên thiết bị: [VERIFICATION.md](docs/VERIFICATION.md).
