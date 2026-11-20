"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { SprigArt, type SprigMood } from "./sprig";
import { PantryPicker } from "./parent-wizard";
import { PIN_PATTERN, createParentPin } from "@/lib/parent-lock";
import { browserCloud, cloudConfigured } from "@/lib/cloud";
import { dietaryChoices, equipmentChoices, type Family } from "@/lib/little-kitchen";
import {
  AGE_CHOICES,
  BUDGET_CHOICES,
  HOUSEHOLD_CHOICES,
  MAJOR_ALLERGENS,
  ONBOARDING_DRAFT_KEY,
  addAvoidFood,
  draftToFamily,
  emptyDraft,
  hasAvoidList,
  onboardingSteps,
  parseDraft,
  removeOtherFood,
  stepProblem,
  type OnboardingDraft,
  type OnboardingStep,
} from "@/lib/onboarding";

/** Seedy, the app's companion, asking the question in a speech bubble. The question is the screen's heading. */
export function SeedySays({
  mood = "hello",
  children,
  big = false,
}: {
  mood?: SprigMood;
  children: ReactNode;
  big?: boolean;
}) {
  return (
    <div className={`ob-seedy${big ? " ob-seedy-big" : ""}`}>
      <div className="ob-seedy-art" aria-hidden="true">
        <SprigArt mood={mood} />
      </div>
      <div className="ob-bubble">{children}</div>
    </div>
  );
}

