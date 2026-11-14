# Làm việc cùng đội

## Chia phần việc theo module

| Phần | Thư mục sở hữu | Interface chính |
| --- | --- | --- |
| UI/dashboard/ngân sách | `src/features`, `src/shared`, route wrappers `src/app` | `useFinance()` |
| Capture Android | `modules/bank-notifications`, `plugins` | `nativeCapture.ts` |
| Ingestion/offline | `src/core/ingestion`, `src/core/database` | `ingestText`, `ingestImage`, `processQueue`, repository |
| Local AI | `src/core/ai` | `prepareModel`, `parseAlert`, `unloadModel` |
| Auth/sync | `src/core/firebase`, `firestore.rules` | `syncTransactions`, cloud DTO |
| Shared contract | `src/types/transaction.ts` | `ParsedTransaction`, `Transaction`, `QueuedAlert` |

Mỗi PR chỉ nên đổi một luồng có thể chạy được. Khi đổi shared contract, cập nhật caller, validator, Firestore DTO/rules và test cùng PR. Không đẩy `android/`, `ios/` đã generate; sửa config plugin/local Expo module rồi rebuild.

## GitHub

1. Người sở hữu tạo repository, invite collaborator; repo này chưa tự tạo remote hay push.
2. Tạo branch: `git switch -c feat/ten-tinh-nang`.
3. Chạy `npm ci`, sao chép `.env.example` → `.env` nếu cần Firebase.
4. Chạy `npm run check`; mở app và kiểm tra luồng vừa đổi.
5. Commit code + `package-lock.json` nếu đổi dependencies. Không commit `.env`, service account, model weights hoặc notification/receipt thật.
6. Mở PR vào `main`, ghi thay đổi, cách test và giới hạn thiết bị. Bật required status `check` trong branch protection khi cả đội đã được cấp quyền.

CI `.github/workflows/checks.yml` chạy lint, TypeScript và tests logic. CI không chứng minh được notification capture/GPU/native build chạy trên mọi điện thoại.

## Quy tắc dữ liệu

- Dùng chuỗi tổng hợp khi thảo luận PR; không dán SMS thật, số tài khoản, ảnh hóa đơn vào issue/log.
- Không thêm analytics/crash breadcrumbs chứa input, prompt, ảnh hoặc native error echo.
- Không tự fallback cloud. Không dùng HTTP webhook cho raw notification rồi vẫn gọi luồng đó là local-only.
- UI tổng hợp chi tiêu chỉ tính `status === 'confirmed'`; review phải cho người dùng sửa/xóa/xác nhận.
- Không thay model bằng parser regex rồi gắn nhãn AI. Regex chỉ lọc noise.
- Android capture không đảm bảo qua force-stop, revoke permission hoặc mọi OEM battery policy. Không quảng cáo như vậy.

## Dependencies và build

Node phiên bản trong `.nvmrc`, npm, JDK 21 cho Android local build. Cài thư viện qua `npx expo install <package>` để giữ tương thích Expo SDK 58. Npm lockfile là nguồn chuẩn; không tạo thêm Bun/Yarn lock.

Native changes cần APK development mới. JS-only changes dùng Metro. Không yêu cầu từng thành viên có Xcode: người dùng Windows có thể dùng EAS cho iOS nhưng Apple signing/device registration vẫn bắt buộc.
