# Kiểm tra setup — 2026-11-14

## Đã chạy

- `npm run lint`: pass sau sửa draft state/effects và link navigation.
- `npm run typecheck`: pass sau annotation Firestore query và Node test types.
- `npm test`: 7/7 pass — OTP/money filters, amount/schema injection guards, invalid calendar dates, five-minute duplicate candidates, cloud DTO privacy, LWW/tombstone conflicts.
- `npx expo prebuild --platform android --no-install`: pass, CNG sinh native project từ config/local module. Đây không phải bằng chứng APK compile thành công.
- Firestore emulator với project `demo-kesefly`: rules compile và kịch bản REST pass: owner create/read/tombstone; từ chối account khác đọc, rawText field, ngày 29/02 không hợp lệ, physical delete. Script throwaway đã xóa; không chạm Firebase production.
- Browser Chromium viewport390×844: app mở không lỗi startup; tạo giao dịch VND thật trong SQLite WASM, reload vẫn còn, sửa65000→70000, đặt ngân sách1000000 và reload còn930000, xóa có confirmation/tombstone và sổ trở về0 giao dịch. Nội dung kiểm thử là tổng hợp, không raw bank data thật.
- Settings không có Firebase config hiển thị local-only; model web unsupported rõ ràng.
- Browser375px light/reduced-motion,844px landscape/dark và1024px tablet/light: navigation links56px cao, landscape không horizontal overflow. OTP bị từ chối trên UI; thông báo tổng hợp được queue qua reload và discard sau confirmation về0 mục. Web không giả chạy AI. Đã dọn giao dịch/ngân sách/raw text tổng hợp sau smoke.

## Cần thiết bị/tài khoản để xác nhận

- `adb devices -l` không có thiết bị kết nối trong phiên setup. Chưa xác nhận listener khi background/reboot/OEM kill, model load/GPU/vision, memory pressure và backup flag trên điện thoại.
- Đã thử `:app:assembleDebug`; chưa tạo APK. Máy chỉ có Android SDK35/36.1, không có SDK37 hay NDK. Gradle đang tải toolchain được dừng; không tự cài system tools. Dùng EAS hoặc cài SDK/NDK theo Expo/RN58 trước khi build local. CNG plugin đã kiểm tra target ABI `arm64-v8a` (binding chỉ hỗ trợ ARM64).
- Không có Firebase project credentials của đội: chưa đăng nhập/sync production, chưa deploy rules lên project thật. Emulator không thay thế bước này.
- iOS signing/build/runtime cần macOS hoặc EAS + Apple provisioning; chưa chạy trong môi trường Windows này.
- Chưa chứng nhận policy Play/Apple, security production, encrypted-at-rest database, data deletion flow hoặc hiệu năng trên mọi máy.

Tách rõ: lint/typecheck/web/database/rules đã kiểm tra; native inference/capture thực tế chưa được chứng minh bằng UI web.
