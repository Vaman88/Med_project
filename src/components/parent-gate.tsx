"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  PARENT_LOCK_KEY,
  PIN_PATTERN,
  createParentPin,
  freshLockState,
  hasParentPin,
  parseLockState,
  recordFailure,
  remainingLockMs,
  triesBeforeWait,
  verifyParentPin,
  type LockState,
} from "@/lib/parent-lock";
import type { Family } from "@/lib/little-kitchen";

function readLock(): LockState {
  try {
    return parseLockState(localStorage.getItem(PARENT_LOCK_KEY));
  } catch {
    return freshLockState();
  }
}
function writeLock(state: LockState) {
  try {
    if (state.failures) localStorage.setItem(PARENT_LOCK_KEY, JSON.stringify(state));
    else localStorage.removeItem(PARENT_LOCK_KEY);
  } catch {
    /* Without storage the wait only lasts for this visit. */
  }
}

/**
 * "Grown-ups only" screen in front of the parent area, food settings and deletion.
 * A profile without a PIN yet (older saves) gets an explicit PIN setup instead.
 * This is a shared-device family control, not authentication.
 */
export function ParentGate({
  family,
  reason,
  onUnlock,
  onCreatePin,
  onCancel,
}: {
  family: Family;
  reason: string;
  onUnlock: () => void;
  onCreatePin: (pin: { pinSalt: string; pinHash: string }) => void;
  onCancel: () => void;
}) {
  const setupMode = !hasParentPin(family);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState<LockState>(freshLockState);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setLock(readLock()), []);
  const waitMs = remainingLockMs(lock, now);
  useEffect(() => {
    if (!waitMs) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waitMs]);
  const waitSeconds = Math.ceil(waitMs / 1000);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (setupMode) {
      if (!PIN_PATTERN.test(pin)) return setError("Choose a PIN of 4 to 8 digits.");
      if (pin !== confirmPin) return setError("The two PINs do not match. Type the same PIN twice.");
      setBusy(true);
      try {
        onCreatePin(await createParentPin(pin));
      } catch {
        setError("This browser could not create a PIN. Try again or use another browser.");
        setBusy(false);
      }
      return;
    }
    const current = readLock();
    const stamp = Date.now();
    setNow(stamp);
    setLock(current);
    if (remainingLockMs(current, stamp)) return setError("");
    setBusy(true);
    const ok =
      PIN_PATTERN.test(pin) && (await verifyParentPin(pin, family.pinSalt!, family.pinHash!));
    setBusy(false);
    if (ok) {
      writeLock(freshLockState());
      onUnlock();
      return;
    }
    const next = recordFailure(current, Date.now());
    writeLock(next);
    setLock(next);
    setNow(Date.now());
    setPin("");
    const left = triesBeforeWait(next);
    setError(
      remainingLockMs(next, Date.now())
        ? "That PIN did not match."
        : `That PIN did not match. ${left} more ${left === 1 ? "try" : "tries"} before a short wait.`,
    );
  }

  return (
    <main className="little-app parent-gate">
      <form onSubmit={submit} aria-labelledby="parent-gate-title">
        <span className="little-kicker">Parent area</span>
        <h1 id="parent-gate-title">{setupMode ? "Create a Parent PIN" : "Grown-ups only"}</h1>
        {setupMode ? (
          <p>
            This kitchen does not have a Parent PIN yet. A parent or guardian should create one now
            to {reason}. Children will need it to open the meal planner, change food settings or
            delete the child profile.
          </p>
        ) : (
          <p>Enter your Parent PIN to {reason}.</p>
        )}
        <label>
          {setupMode ? "New Parent PIN (4–8 digits)" : "Parent PIN"}
          <input
            type="password"
            inputMode="numeric"
            autoComplete={setupMode ? "new-password" : "current-password"}
            maxLength={8}
            value={pin}
            disabled={!!waitMs}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </label>
        {setupMode && (
          <label>
            Type the PIN again
            <input
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={8}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))}
            />
          </label>
        )}
        {error && <p role="alert">{error}</p>}
        {!!waitMs && (
          <p role="status">
            Too many wrong PINs. Try again in {waitSeconds} {waitSeconds === 1 ? "second" : "seconds"}.
          </p>
        )}
        <button className="little-primary" type="submit" disabled={busy || !!waitMs}>
          {setupMode ? "Save PIN and continue" : "Open parent area"}
        </button>
        <button type="button" onClick={onCancel}>
          Back
        </button>
        <small>
          {setupMode
            ? "The PIN is a family control for a shared device, not a password. It is stored only in this browser, and someone with access to the browser’s storage or settings can get around it."
            : "Forgot the PIN? Clearing this site’s data in your browser settings removes the PIN, and also deletes the saved child profile and kitchen on this device."}
        </small>
      </form>
    </main>
  );
}
