import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  allergyChoices, littleRecipes, pantryFoods, recipeChoices, type Family, type LittleRecipe,
} from "../src/lib/little-kitchen";
import {
  KABOB_SLOTS, COOKIE_SLOTS, completeDish, doCut, doFlip, doMash, doPaint, doPour, doScoop, doStir, dropItem,
  dropZone, emptyDish, finalSurface, placedCount, planFor, setHeat, simulatedSeconds, stepDone, trayItems,
  type DishState, type Step,
} from "../src/lib/cooking";
import { PAINT_VALID, paintNext, type Surface } from "../src/lib/cooking-geometry";
import { recipeChallenges } from "../src/lib/chef-challenges";
import { ART, ASSET_LABEL } from "../src/components/food-art";
import { CookingScene } from "../src/components/cooking-scene";

const NEW_IDS = [
  "fruit-salad", "avocado-toast", "quesadilla", "veggie-wrap", "oatmeal-bowl",
  "banana-oat-cookies", "tomato-pasta", "egg-muffins", "fruit-kabobs", "veggie-fried-rice",
];
const recipe = (id: string) => littleRecipes.find((r) => r.id === id)!;
const SURFACES: Surface[] = ["board", "glass", "bowl", "pita", "pan", "plate"];

const family: Family = {
  version: 1, age: 7, pantry: [...pantryFoods], allergies: [], otherAllergies: "",
  allergyConfirmed: true, parentConfirmed: true,
};
const idsFor = (f: Family) => recipeChoices(f).map((c) => c.recipe.id);

/** Plays one recipe from an empty dish using only the pure game functions. */
function play(r: LittleRecipe): { plan: Step[]; dish: DishState } {
  const plan = planFor(r);
  let dish = emptyDish();
  for (const step of plan) {
    if (step.kind === "quiz") continue;
    assert.equal(stepDone(step, dish), false, `${r.id}/${step.id} starts unfinished`);
    switch (step.kind) {
      case "drop": {
        for (const item of step.items) {
          for (let i = 0; i < item.count; i++) {
            const before = dish;
            dish = dropItem(dish, step, plan, item.asset);
            assert.notEqual(dish, before, `${r.id}/${step.id} accepts ${item.asset} #${i + 1}`);
            const drop = dish.drops.at(-1)!;
            assert.equal(drop.zone, step.zone);
            if (!step.fixed && !step.slots) {
              const { area } = dropZone(step, dish, plan);
              const inside = ((drop.x - area.cx) / area.rx) ** 2 + ((drop.y - area.cy) / area.ry) ** 2;
              assert.ok(inside <= 1.0001, `${r.id}/${step.id} keeps ${item.asset} on the surface`);
            }
          }
        }
        // Extra drops are ignored.
        const again = dropItem(dish, step, plan, step.items[0].asset);
        assert.equal(again, dish, `${r.id}/${step.id} ignores extra ${step.items[0].asset}`);
        assert.equal(trayItems(step, dish).every((t) => t.left === 0), true);
        break;
      }
      case "cut": for (let i = 0; i < step.cuts; i++) dish = doCut(dish, step, i); break;
      case "mash": for (let i = 0; i < step.spots; i++) dish = doMash(dish, step, i); break;
      case "scoop": for (let i = 0; i < step.count; i++) dish = doScoop(dish, step); break;
      case "pour": dish = doPour(dish, step); break;
      case "spread": {
        for (let guard = 0; guard < 60 && !stepDone(step, dish); guard++)
          dish = doPaint(dish, step, paintNext(dish.paint[step.id] ?? []));
        break;
      }
      case "stir": {
        for (let guard = 0; guard < 40 && !stepDone(step, dish); guard++) dish = doStir(dish, step, 90);
        break;
      }
      case "cook": dish = setHeat(dish, step, 1); break;
      case "flip": for (let i = 0; i < step.count; i++) dish = doFlip(dish, step, i); break;
    }
    assert.ok(stepDone(step, dish), `${r.id}/${step.id} finishes`);
  }
  return { plan, dish };
}

