# Express API — không cần Firebase Blaze

`server/` là Node22/Express5 độc lập, không Cloud Functions/Secret Manager/firebase-admin. OpenAI key chỉ ở server, Firebase ID token được verify bằng public Google JWT keys. Firebase Spark Auth/Firestore vẫn phục vụ app, không phải nơi chạy API.

## 1. Chạy local

Node22.19.0+, terminal ở repo root:

```bash
npm ci --prefix server
```

Copy `server/.env.example` → `server/.env` rồi điền:

```dotenv
FIREBASE_PROJECT_ID=project-id-cua-doi
OPENAI_API_KEY=
HOST=127.0.0.1
PORT=3001
DB_PATH=./data/ai.sqlite
STATIC_DIR=../dist
CORS_ORIGINS=http://localhost:8081,http://localhost:8082,http://localhost:5000
```

Để key trống vẫn chạy health/Auth/input guards; AI mới trả503AI_UNAVAILABLE. Khi có OpenAI API key, điền localfile/hostsecret rồi restart. Không putkeyFirestore/EXPO_PUBLIC/source/chat; không cần serviceaccountJSON. ChatGPTsubscription khôngbaoAPIbilling.

```bash
npm run server:dev
# GET http://localhost:3001/health -> {"status":"ok"}
```

Root `.env`: publicFirebaseconfig + `EXPO_PUBLIC_AI_API_URL=http://localhost:3001`. Một processAPI và một terminal `npm run web`. Express cần máy chạy xuyên demo; không cócloudfunction tựstart khi máyđội tắt.

## 2. HTTP contract

- `GET /health`:processhealth,khôngcallOpenAI hoặc xác nhậnkey/modelaccess.
- `POST /api/parse-transaction`: `Authorization: Bearer <Firebase ID token>` và Content-Typeapplication/json.
- Bodydirectrequest từ `src/types/ai.ts`:requestId,consentVersionexpress-openai-input-v1,text,receivedAt,imageornull. Khôngcallable`{data:...}`,khôngUIDclient.
- Successdirect`{transaction:ParsedTransaction|null}`. Error`{error:{code,message}}`,code/status cốđịnh,safe.
- Auth401,consent403,invalidinput400,unavailable503,pending/conflict409,failed502,expired410,quota429. Client chỉchấpnhậnsafeallowlist,khôngechoSDKbody.
- JSONbody<=3MiB,text<=6000,ảnhdecoded<=2MiB JPEG/PNG/WebPcanonicalbase64/magic,khôngexternalURLfetch.

Bearer productionRS256verify fixedGoogleJWKS,issuer/audienceproject,exp/iat/auth_time/sub. KhôngcầnbillingGoogle hoặcAdmincredential. Khôngcheckrevocation/disabledaccount từpublicsignature:tokenvalidcònhạncóthểđượcaccept. DùngprojectAuthđúng,gửiquaHTTPSpublic.

## 3. Key/network cho demo

### Android USB

```bash
adb reverse tcp:3001 tcp:3001
```

AppAPIURLlocalhost3001;AndroidHTTPlocalcầnEXPO_PUBLIC_ALLOW_INSECURE_AI_HTTP=true vàrebuildnativeAPK qua configplugin. PublicHTTPS thìflagfalse.

### Wi-Fi LAN

SetserverHOST0.0.0.0,PORT3001;clientAPIURLhttp://192.168.x.x:3001 vàLANHTTPopt-inflagtrue. SameWiFi,allowfirewallport3001. Không dùngrealbanktext vì raw/tokenplaintextHTTP. CORS_ORIGINS thêm đúngbrowserorigin nếuUIhostkhác. Native/noOrigin vẫnphảiverifyBearer.

### Public website

PublicExpressAPI phảiHTTPS:hosttựchọn/tunnelHTTPSnếucóquyền,sửaEXPO_PUBLIC_AI_API_URL rồire-export/rebuildUI. Không cóhosttrảphíbắtbuộc,nhưngfreehosting thườngsleep/ephemeraldisk. HTTPSUIkhôngcallHTTPAPI(mixedcontent).

KhôngmuốnhostUIriêng: `npm run web:export`, `npm run server:build`, `npm run server:start`;ExpressserveSPA`../dist` nếucóindex,cùngoriginAPI,COOP/COEPchoSQLiteWASM. DùngFirebaseHostingSpark chỉservefrontend; khôngNode/Functionsproxy.

