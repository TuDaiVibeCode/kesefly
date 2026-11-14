# Kiến trúc và ranh giới riêng tư

## Hai đường cloud khác nhau

Ledger offline dùng SQLite; capture Android ghi native queue trước JS. Người dùng paste/chọn ảnh cũng chỉ thêm queue local. AI **không tự chạy** khi mở app,login,bật consent hoặc notification mới tới.

Chọn queue IDs → xác nhận gửi → perUID AI consent+Firebase Auth → `parseTransaction` callable → validation/quota/idempotency → OpenAI Responses → strict structured output → local Transaction status review. Người dùng sửa/xác nhận mới vào tổng thu chi. Sync confirmed ledger lên Firestore là consent và nút Sync riêng.

Raw text/ảnh của các mục được chọn **rời thiết bị** qua Firebase tới OpenAI. Không mô tả chế độ này là local-only. Backend không chủ động lưu raw/prompt/image trong Firestore,Storage hoặc log; `store:false` không vô hiệu mọi provider retention. Tắt consent/logout bỏ hiệu lực kết quả client nhưng không thu hồi request đã tới server/provider.

## Domain và storage

Nguồn chuẩn `src/types/transaction.ts`,`src/types/ai.ts`,`src/core/ai/validation.ts`. VND nguyên dương<=1e15,type thu/chi,merchant/categories/date/confidence được validate server/client. Validator/schema dùng chung,không eval/repaired arbitrary model output. Confidence không phải xác suất đã hiệu chuẩn,JSON hợp schema không chứng minh facts đúng.

- `alert_queue`: raw text hoặc đường dẫn private JPEG/native,dataURLJPEG/web; receivedAt/source/error generic. Raw hết hạn7ngày,xóa sau parse success/discard; prune khi app hoạt động/native alarms,OS có thể trì hoãn xóa vật lý.
- `transactions`: review/confirmed; dashboard/budget chỉ confirmed chưa xóa. Manual không cần Auth/mạng. Xóa giữ tombstone,không hard-delete cloud gây resurrect từ máy offline.
- `processed_alerts`: chỉ receiptID+time chống replay sau crash/ack. ExactID idempotent,cùng amount/type±5phút chỉ cảnh báo không auto merge.
- `settings`: budget local,mỗi UID AI consent version,sync consent,sticky cloud owner. Budget là một limit áp dụng mọi tháng,không per-month/sync.
- SQLite không SQLCipher,dựa OS sandbox/encryption,backup exclusion. Không bảo đảm secure erase SSD/WAL,root/jailbreak hoặc máy chia sẻ đang mở khóa.

## Image handling

Picker image normalize JPEG width1024 quality0.8 trước persist,giới hạn2MiB. Native file trong private Documents; web dataURL trong SQLite nên sống qua reload thay vì blobURL tạm. Send selected item mới đọc base64,không gửi external URL/Files upload. Backend kiểm tra canonical base64,size,MIME và magic bytes,không fetch URL do client đưa. Ảnh gốc thư viện người dùng vẫn tồn tại sau khi app xóa bản sao.

## Server boundary

Firebase v2 callable `parseTransaction`,region asia-southeast1,verified AuthUID,secret OPENAI_API_KEY chỉ server. Model fixed allowlist gpt-6-luna,no tools/history/arbitrary model. Responses strict schema,reasoning none,max512output,25s timeout,no SDK retry,storefalse. Null/refusal/incomplete/schema/business error không thành giao dịch sai.

Request key hashUID+queueID,payload digest bao input+consent. Transactional reservation trước provider để race request trùng không tính thêm call. `_aiRequests` giữ permanent digest/status tombstones; `_aiResults` chỉ structured result,logical expiry7ngày+optional Firestore TTL. Không đặt TTL lên request tombstones: xóa sẽ cho requestID cũ gọi lại. Pending timeout/failed terminal không auto replay provider vì request có thể đã billed. Cache hết hạn trả lỗi,không chạy lại cùngID.

