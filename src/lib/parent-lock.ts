const encoder = new TextEncoder();

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function createParentPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { pinSalt: hex(salt), pinHash: await derive(pin, salt) };
}

async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: 120000,
      salt: salt as BufferSource,
    },
    key,
    256,
  );
  return hex(new Uint8Array(bits));
}

export async function verifyParentPin(
  pin: string,
  saltHex: string,
  expected: string,
) {
  if (!/^([a-f0-9]{2}){16}$/.test(saltHex) || !/^[a-f0-9]{64}$/.test(expected))
    return false;
  const salt = new Uint8Array(
    saltHex.match(/../g)!.map((pair) => parseInt(pair, 16)),
  );
  const actual = await derive(pin, salt);
  let mismatch = 0;
  for (let index = 0; index < actual.length; index++)
    mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

/*
 * Parent PIN policy. This is a shared-device family control: it keeps children out of the
 * ordinary parent screens, but anyone with access to the browser's storage or developer tools
 * can bypass it. It is not authentication and must not be described as security.
 */
export const PIN_PATTERN = /^\d{4,8}$/;
/** Wrong PINs allowed before each further miss starts a waiting period. */
export const FREE_ATTEMPTS = 3;
export const BASE_LOCKOUT_MS = 30_000;
export const MAX_LOCKOUT_MS = 15 * 60_000;
/** An unlocked parent area locks again after this long without a tap or key press. */
export const INACTIVITY_LOCK_MS = 5 * 60_000;
export const PARENT_LOCK_KEY = "healthy-steps-parent-lock-v1";

export interface LockState {
  failures: number;
  lockedUntil: number;
}
export const freshLockState = (): LockState => ({ failures: 0, lockedUntil: 0 });

export function hasParentPin(family: { pinSalt?: string; pinHash?: string } | null | undefined) {
  return !!family && /^([a-f0-9]{2}){16}$/.test(family.pinSalt ?? "") && /^[a-f0-9]{64}$/.test(family.pinHash ?? "");
}

/** Waiting time after `failures` wrong PINs: none at first, then doubling, capped. */
export function lockoutMs(failures: number) {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(BASE_LOCKOUT_MS * 2 ** (failures - FREE_ATTEMPTS), MAX_LOCKOUT_MS);
}
export function recordFailure(state: LockState, now: number): LockState {
  const failures = Math.min(state.failures + 1, 100);
  return { failures, lockedUntil: now + lockoutMs(failures) };
}
export function remainingLockMs(state: LockState, now: number) {
  // Capped so a changed device clock cannot lock a parent out for longer than the policy allows.
  return Math.min(MAX_LOCKOUT_MS, Math.max(0, state.lockedUntil - now));
}
/** Tries left before the next miss starts a wait (0 once waits have begun). */
export function triesBeforeWait(state: LockState) {
  return Math.max(0, FREE_ATTEMPTS - 1 - state.failures);
}
export function parseLockState(raw: string | null): LockState {
  try {
    const value = raw ? (JSON.parse(raw) as Partial<LockState>) : null;
    const failures = Number(value?.failures);
    const lockedUntil = Number(value?.lockedUntil);
    if (Number.isInteger(failures) && failures >= 0 && Number.isFinite(lockedUntil) && lockedUntil >= 0)
      return { failures: Math.min(failures, 100), lockedUntil };
  } catch {
    /* Fall through to a fresh state. */
  }
  return freshLockState();
}
