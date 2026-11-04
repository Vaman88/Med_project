import { test } from "node:test";
import assert from "node:assert/strict";
import {
  childPlannerSnapshot,
  familySchema,
  pantryFoods,
  recipeChoices,
  littleRecipes,
  type Family,
} from "../src/lib/little-kitchen";
import { effectiveAllergies } from "../src/lib/food-settings";
const family: Family = {
  version: 1,
  age: 7,
  pantry: [...pantryFoods],
  allergies: [],
  otherAllergies: "",
  allergyConfirmed: true,
  parentConfirmed: true,
};
test("pantry controls readiness; no recipe is ready with missing ingredients", () => {
  assert.equal(
    recipeChoices(family).filter((c) => !c.missing.length).length,
    19,
  );
  assert.ok(
    recipeChoices({ ...family, pantry: [] }).every((c) => c.missing.length),
  );
  const choices = recipeChoices({
    ...family,
    pantry: ["Black beans", "Oats", "Banana", "Cocoa", "Egg"],
  });
  assert.deepEqual(
    choices.filter((c) => !c.missing.length).map((c) => c.recipe.id),
    ["brownies"],
  );
});
test("all ingredient allergies hide matching recipes, and unrecognized exclusions stop matching", () => {
  for (const recipe of littleRecipes)
    for (const allergy of recipe.allergens) {
      assert.ok(
        !recipeChoices({
          ...family,
          allergies: [allergy as Family["allergies"][number]],
        }).some((c) => c.recipe.id === recipe.id),
      );
    }
  assert.ok(
    recipeChoices({ ...family, allergies: ["Milk", "Egg"] }).every(
      ({ recipe }) => !recipe.allergens.includes("Milk") && !recipe.allergens.includes("Egg"),
    ),
  );
  assert.deepEqual(
    recipeChoices({ ...family, otherAllergies: "cinnamon" }),
    [],
  );
});
test("parent setup validates age, consent and persisted data", () => {
  for (const age of [4, 18, 7.5])
    assert.equal(familySchema.safeParse({ ...family, age }).success, false);
  for (const key of ["parentConfirmed", "allergyConfirmed"])
    assert.equal(
      familySchema.safeParse({ ...family, [key]: false }).success,
      false,
    );
  assert.ok(familySchema.safeParse({ ...family, age: 10 }).success);
  assert.ok(familySchema.safeParse({ ...family, pantry: ["Unknown food"] }).success);
  assert.equal(
    familySchema.safeParse({ ...family, pantry: ["A".repeat(81)] }).success,
    false,
  );
  assert.equal(
    familySchema.safeParse({ ...family, pantry: ["Apple", "apple"] }).success,
    false,
  );
});
test("older child handoff preserves standard allergies and holds unsupported exclusions", () => {
  const saved = childPlannerSnapshot({
    ...family,
    age: 10,
    allergies: ["Peanut", "Oats"],
  });
  assert.deepEqual(saved.profile.allergies, ["peanut"]);
  assert.equal(effectiveAllergies(saved.profile).unresolved, true);
  assert.equal(saved.foods.length, family.pantry.length);
  assert.equal(saved.foods[0].quantity, 500, "ticked pantry foods carry a household-sized amount");
});
