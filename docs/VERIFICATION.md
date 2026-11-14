# Kiểm tra Express cutover — 2026-11-14

## Phạm vi

StandaloneNode22/Express thayFirebasecallable/Blaze. Quota/cachepersistserverSQLite,AuthBearerpublicJWTverify,FirebaseSparkledgerSyncgiữriêng. Consentversionmới,clientHTTPendpointconfig,selectedsendmanual,khôngautoupload. Thưmụcfunctionsđãđượcthaybằngserver,khôngcompatshim.

## Bằng chứng cũ không thay nghiệm thu mới

Các lầnsetuptrước đãpassmanualSQLiteUI/reload,Rulesemulator,parserunit vàFirestorequota/emulator. Chúng khôngchứngminhserverExpress/JWT/CORS/SQLitequotamới; checks mớiđượcbổsungsauobservedoutput.

## Checks Express

- Serverbuildpass;servertoolstypecheckpasssauannotaterequestfixture;31/31servertests pass(JWTrealtestRSAsignatures/claims,HTTPExpress,CORS/bodylimit,SQLitepersistence/quota/replay,parserfixtures). Tests injectprovider/authđượcgắnunit,khôngclaimliveOpenAI.
- App`npm run check`pass:lint/typecheckvà15/15tests,gồmendpointHTTPS/loopback/privateLANopt-in/unsafeURL/publicHTTPguards.
- `npm run smoke --prefix server`safe-skip,no-networkkhôngkey. `npm ls`khôngfirebase-functions/firebase-adminserver;thưmụcfunctionsđãbỏ.
- RuntimeExpress3001:health200,missingBearer401,disallowedOrigin403,realFirebaseAuthemulatortokenlookupaccepted→emptykey503AI_UNAVAILABLE. Khôngproviderrequest.
- Browser390pxUI8083:realemailsignup,consentmớihướngExpress,syncvẫnoff,pastequeue,chọnmục→confirm/cancel→explicitPOSTExpress,errorretainsqueue/noAItransaction. KhôngJSerrorsobserved.
- Productionwebexportpass;ExpressserveSPA`/transaction/unknown-demo`200HTML+COOP/COEP,`/api/unknown`404JSONkhôngfallthrough.
- AndroidprebuildpassvớiprivateLANHTTPopt-inflag/configplugin. Chưacompile/installAPKhoặcLANdevicetest.

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
## Giới hạn

- ChưaOpenAIkey/Firebaseprojectđộinênchưaactualprovidertext/vision,billing/modelaccess,productionAuth/sync/publicHTTPS.
- ChưaAPK/iOSdevicecompile/install,mạngLAN/nativecleartext/OEMlistener/backupflagrealdevice. PrebuildkhôngthayAPK.
- Khôngproductionsecurity/encryption/accountdeletioncertification. Freehostephemeral khôngbảođảmdurablebudget/dedupe,localdemomáyphảimở.
