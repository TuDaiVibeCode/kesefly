import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { AI_CONSENT_VERSION } from '../../src/types/ai';
import { createApp, JSON_BODY_LIMIT } from '../src/app';
import { loadConfig } from '../src/config';
import { ReservationStore } from '../src/reservations';
import { type ProviderExtraction } from '../src/provider';

// Unit HTTP integration: real Express, HTTP and SQLite; injected auth/provider are not live verification.
async function setup(t: TestContext, extract?: () => Promise<ProviderExtraction>, enabled = true) {
  const directory = mkdtempSync(join(tmpdir(), 'kesefly-http-'));
  writeFileSync(join(directory, 'index.html'), '<!doctype html><title>Test SPA</title>');
  const config = loadConfig({ FIREBASE_PROJECT_ID: 'demo-kesefly', CORS_ORIGINS: 'http://localhost:8081', STATIC_DIR: directory });
  config.providerEnabled = enabled;
  const store = new ReservationStore(join(directory, 'ai.sqlite'));
  let calls = 0;
  const logs: unknown[] = [];
  const server = createServer(createApp(config, {
    store,
    verifyToken: async (token) => { if (token !== 'unit-token') throw new Error('PRIVATE-AUTH'); return 'PRIVATE-UID'; },
    extract: async () => { calls++; return extract ? extract() : { response: { transaction: null }, metrics: { latencyMs: 1, inputTokens: 2, outputTokens: 3, cachedInputTokens: null, cacheWriteTokens: null } }; },
    log: (event, fields) => { logs.push({ event, ...fields }); },
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    store.close(); rmSync(directory, { recursive: true, force: true });
  });
  const post = (body: unknown, token = 'unit-token', headers: Record<string, string> = {}) => fetch(`${base}/api/parse-transaction`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...headers }, body: JSON.stringify(body),
  });
  return { base, post, logs, calls: () => calls };
}
const input = () => ({ requestId: 'request_1234567890', consentVersion: AI_CONSENT_VERSION, text: 'PRIVATE-EVIDENCE', receivedAt: Date.now(), image: null });
async function code(response: Response, status: number, expected: string) {
  assert.equal(response.status, status);
  const body = await response.json() as { error: { code: string; message: string } };
  assert.equal(body.error.code, expected);
  assert.equal(JSON.stringify(body).includes('PRIVATE'), false);
}

test('unit HTTP: auth before JSON, health, strict CORS and static SPA', async (t) => {
  const { base, post, calls } = await setup(t);
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' });
  await code(await fetch(`${base}/api/parse-transaction`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }), 401, 'AI_AUTH_REQUIRED');
  await code(await post(input(), 'bad-token'), 401, 'AI_AUTH_REQUIRED');
  await code(await post(input(), 'unit-token', { Origin: 'https://evil.example' }), 403, 'AI_UNAVAILABLE');
  const preflight = await fetch(`${base}/api/parse-transaction`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  const forbidden = await fetch(`${base}/api/parse-transaction`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'DELETE' } });
  assert.equal(forbidden.status, 403);
  const page = await fetch(`${base}/review/123`);
  assert.match(await page.text(), /Test SPA/);
  assert.equal(page.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(page.headers.get('cross-origin-embedder-policy'), 'credentialless');
  assert.equal((await fetch(`${base}/api/not-found`)).status, 404);
  assert.equal(calls(), 0);
});

test('unit HTTP: direct response, cached result, conflicting ID and safe usage logs', async (t) => {
  const { post, calls, logs } = await setup(t);
  const request = input();
  const first = await post(request);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await first.json(), { transaction: null });
  assert.deepEqual(await (await post(request)).json(), { transaction: null });
  await code(await post({ ...request, text: 'different' }), 409, 'REQUEST_ID_CONFLICT');
  assert.equal(calls(), 1);
  assert.equal(JSON.stringify(logs).includes('PRIVATE'), false);
  assert.match(JSON.stringify(logs), /inputTokens/);
});

test('unit HTTP: consent, payload, JSON body limit and safe missing-key failure', async (t) => {
  const { base, post, calls } = await setup(t, undefined, false);
  await code(await post({ ...input(), consentVersion: 'old' }), 403, 'AI_CONSENT_REQUIRED');
  await code(await post({ data: input() }), 400, 'AI_INPUT_INVALID');
  await code(await post(input()), 503, 'AI_UNAVAILABLE');
  await code(await fetch(`${base}/api/parse-transaction`, { method: 'POST', headers: { Authorization: 'Bearer unit-token', 'Content-Type': 'application/json' }, body: '{bad' }), 400, 'AI_INPUT_INVALID');
  await code(await post({ ...input(), text: 'x'.repeat(JSON_BODY_LIMIT + 1) }), 400, 'AI_INPUT_INVALID');
  assert.equal(calls(), 0);
});

test('unit HTTP: provider failure is terminal with no retry and sanitized errors', async (t) => {
  const { post, calls, logs } = await setup(t, async () => { throw new Error('PRIVATE-PROVIDER-SECRET'); });
  const request = input();
  await code(await post(request), 502, 'REQUEST_FAILED');
  await code(await post(request), 502, 'REQUEST_FAILED');
  assert.equal(calls(), 1);
  assert.equal(JSON.stringify(logs).includes('PRIVATE'), false);
});

test('unit HTTP: concurrent replay stays pending and never submits twice', async (t) => {
  let finish!: (value: ProviderExtraction) => void;
  const pending = new Promise<ProviderExtraction>((resolve) => { finish = resolve; });
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const { post, calls } = await setup(t, () => { started(); return pending; });
  const request = input();
  const first = post(request);
  await startedPromise;
  await code(await post(request), 409, 'REQUEST_PENDING');
  finish({ response: { transaction: null }, metrics: { latencyMs: 1, inputTokens: null, outputTokens: null, cachedInputTokens: null, cacheWriteTokens: null } });
  assert.equal((await first).status, 200);
  assert.equal(calls(), 1);
});
