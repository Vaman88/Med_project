import assert from "node:assert/strict";
import test from "node:test";
import { chefTitle } from "../src/lib/chef-name";
import {
  DEFAULT_AVATAR, LAST_SETUP_STEP, PROFILE_STEP, SETUP_STEPS, hasCustomChef, keptChefFields, resetChef, validChildAge,
} from "../src/lib/family-setup";
import { familySchema, type Family } from "../src/lib/little-kitchen";

const base: Family = {
  version: 1, age: 7, pantry: ["Banana"], allergies: [], otherAllergies: "",
  allergyConfirmed: true, parentConfirmed: true,
};

test("the child's age on the last setup step must be a whole number from 5 to 17", () => {
  for (const ok of ["5", "7", "12", "17", " 9 "]) assert.ok(validChildAge(ok), ok);
  for (const bad of ["", "  ", "4", "18", "7.5", "-7", "seven"]) assert.ok(!validChildAge(bad), bad);
});

test("setup has three steps with no naming step, and each profile section opens its own step", () => {
  assert.deepEqual([...SETUP_STEPS], ["Your pantry", "Foods to avoid", "Family details"]);
  assert.ok(!SETUP_STEPS.some((title) => /chef|name/i.test(title)));
  assert.equal(SETUP_STEPS[PROFILE_STEP.pantry], "Your pantry");
  assert.equal(SETUP_STEPS[PROFILE_STEP.avoid], "Foods to avoid");
  assert.equal(SETUP_STEPS[PROFILE_STEP.details], "Family details");
  assert.equal(LAST_SETUP_STEP, PROFILE_STEP.details);
});

test("new profiles get the default chef look and Chef Seedy", () => {
  const chef = keptChefFields(null);
  assert.deepEqual(chef, { nickname: undefined, avatar: DEFAULT_AVATAR });
  const family = familySchema.parse({ ...base, ...chef });
  assert.equal(chefTitle(family.nickname), "Chef Seedy");
  assert.equal(hasCustomChef(family), false);
});

test("editing an older profile keeps its saved chef name and look", () => {
  const avatar = { skin: "deep", hair: "buns", apron: "mint" } as const;
  const older = familySchema.parse({ ...base, nickname: "Eli", avatar });
  const chef = keptChefFields(older);
  assert.equal(chef.nickname, "Eli");
  assert.deepEqual(chef.avatar, avatar);
  // A profile saved with a nickname but no look gets the default look, and keeps the name.
  assert.deepEqual(keptChefFields({ ...base, nickname: "Eli" }), { nickname: "Eli", avatar: DEFAULT_AVATAR });
});

test("a grown-up can reset an older custom chef back to Seedy", () => {
  const older = familySchema.parse({ ...base, nickname: "Eli", avatar: { skin: "deep", hair: "buns", apron: "mint" } });
  assert.equal(hasCustomChef(older), true);
  assert.equal(hasCustomChef({ ...base, avatar: { ...DEFAULT_AVATAR, apron: "mint" } }), true);
  assert.equal(hasCustomChef({ ...base, nickname: "  " }), false);
  const reset = resetChef(older);
  assert.equal("nickname" in reset, false);
  assert.equal("avatar" in reset, false);
  assert.equal(hasCustomChef(reset), false);
  assert.equal(chefTitle(reset.nickname), "Chef Seedy");
  assert.deepEqual(familySchema.parse(reset), reset);
});
