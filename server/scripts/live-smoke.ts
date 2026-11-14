import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { AI_CONSENT_VERSION, type ParseTransactionRequest } from '../../src/types/ai';
import { PARSER_FIXTURES, TEXT_FIXTURES, fixtureMismatches, type ParserFixture } from '../fixtures/parser';
import { validateRequest } from '../src/input';

const API_TIMEOUT_MS = 40_000;
const AUTH_TIMEOUT_MS = 15_000;
const HELP = `Safe skip: no network or API call was made. Live execution requires --live --run-id <stable-id-at-least-8-characters>.
Flags: --case <fixture-id> (default income-salary), --all (20 texts + 1 image, sequential), --emulator (demo project only).
Set AI_SMOKE_API_URL, AI_SMOKE_PROJECT_ID, AI_SMOKE_FIREBASE_API_KEY, AI_SMOKE_EMAIL, AI_SMOKE_PASSWORD in server/.env.smoke; see .env.smoke.example.
Reuse the SAME run ID and dedicated Auth account to request the cached result; never change run ID merely to retry a failed request.
The emulator requires Auth localhost:9099, server AI_ALLOW_EMULATOR_AUTH=true and OPENAI_ALLOW_EMULATOR_LIVE=true.
Only wall latency is measured here. Provider token telemetry, when available, is in sanitized server logs; HTTP responses do not contain token usage.`;