/** A big tappable answer card. `pressed` makes it a toggle that screen readers announce as selected. */
function Choice({
  pressed,
  onClick,
  children,
  wide = false,
  small = false,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  wide?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      className={`ob-choice${pressed ? " is-on" : ""}${wide ? " ob-choice-wide" : ""}${small ? " ob-choice-small" : ""}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      <span>{children}</span>
      {pressed && <IconCheck className="ob-tick" size={18} stroke={3} aria-hidden="true" />}
    </button>
  );
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export function Onboarding({
  onFinish,
}: {
  /** Called once with the saved-ready family and, when someone signed in, their online account id. */
  onFinish: (family: Family, accountUserId?: string) => void;
}) {
  const steps = onboardingSteps(cloudConfigured);
  const [draft, setDraft] = useState<OnboardingDraft>(emptyDraft);
  const [restored, setRestored] = useState(false);
  const [direction, setDirection] = useState<"fwd" | "back">("fwd");
  const [error, setError] = useState("");
  const [avoidQuery, setAvoidQuery] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [grownUp, setGrownUp] = useState(false);
  const [lock, setLock] = useState<{ pinSalt: string; pinHash: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Optional online account (only when Supabase keys are configured).
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [account, setAccount] = useState<{ id?: string; email: string; pending?: boolean } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // The step whose heading last had focus moved to it, so only a real step change moves focus.
  const shownStep = useRef<OnboardingStep | null>(null);

  const step: OnboardingStep = steps.includes(draft.step) ? draft.step : "welcome";
  const index = steps.indexOf(step);
  const questions = steps.length - 1;
  const progress = Math.round((index / questions) * 100);

  // Pick up where a reload left off. The PIN is never saved, so the PIN step starts empty.
  useEffect(() => {
    try {
      const saved = parseDraft(localStorage.getItem(ONBOARDING_DRAFT_KEY));
      if (saved) {
        if (saved.step === "account") saved.step = "pin";
        setDraft(saved);
        if (typeof saved.budget === "number" && !BUDGET_CHOICES.includes(saved.budget as never)) setCustomBudget(String(saved.budget));
      }
    } catch {
      /* Without storage the answers last for this visit. */
    }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* Without storage the answers last for this visit. */
    }
  }, [draft, restored]);
  // Move focus to each new question so keyboard and screen reader users start in the right place.
  useEffect(() => {
    const previous = shownStep.current;
    shownStep.current = step;
    if (previous === null || previous === step) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  const update = (patch: Partial<OnboardingDraft>) => {
    setError("");
    setDraft((current) => ({ ...current, ...patch }));
  };
  function go(next: OnboardingStep, dir: "fwd" | "back") {
    setDirection(dir);
    setError("");
    setDraft((current) => ({ ...current, step: next }));
  }
  function back() {
    if (index > 0) go(steps[index - 1], "back");
  }
  function finish(lockFields = lock, userId = account?.id) {
    if (!lockFields) {
      go("pin", "back");
      return;
    }
    const parsed = draftToFamily(draft, lockFields);
    if (!parsed.success) {
      setError("Something in your answers needs another look. Go back and check each step.");
      return;
    }
    try {
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    } catch {
      /* Nothing to clear. */
    }
    onFinish(parsed.data, userId);
  }
  async function next(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const problem = stepProblem(step, draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (step === "pin") {
      if (!PIN_PATTERN.test(pin)) return setError("Make a Parent PIN of 4 to 8 digits.");
      if (pin !== pinAgain) return setError("The two PINs do not match. Type the same PIN twice.");
      if (!grownUp) return setError("Please confirm you are a parent or guardian, age 18 or older.");
      setBusy(true);
      let made: { pinSalt: string; pinHash: string };
      try {
        made = await createParentPin(pin);
      } catch {
        setBusy(false);
        return setError("This browser could not create a Parent PIN. Try another browser.");
      }
      setBusy(false);
      setLock(made);
      setPin("");
      setPinAgain("");
      if (index === steps.length - 1) finish(made);
      else go(steps[index + 1], "fwd");
      return;
    }
    if (step === "account") {
      finish();
      return;
    }
    go(steps[index + 1], "fwd");
  }
  async function authenticate() {
    setError("");
    if (!email.trim() || !password) return setError("Type your email address and a password.");
    if (authMode === "signup" && password.length < 8) return setError("Use a password of at least 8 characters.");
    setBusy(true);
    try {
      const client = browserCloud();
      const credentials = { email: email.trim(), password };
      if (authMode === "signup") {
        const { data, error: authError } = await client.auth.signUp(credentials);
        if (authError) throw new Error(authError.message);
        setAccount(data.session && data.user ? { id: data.user.id, email: credentials.email } : { email: credentials.email, pending: true });
      } else {
        const { data, error: authError } = await client.auth.signInWithPassword(credentials);
        if (authError) throw new Error(authError.message);
        setAccount({ id: data.user?.id, email: credentials.email });
      }
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function addAvoid() {
    const result = addAvoidFood(draft, avoidQuery);
    if ("error" in result) return setError(result.error);
    update(result);
    setAvoidQuery("");
  }

  const name = draft.parentName.trim();
  const ready = !stepProblem(step, draft);
  const others = draft.otherAllergies.split(",").map((item) => item.trim()).filter(Boolean);

  let mood: SprigMood = "hello";
  let question: ReactNode = null;
  let hint: ReactNode = null;
  let body: ReactNode = null;
  let action = "Continue";

  switch (step) {
    case "welcome":
      question = "Hi! I’m Seedy.";
      hint = "I help your family cook, play and plan healthy meals. Let’s set up Healthy Steps together. It takes about two minutes.";
      action = "Get started";
      mood = "cheer";
      break;
    case "parent":
      question = "First, what should I call you?";
      hint = "Just your first name, grown-up. I’ll use it to say hello.";
      body = (
        <label className="ob-field">
          Your first name
          <input
            value={draft.parentName}
            maxLength={40}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="next"
            onChange={(e) => update({ parentName: e.target.value })}
          />
        </label>
      );
      break;
    case "age":
      question = name ? `Nice to meet you, ${name}! How old is your child?` : "How old is your child?";
      hint = "Kids from 5 to 17 can play the cooking game. No names needed.";
      body = (
        <div className="ob-grid ob-grid-numbers" role="group" aria-label="Child’s age">
          {AGE_CHOICES.map((age) => (
            <Choice key={age} small pressed={draft.age === age} onClick={() => update({ age })}>{age}</Choice>
          ))}
        </div>
      );
      break;
    case "household":
      question = "How many people eat at home?";
      hint = "I’ll size recipes and the grocery list for everyone.";
      body = (
        <div className="ob-grid ob-grid-numbers" role="group" aria-label="People eating at home">
          {HOUSEHOLD_CHOICES.map((size) => (
            <Choice key={size} small pressed={draft.householdSize === size} onClick={() => update({ householdSize: size })}>{size}</Choice>
          ))}
        </div>
      );
      break;
    case "pantry":
      question = "What food do you have at home right now?";
      hint = "Search and add each food you have. The kids’ dishes and your meal ideas start from these foods.";
      mood = "encourage";
      body = (
        <>
          <div className="ob-pantry-search">
            <PantryPicker selected={draft.pantry} onChange={(pantry) => update({ pantry })} />
          </div>
        </>
      );
      break;
    case "equipment":
      question = "What can you cook with?";
      hint = "Pick everything in your kitchen. I’ll skip dishes that need something you don’t have.";
      body = (
        <div className="ob-grid ob-grid-two" role="group" aria-label="Kitchen equipment">
          {equipmentChoices.map((item) => (
            <Choice key={item} pressed={draft.equipment.includes(item)} onClick={() => update({ equipment: toggle(draft.equipment, item) })}>{item}</Choice>
          ))}
        </div>
      );
      break;
    case "avoid":
      question = "Are there foods your child must avoid?";
      hint = "Dishes with these foods are hidden from the kids’ game and flagged in the meal planner.";
      mood = "encourage";
      body = (
        <>
          <Choice
            wide
            pressed={draft.noAllergies && !hasAvoidList(draft)}
            onClick={() => update({ noAllergies: true, allergies: [], otherAllergies: "", allergyChecked: false })}
          >
            No known food allergies
          </Choice>
          <div className="ob-grid" role="group" aria-label="Foods to avoid">
            {MAJOR_ALLERGENS.map((food) => (
              <Choice
                key={food}
                pressed={draft.allergies.includes(food)}
                onClick={() => update({ allergies: toggle(draft.allergies, food), noAllergies: false, allergyChecked: false })}
              >
                {food}
              </Choice>
            ))}
          </div>
          <div className="ob-add">
            <label htmlFor="ob-avoid-other">Something else to avoid?</label>
            <div>
              <input
                id="ob-avoid-other"
                value={avoidQuery}
                maxLength={80}
                autoComplete="off"
                placeholder="For example kiwi or mango"
                onChange={(e) => setAvoidQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAvoid();
                  }
                }}
              />
              <button type="button" onClick={addAvoid} disabled={!avoidQuery.trim()}>Add food</button>
            </div>
          </div>
          {(draft.allergies.some((food) => !MAJOR_ALLERGENS.includes(food)) || others.length > 0) && (
            <ul className="ob-tags" aria-label="Other foods to avoid">
              {draft.allergies.filter((food) => !MAJOR_ALLERGENS.includes(food)).map((food) => (
                <li key={food}>{food}<button type="button" aria-label={`Remove ${food}`} onClick={() => update({ allergies: draft.allergies.filter((x) => x !== food), allergyChecked: false })}>×</button></li>
              ))}
              {others.map((food) => (
                <li key={food}>{food}<button type="button" aria-label={`Remove ${food}`} onClick={() => update(removeOtherFood(draft, food))}>×</button></li>
              ))}
            </ul>
          )}
          {others.length > 0 && (
            <p className="ob-warn" role="note">
              I can’t check {others.join(", ")} in recipes yet, so the kids’ game will hide every dish
              until a grown-up removes {others.length === 1 ? "it" : "them"} in Parent settings. The meal planner
              still flags {others.length === 1 ? "it" : "them"} for you.
            </p>
          )}
          {hasAvoidList(draft) && (
            <label className="ob-check">
              <input type="checkbox" checked={draft.allergyChecked} onChange={(e) => update({ allergyChecked: e.target.checked })} />
              I have checked the allergy and exclusion list.
            </label>
          )}
          <p className="ob-note">Always check food labels and cross-contact when cooking for real.</p>
        </>
      );
      break;
    case "diet":
      question = "Does your family follow a special diet?";
      hint = "Pick any that apply.";
      body = (
        <div className="ob-grid ob-grid-two" role="group" aria-label="Eating style">
          <Choice pressed={draft.noDiet} onClick={() => update({ noDiet: true, dietary: [] })}>No special diet</Choice>
          {dietaryChoices.map((item) => (
            <Choice key={item} pressed={draft.dietary.includes(item)} onClick={() => update({ dietary: toggle(draft.dietary, item), noDiet: false })}>{item}</Choice>
          ))}
        </div>
      );
      break;
    case "budget":
      question = "What’s your weekly grocery budget?";
      hint = "The meal planner uses it to keep shopping lists affordable. A rough guess is fine.";
      body = (
        <>
          <div className="ob-grid" role="group" aria-label="Weekly grocery budget">
            {BUDGET_CHOICES.map((amount) => (
              <Choice key={amount} pressed={draft.budget === amount && !customBudget} onClick={() => { setCustomBudget(""); update({ budget: amount }); }}>${amount}</Choice>
            ))}
            <Choice pressed={draft.budget === "unsure"} onClick={() => { setCustomBudget(""); update({ budget: "unsure" }); }}>Not sure yet</Choice>
          </div>
          <label className="ob-field ob-field-short">
            Another amount (dollars)
            <input
              inputMode="numeric"
              value={customBudget}
              maxLength={4}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setCustomBudget(digits);
                const value = Number(digits);
                update({ budget: digits && value <= 1000 ? value : null });
              }}
            />
          </label>
        </>
      );
      break;
    case "pin":
      question = "Last step for grown-ups: make a Parent PIN.";
      hint = "Kids need it to open the meal planner, change food settings or delete the profile. It is a family lock for a shared device, saved only in this browser, not a password.";
      action = cloudConfigured ? "Continue" : "Finish";
      body = (
        <>
          <label className="ob-field ob-field-short">
            Parent PIN (4–8 digits)
            <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={(e) => { setError(""); setPin(e.target.value.replace(/\D/g, "")); }} />
          </label>
          <label className="ob-field ob-field-short">
            Type the Parent PIN again
            <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pinAgain} onChange={(e) => { setError(""); setPinAgain(e.target.value.replace(/\D/g, "")); }} />
          </label>
          <label className="ob-check">
            <input type="checkbox" checked={grownUp} onChange={(e) => { setError(""); setGrownUp(e.target.checked); }} />
            I am a parent or guardian, age 18+, and agree to save these settings on this device.
          </label>
        </>
      );
      break;
    case "account":
      question = "Want to save your meal planner online?";
      hint = "Optional. An account keeps your pantry and planner settings across devices. You can skip this and everything stays on this device.";
      action = account ? "Finish" : "Skip for now";
      body = account ? (
        <p className="ob-success" role="status">
          {account.pending
            ? `Check ${account.email} for a confirmation link, then sign in from the meal planner’s Account button.`
            : `Signed in as ${account.email}. Your planner will be saved online when you finish.`}
        </p>
      ) : (
        <div className="ob-account">
          <label className="ob-field">
            Email address
            <input type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="ob-field">
            Password
            <input type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="button" className="ob-secondary" disabled={busy} onClick={() => void authenticate()}>
            {busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button type="button" className="ob-link" onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setError(""); }}>
            {authMode === "signup" ? "I already have an account" : "Create a new account instead"}
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="ob-app">
      <header className="ob-top">
        {index > 0 ? (
          <button type="button" className="ob-back" onClick={back} aria-label="Back">
            <IconArrowLeft size={26} stroke={2.6} aria-hidden="true" />
          </button>
        ) : (
          <span className="ob-back-space" aria-hidden="true" />
        )}
        <div
          className="ob-progress"
          role="progressbar"
          aria-label="Sign-up progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={index ? `Question ${index} of ${questions}` : "Welcome"}
        >
          <span style={{ width: `${Math.max(progress, 4)}%` }} />
        </div>
      </header>
      <form className={`ob-screen ob-in-${direction}`} key={step} onSubmit={(e) => void next(e)} noValidate>
        <SeedySays mood={mood} big={step === "welcome"}>
          <h1 ref={heading} tabIndex={-1}>{question}</h1>
          {hint && <p>{hint}</p>}
        </SeedySays>
        {body && <div className="ob-body">{body}</div>}
        <div className="ob-footer">
          {error && <p className="ob-error" role="alert">{error}</p>}
          <button type="submit" className={`ob-continue${ready ? "" : " is-waiting"}`} disabled={busy}>
            {busy && step === "pin" ? "Saving…" : action}
          </button>
          {step === "welcome" && <p className="ob-fine">For a parent or guardian. Your answers stay on this device{cloudConfigured ? " unless you choose to save online" : ""}.</p>}
        </div>
      </form>
    </div>
  );
}
