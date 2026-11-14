import test from 'node:test';
import assert from 'node:assert/strict';
import { getAIEndpoint, resolveAIEndpoint } from '../src/core/ai/endpoint';

test('AI requires an explicit HTTPS origin and fixes the API route', () => {
  assert.equal(resolveAIEndpoint(undefined), null);
  assert.equal(resolveAIEndpoint(''), null);
  assert.equal(resolveAIEndpoint('https://ai.example.com'), 'https://ai.example.com/api/parse-transaction');
  assert.equal(resolveAIEndpoint('https://ai.example.com:8443/'), 'https://ai.example.com:8443/api/parse-transaction');
});

test('HTTPS private origins do not need insecure HTTP permission', () => {
  for (const origin of ['https://10.0.0.1:3001', 'https://172.16.0.1', 'https://192.168.1.5']) {
    assert.equal(resolveAIEndpoint(origin), `${origin}/api/parse-transaction`, origin);
  }
});

test('loopback HTTP is available without a LAN opt-in', () => {
  for (const origin of ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://127.12.34.56:3001', 'http://[::1]:3001']) {
    assert.equal(resolveAIEndpoint(origin), `${new URL(origin).origin}/api/parse-transaction`, origin);
  }
});

test('only RFC1918 IPv4 HTTP is enabled by the explicit insecure LAN opt-in', () => {
  for (const origin of ['http://10.0.0.1:3001', 'http://172.16.0.1', 'http://172.31.255.255', 'http://192.168.1.5:3001']) {
    assert.equal(resolveAIEndpoint(origin), null, origin);
    assert.equal(resolveAIEndpoint(origin, true), `${new URL(origin).origin}/api/parse-transaction`, origin);
  }
});

test('public, link-local, shared, unspecified, and non-RFC1918 HTTP stay forbidden with opt-in', () => {
  for (const origin of ['http://ai.example.com', 'http://8.8.8.8', 'http://172.15.255.255',
    'http://172.32.0.0', 'http://192.169.0.1', 'http://169.254.1.1', 'http://100.64.0.1',
    'http://0.0.0.0:3001', 'http://[::]', 'http://[fd00::1]', 'http://localhost.example.com']) {
    assert.equal(resolveAIEndpoint(origin, true), null, origin);
  }
});

test('LAN permission never admits hostnames resembling a private IPv4 address', () => {
  for (const origin of ['http://10.evil.com', 'http://10.0.0.evil', 'http://192.168.evil.com',
    'http://172.16.evil.com', 'http://10.0.0.256', 'http://192.168.1.999', 'http://10..0.1']) {
    assert.equal(resolveAIEndpoint(origin, true), null, origin);
  }
});
test('credentials, paths, query strings, and fragments are never accepted as origins', () => {
  for (const origin of ['https://user:password@ai.example.com', 'https://user@ai.example.com',
    'https://@ai.example.com', 'https://ai.example.com/api/parse-transaction',
    'https://ai.example.com/path/..', 'https://ai.example.com//', 'https://ai.example.com?key=value',
    'https://ai.example.com?', 'https://ai.example.com/#fragment', 'https://ai.example.com/#',
    'http://192.168.1.5:3001?x=1', 'http://localhost:3001/#']) {
    assert.equal(resolveAIEndpoint(origin, true), null, origin);
  }
});

test('malformed and non-HTTP URLs fail closed rather than falling back to another service', () => {
  for (const origin of ['ai.example.com', '//ai.example.com', 'ftp://ai.example.com', 'file:///tmp/ai',
    'javascript:alert(1)', 'https://', 'https://ai.example.com:99999', ' https://ai.example.com',
    'https://ai.example.com\n', 'https://ai.example.com\\path']) {
    assert.equal(resolveAIEndpoint(origin, true), null, origin);
  }
});

test('getAIEndpoint falls back to default local backend origin if env is unset', () => {
  const original = process.env.EXPO_PUBLIC_AI_API_URL;
  delete process.env.EXPO_PUBLIC_AI_API_URL;
  try {
    assert.equal(getAIEndpoint(), 'http://localhost:3001/api/parse-transaction');
  } finally {
    if (original !== undefined) process.env.EXPO_PUBLIC_AI_API_URL = original;
  }
});
