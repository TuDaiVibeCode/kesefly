import assert from 'node:assert/strict';
import test from 'node:test';

process.env.TZ = 'America/Los_Angeles';

import { formatCalendarDate, parseDateOnly } from '../src/shared/dates';
import { userError } from '../src/shared/userError';

test('date-only values keep their calendar day west of UTC', () => {
  const date = parseDateOnly('2026-11-01');
  assert.ok(date);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 10);
  assert.equal(date.getDate(), 1);
  assert.equal(formatCalendarDate('2026-11-01'), new Date(2026, 10, 1).toLocaleDateString('vi-VN'));
});

test('invalid calendar dates are rejected instead of rolling over', () => {
  assert.equal(parseDateOnly('2026-02-30'), null);
  assert.equal(parseDateOnly('not-a-date'), null);
});

test('technical errors are translated while user-facing Vietnamese is preserved', () => {
  assert.equal(userError('Firebase: Error (auth/invalid-credential).'), 'Email hoặc mật khẩu chưa đúng.');
  assert.equal(userError('SQLITE_BUSY: database is locked'), 'Chưa mở được sổ trên máy. Hãy thử lại.');
  assert.equal(userError('Unexpected internal failure'), 'Không hoàn tất được thao tác. Vui lòng thử lại.');
  const friendly = 'Cần đăng nhập trước khi bật đồng bộ.';
  assert.equal(userError(friendly), friendly);
});
