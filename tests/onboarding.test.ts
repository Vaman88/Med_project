import assert from "node:assert/strict";
import test from "node:test";
import {
  ONBOARDING_STEPS, addAvoidFood, allergyConfirmed, draftToFamily, emptyDraft, onboardingSteps,
  parseDraft, removeOtherFood, stepProblem, type OnboardingDraft,
} from "../src/lib/onboarding";
import { childPlannerSnapshot, recipeChoices } from "../src/lib/little-kitchen";
import { chefTitle } from "../src/lib/chef-name";

const lock = { pinSalt: "ab".repeat(16), pinHash: "cd".repeat(32) };
function answered(patch: Partial<OnboardingDraft> = {}): OnboardingDraft {
  return {
    ...emptyDraft(), parentName: "Maya", age: 7, householdSize: 4, pantry: ["Banana", "Oats", "Egg", "Plain yogurt"],
    noAllergies: true, noDiet: true, budget: 50, ...patch,
  };
}

test("one sign-up flow: profile questions, then pantry and food steps, then the Parent PIN", () => {
  assert.deepEqual(onboardingSteps(false), [
    "welcome", "parent", "age", "household", "pantry", "equipment", "avoid", "diet", "budget", "pin",
  ]);
  // The optional online account only appears when Supabase is configured, as the last step.
  assert.deepEqual(onboardingSteps(true), [...ONBOARDING_STEPS]);
  assert.equal(onboardingSteps(true).at(-1), "account");
  // There is no chef naming step anywhere, and no step asks for the child's name.
  assert.ok(!ONBOARDING_STEPS.some((step) => /name|chef|nick/i.test(step)));
});

test("each question must be answered before continuing, and the pantry is not left for later", () => {
  const empty = emptyDraft();
  for (const step of ["parent", "age", "household", "pantry", "avoid", "diet", "budget"] as const)
    assert.ok(stepProblem(step, empty), step);
  assert.equal(stepProblem("welcome", empty), "");
  assert.match(stepProblem("pantry", empty), /at least one food/);
  assert.equal(stepProblem("parent", { ...empty, parentName: "  " }), stepProblem("parent", empty));
  assert.equal(stepProblem("equipment", empty), "");
  assert.ok(stepProblem("equipment", { ...empty, equipment: [] }));
  const done = answered();
  for (const step of ONBOARDING_STEPS) assert.equal(stepProblem(step, done), "", step);
});

test("foods to avoid need an explicit none or a checked list", () => {
  let d = answered({ noAllergies: false });
  assert.match(stepProblem("avoid", d), /No known food allergies/);
  d = { ...d, allergies: ["Egg"] };
  assert.match(stepProblem("avoid", d), /tick the box/);
  assert.equal(allergyConfirmed(d), false);
  d = { ...d, allergyChecked: true };
  assert.equal(stepProblem("avoid", d), "");
  assert.equal(allergyConfirmed(d), true);
});

test("typed foods to avoid become tagged allergies or free text, and reset the check", () => {
  let d = answered({ allergyChecked: true });
  const known = addAvoidFood(d, "  peanut ");
  assert.ok(!("error" in known));
  d = known as OnboardingDraft;
  assert.deepEqual(d.allergies, ["Peanut"]);
  assert.equal(d.noAllergies, false);
  assert.equal(d.allergyChecked, false);
  d = addAvoidFood(d, "kiwi") as OnboardingDraft;
  d = addAvoidFood(d, "Mango") as OnboardingDraft;
  d = addAvoidFood(d, "KIWI") as OnboardingDraft;
  assert.equal(d.otherAllergies, "kiwi, Mango");
  assert.equal(removeOtherFood(d, "kiwi").otherAllergies, "Mango");
  assert.ok("error" in addAvoidFood({ ...d, otherAllergies: "x".repeat(199) }, "melon"));
});

test("finished answers save as a valid family that the kids' game and planner both use", () => {
  const parsed = draftToFamily(answered({
    noAllergies: false, allergies: ["Egg"], otherAllergies: "kiwi", allergyChecked: true,
    noDiet: false, dietary: ["Vegetarian"], budget: "unsure",
  }), lock);
  assert.ok(parsed.success);
  const family = parsed.data;
  assert.equal(family.parentName, "Maya");
  assert.equal(family.age, 7);
  assert.equal(family.householdSize, 4);
  assert.equal(family.weeklyBudget, undefined);
  assert.equal(family.allergyConfirmed, true);
  assert.equal(family.parentConfirmed, true);
  assert.equal(family.pinHash, lock.pinHash);
  assert.equal(family.nickname, undefined);
  assert.equal(chefTitle(family.nickname), "Chef Seedy");
  // The allergy check hides dishes with the avoided food in the kids' game...
  const noAllergy = draftToFamily(answered(), lock);
  assert.ok(noAllergy.success);
  assert.ok(recipeChoices(family).length < recipeChoices(noAllergy.data).length);
  // ...and the same limits carry into the parent's meal planner.
  const planner = childPlannerSnapshot(family);
  assert.deepEqual(planner.profile.allergies, ["egg"]);
  assert.ok(planner.profile.members?.[0].allergies.some((item) => item.rawText === "kiwi"));
  assert.deepEqual(planner.foods.map((food) => food.label), ["Banana", "Oats", "Egg", "Plain yogurt"]);
  assert.equal(planner.profile.householdSize, 4);
  assert.equal(planner.profile.weeklyBudgetCents, 2500);
  assert.equal(childPlannerSnapshot({ ...family, weeklyBudget: 75 }).profile.weeklyBudgetCents, 7500);
});

test("a family cannot be saved without the allergy confirmation or the child's age", () => {
  assert.equal(draftToFamily(answered({ noAllergies: false }), lock).success, false);
  assert.equal(draftToFamily(answered({ age: null }), lock).success, false);
});

test("a saved draft restores, and broken drafts are ignored", () => {
  const d = answered({ step: "budget" });
  assert.deepEqual(parseDraft(JSON.stringify(d)), d);
  assert.equal(parseDraft("{"), null);
  assert.equal(parseDraft(JSON.stringify({ ...d, step: "chef-name" })), null);
  assert.equal(parseDraft(null), null);
});