## 4. Durable quota/idempotency

`node:sqlite` built-in,DB_PATH resolve theo workingdirectoryserver. Dùngpersistentdisk,mộtinstance/chungDB,khôngsyncDBquaGit. 100user/dayUTC,1000global/dayUTC,lifetime500cents,2centsreservationperattempt. Đây làreservationcap khôngcamkếtinvoiceOpenAI/server/network. Khôngauto refund/resetunknownbilling.

AtomicBEGINIMMEDIATE,preparedSQL,WAL;requesthashUID+ID,digestpayload,status/tombstonepermanent. Cachestructuredresultlogical7days,pruneexpiredonaccess. Pending2phút/failed/expiredkhôngproviderretry;cachehitkhôngcalllại,IDdifferentpayload409. Restartvẫnngân sách/dedupe; xóaDB/freehostrecycledisk làmấtbảovệnày. KhôngscalehostDBriêng. Structuredcachevẫnfinancialdata,khôngrawinput/images/log.

## 5. Model/parser và live smoke

Responsesgpt-6-luna,text+imagehighdetail,strictschema/domainvalidator dùngchung,max512output,reasoningnone,timeout25s,retries0,notools/history,storefalse. Tokenusage eventlogsafe,norawproviderbody. Promptuntrustedinput,OTP/promo/pending/ambiguous/multi/missingfactsnull;amountkhôngnhầmbalance. ReceivedAtfallbacktimezoneVietnam;resultreviewbeforeledger.

20text+1receiptPNGsyntheticexpectedsemanticskhôngphảiliveaccuracy. Copy `server/.env.smoke.example`→`server/.env.smoke`,Firebasepublicconfig+tài khoảntest+AI_SMOKE_API_URL trỏserver. RunnerAuthFirebase rồiHTTPExpress,cũngquaquota; khônggọiOpenAItrựctiếp.

```bash
# No network mặcđịnh
npm run smoke --prefix server
# Billable explicit, saukhiserverkeyđãcấu hình
npm run smoke --prefix server -- --live --run-id demo-first-01
# Chỉsaufirstpass
npm run smoke --prefix server -- --live --run-id acceptance-01 --all
```

ReusecùngrunID+account đểrequestIDstable/cache. NewrunIDlàattemptmới,cóthểtínhphí;errorservicestopall,noautoretry. LogsfixtureID/mismatchfields/walllatency,khôngpassword/token/rawoutput. Usage đọcstdoutserverevents,khôngfake0khicache/unknown.

## 6. Demo emulator và checks

FirebaseAuth localdemo chỉ explicitserverAI_ALLOW_EMULATOR_AUTH=true,FIREBASE_PROJECT_IDdemo-*,NODE_ENVkhôngproduction,FIREBASE_AUTH_EMULATOR_HOSTloopback9099. Verifierchấpnhậnunsignedemulatortokenchỉmodeđó+lookupenabledaccountthậttrênemulator. OPENAI_ALLOW_EMULATOR_LIVEfalsemặcđịnhkhôngproviderlive,kểcóinheritedkey. Khôngpublicserveremulatorauth.

```bash
npx firebase-tools emulators:start --project demo-kesefly --only auth,firestore
# APIprocessenv demo flags,set riêngtheotemplate
npm run server:dev
```

Kiểmtra:

```bash
npm run server:build
npm run typecheck --prefix server
npm run server:test
npm run check
```

JWTunit tests kýtestkeyriêng làvalidationtest,khôngproviderlive. HTTPdependencyinjectiontests khôngđượcgọilàliveOpenAI. Runtimehealth/Auth-emulator/503path cóthểtestkhôngAPIkey. Chưakeythìkhôngclaimactualtext/visionaccuracy/usage.

## 7. Handoff role2

Role2giữserver/prompt/schema/SQLitequota/HTTP/fixture;role3FirebaseSpark/Auth/client/sync;role4UIconsent/selectedsend;role1APKnetwork/capture. Contractgiữsharedtypes,responsekhôngcallercompatshim. KhôngcầnnângBlazeđểchạyAPI. PubliclaunchvẫncầnTLS/durablehosting/threatmodel/accountabusecontrols;retentionOpenAIkhôngzero vìstorefalse.
