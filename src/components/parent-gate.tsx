"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const [grownUp, setGrownUp] = useState(false);
  const [lock, setLock] = useState<LockState>(freshLockState);
  const [now, setNow] = useState(() => ({ wall: Date.now(), mono: 0 }));
  // A wait also runs on the page's own monotonic clock, so moving the device clock forward cannot shorten it.
  const monoUntil = useRef(0);
  function noteWait(state: LockState) {
    const wall = Date.now();
    const mono = performance.now();
    monoUntil.current = Math.max(monoUntil.current, mono + remainingLockMs(state, wall));
    setLock(state);
    setNow({ wall, mono });
  }
  const waitFor = (state: LockState, wall: number, mono: number) =>
    Math.max(remainingLockMs(state, wall), Math.ceil(monoUntil.current - mono));
  useEffect(() => {
    noteWait(readLock());
    // Misses in another tab count here too.
    const onStorage = (event: StorageEvent) => {
      if (event.key === PARENT_LOCK_KEY) noteWait(parseLockState(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const waitMs = waitFor(lock, now.wall, now.mono);
  useEffect(() => {
    if (waitMs <= 0) return;
    const timer = setInterval(() => setNow({ wall: Date.now(), mono: performance.now() }), 1000);
    return () => clearInterval(timer);
  }, [waitMs]);
  const waitSeconds = Math.ceil(Math.max(0, waitMs) / 1000);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (setupMode) {
      if (!PIN_PATTERN.test(pin)) return setError("Choose a PIN of 4 to 8 digits.");
      if (pin !== confirmPin) return setError("The two PINs do not match. Type the same PIN twice.");
      if (!grownUp) return setError("A parent or guardian needs to set this PIN. Tick the box to confirm.");
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
    noteWait(current);
    if (waitFor(current, Date.now(), performance.now()) > 0) return setError("");
    // Count the try as a miss before checking it, so tries running at once in several tabs still add up.
    const next = recordFailure(current, Date.now());
    writeLock(next);
    setBusy(true);
    let ok = false;
    try {
      ok = PIN_PATTERN.test(pin) && (await verifyParentPin(pin, family.pinSalt!, family.pinHash!));
    } catch {
      ok = false;
    }
    setBusy(false);
    if (ok) {
      writeLock(freshLockState());
      onUnlock();
      return;
    }
    noteWait(readLock());
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
          <>
            <p>
              <strong>Grown-ups: please set this PIN yourself.</strong> This kitchen does not have a
              Parent PIN yet. Create one now to {reason}. After that, the PIN is needed to open the
              meal planner, change food settings or delete the child profile.
            </p>
            <p>Children: please hand the device to a grown-up and tap Back.</p>
          </>
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
        {setupMode && (
          <label className="parent-gate-confirm">
            <input type="checkbox" checked={grownUp} onChange={(event) => setGrownUp(event.target.checked)} />
            I am a parent or guardian, age 18+, and I am choosing this PIN myself.
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
            ? "The PIN is a family control for a shared device, not a password. It is stored only in this browser, and someone with access to the browser’s storage or settings can get around it. If a child set the PIN, clearing this site’s data in browser settings removes it, along with the saved child profile."
            : "Forgot the PIN? Clearing this site’s data in your browser settings removes the PIN, and also deletes the saved child profile and kitchen on this device."}
        </small>
      </form>
    </main>
  );
}
