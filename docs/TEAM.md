# Làm việc cùng đội

## Chia phần việc cho4người

**Bảng ownership và prompt giao việc duy nhất nằm trong [PLAN.md](../PLAN.md),mục2/4/8.** Vai trò1 native/APK,2OpenAI backend/parser,3data/Auth/sync/client/deploy,4UI/integration. Không sao chép bảng thứ hai lệch owner.

Giữ SQLite/Expo58/code sẵn có. Mỗi owner sửa đúng vùng,PR nhỏ,contract delta thống nhất trước. Root package/lockfile người4; Functions package/lockfile người2; Settings người4; FinanceProvider người3. Native root android/ios được generate,sửa configplugin/module rồi rebuild.

## GitHub

1. Người sở hữu tạo repository, invite collaborator; repo này chưa tự tạo remote hay push.
2. Tạo branch: `git switch -c feat/ten-tinh-nang`.
3. Chạy `npm ci`, sao chép `.env.example` → `.env` nếu cần Firebase.
4. Chạy `npm run check`; mở app và kiểm tra luồng vừa đổi.
5. Commit code + `package-lock.json` nếu đổi dependencies. Không commit `.env`, service account, model weights hoặc notification/receipt thật.
6. Mở PR vào `main`, ghi thay đổi, cách test và giới hạn thiết bị. Bật required status `check` trong branch protection khi cả đội đã được cấp quyền.

CI `.github/workflows/checks.yml` chạy app lint/TypeScript/tests và backend build/tests. CI không chứng minh được notification capture hoặc OpenAI live/account billing.

Functions checks: `npm ci --prefix functions`, `npm run functions:build`, `npm run functions:test`. Không đưa server OPENAI_API_KEY vào EXPO_PUBLIC hay share service-account. Dùng Secret Manager/CLI login từng người,không copy key vào PR.

## Quy tắc dữ liệu

- Dùng chuỗi tổng hợp khi thảo luận PR; không dán SMS thật, số tài khoản, ảnh hóa đơn vào issue/log.
- Không thêm analytics/crash breadcrumbs chứa input, prompt, ảnh hoặc native error echo.
- AI qua Firebase→OpenAI chỉ sau Auth+AI consent+chọn mục+xác nhận gửi. Consent capture và sync riêng. Không nói raw luôn local khi người dùng đã gửi AI.
- UI totals chỉ confirmed; review cho sửa/xóa/xác nhận. Offline chỉ manual/ledger/queue,không có AI offline hoặc regex giả inference.
- Android capture không đảm bảo qua force-stop, revoke permission hoặc mọi OEM battery policy. Không quảng cáo như vậy.

## Dependencies và build

Node phiên bản trong `.nvmrc`, npm, JDK 21 cho Android local build. Cài thư viện qua `npx expo install <package>` để giữ tương thích Expo SDK 58. Npm lockfile là nguồn chuẩn; không tạo thêm Bun/Yarn lock.

Native changes cần APK development mới. JS-only changes dùng Metro. Không yêu cầu từng thành viên có Xcode: người dùng Windows có thể dùng EAS cho iOS nhưng Apple signing/device registration vẫn bắt buộc.