test("there are sixteen recipes with the new ids, unique ids and photo paths", () => {
  assert.equal(littleRecipes.length, 16);
  assert.equal(new Set(littleRecipes.map((r) => r.id)).size, 16);
  assert.equal(new Set(littleRecipes.map((r) => r.title)).size, 16);
  for (const id of NEW_IDS) {
    const r = recipe(id);
    assert.ok(r, id);
    assert.ok(r.image.startsWith("/images/") && existsSync(`public${r.image}`), `${id} has a local recipe photo`);
    assert.ok(r.servings && r.servings.length > 3, `${id} says how many it makes`);
    assert.ok(r.ingredients.length >= 3 && r.ingredients.every((i) => i.amount.trim().length >= 1), id);
    assert.ok(r.adultSteps.length >= 2, id);
    assert.ok(r.minutes > 0 && r.benefit.length > 10, id);
    assert.ok(["breakfast", "lunch", "sweet"].includes(r.category ?? ""), id);
    // No weight-loss or good/bad food language for children.
    assert.ok(!/diet|weight|calorie|junk|unhealthy|guilt|fattening|clean eating/i.test(JSON.stringify(r)), id);
  }
});

test("every new recipe plays through to a finished dish with pure game functions", () => {
  for (const id of NEW_IDS) {
    const r = recipe(id);
    const { plan, dish } = play(r);
    assert.equal(plan.filter((s) => s.kind === "quiz").length, 2, id);
    assert.equal(new Set(plan.map((s) => s.id)).size, plan.length, `${id} step ids are unique`);
    assert.equal(plan.at(-1)!.kind, "quiz", id);
    assert.equal(plan.at(-1)!.surface, finalSurface(r), `${id} ends on the finished dish`);
    // Distinct, varied actions.
    assert.ok(new Set(plan.map((s) => s.kind)).size >= (id === "fruit-kabobs" ? 3 : 4), `${id} has varied actions`);
    // Playing step by step lands on the same dish as the preview helper.
    assert.equal(completeDish(r).drops.length, dish.drops.length, id);
  }
});

test("every asset in every plan has art, a label and a valid place to go", () => {
  for (const id of NEW_IDS) {
    const r = recipe(id);
    const plan = planFor(r);
    const assets = new Set<string>();
    for (const s of plan) {
      assert.ok(SURFACES.includes(s.surface), `${id}/${s.id} surface`);
      if (s.kind === "drop") {
        assert.ok(SURFACES.includes(s.zone), `${id}/${s.id} zone`);
        s.items.forEach((i) => assets.add(i.asset));
        if (s.slots) assert.ok(s.slots.length >= s.items.reduce((n, i) => n + i.count, 0), `${id}/${s.id} has a spot for every piece`);
      }
      if (s.kind === "cut") { assets.add(s.result); assets.add(`${s.food}:whole`); }
      if (s.kind === "mash") { assets.add(`${s.food}:whole`); assets.add(`${s.food}:mash`); }
      if (s.kind === "scoop" || s.kind === "pour") assets.add(s.asset);
    }
    for (const a of assets) {
      assert.ok(ART[a], `${id}: ${a} has art`);
      assert.ok(ASSET_LABEL[a], `${id}: ${a} has a label`);
    }
  }
  assert.equal(KABOB_SLOTS.length, 9);
  assert.equal(COOKIE_SLOTS.length, 6);
});

test("cooking steps are pretend, short and labelled with real kitchen time", () => {
  for (const id of NEW_IDS) {
    const r = recipe(id);
    const plan = planFor(r);
    const cooks = plan.filter((s) => s.kind === "cook");
    assert.equal(cooks.length > 0, r.game !== "assembly", id);
    for (const c of cooks) {
      assert.ok(c.kind === "cook" && /minutes/.test(c.real) && c.seconds <= 8, `${id}/${c.id}`);
      assert.ok(/grown-up|Grown-up/.test(c.hint + c.real), `${id}/${c.id} points to a grown-up for real heat`);
    }
    assert.ok(simulatedSeconds(plan) <= 16, id);
    if (r.game !== "assembly") assert.ok(["Oven", "Stove"].includes(r.heat ?? ""), `${id} names its heat source`);
    // Adult notes mention a grown-up for knives or heat.
    assert.ok(r.adultSteps.some((s) => /grown-up/i.test(s)) || r.game === "assembly", id);
  }
});

