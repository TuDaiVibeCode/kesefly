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

## Giới hạn

- ChưaOpenAIkey/Firebaseprojectđộinênchưaactualprovidertext/vision,billing/modelaccess,productionAuth/sync/publicHTTPS.
- ChưaAPK/iOSdevicecompile/install,mạngLAN/nativecleartext/OEMlistener/backupflagrealdevice. PrebuildkhôngthayAPK.
- Khôngproductionsecurity/encryption/accountdeletioncertification. Freehostephemeral khôngbảođảmdurablebudget/dedupe,localdemomáyphảimở.
