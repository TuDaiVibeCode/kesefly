const { withAndroidManifest } = require('expo/config-plugins');

// Raw alerts and consent live in noBackupFilesDir. Disable app-wide backup too:
// Expo SQLite and imported images also contain private financial information.
module.exports = function withBankNotifications(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) throw new Error('Android application manifest is missing');
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = 'false';
    application.$['android:dataExtractionRules'] = '@xml/kesefly_data_extraction_rules';
    return mod;
  });
};
