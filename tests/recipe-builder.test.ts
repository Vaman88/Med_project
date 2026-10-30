import assert from "node:assert/strict";
import test from "node:test";
import { littleRecipes } from "../src/lib/little-kitchen";
import { buildRecipeStages, recipeDish } from "../src/lib/recipe-builder";

test("every kitchen recipe uses its real ingredients in a playable sequence", () => {
  // The older recipe-builder game only knows the original six dishes.
  const original = ["brownies", "pizza", "pancakes", "parfait", "veggie-dippers", "bean-salad"];
  const legacy = littleRecipes.filter((recipe) => original.includes(recipe.id));
  assert.equal(legacy.length, 6);
  for (const recipe of legacy) {
    const stages = buildRecipeStages(recipe);
    const foods = stages.flatMap((stage) => stage.kind === "add"
      ? stage.items.map((item) => item.food)
      : []);
    assert.deepEqual(foods.sort(), recipe.ingredients.map(({ food }) => food).sort(), recipe.title);
    assert.ok(stages[0].kind === "prep", recipe.title);
    assert.ok(stages.some((stage) => stage.kind === "quiz"), recipe.title);
    assert.ok(stages.at(-1)?.kind === "serve", recipe.title);
    assert.equal(stages.some((stage) => stage.kind === "cook"), recipe.game !== "assembly", recipe.title);
    assert.ok(recipeDish(recipe));
    for (const stage of stages)
      if (stage.kind === "add")
        for (const item of stage.items) assert.ok(item.need > 0 && item.need <= 3);
  }
});
