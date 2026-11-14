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
    // Opt-in demo HTTP only. Never enable cleartext for an arbitrary public host.
    const address = process.env.EXPO_PUBLIC_AI_API_URL;
    if (process.env.EXPO_PUBLIC_ALLOW_INSECURE_AI_HTTP === 'true' && address) {
      const url = new URL(address);
      const host = url.hostname;
      const parts = host.split('.');
      const ipv4 = parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
      const privateHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || (ipv4 &&
        (parts[0] === '10' || (parts[0] === '192' && parts[1] === '168') ||
          (parts[0] === '172' && Number(parts[1]) >= 16 && Number(parts[1]) <= 31)));
      if (url.protocol === 'http:' && privateHost && !url.username && !url.password) {
        application.$['android:usesCleartextTraffic'] = 'true';
      }
    }
    return mod;
  });
};
