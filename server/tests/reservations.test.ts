import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test, { type TestContext } from 'node:test';
import { payloadDigest, requestKey, userKey } from '../src/input';
import { CACHE_TTL_MS, GLOBAL_DAILY_LIMIT, LIFETIME_RESERVED_CENTS, PENDING_TTL_MS, RESERVED_CENTS_PER_ATTEMPT, ReservationStore, USER_DAILY_LIMIT } from '../src/reservations';
import { AI_CONSENT_VERSION, type ParseTransactionRequest } from '../../src/types/ai';

const start = Date.UTC(2026, 10, 14, 12);
function setup(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'kesefly-sqlite-'));
  const path = join(directory, 'ai.sqlite');
  let now = start;
  const stores: ReservationStore[] = [];
  const open = () => { const store = new ReservationStore(path, () => now); stores.push(store); return store; };
  t.after(() => { for (const store of stores) store.close(); rmSync(directory, { recursive: true, force: true }); });
  const edit = (sql: string, ...values: Array<string | number>) => { const db = new DatabaseSync(path); try { db.prepare(sql).run(...values); } finally { db.close(); } };
  return { path, open, edit, advance: (milliseconds: number) => { now += milliseconds; } };
}
const complete = { transaction: null };

test('SQLite: cross-connection duplicate reservation, restart cache, conflict and terminal states', (t) => {
  const context = setup(t);
  const first = context.open();
  const second = context.open();
  assert.deepEqual(first.reserveRequest('one', 'user', 'digest', true), { kind: 'reserved' });
  assert.deepEqual(second.reserveRequest('one', 'user', 'digest', true), { kind: 'error', code: 'REQUEST_PENDING' });
  assert.deepEqual(second.reserveRequest('one', 'user', 'different', true), { kind: 'error', code: 'REQUEST_ID_CONFLICT' });
  assert.equal(second.completeRequest('one', 'wrong', complete), false);
  assert.equal(first.completeRequest('one', 'digest', complete), true);
  const reopened = context.open();
  assert.deepEqual(reopened.reserveRequest('one', 'user', 'digest', false), { kind: 'completed', result: complete });
  assert.equal(reopened.completeRequest('one', 'digest', complete), false);
  reopened.failRequest('one', 'digest');
  assert.deepEqual(first.reserveRequest('one', 'user', 'digest', true), { kind: 'completed', result: complete });
  context.advance(CACHE_TTL_MS);
  assert.deepEqual(first.reserveRequest('one', 'user', 'digest', true), { kind: 'error', code: 'REQUEST_EXPIRED' });
  assert.deepEqual(second.reserveRequest('one', 'user', 'changed', true), { kind: 'error', code: 'REQUEST_ID_CONFLICT' });
});

