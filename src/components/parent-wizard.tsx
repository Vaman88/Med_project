"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { PIN_PATTERN, createParentPin, hasParentPin } from "@/lib/parent-lock";
import {
  allergyChoices,
  dietaryChoices,
  equipmentChoices,
  familySchema,
  pantryFoods,
  type Family,
} from "@/lib/little-kitchen";
import {
  LAST_SETUP_STEP as last,
  PROFILE_STEP,
  SETUP_STEPS as steps,
  keptChefFields,
  validChildAge,
} from "@/lib/family-setup";
import { ChefAvatar } from "./chef-avatar";

export function PantryPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (foods: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const term = query.trim();
  const matches = term
    ? pantryFoods
        .filter(
          (food) =>
            food.toLowerCase().includes(term.toLowerCase()) &&
            !selected.some((item) => item.toLowerCase() === food.toLowerCase()),
        )
        .sort((a, b) =>
          Number(b.toLowerCase().startsWith(term.toLowerCase())) -
          Number(a.toLowerCase().startsWith(term.toLowerCase())),
        )
        .slice(0, 8)
    : [];
  const custom =
    term.length > 0 &&
    term.length <= 80 &&
    !pantryFoods.some((food) => food.toLowerCase() === term.toLowerCase()) &&
    !selected.some((food) => food.toLowerCase() === term.toLowerCase());
  const options = [...matches, ...(custom ? [term] : [])];
  function add(food: string) {
    if (selected.length >= 100) return;
    if (!selected.some((item) => item.toLowerCase() === food.toLowerCase()))
      onChange([...selected, food]);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") setOpen(false);
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((value) => (value + 1) % options.length);
    }
    if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((value) => (value - 1 + options.length) % options.length);
    }
    if (event.key === "Enter" && open && options.length) {
      event.preventDefault();
      add(options[active] ?? options[0]);
    }
  }
  return (
    <div className="pantry-picker">
      <label htmlFor={`${listId}-input`}>Search for a food</label>
      <div className="pantry-search">
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          maxLength={80}
          placeholder="Start typing, for example apple"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={keyDown}
        />
        {open && options.length > 0 && (
          <div id={listId} role="listbox" className="pantry-options">
            {options.map((food, index) => (
              <button
                id={`${listId}-${index}`}
                key={food}
                type="button"
                role="option"
                aria-selected={active === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(food)}
              >
                {custom && index === options.length - 1 ? `Add “${food}”` : food}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="pantry-help">Choose a suggestion or add your own food. Recipes appear when their ingredients are selected. Up to 100 foods can be saved.</p>
      <div className="pantry-selected" aria-label="Foods in your pantry">
        {selected.map((food) => (
          <span key={food}>
            {food}
            <button
              type="button"
              aria-label={`Remove ${food}`}
              onClick={() => onChange(selected.filter((item) => item !== food))}
            >
              ×
            </button>
          </span>
        ))}
        {!selected.length && <p>No foods added yet.</p>}
      </div>
    </div>
  );
}

export function ParentWizard({
  initial,
  startStep = 0,
  onSave,
  onCancel,
}: {
  initial: Family | null;
  /** Step to open on, when a grown-up edits one section from the child profile page. */
  startStep?: number;
  onSave: (family: Family) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(startStep);
  const [age, setAge] = useState(initial?.age.toString() ?? "");
  const [parentName, setParentName] = useState(initial?.parentName ?? "");
  // Every child gets the chef companion automatically; there is no naming or look step.
  const chef = keptChefFields(initial);
  const [pantry, setPantry] = useState<Family["pantry"]>(initial?.pantry ?? []);
  const [allergies, setAllergies] = useState<Family["allergies"]>(
    initial?.allergies ?? [],
  );
  const [allergyQuery, setAllergyQuery] = useState("");
  const [other, setOther] = useState(initial?.otherAllergies ?? "");
  const [confirmed, setConfirmed] = useState(
    initial?.allergyConfirmed ?? false,
  );
  const [parent, setParent] = useState(
    Boolean(initial?.parentConfirmed),
  );
  const [budget, setBudget] = useState(initial?.weeklyBudget?.toString() ?? "");
  const [household, setHousehold] = useState(
    initial?.householdSize?.toString() ?? "",
  );
  const [equipment, setEquipment] = useState<NonNullable<Family["equipment"]>>(
    initial?.equipment ?? ["Oven", "Stove"],
  );
  const [store, setStore] = useState(initial?.store ?? "");
  const [dietary, setDietary] = useState<NonNullable<Family["dietary"]>>(
    initial?.dietary ?? [],
  );
  const [favorites, setFavorites] = useState<NonNullable<Family["favorites"]>>(
    initial?.favorites ?? [],
  );
  const [error, setError] = useState("");
  // A brand-new kitchen (or an older one saved before PINs) gets its Parent PIN here.
  const needsPin = !hasParentPin(initial);
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");

  function advance() {
    if (step === PROFILE_STEP.avoid && !confirmed) {
      setError("Please check the allergy information before continuing.");
      return;
    }
    setError("");
    setStep((current) => Math.min(last, current + 1));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step < last) {
      advance();
      return;
    }
    await saveChanges();
  }
  async function saveChanges() {
    if (!validChildAge(age)) {
      setStep(last);
      setError("Add the child’s age, from 5 to 17.");
      return;
    }
    if (!confirmed) {
      setStep(PROFILE_STEP.avoid);
      setError("Please check the allergy information before saving.");
      return;
    }
    if (!parent) {
      setStep(last);
      setError("Confirm you are a parent or guardian before saving.");
      return;
    }
    if (needsPin && (!PIN_PATTERN.test(pin) || pin !== pinAgain)) {
      setStep(last);
      setError(
        PIN_PATTERN.test(pin)
          ? "The two Parent PINs do not match. Type the same PIN twice."
          : "Create a Parent PIN of 4 to 8 digits before saving.",
      );
      return;
    }
    let lockFields: { pinSalt: string; pinHash: string };
    try {
      lockFields = needsPin
        ? await createParentPin(pin)
        : { pinSalt: initial!.pinSalt!, pinHash: initial!.pinHash! };
    } catch {
      setError("This browser could not create a Parent PIN. Try another browser.");
      return;
    }
    const parsed = familySchema.safeParse({
      version: 1,
      age: Number(age),
      ...(parentName.trim() ? { parentName: parentName.trim() } : {}),
      // The companion is always Chef Seedy: there is no chef name, only an older saved look.
      ...chef,
      pantry,
      allergies,
      otherAllergies: other,
      allergyConfirmed: confirmed,
      parentConfirmed: true,
      weeklyBudget: budget ? Number(budget) : undefined,
      householdSize: household ? Number(household) : undefined,
      equipment,
      store,
      dietary,
      favorites: favorites.filter((food) => pantry.includes(food)),
      ...lockFields,
    });
    if (!parsed.success) {
      setError(
        "Review your entries. Budget and household size must be whole numbers.",
      );
      return;
    }
    onSave(parsed.data);
  }
  function toggle<T extends string>(
    values: T[],
    value: T,
    update: (next: T[]) => void,
  ) {
    update(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }
  function addTypedAllergy() {
    const entry = allergyQuery.trim();
    if (!entry) return;
    const known = allergyChoices.find(
      (food) => food.toLowerCase() === entry.toLowerCase(),
    );
    if (known) {
      if (!allergies.includes(known)) setAllergies([...allergies, known]);
    } else if (
      !other.split(",").some((food) => food.trim().toLowerCase() === entry.toLowerCase())
    ) {
      const next = other.trim() ? `${other.trim()}, ${entry}` : entry;
      if (next.length > 200) {
        setError("Other allergies and exclusions can be up to 200 characters.");
        return;
      }
      setOther(next);
    }
    setAllergyQuery("");
    setConfirmed(false);
    setError("");
  }
  const matchingAllergies = allergyChoices.filter((food) =>
    food.toLowerCase().includes(allergyQuery.trim().toLowerCase()),
  );
  return (
    <div className="little-app parent-wizard-app">
      <header className="little-header">
        <strong className="little-brand">
          🍳 Healthy Steps <b>Parent setup</b>
        </strong>
        <button onClick={onCancel}>Back</button>
      </header>
      <main className="wizard-shell">
        <aside className="wizard-intro">
          <span className="little-kicker">For grown-ups</span>
          <h1>Your family’s kitchen settings.</h1>
          <p>
            Change the pantry, foods to avoid and family details you gave at
            sign-up. Playful recipes come from these foods and equipment.
          </p>
          <div className="wizard-chef-preview">
            <ChefAvatar avatar={chef.avatar!} />
          </div>
          <p className="wizard-privacy">
            Saved on this device. Food settings and budget stay in the parent
            area. Device storage is not encrypted.
          </p>
        </aside>
        <form className="wizard-card" onSubmit={submit}>
          <div className="wizard-count">Step {step + 1} of {steps.length}</div>
          <div
            className="wizard-progress"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={step + 1}
          >
            <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <h2>{steps[step]}</h2>
          {step === PROFILE_STEP.pantry && (
            <fieldset>
              <legend>What’s in your pantry?</legend>
              <p>The foods you have at home today.</p>
              <PantryPicker selected={pantry} onChange={setPantry} />
            </fieldset>
          )}
          {step === PROFILE_STEP.avoid && (
            <fieldset>
              <legend>Food allergies and exclusions</legend>
              <p>
                Recipes with selected ingredients will be hidden. Check food
                labels and cross-contact for real cooking.
              </p>
              <div className="wizard-allergy-entry">
                <label htmlFor="wizard-allergy-search">Search or type a food allergy</label>
                <div>
                  <input
                    id="wizard-allergy-search"
                    value={allergyQuery}
                    maxLength={80}
                    autoComplete="off"
                    placeholder="For example milk, sesame, or kiwi"
                    onChange={(e) => setAllergyQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTypedAllergy();
                      }
                    }}
                  />
                  <button type="button" onClick={addTypedAllergy} disabled={!allergyQuery.trim()}>
                    Add food
                  </button>
                </div>
                <small>Choose a matching food below, or add the name you typed.</small>
              </div>
              <div className="wizard-check-grid">
                {matchingAllergies.map((food) => (
                  <label key={food}>
                    <input
                      type="checkbox"
                      checked={allergies.includes(food)}
                      onChange={() => {
                        toggle(allergies, food, setAllergies);
                        setConfirmed(false);
                      }}
                    />
                    {food}
                  </label>
                ))}
              </div>
              {allergyQuery.trim() && !matchingAllergies.length && (
                <p className="wizard-allergy-no-match">No preset match. Use Add food to save it for review.</p>
              )}
              <label className="wizard-wide">
                Other food allergies or exclusions
                <input
                  value={other}
                  maxLength={200}
                  onChange={(e) => {
                    setOther(e.target.value);
                    setConfirmed(false);
                  }}
                />
              </label>
              <label className="wizard-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                {allergies.length || other
                  ? "I have checked the allergy and exclusion list."
                  : "I confirm there are no known food allergies."}
              </label>
              <h3>Dietary preferences</h3>
              <div className="wizard-check-grid">
                {dietaryChoices.map((item) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={dietary.includes(item)}
                      onChange={() => toggle(dietary, item, setDietary)}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {step === last && (
            <div className="wizard-fields">
              <label>
                Your first name (optional)
                <input
                  value={parentName}
                  maxLength={40}
                  autoComplete="given-name"
                  onChange={(e) => setParentName(e.target.value)}
                />
              </label>
              <label>
                Child’s age
                <input
                  type="number"
                  min="5"
                  max="17"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </label>
              <p>
                The other details are for parents and stay out of the cooking game.
              </p>
              <label>
                Weekly grocery budget (optional, dollars)
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </label>
              <label>
                Household size (optional)
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={household}
                  onChange={(e) => setHousehold(e.target.value)}
                />
              </label>
              <label>
                Preferred store (optional)
                <input
                  value={store}
                  maxLength={80}
                  onChange={(e) => setStore(e.target.value)}
                />
              </label>
              <fieldset>
                <legend>Available equipment</legend>
                <div className="wizard-check-grid">
                  {equipmentChoices.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={equipment.includes(item)}
                        onChange={() => toggle(equipment, item, setEquipment)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Favorite foods (optional)</legend>
                <div className="wizard-check-grid">
                  {pantry.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={favorites.includes(item)}
                        onChange={() => toggle(favorites, item, setFavorites)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="wizard-confirm">
                <input
                  type="checkbox"
                  checked={parent}
                  onChange={(e) => setParent(e.target.checked)}
                />
                I am a parent or guardian, age 18+, and agree to save these
                settings on this device.
              </label>
              {needsPin && (
                <fieldset className="wizard-pin">
                  <legend>Parent PIN</legend>
                  <p>
                    Children will need this PIN to open the meal planner, change food settings or
                    delete the profile. It is a family control for a shared device, not a
                    password: it is stored only in this browser.
                  </p>
                  <label>
                    Parent PIN (4–8 digits)
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    />
                  </label>
                  <label>
                    Type the Parent PIN again
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={8}
                      value={pinAgain}
                      onChange={(e) => setPinAgain(e.target.value.replace(/\D/g, ""))}
                    />
                  </label>
                </fieldset>
              )}
            </div>
          )}
          {error && (
            <p role="alert" className="wizard-error">
              {error}
            </p>
          )}
          <div className="wizard-actions">
            {step > 0 && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}
              >
                Previous
              </button>
            )}
            <button className={initial && step < last ? undefined : "little-primary"} type="submit">
              {step === last
                ? initial
                  ? "Save kitchen"
                  : "Create kitchen"
                : "Continue →"}
            </button>
            {initial && step < last && (
              <button className="little-primary" type="button" onClick={() => void saveChanges()}>
                Save changes
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
