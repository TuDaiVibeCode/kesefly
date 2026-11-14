import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_BANK_PACKAGES, isValidBankPackage } from '../src/core/ingestion/bankPackages';

test('default bank packages are exact Android identifiers native will accept', () => {
  assert.ok(DEFAULT_BANK_PACKAGES.length > 0);
  for (const name of DEFAULT_BANK_PACKAGES) {
    assert.equal(isValidBankPackage(name), true, `${name} must pass native package pattern`);
  }
  // Single source of truth: no duplicates.
  assert.equal(new Set(DEFAULT_BANK_PACKAGES).size, DEFAULT_BANK_PACKAGES.length);
});

test('package validator mirrors the native CaptureStore pattern (no wildcards, no relaxed names)', () => {
  // Captured from CaptureStore.kt packagePattern: segments of letters/digits/underscore.
  const rejected = [
    '',                        // empty
    'com',                     // single segment
    'com.VCB.*',               // wildcard
    '*.vcb',                   // leading wildcard
    'com.vcb ',                // trailing space
    'com..vcb',                // empty segment
    'com.123',                 // segment starts with digit
    'com.vcb;rm -rf',          // injection attempt
    'Com.VCB Vietnam',         // space inside
  ];
  for (const name of rejected) {
    assert.equal(isValidBankPackage(name), false, `${JSON.stringify(name)} must be rejected`);
  }
  const accepted = ['com.VCB', 'com.vnpay.bidv', 'com.mbmobile', 'com.techcombank.retail', 'com.vietinbank.ipay', 'a.b'];
  for (const name of accepted) {
    assert.equal(isValidBankPackage(name), true, `${name} must be accepted`);
  }
});
