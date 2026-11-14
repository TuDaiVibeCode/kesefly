# Kiểm tra migration OpenAI — 2026-11-14

## Phạm vi lần thay đổi

Chuyển toàn bộ AI sang Firebase callable + OpenAI Responses, giữ manual/ledger offline và Android capture. Loại dependency/plugin/runtime on-device,download UI/modelenv/ARM-only restriction/virtualaddressing entitlement. Input AI qua cloud sau Auth+versionedconsent+chọnmục+xácnhậngửi; không auto upload foreground/paste/login.

## Bằng chứng lần setup trước migration

Local SQLite CRUD/reload/edit/delete,budget,OTPfilter,Rules emulator và responsive UI đã được kiểm tra trong phiên setup. Những kết quả đó **không** chứng minh callable/OpenAI/consent mới hoạt động; cần đối chiếu checks migration bên dưới.

## Checks migration

- `npm run check`: app lint/typecheck và7/7tests pass; warning provider cleanup đã sửa, lint/typecheck chạy lại sạch.
- `npm run functions:build`: pass sau sửa relative shared-source imports; `npm run functions:test`:6/6pass (input/imagebounds,schema/calendar,providerresponse/refusal,idempotency/replay).
- `npm run web:export`: pass,SPA output dist có index/JS/WASM/worker; chưa deploy public host.
- `npx expo prebuild --platform android --no-install`: pass với config không còn runtime AI native; chưa compile/installAPK.
- `npm ls`: không còn react-native-litert-lm/react-native-nitro-modules ở app; openai chỉ trong Functions.
- Firebase Auth/Firestore/Functions emulator khởi động callable thật. REST guard unauthenticated bị401; authenticated input khi provider disabled trả safeAI_UNAVAILABLE,không OpenAIcall.
- Firestore emulator transaction smoke:hai concurrent sameID chỉ1reservation;pending/mismatch/failed replays blocked;completedcache reused;lifetime reservation cap blocked attempt. Script throwaway đã xóa,không mock provideroutput làm live evidence.
- Browser390px:real emulator emailsignup,AI consent bật độc lập trong khi sync vẫnoff;paste chỉ localqueue;chọnmục→confirmation→cancel;explicitconfirm gọi callable thật,providerdisabled giữqueue+genericerror,không tạo transaction. Logout chuyển về consentdisabled/off và loginform. Browserkhông lỗiJS trong luồngđó.
- Firebase Hosting emulator serve đúng production dist/SPA rewrite+headers:manual create25000 khôngAuth→ledger→route `/transaction/<id>`→hardreload vẫn amount25000→deleteconfirmation→sổtrống. Chưa deployhostpublic.
- Browser upload image picker automation không mở được filechooser/không có input để upload trong phiên headless; chưa chứng minh normalize/persistảnh qua UI. Server image MIME/size/base64 validation đã có test,không thay chứng cứ chọnảnh hoặc OpenAIvisionlive.

## Native/APK — Người1, branch feat/native-capture (2026-11-14)

- JS unit tests: `npm test` 9/9 pass sau khi trích `bankPackages.ts` làm nguồn chuẩn package (validator JS khớp pattern native; test mới `tests/nativeCapture.test.ts` chạy RED trước khi trích).
- JVM unit tests `:bank-notifications:testDebugUnitTest`: 13/13 pass (RED quan sát được: 3 class chưa tồn tại → compile fail; sau đó GREEN). Che phủ: OTP/verification luôn loại; promo chỉ loại khi không có bằng chứng giao dịch (memo có "cashback" vẫn qua); fold dấu Việt; package pattern (wildcard/space/segment rỗng bị chặn); debug producer title luôn có marker "không phải ngân hàng thật" và chống newline injection.
- `:app:assembleDebug` BUILD SUCCESSFUL từ commit `dbbcb04`; lần đầu fail `mergeExtDexDebug` OOM heap 1g, pass với `-Xmx4g`. APK `app-debug.apk` (284MB) kiểm tra bằng aapt2: package `com.kesefly.app`, service `BankNotificationListener` với `BIND_NOTIFICATION_LISTENER_SERVICE`, `allowBackup=false`, `fullBackupContent=false`, `dataExtractionRules=@xml/kesefly_data_extraction_rules`, minSdk 24/targetSdk 36, đủ ABI (135 native libs — không còn giới hạn ARM64/GPU).
- `npx expo prebuild --platform android --no-install` pass; config plugin `with-bank-notifications` áp đúng vào manifest generate.
- Thiết bị thật Galaxy S26 (Android 16) qua rdb: cài APK đang chạy (transfer 284MB chậm qua tunnel); kết quả cài + test capture consent/allowlist/persistence/revoke trên thiết bị ghi bổ sung sau khi hoàn tất.

## Chưa xác nhận với dịch vụ thật

- Chưa cung cấp OpenAI API key/Firebase project của đội: chưa live provider call,model access/billing,Functions deploy,production Auth/sync hoặc public Hosting.
- Notification listener trên thiết bị thật (consent/allowlist/persist-before-ack/revoke dọn raw) chưa quan sát trực tiếp trong phiên này; APK đã build nhưng install/device tests đang chạy. `postTestAlert` producer mới, chưa chạy trên device.
- Không có iOS device build: notification capture iOS không thể, manual/text/ảnh vẫn là đường dùng được.
- Chưa chứng nhận production security/AppCheck/account deletion/encrypted-at-rest/PlayPolicy. Một DB sticky owner vẫn local,logout không tự xóa/ẩn ledger/capture.
- Emulator guard/tests không fake OpenAI response và không thay thế live text/vision accuracy test.