test('SQLite: pending timeout, failed attempt and unavailable provider never re-resubmit or refund', (t) => {
  const { open, advance, path } = setup(t);
  const store = open();
  assert.deepEqual(store.reserveRequest('off', 'user', 'd', false), { kind: 'error', code: 'AI_UNAVAILABLE' });
  assert.deepEqual(store.reserveRequest('pending', 'user', 'd', true), { kind: 'reserved' });
  advance(PENDING_TTL_MS);
  assert.equal(store.completeRequest('pending', 'd', complete), false);
  assert.deepEqual(store.reserveRequest('pending', 'user', 'd', true), { kind: 'error', code: 'REQUEST_EXPIRED' });
  store.reserveRequest('failed', 'user', 'd', true);
  store.failRequest('failed', 'd');
  assert.deepEqual(store.reserveRequest('failed', 'user', 'd', true), { kind: 'error', code: 'REQUEST_FAILED' });
  const db = new DatabaseSync(path);
  try {
    assert.equal(db.prepare("SELECT used FROM counters WHERE counter_key = 'lifetime'").get()?.used, RESERVED_CENTS_PER_ATTEMPT * 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM requests WHERE request_key = 'off'").get()?.count, 0);
  } finally { db.close(); }
});

test('SQLite: every quota boundary and corrupt counters fail closed without consuming a new ID', (t) => {
  const { open, edit, advance, path } = setup(t);
  const store = open();
  const day = new Date(start).toISOString().slice(0, 10);
  for (const [counter, limit] of [[`user_${userKey('user')}_${day}`, USER_DAILY_LIMIT], [`global_${day}`, GLOBAL_DAILY_LIMIT], ['lifetime', LIFETIME_RESERVED_CENTS]] as const) {
    edit('DELETE FROM counters');
    edit('INSERT INTO counters VALUES (?, ?)', counter, limit);
    assert.deepEqual(store.reserveRequest('boundary', 'user', 'd', true), { kind: 'error', code: 'QUOTA_EXCEEDED' });
    edit('UPDATE counters SET used = ? WHERE counter_key = ?', -1, counter);
    assert.throws(() => store.reserveRequest('corrupt', 'user', 'd', true), { code: 'QUOTA_EXCEEDED' });
  }
  edit('DELETE FROM counters');
  edit('INSERT INTO counters VALUES (?, ?)', 'lifetime', LIFETIME_RESERVED_CENTS - RESERVED_CENTS_PER_ATTEMPT);
  assert.deepEqual(store.reserveRequest('last', 'user', 'd', true), { kind: 'reserved' });
  advance(24 * 60 * 60_000);
  assert.deepEqual(store.reserveRequest('tomorrow', 'another-user', 'd', true), { kind: 'error', code: 'QUOTA_EXCEEDED' });
  const db = new DatabaseSync(path);
  try { assert.equal(db.prepare('SELECT COUNT(*) AS count FROM requests').get()?.count, 1); } finally { db.close(); }
});

test('SQLite: full daily quota allows exactly 100, then next day resets daily only', (t) => {
  const { open, advance } = setup(t);
  const store = open();
  for (let index = 0; index < USER_DAILY_LIMIT; index++) assert.deepEqual(store.reserveRequest(`day-${index}`, 'user', 'd', true), { kind: 'reserved' });
  assert.deepEqual(store.reserveRequest('over', 'user', 'd', true), { kind: 'error', code: 'QUOTA_EXCEEDED' });
  advance(24 * 60 * 60_000);
  assert.deepEqual(store.reserveRequest('next', 'user', 'd', true), { kind: 'reserved' });
});

test('SQLite: corrupt cache is deleted and tombstoned; completion uses shared schema validation', (t) => {
  const { open, edit, path } = setup(t);
  const store = open();
  store.reserveRequest('cached', 'user', 'd', true);
  assert.throws(() => store.completeRequest('cached', 'd', { transaction: { amount: -1 } } as never));
  assert.equal(store.completeRequest('cached', 'd', complete), true);
  edit('UPDATE results SET response = ?', '{"transaction":{"raw":"PRIVATE"}}');
  assert.deepEqual(store.reserveRequest('cached', 'user', 'd', true), { kind: 'error', code: 'REQUEST_EXPIRED' });
  const db = new DatabaseSync(path);
  try { assert.equal(db.prepare('SELECT COUNT(*) AS count FROM results').get()?.count, 0); } finally { db.close(); }
});

test('SQLite: only hashed identity/input and validated structured output persist, never evidence', (t) => {
  const { open, path } = setup(t);
  const store = open();
  const uid = 'PRIVATE-UID-SENTINEL';
  const input: ParseTransactionRequest = { requestId: 'request_1234567890', consentVersion: AI_CONSENT_VERSION, text: 'PRIVATE-EVIDENCE-SENTINEL', receivedAt: start, image: null };
  store.reserveRequest(requestKey(uid, input.requestId), uid, payloadDigest(input), true);
  store.completeRequest(requestKey(uid, input.requestId), payloadDigest(input), complete);
  const db = new DatabaseSync(path);
  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } finally { db.close(); }
  const bytes = readFileSync(path).toString('utf8');
  assert.equal(bytes.includes(uid), false);
  assert.equal(bytes.includes(input.text), false);
  assert.equal(bytes.includes(input.requestId), false);
});

test('SQLite: completed results and spent quota survive closing every connection', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'kesefly-restart-'));
  const path = join(directory, 'ai.sqlite');
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const first = new ReservationStore(path, () => start);
  first.reserveRequest('restart', 'user', 'digest', true);
  first.completeRequest('restart', 'digest', complete);
  first.close();
  const restarted = new ReservationStore(path, () => start);
  try {
    assert.deepEqual(restarted.reserveRequest('restart', 'user', 'digest', false), { kind: 'completed', result: complete });
    const db = new DatabaseSync(path);
    try { assert.equal(db.prepare("SELECT used FROM counters WHERE counter_key = 'lifetime'").get()?.used, RESERVED_CENTS_PER_ATTEMPT); } finally { db.close(); }
  } finally { restarted.close(); }
});
