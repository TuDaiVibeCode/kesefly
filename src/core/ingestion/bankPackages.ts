/**
 * Single source of truth for bank package identifiers on the JS side.
 *
 * The native `CaptureStore` (modules/bank-notifications/.../CaptureStore.kt) enforces
 * its own pattern on every write; keep this validator in sync with it. Any package
 * the UI or JS layer offers must pass here first, so a name that native would reject
 * never reaches consent configuration.
 */
export const DEFAULT_BANK_PACKAGES = [
  'com.VCB',
  'com.vnpay.bidv',
  'com.mbmobile',
  'com.techcombank.retail',
  'com.vietinbank.ipay',
];

// Mirrors CaptureStore.kt packagePattern: ^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$
const packagePattern = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

export function isValidBankPackage(name: string): boolean {
  return packagePattern.test(name) && name.length <= 255;
}