test("each new recipe handles every one of its ingredients in the game", () => {
  const words: Record<string, string> = {
    Banana: "banana", Strawberries: "strawberry", Grapes: "grape", Blueberries: "blueberry", Orange: "orange",
    "Whole wheat bread": "bread", Avocado: "avocado", Tomato: "tomato", Tortillas: "tortilla",
    "Canned black beans": "beans", "Cheddar cheese": "cheese", Hummus: "hummus", Spinach: "spinach",
    Cucumber: "cucumber", Carrots: "carrot", "Bell pepper": "pepper", Oats: "oats", Milk: "milk",
    Raisins: "raisin", Cinnamon: "cinnamon", Pasta: "pasta", "Tomato sauce": "sauce", Mozzarella: "cheese",
    Egg: "egg", "Brown rice": "rice", Peas: "peas", "Soy sauce": "soy",
  };
  for (const id of NEW_IDS) {
    const text = JSON.stringify(planFor(recipe(id)));
    for (const { food } of recipe(id).ingredients) {
      assert.ok(words[food], `${id}: test knows ${food}`);
      assert.ok(text.includes(words[food]), `${id} uses ${food}`);
      assert.ok((pantryFoods as readonly string[]).includes(food), `${food} is a pantry food`);
    }
  }
});

test("allergy tags are valid and filter the new recipes correctly", () => {
  const choices = allergyChoices as readonly string[];
  for (const r of littleRecipes) for (const a of r.allergens) assert.ok(choices.includes(a), `${r.id}: ${a} is a known allergy choice`);

  // Egg
  const noEgg = idsFor({ ...family, allergies: ["Egg"] });
  for (const id of ["egg-muffins", "veggie-fried-rice", "pancakes", "brownies"]) assert.ok(!noEgg.includes(id), `egg removes ${id}`);
  for (const id of ["fruit-salad", "quesadilla", "oatmeal-bowl", "tomato-pasta"]) assert.ok(noEgg.includes(id), `egg keeps ${id}`);
  // Dairy
  const noMilk = idsFor({ ...family, allergies: ["Milk"] });
  for (const id of ["quesadilla", "egg-muffins", "tomato-pasta", "oatmeal-bowl"]) assert.ok(!noMilk.includes(id), `milk removes ${id}`);
  assert.ok(noMilk.includes("veggie-fried-rice") && noMilk.includes("fruit-kabobs"));
  const dairyFree = idsFor({ ...family, dietary: ["Dairy-free"] });
  assert.ok(!dairyFree.includes("quesadilla") && !dairyFree.includes("egg-muffins"));
  // Gluten / wheat
  const noWheat = idsFor({ ...family, allergies: ["Wheat"] });
  for (const id of ["tomato-pasta", "veggie-wrap", "quesadilla", "avocado-toast", "veggie-fried-rice"]) assert.ok(!noWheat.includes(id), `wheat removes ${id}`);
  const glutenFree = idsFor({ ...family, dietary: ["Gluten-free"] });
  for (const id of ["tomato-pasta", "veggie-wrap", "quesadilla", "avocado-toast", "oatmeal-bowl", "banana-oat-cookies"])
    assert.ok(!glutenFree.includes(id), `gluten-free removes ${id}`);
  for (const id of ["fruit-salad", "fruit-kabobs", "egg-muffins"]) assert.ok(glutenFree.includes(id), `gluten-free keeps ${id}`);
  // Soy, sesame, rice, nuts
  assert.ok(!idsFor({ ...family, allergies: ["Soy"] }).includes("veggie-fried-rice"));
  assert.ok(!idsFor({ ...family, allergies: ["Sesame"] }).includes("veggie-wrap"));
  assert.ok(!idsFor({ ...family, allergies: ["Rice"] }).includes("veggie-fried-rice"));
  assert.ok(!idsFor({ ...family, allergies: ["Avocado"] }).includes("avocado-toast"));
  assert.ok(!idsFor({ ...family, allergies: ["Grapes"] }).includes("fruit-kabobs"));
  assert.ok(!idsFor({ ...family, allergies: ["Oats"] }).includes("banana-oat-cookies"));
  assert.ok(!idsFor({ ...family, allergies: ["Spinach"] }).includes("egg-muffins"));
  // None of the new recipes contains peanuts, tree nuts, fish or shellfish.
  for (const id of NEW_IDS)
    assert.ok(!recipe(id).allergens.some((a) => ["Peanut", "Tree nuts", "Fish", "Shellfish"].includes(a)), id);
  // An unreviewed exclusion still hides everything.
  assert.deepEqual(idsFor({ ...family, otherAllergies: "kiwi" }), []);
});

