import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lockReason, pageState } from './access.js';

const STATUSES = ['unauthenticated', 'authenticated', 'mfa_required'];
const table = (access) => STATUSES.map((s) => pageState(access, s));

test('always: usable in every state', () => {
  assert.deepEqual(table('always'), ['ok', 'ok', 'ok']);
});

test('guest pages (sign in, sign up, magic link): sign out first; finish MFA first', () => {
  assert.deepEqual(table('guest'), ['ok', 'sign-out', 'finish-mfa']);
});

test('signed-in pages (sessions, account): sign in first', () => {
  assert.deepEqual(table('signed-in'), ['sign-in', 'ok', 'finish-mfa']);
});

test('MFA page: signed in, or in the middle of an MFA sign-in', () => {
  assert.deepEqual(table('signed-in-or-mfa'), ['sign-in', 'ok', 'ok']);
});

test('loading never shows a lock', () => {
  assert.equal(pageState('signed-in', 'loading'), 'loading');
  assert.equal(lockReason('signed-in', 'loading'), null);
});

test('lockReason explains the dimmed sidebar items', () => {
  assert.equal(lockReason('signed-in', 'unauthenticated'), 'Sign in to try this');
  assert.equal(lockReason('guest', 'authenticated'), 'Sign out to try this');
  assert.equal(lockReason('guest', 'mfa_required'), 'Finish signing in (MFA) first');
  assert.equal(lockReason('always', 'unauthenticated'), null);
});