class SafeFailure extends Error {
  constructor(readonly safeCode: string, readonly httpStatus?: number) { super(safeCode); }
}
interface Options { live: boolean; emulator: boolean; runId?: string; caseId?: string; all: boolean; help: boolean }
interface Configuration { authURL: string; apiURL: string; email: string; password: string }
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
interface JSONResponse { status: number; ok: boolean; body: unknown }
function parseOptions(args: string[]): Options {
  const options: Options = { live: false, emulator: false, all: false, help: false };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (seen.has(flag)) throw new SafeFailure('INVALID_FLAGS');
    seen.add(flag);
    if (flag === '--live') options.live = true;
    else if (flag === '--emulator') options.emulator = true;
    else if (flag === '--all') options.all = true;
    else if (flag === '--help') options.help = true;
    else if (flag === '--run-id' || flag === '--case') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new SafeFailure('INVALID_FLAGS');
      if (flag === '--run-id') options.runId = value;
      else options.caseId = value;
    } else throw new SafeFailure('INVALID_FLAGS');
  }
  if (options.all && options.caseId) throw new SafeFailure('INVALID_FLAGS');
  return options;
}
function configuration(emulator: boolean): Configuration {
  const project = process.env.AI_SMOKE_PROJECT_ID ?? '';
  const apiKey = process.env.AI_SMOKE_FIREBASE_API_KEY ?? '';
  const email = process.env.AI_SMOKE_EMAIL ?? '';
  const password = process.env.AI_SMOKE_PASSWORD ?? '';
  const api = new URL(process.env.AI_SMOKE_API_URL ?? '');
  if (api.username || api.password || api.search || api.hash || api.pathname !== '/' ||
      (api.protocol !== 'https:' && !(api.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)))) throw new SafeFailure('INVALID_API_URL');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project) || !/^[A-Za-z0-9_-]{1,200}$/.test(apiKey) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password.trim()) throw new SafeFailure('INVALID_CONFIGURATION');
  if (emulator !== project.startsWith('demo-')) throw new SafeFailure('PROJECT_MODE_MISMATCH');
  const authOrigin = emulator ? 'http://localhost:9099/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com';
  return {
    authURL: `${authOrigin}/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    apiURL: new URL('/api/parse-transaction', api).href,
    email, password,
  };
}
async function postJSON(url: string, body: unknown, timeoutMs: number, token?: string): Promise<JSONResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    let data: unknown;
    try { data = await response.json(); } catch { throw new SafeFailure('INVALID_JSON_RESPONSE', response.status); }
    return { status: response.status, ok: response.ok, body: data };
  } catch (error) {
    if (error instanceof SafeFailure) throw error;
    throw new SafeFailure(controller.signal.aborted ? 'NETWORK_TIMEOUT_BILLING_UNKNOWN' : 'NETWORK_ERROR_BILLING_UNKNOWN');
  } finally { clearTimeout(timer); }
}
async function authenticate(config: Configuration): Promise<string> {
  let response: JSONResponse;
  try {
    response = await postJSON(config.authURL, { email: config.email, password: config.password, returnSecureToken: true }, AUTH_TIMEOUT_MS);
  } catch (error) {
    // Authentication has no provider billing, but its URL/body can contain credentials.
    throw new SafeFailure('AUTH_REQUEST_FAILED', error instanceof SafeFailure ? error.httpStatus : undefined);
  }
  if (!response.ok || !record(response.body) || typeof response.body.idToken !== 'string' || !response.body.idToken) {
    throw new SafeFailure('AUTH_FAILED', response.status);
  }
  return response.body.idToken;
}
const RESERVATION_CODES: Readonly<Record<string, true>> = {
  AI_AUTH_REQUIRED: true, AI_CONSENT_REQUIRED: true, AI_INPUT_INVALID: true,
  REQUEST_PENDING: true, REQUEST_EXPIRED: true, REQUEST_ID_CONFLICT: true, REQUEST_FAILED: true, QUOTA_EXCEEDED: true, AI_UNAVAILABLE: true,
};
function apiResult(response: JSONResponse): unknown {
  const envelope = response.body;
  if (record(envelope) && Object.hasOwn(envelope, 'error')) {
    const code = record(envelope.error) ? envelope.error.code : undefined;
    throw new SafeFailure(typeof code === 'string' && Object.hasOwn(RESERVATION_CODES, code) ? code : 'API_ERROR', response.status);
  }
  if (!response.ok) throw new SafeFailure('API_HTTP_ERROR', response.status);
  if (!record(envelope) || Object.keys(envelope).length !== 1 || !Object.hasOwn(envelope, 'transaction')) throw new SafeFailure('INVALID_API_RESPONSE', response.status);
  return envelope.transaction;
}
async function fixtureRequest(fixture: ParserFixture, runId: string): Promise<ParseTransactionRequest> {
  let image: ParseTransactionRequest['image'] = null;
  if (fixture.imageFile) {
    let bytes: Buffer;
    try { bytes = await readFile(join(__dirname, '..', 'fixtures', fixture.imageFile)); }
    catch { throw new SafeFailure('FIXTURE_IMAGE_UNAVAILABLE'); }
    image = { base64: bytes.toString('base64'), mimeType: 'image/png' };
  }
  try {
    return validateRequest({
      requestId: createHash('sha256').update('express:' + runId + fixture.id).digest('hex'),
      consentVersion: AI_CONSENT_VERSION, text: fixture.text, receivedAt: fixture.receivedAt, image,
    }, Date.now());
  } catch { throw new SafeFailure('FIXTURE_REQUEST_INVALID'); }
}
function reportFailure(error: unknown, fixture?: ParserFixture, latencyMs?: number): void {
  const failure = error instanceof SafeFailure ? error : new SafeFailure('UNEXPECTED_ERROR');
  console.error(JSON.stringify({
    ...(fixture ? { fixtureId: fixture.id, latencyMs, cachedOrBilledUnknown: true } : {}),
    status: 'service-error', code: failure.safeCode, ...(failure.httpStatus === undefined ? {} : { httpStatus: failure.httpStatus }),
  }));
}
async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help || !options.live) { console.log(HELP); return; }
  if (!options.runId || !/^[A-Za-z0-9_-]{8,128}$/.test(options.runId)) throw new SafeFailure('INVALID_RUN_ID');
  const fixtures = options.all ? PARSER_FIXTURES : PARSER_FIXTURES.filter((fixture) => fixture.id === (options.caseId ?? TEXT_FIXTURES[0].id));
  if (!fixtures.length) throw new SafeFailure('UNKNOWN_FIXTURE');
  const config = configuration(options.emulator);
  // Preflight every local payload before authentication or any billable request.
  const requests = await Promise.all(fixtures.map((fixture) => fixtureRequest(fixture, options.runId!)));
  const token = await authenticate(config);
  console.log('Only wall latency is reported. Provider token telemetry is in sanitized server logs, not the HTTP response.');
  let mismatch = false;
  for (let index = 0; index < fixtures.length; index++) {
    const fixture = fixtures[index];
    const start = performance.now();
    try {
      // Exactly one attempt per fixture, sequentially; never retry on network/provider failure.
      const response = await postJSON(config.apiURL, requests[index], API_TIMEOUT_MS, token);
      const result = apiResult(response);
      const fields = fixtureMismatches(fixture, result);
      if (fields.includes('schema')) throw new SafeFailure('INVALID_TRANSACTION_SCHEMA', response.status);
      mismatch ||= fields.length > 0;
      console.log(JSON.stringify({ fixtureId: fixture.id, status: fields.length ? 'accuracy-mismatch' : 'pass', fields,
        latencyMs: Math.round(performance.now() - start), cachedOrBilledUnknown: true }));
    } catch (error) {
      reportFailure(error, fixture, Math.round(performance.now() - start));
      process.exitCode = 1;
      return; // All service errors stop --all: billing may be unknown or quota/config exhausted.
    }
  }
  if (mismatch) process.exitCode = 1;
}
void main().catch((error: unknown) => { reportFailure(error); process.exitCode = 1; });
