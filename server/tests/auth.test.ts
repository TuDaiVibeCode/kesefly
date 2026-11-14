import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { assertFirebaseClaims, createFirebaseVerifier, verifySignedFirebaseToken } from '../src/auth';
import { loadConfig } from '../src/config';

const project = 'demo-kesefly';
const now = Math.floor(Date.now() / 1000);
const valid: JWTPayload = { sub: 'unit-user', aud: project, iss: `https://securetoken.google.com/${project}`, exp: now + 3600, iat: now - 10, auth_time: now - 30 };

test('unit JWT: Firebase claims require exact issuer, audience, valid times and bounded subject', () => {
  assert.equal(assertFirebaseClaims(valid, project, now), 'unit-user');
  for (const changes of [
    { sub: '' }, { sub: 'a'.repeat(129) }, { aud: 'another-project' }, { aud: [project] },
    { iss: 'https://attacker.example' }, { exp: now }, { exp: undefined }, { exp: now + 0.5 },
    { iat: now + 1 }, { iat: undefined }, { iat: -1 }, { auth_time: now + 1 }, { auth_time: undefined },
    { auth_time: now - 5 }, { exp: now - 100 },
  ]) assert.throws(() => assertFirebaseClaims({ ...valid, ...changes }, project, now));
});

test('unit JWT: actual RSA signatures, algorithm and kid are verified using local public keys, not live Google keys', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const publicJWK = { ...await exportJWK(publicKey), kid: 'unit-key', alg: 'RS256', use: 'sig' };
  const keys = createLocalJWKSet({ keys: [publicJWK] });
  const token = await new SignJWT(valid).setProtectedHeader({ alg: 'RS256', kid: 'unit-key' }).sign(privateKey);
  assert.equal(await verifySignedFirebaseToken(token, project, keys), 'unit-user');
  const segments = token.split('.');
  segments[1] = Buffer.from(JSON.stringify({ ...valid, sub: 'attacker' })).toString('base64url');
  await assert.rejects(verifySignedFirebaseToken(segments.join('.'), project, keys));
  await assert.rejects(verifySignedFirebaseToken(token, 'other-project', keys));
  const unknown = await new SignJWT(valid).setProtectedHeader({ alg: 'RS256', kid: 'unknown-key' }).sign(privateKey);
  await assert.rejects(verifySignedFirebaseToken(unknown, project, keys));
  const expired = await new SignJWT({ ...valid, exp: now - 1 }).setProtectedHeader({ alg: 'RS256', kid: 'unit-key' }).sign(privateKey);
  await assert.rejects(verifySignedFirebaseToken(expired, project, keys));
  const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify(valid)).toString('base64url')}.`;
  await assert.rejects(verifySignedFirebaseToken(unsigned, project, keys));
});

test('unit configuration: emulator auth requires explicit flag, demo project, nonproduction and localhost Auth', () => {
  const base = { FIREBASE_PROJECT_ID: project };
  assert.equal(loadConfig(base).emulatorAuth, false);
  assert.equal(loadConfig(base).providerEnabled, false);
  assert.equal(loadConfig(base).host, '127.0.0.1');
  assert.equal(loadConfig(base).port, 3001);
  const emulator = { ...base, AI_ALLOW_EMULATOR_AUTH: 'true', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', OPENAI_API_KEY: 'unit-key-not-live' };
  assert.equal(loadConfig(emulator).providerEnabled, false);
  assert.equal(loadConfig({ ...emulator, OPENAI_ALLOW_EMULATOR_LIVE: 'true' }).providerEnabled, true);
  for (const changes of [{ NODE_ENV: 'production' }, { FIREBASE_PROJECT_ID: 'real-project' }, { FIREBASE_AUTH_EMULATOR_HOST: 'example.com:9099' }, { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099/path' }, { FIREBASE_AUTH_EMULATOR_HOST: '' }]) assert.throws(() => loadConfig({ ...emulator, ...changes }));
  assert.throws(() => loadConfig({ ...base, CORS_ORIGINS: '*' }));
  assert.throws(() => loadConfig({ ...base, CORS_ORIGINS: 'https://example.com/path' }));
  assert.throws(() => loadConfig({ ...base, AI_ALLOW_EMULATOR_AUTH: 'yes' }));
});

test('unit JWT: production verifier rejects unsigned emulator tokens before any key fetch', async () => {
  const verifier = createFirebaseVerifier({ projectId: project, emulatorAuth: false, emulatorHost: null });
  const token = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify(valid)).toString('base64url')}.`;
  await assert.rejects(verifier(token), { code: 'AI_AUTH_REQUIRED' });
  await assert.rejects(verifier('x'.repeat(16385)), { code: 'AI_AUTH_REQUIRED' });
});
