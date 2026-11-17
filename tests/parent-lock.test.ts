import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_LOCKOUT_MS, FREE_ATTEMPTS, MAX_LOCKOUT_MS, PIN_PATTERN, createParentPin, freshLockState, hasParentPin,
  lockoutMs, parseLockState, recordFailure, remainingLockMs, triesBeforeWait, verifyParentPin,
} from '../src/lib/parent-lock';
import { familySchema } from '../src/lib/little-kitchen';

test('a created Parent PIN verifies only with the same digits and is salted', async () => {
  const first = await createParentPin('2468');
  const second = await createParentPin('2468');
  assert.match(first.pinSalt, /^[a-f0-9]{32}$/);
  assert.match(first.pinHash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.pinHash, second.pinHash);
  assert.equal(await verifyParentPin('2468', first.pinSalt, first.pinHash), true);
  assert.equal(await verifyParentPin('2469', first.pinSalt, first.pinHash), false);
  assert.equal(await verifyParentPin('2468', 'not-hex', first.pinHash), false);
});

test('only well-formed PIN fields count as a set PIN, so older profiles get explicit setup', async () => {
  const pin = await createParentPin('1357');
  assert.equal(hasParentPin(null), false);
  assert.equal(hasParentPin({}), false);
  assert.equal(hasParentPin({ pinSalt: pin.pinSalt }), false);
  assert.equal(hasParentPin({ pinSalt: 'zz', pinHash: pin.pinHash }), false);
  assert.equal(hasParentPin(pin), true);
  // A saved family keeps its PIN fields through the schema.
  const family = familySchema.parse({ version: 1, age: 7, pantry: [], allergies: [], otherAllergies: '', allergyConfirmed: true, parentConfirmed: true, ...pin });
  assert.equal(hasParentPin(family), true);
});

test('PINs are 4 to 8 digits', () => {
  for (const ok of ['1234', '12345678']) assert.ok(PIN_PATTERN.test(ok));
  for (const bad of ['123', '123456789', '12a4', '']) assert.ok(!PIN_PATTERN.test(bad));
});

test('wrong PINs get a few free tries, then doubling waits that stop at a cap', () => {
  let state = freshLockState();
  const now = 1_000_000;
  for (let miss = 1; miss < FREE_ATTEMPTS; miss++) {
    state = recordFailure(state, now);
    assert.equal(remainingLockMs(state, now), 0, `miss ${miss} has no wait`);
  }
  assert.equal(triesBeforeWait(state), 0);
  state = recordFailure(state, now);
  assert.equal(remainingLockMs(state, now), BASE_LOCKOUT_MS);
  state = recordFailure(state, now);
  assert.equal(remainingLockMs(state, now), BASE_LOCKOUT_MS * 2);
  assert.equal(lockoutMs(50), MAX_LOCKOUT_MS);
  assert.equal(remainingLockMs(state, now + BASE_LOCKOUT_MS * 2), 0);
  // A changed device clock cannot stretch the wait past the cap.
  assert.equal(remainingLockMs({ failures: 9, lockedUntil: now + 10 * MAX_LOCKOUT_MS }, now), MAX_LOCKOUT_MS);
});

test('saved lock state is read defensively', () => {
  assert.deepEqual(parseLockState(null), freshLockState());
  assert.deepEqual(parseLockState('not json'), freshLockState());
  assert.deepEqual(parseLockState('{"failures":-1,"lockedUntil":5}'), freshLockState());
  assert.deepEqual(parseLockState('{"failures":4,"lockedUntil":5}'), { failures: 4, lockedUntil: 5 });
});
