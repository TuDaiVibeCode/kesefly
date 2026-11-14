const { withAndroidManifest, withGradleProperties } = require('expo/config-plugins');

// Raw alerts and consent live in noBackupFilesDir. Disable app-wide backup too:
// Expo SQLite and imported images also contain private financial information.
module.exports = function withBankNotifications(config) {
  config = withGradleProperties(config, (mod) => {
    const properties = mod.modResults.filter((item) => item.key !== 'reactNativeArchitectures');
    properties.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    mod.modResults = properties;
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) throw new Error('Android application manifest is missing');
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = 'false';
    application.$['android:dataExtractionRules'] = '@xml/kesefly_data_extraction_rules';
    return mod;
  });
};
