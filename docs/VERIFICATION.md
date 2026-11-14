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

## Chưa xác nhận với dịch vụ thật

- Chưa cung cấp OpenAI API key/Firebase project của đội: chưa live provider call,model access/billing,Functions deploy,production Auth/sync hoặc public Hosting.
- Không có Android/iOS device build trong phiên migration: notification listener/OEM/background/backup và APK cài được chưa xác nhận. Expo prebuild không thay assemble/install.
- Chưa chứng nhận production security/AppCheck/account deletion/encrypted-at-rest/PlayPolicy. Một DB sticky owner vẫn local,logout không tự xóa/ẩn ledger/capture.
- Emulator guard/tests không fake OpenAI response và không thay thế live text/vision accuracy test.
