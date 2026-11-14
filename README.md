# Kesefly

Sổ chi tiêu offline-first bằng Expo SDK58 / React Native / SQLite. **AI dùng OpenAI API qua Firebase Cloud Functions**, không chạy model trên điện thoại. Nhập tay offline không cần tài khoản; AI cần mạng, Firebase Auth và người dùng đồng ý gửi input. Không có dữ liệu giả tự seed.

## Chạy local

Node22.19.0 và npm, dùng lockfiles của repo:

```bash
npm ci
npm ci --prefix functions
npm run functions:build
npm run web
```

Manual CRUD/dashboard/budget dùng được dù chưa cấu hình cloud. Web dùng SQLite WASM thật; Metro đã có COOP/COEP. Mobile capture/backup helper cần development build, không phải Expo Go.

## Keys cần setup

Copy `.env.example` → `.env`, điền Firebase Console → Project settings → Your apps → Web app SDK config:

| Biến client | Giá trị |
| --- | --- |
| EXPO_PUBLIC_FIREBASE_API_KEY | apiKey |
| EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | authDomain |
| EXPO_PUBLIC_FIREBASE_PROJECT_ID | projectId |
| EXPO_PUBLIC_FIREBASE_APP_ID | appId |
| EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION | asia-southeast1 mặc định |

Public Firebase config được đóng trong bundle, không phải secret. Không cần Storage bucket/FCM server key cho AI hoặc capture. Không thêm service account hoặc OpenAI key vào app. Restart Metro/rebuild APK/re-export web sau đổi config.

**Secret server duy nhất cho provider: OPENAI_API_KEY.** Tạo từ OpenAI API project có billing/quota; ChatGPT subscription hoặc credit coding agent không tự cấp API credit. Không paste key vào chat,repo,URL hoặc EXPO_PUBLIC.

## Firebase + OpenAI deploy

1. Tạo/chọn project chung, bật Email/Password Auth, default Firestore production mode, authorized domains cho web. Cloud Functions cần Blaze/IAM/API được bật theo Firebase CLI.
2. Đọc `functions/.env.example`; server chỉ chấp nhận model mặc định `gpt-6-luna`, region asia-southeast1. Không client-select model hoặc tự fallback provider.
3. Cài secret qua prompt CLI và deploy:

```bash
npx firebase-tools login
npx firebase-tools functions:secrets:set OPENAI_API_KEY --project YOUR_PROJECT_ID
npm run functions:build
npx firebase-tools deploy --project YOUR_PROJECT_ID --only firestore,functions
```

4. Đăng ký/đăng nhập app → đọc disclosure và bật **AI cloud** → dán text/chọn ảnh (chỉ lưu local) → mở Hàng đợi → chọn mục → xác nhận gửi Firebase→OpenAI → kiểm tra/sửa bản nháp → xác nhận giao dịch.
5. **Đồng bộ ledger là consent riêng.** Bật sync rồi bấm Đồng bộ ngay mới gửi confirmed fields/tombstones tới Firestore. AI vẫn chạy được khi sync ledger tắt.

Raw text/ảnh được chọn gửi rời thiết bị. Backend không lưu raw trong Firestore/Storage/log app; structured AI result cache tồn tại tối đa7ngày theo logical expiry, vẫn là dữ liệu tài chính nhạy cảm. Configure TTL `expiresAt` cho collection group `_aiResults` trong Firestore; không bật TTL/delete `_aiRequests` vì tombstones chống duplicate billed call. `store:false` không cam kết zero retention phía OpenAI. Tắt consent không thu hồi request đã gửi.

Quota backend100calls/UID/ngày,1000project/ngày; reservation0.02USD/attempt với cap5USD tích lũy không auto refund/reset. Đây là conservative reservation/attempt ceiling, không bảo đảm hóa đơn OpenAI/Firebase/network. Request cùng ID/payload chỉ có tối đa một provider attempt; terminal failure/expired cần input mới do người dùng chủ động, không retry tự tạoID. Tham khảo `functions/.env.example` và code limits trước demo.

## Android/iOS

```bash
# Local SDK/JDK21 toolchain sẵn có
npm run android
# hoặc EAS
npx eas-cli login
npx eas-cli init
npm run build:android:dev
```