test("equipment notes name the right heat source", () => {
  const stoveOnly = recipeChoices({ ...family, equipment: ["Stove"] });
  const need = (id: string) => stoveOnly.find((c) => c.recipe.id === id)!.missing;
  assert.ok(need("banana-oat-cookies").includes("an oven"));
  assert.ok(need("egg-muffins").includes("an oven"));
  assert.ok(!need("quesadilla").includes("an oven") && !need("quesadilla").includes("a stove"));
  assert.ok(!need("tomato-pasta").length && !need("veggie-fried-rice").length && !need("oatmeal-bowl").length);
  assert.ok(!need("fruit-salad").length && !need("veggie-wrap").length && !need("fruit-kabobs").length, "no-cook dishes need no heat");
  const ovenOnly = recipeChoices({ ...family, equipment: ["Oven"] });
  assert.ok(ovenOnly.find((c) => c.recipe.id === "quesadilla")!.missing.includes("a stove"));
  assert.ok(ovenOnly.find((c) => c.recipe.id === "pancakes")!.missing.includes("a stove"));
});

test("learning moments are positive, have three answers and one right answer", () => {
  for (const id of NEW_IDS) {
    for (const age of [6, 10]) {
      const pair = recipeChallenges(id, age);
      assert.equal(pair.length, 2, id);
      for (const q of pair) {
        assert.equal(q.answers.length, 3, id);
        assert.ok(q.correct >= 0 && q.correct <= 2, id);
        assert.equal(new Set(q.answers).size, 3, id);
        assert.ok(q.question.length > 10 && q.explanation.length > 10, id);
        assert.ok(!/diet|weight|calorie|junk|unhealthy|bad food|good food|fattening/i.test(JSON.stringify(q)), id);
      }
    }
  }
  assert.notDeepEqual(recipeChallenges("egg-muffins", 6), recipeChallenges("brownies", 6));
});

test("scenes render for every step of every new recipe without throwing", () => {
  for (const id of NEW_IDS) {
    const r = recipe(id);
    const plan = planFor(r);
    const final = completeDish(r);
    for (const step of plan) {
      const html = renderToStaticMarkup(createElement(CookingScene, { recipe: r, plan, dish: final, step, surface: step.surface }));
      assert.ok(html.includes("<svg"), `${id}/${step.id} draws`);
    }
    const done = renderToStaticMarkup(createElement(CookingScene, { recipe: r, plan, dish: final, step: null, surface: finalSurface(r), presenting: true }));
    assert.ok(done.length > 800, `${id} finished dish draws`);
    const empty = renderToStaticMarkup(createElement(CookingScene, { recipe: r, plan, dish: emptyDish(), step: plan[0], surface: plan[0].surface }));
    assert.ok(empty.includes("<svg"));
  }
  // Intermediate scenes (empty dish on later surfaces) also draw.
  for (const id of NEW_IDS) {
    const r = recipe(id);
    const plan = planFor(r);
    for (const surface of new Set(plan.map((s) => s.surface))) {
      const html = renderToStaticMarkup(createElement(CookingScene, { recipe: r, plan, dish: emptyDish(), step: plan.find((s) => s.surface === surface)!, surface }));
      assert.ok(html.includes("<svg"), `${id}/${surface}`);
    }
  }
});

test("slot-based steps fill their spots in order and ignore extra pieces", () => {
  const kab = recipe("fruit-kabobs");
  const plan = planFor(kab);
  const thread = plan.find((s) => s.id === "thread")!;
  let dish = emptyDish();
  const order = ["grape:single", "banana:slice", "strawberry:slice"];
  for (let i = 0; i < 9; i++) dish = dropItem(dish, thread, plan, order[i % 3], { x: 0, y: 0 });
  assert.equal(placedCount(dish, "thread"), 9);
  assert.deepEqual(dish.drops.map((d) => [d.x, d.y]), KABOB_SLOTS.map((s) => [s.x, s.y]));
  assert.equal(dropItem(dish, thread, plan, "grape:single"), dish);
  assert.ok(PAINT_VALID.length > 0);
});
