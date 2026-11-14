# Kesefly

Sổ chi tiêu Expo58/ReactNative/SQLite,AI qua **Node.js/Express→OpenAI**. Không cần FirebaseBlaze/CloudFunctions/SecretManager. FirebaseSpark giữ Email/PasswordAuth và Firestore sync trong quota miễn phí. Nhập tay/ledger/budget offline; AI cần mạng,Auth và consent+chọnmục+xácnhận.

**OpenAI API vẫn tính phí riêng.** ChạyExpress trênmáyđội không cầnthuêhost; máychủ phải mở,cùngmạng/reachable. Khônghứa publichostfree unlimited hoặc ChatGPTsubscriptionbaoAPIcredit.

## Chạy ngay trên máy

Node22.19.0+,npm,hai lockfiles:

```bash
npm ci
npm ci --prefix server
```

Copy `.env.example`→`.env` điền FirebaseWebpublicconfig và APIorigin. Copy `server/.env.example`→`server/.env` điền FIREBASE_PROJECT_ID trùngprojectAuth và OPENAI_API_KEY khi có.

```bash
# Terminal1: server default127.0.0.1:3001
npm run server:dev
# Terminal2: Expo UI
npm run web
```

ManualUI dùng được chưa cóFirebase/key. `GET http://localhost:3001/health` chỉ healthprocess,khôngchứngminhOpenAIkey. Chưa key AI trảunavailable,khôngfakeresponse.

## Keys và FirebaseSpark

| Nơi | Biến | Lấy ở đâu |
| --- | --- | --- |
| root.env | EXPO_PUBLIC_FIREBASE_API_KEY | FirebaseConsole→Projectsettings→WebSDKapiKey |
| root.env | EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN | authDomain cùngconfig |
| root.env | EXPO_PUBLIC_FIREBASE_PROJECT_ID | projectId |
| root.env | EXPO_PUBLIC_FIREBASE_APP_ID | appId |
| root.env | EXPO_PUBLIC_AI_API_URL | OriginExpress,VDhttp://localhost:3001 |
| server.env | FIREBASE_PROJECT_ID | CùngprojectđểverifyIDtoken |
| server.env | OPENAI_API_KEY | OpenAIAPIproject cóbilling/access,secretserveronly |

Không đặtOpenAIkey trongEXPO_PUBLIC,Firestore,app.json,Git. Server verifyFirebaseIDtoken bằng publicGoogleJWTkeys,khôngcầnFirebaseAdminJSON/serviceaccount. KhôngFunctionsregion,khôngkeySecretManager.

Người3 setupSpark:Email/PasswordAuth,defaultFirestoreproductionmode,AuthorizedDomainsrồi deployrules:

```bash
npx firebase-tools login
npx firebase-tools deploy --project PROJECT_ID --only firestore
```

Khôngdeployfunctions,khôngprovisionStorage/AppHosting/CloudRun đểdemo. StaticFirebaseHosting tùychọn trongSparkquota; vượtquota cóthể dừngdịchvụ. [BảnggiáFirebase](https://firebase.google.com/pricing) ghi Sparkno-payment-method,Blazepay-as-you-go; khôngnânggói trongsetupnày.

## Demo cùng điện thoại

- USBAndroid:`adb reverse tcp:3001 tcp:3001`,appAPIURLlocalhost3001. Nếu dùngFirebaseemulator thìreverse9099/8080riêng.
- LANWi-Fi:serverHOST0.0.0.0,APIURLhttp://192.168.x.x:3001,EXPO_PUBLIC_ALLOW_INSECURE_AI_HTTP=true,firewallport3001,cùngmạng. HTTPtrustedLAN chỉdemo dữliệutổnghợp,token/rawkhôngmãhóatransport. Public dùngHTTPS.
- Androidcleartext phảiopt-inbuildflag+privateURL trongconfigplugin,rebuildAPK sauđổi. Không sửaandroid/iosgenerated. HTTPSpublic thìflagfalse.
- BrowserHTTPS khônggọiAPIHTTP do mixedcontent. Dùng Express serveUIlocalcùngorigin hoặc publicHTTPSAPI; khôngđưakeyclientđểnérestriction.

```bash
# DevelopmentAPK cócapturemodule
npm run android
# hoặc EAS projectchung
npm run build:android:dev
```

CaptureAndroidvẫncầnNotificationAccess+consent+exactpackagebank. Queuepersistnative→appSQLiteacksaudurability,khôngautosendAI. iOS khôngđọcnotificationappkhác;manual/text/ảnhcóthểdùng. ChưaShortcuts/IMAP/shareextension. Nativebackuphelpercầnrealbuild.

## Web không cần đăng ký host

```bash
npm run web:export
npm run server:build
npm run server:start
# Mở http://localhost:3001 nếu Express được cấu hình phục vụ dist hiện có
```

ExpressSPA vàAPIcùngorigin tránhCORS; servercóCOOP/COEPchoSQLiteWASM. Nếu dùngstaticFirebaseHostingSpark:

```bash
npm run web:export
npx firebase-tools deploy --project PROJECT_ID --only hosting
```

ExpressphảicópublicHTTPS riêng vàCORS_ORIGINSđúngdomainwebsite; staticHostingkhôngchạyNodebackend. ĐổienvclientphảirestartMetro/rebuildAPK/re-exportweb.

## Auth/AI/sync/privacy

ĐăngnhậpFirebase→bậtconsentAIphiênbảnmới→dántext/chọnảnh chỉlocalqueue→chọnmục+xácnhậngửiExpress→OpenAI→review→confirmvàotổng. Syncledgerlàquyềnriêng+nútSyncnow,chỉconfirmedfields/tombstones,khôngraw.

RawAIđượcchọngửirờithiếtbị. Serverkhônglưurawtext/ảnh/prompt trongDB/log; structuredcachevẫylàfinancialdata. `store:false` khôngzero-retentionguarantee. Requestđãgửikhôngthuồibằnglogout/revoke.

Quota/idempotency trongpersistentSQLite `DB_PATH`,khôngFirestorequota.100/UID/ngày,1000global/ngày,lifetime250attempts×0.02USDreservation;khôngreset/refundkhibillingunknown. Mộtinstance+dĩabềnvững; freehostephemeral/redeploylàmấtDBsẽmấtdedupe/budget,nênkhôngdemođó nhưproduction-safe. BackupDBriêngkhôngGit. Cache7ngàylogicalexpiry,requesttombstonesgiữchốngreplay.

AppSQLitechưaSQLCipher,stickyUIDownerđầutiêndùngAI/sync,logoutgiữlocalledger/capture. Chưaaccountdelete/resetUX/AppCheck/E2Eencryption hoặcproductionsecuritycertification. Budgetmộtlimitlocalápdụngmọitháng,khôngsyncbudget.

## Kiểm tra và chia việc

```bash
npm run check
npm run server:build
npm run typecheck --prefix server
npm run server:test
npm run smoke --prefix server
```

Smoke mặcđịnhkhôngnetwork;`server/README.md` hướngdẫnlivefixturesvàserverenv.20text+1receiptảnhtổnghợpkhôngphảiAIaccuracyđãđo. ChưaOpenAIkey/projectthìkhôngclaimlivepass.

[PLAN](PLAN.md):4người/ownership/merge. [APIsetup](server/README.md). [Architecture](docs/ARCHITECTURE.md). [Verification](docs/VERIFICATION.md). [Team](docs/TEAM.md). Khôngcommitkey/DB/rawdata/generatednative,khôngtựpushremote.