Cài APK development rồi `npx expo start --dev-client`. Preview APK không cần Metro: `npm run build:android:preview`. Liên kết **một Expo project** cho cả đội, set public Firebase env giống nhau trong development/preview. Không còn tải weights hoặc yêu cầu ARM64 riêng do AI.

Android: disclosure capture → exact package allowlist → cấp Notification access trong Settings. Native queue persist dù JS chưa chạy, import vào SQLite khi app mở; **không tự gửi AI**. Permission/OEM/force-stop có thể làm mất event chưa được OS giao. Không READ_SMS. Revoke consent dọn native+imported notification queue.

iOS không đọc notification app khác; dùng manual/text/ảnh. Build qua macOS hoặc EAS+Apple signing. Native helper exclude backup cần build thật; không còn entitlement tăng bộ nhớ cho AI. Không có Shortcuts/IMAP/share extension được giả nhận là đã có.

## Public website

```bash
npm run web:export
npx firebase-tools deploy --project YOUR_PROJECT_ID --only hosting
```

App dùng SPA output single,hosting public dist/rewrite index và COOP same-origin/COEP credentialless. Firebase Hosting config trong `firebase.json`; không đồng nhất headers Metro với hosting. Test HTTPS,WASM,Auth và refresh `/transaction/<id>` sau deploy.

## Local emulators

Chỉ bật `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` với public demo Firebase config (`demo-kesefly`), loopback hosts theo template. Backend mặc định không gọi OpenAI trong emulator. Tạo file ignored `functions/.secret.local` với `OPENAI_API_KEY=` rỗng để guard tests không truy cập production Secret Manager.

```bash
npm run functions:build
npx firebase-tools emulators:start --project demo-kesefly --only auth,firestore,functions
```

Native Android dùng adb reverse9099/8080/5001 khi cần localhost. Live emulator call chỉ khi chủ động bật server `OPENAI_ALLOW_EMULATOR_LIVE=true` và cung cấp key thật; không bật trong CI. Không fake provider response rồi gọi đó là OpenAI live verification.

## Dữ liệu và giới hạn

- SQLite,queue,review,manual và budget vẫn offline; AI không offline. Chỉ confirmed chưa xóa vào tổng; mọi kết quả AI cần người dùng kiểm tra.
- Raw local hết hạn7ngày,dọn khi app hoạt động; ảnh normalized JPEG tối đa2MiB,không external URL. Parse success/discard xóa raw local. OS có thể trì hoãn xóa vật lý.
- Một database thiết bị gắn UID cloud đầu tiên (AI hoặc sync). Logout tắt AI/sync nhưng giữ local ledger/capture. Tài khoản khác bị chặn dùng dữ liệu đó cho cloud; chưa có per-account encrypted database/reset UX. Không dùng máy chia sẻ như thể logout xóa dữ liệu.
- Budget một hạn mức local áp dụng mỗi tháng,không per-month sync. SQLite chưa SQLCipher. Chưa account-deletion/password-reset UI,App Check enforcement hoặc E2E encryption; cần đánh giá trước public production.

## Cấu trúc và kiểm tra

`src/app` route wrappers; `src/features` UI/provider; `src/core/database` ledger; `src/core/ingestion` capture import/queue; `src/core/ai` consent/callable adapter/validator; `src/core/firebase` Auth/sync; `functions` provider+quota server; `modules/bank-notifications` Kotlin/Swift. Root android/ios generated,không sửa tay/commit.

```bash
npm run check
npm run functions:build
npm run functions:test
```

CI chạy cả app và server checks. Tests/emulator không chứng minh credentials/model access hoặc notification trên điện thoại. Bằng chứng thực tế ghi [VERIFICATION](docs/VERIFICATION.md).

Chia việc4người và prompt: [PLAN.md](PLAN.md). Quy trình Git: [TEAM](docs/TEAM.md). Privacy/data: [ARCHITECTURE](docs/ARCHITECTURE.md). Không tự tạo remote/commit/push; owner repo invite đội,commit code/config/lockfiles nhưng không secrets/raw data/generated binaries.