Quota100/UID/ngày và1000project/ngày; lifetime reservation500cents,2cents/attempt,không auto refund/reset. Đây là attempt/reservation ceiling không bảo đảm actual OpenAI/Functions/Firestore bill. Budget warning ở vendor không phải hard stop. Metadata requests/rate counters nhạy cảm theo tài khoản,default deny client. TTL là asynchronous,không bảo đảm deletion vật lý chính xác7ngày.

## Auth/consent/session fences

Existing named Firebase app/Auth persistence được dùng cho callable+sync,không Firebase app thứ hai. AI consent version theo UID,independent sync,capture consent. Generation tăng trên auth transition/revoke,kiểm tra trước request,sau response,trước save trong serialized repository. Pipeline chỉ IDs snapshot người dùng chọn; mới tới không gửi ké. UI cấm discard/change selection khi processing; row còn tồn tại và session guard chặn stale results.

Một DB local gắn UID cloud đầu tiên. Logout revokes AI/sync nhưng vẫn giữ local ledger và capture; không per-account encryptedDB. UID khác không được gửi local data qua AI/sync. Sticky-owner không bảo vệ người khác xem local khi máy đã mở khóa; UI phải cảnh báo. Account-deletion/reset UX và data export cần scope riêng,không xóa pending trong im lặng.

## Firestore ledger sync

Path `users/{uid}/transactions/{id}`; explicit DTO chọn fields,không sourcePackage,syncedAt,raw/ảnh/prompt/errors. Confirmed+tombstone only,LWWupdatedAt client,conditional ackrevision,equalserverwins trừ tombstone,server transaction+rules chặn stale. Clockskew vẫn có thể gây conflict. Không CRDT,realtime/autosync hoặc sync budget. Query paginated server-only100records tránh cache account cũ; next sync bắt insert sau cursor.

Rules defaultdeny,owner/schema/ranges/calendar validation,denyphysicaldelete. `_ai*` collections chỉ AdminSDK; storage.rules denyall. Admin Firebase/OpenAI vẫn có thể xử lý structured financial fields nên không gọi là anonymous/E2E encrypted.

## Native và platform

Android listener cần explicit consent+exact package trước đọc/lưu,separate notification access trong Settings. Native queue noBackupFilesDir,app backup disabled,listener protected BIND_NOTIFICATION_LISTENER_SERVICE,không READ_SMS/AccessibilityService. JS import persisted trước ack; inference cloud chỉ foreground explicituseraction. Không đảm bảo force-stop/revoke/OEMkilled/event OS chưa giao.

iOS không intercept notificationappkhác. Manual/text/ảnh có thể dùng,Swifthelper exclude Documents/ApplicationSupport backup failclosed trước privateDB. Web không capture nhưng có fullAIcallable,text/ảnhqueue/manual ledger. Không còn model/nativeinference,GPU/ARM64 restriction hoặc entitlement virtualaddressing. Native module capture/backup vẫn cần developmentbuild.

Web SQLite cần COOPsame-origin/COEPcredentialless trong Metro **và hosting**. Appoutputsingle+FirebaseHosting SPArewrite phục vụ routetransaction dynamic; productionexport/deploy/directreload cần test riêng.

## Verification và production limits

`docs/VERIFICATION.md` ghi bằng chứng đã chạy. Không key/projectcredentials ⇒ không claim liveOpenAI/deploypass. CI tests không thay thế notificationdevice/liveprovider smoke. Chưa AppCheck enforcement,mãhóalocal/accountdeletion/securityproduction certification. Public deployment cần privacy policy,abusecontrols,projectbillingreview và Play/Applepolicy hiện hành; notificationlistener không mặc nhiên có cùng video/declaration rules như AccessibilityAPI.

Nguồn: [Firebase callable](https://firebase.google.com/docs/functions/callable),[secrets](https://firebase.google.com/docs/functions/config-env),[OpenAI schema](https://developers.openai.com/api/docs/guides/structured-outputs),[vision](https://developers.openai.com/api/docs/guides/images-vision),[model](https://developers.openai.com/api/docs/models/gpt-6-luna),[Android listener](https://developer.android.com/reference/android/service/notification/NotificationListenerService).
