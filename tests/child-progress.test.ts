import { test } from "node:test";
import assert from "node:assert/strict";
import { awardRecipe, emptyProgress } from "../src/lib/child-progress";
import { familySchema, recipeChoices } from "../src/lib/little-kitchen";

const family = familySchema.parse({
  version: 1,
  age: 7,
  pantry: ["Black beans", "Oats", "Banana", "Cocoa", "Egg"],
  allergies: [],
  otherAllergies: "",
  allergyConfirmed: true,
  parentConfirmed: true,
});

test("older saved child profiles still load and equipment is respected when supplied", () => {
  assert.equal(
    recipeChoices(family).find((item) => item.recipe.id === "brownies")?.missing
      .length,
    0,
  );
  const withoutOven = familySchema.parse({
    ...family,
    equipment: ["Stove", "No-cook"],
  });
  assert.deepEqual(
    recipeChoices(withoutOven).find((item) => item.recipe.id === "brownies")
      ?.missing,
    ["an oven"],
  );
});

test("dietary filters never surface recipes with excluded ingredients", () => {
  const dairyFree = familySchema.parse({ ...family, dietary: ["Dairy-free"] });
  assert.equal(
    recipeChoices(dairyFree).some((item) => item.recipe.id === "pancakes"),
    false,
  );
  assert.equal(
    recipeChoices(dairyFree).some((item) => item.recipe.id === "brownies"),
    true,
  );
  const glutenFree = familySchema.parse({
    ...family,
    dietary: ["Gluten-free"],
  });
  assert.ok(
    recipeChoices(glutenFree).every(
      ({ recipe }) => !recipe.allergens.some((item) => ["Wheat", "Oats"].includes(item)),
    ),
  );
});

test("completing recipes records replays and stars without replacing earlier progress", () => {
  const once = awardRecipe(emptyProgress(), "brownies", 2);
  const twice = awardRecipe(once, "brownies", 1);
  assert.equal(twice.completed.brownies, 2);
  assert.equal(twice.stars, 5);
});
