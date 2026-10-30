import assert from "node:assert/strict";
import test from "node:test";
import { littleRecipes } from "../src/lib/little-kitchen";
import { chefTitle } from "../src/lib/chef-name";
import {
  answerAsset, completeDish, dishSchema, doCut, doFlip, doMash, doPaint, doScoop, doStir, dropItem,
  emptyDish, finalSurface, placedCount, planFor, setHeat, stepDone, stepProgress, totalScoops, trayItems,
  undoDrop, type DishState,
} from "../src/lib/cooking";
import {
  GLASS, PAINT_VALID, angleDelta, autoSpot, clampToEllipse, glassSurface, glassSurfaceY, paintAt,
  paintCoverage, paintNext, cutPositions, PLATE,
} from "../src/lib/cooking-geometry";
import { ART } from "../src/components/food-art";
import { awardRecipe, childProgressSchema, emptyProgress, saveCreation } from "../src/lib/child-progress";

const parfait = littleRecipes.find((r) => r.id === "parfait")!;

test("chef names never repeat the title", () => {
  assert.equal(chefTitle("Eli"), "Chef Eli");
  assert.equal(chefTitle("Chef Eli"), "Chef Eli");
  assert.equal(chefTitle("  chef   Eli "), "Chef Eli");
  assert.equal(chefTitle("Chefa"), "Chef Chefa");
  assert.equal(chefTitle(""), "Chef Friend");
  assert.equal(chefTitle(undefined), "Chef Friend");
});

test("every recipe has a playable plan that finishes with two learning moments", () => {
  for (const recipe of littleRecipes) {
    const plan = planFor(recipe);
    assert.equal(new Set(plan.map((s) => s.id)).size, plan.length, `${recipe.id} step ids are unique`);
    assert.equal(plan.filter((s) => s.kind === "quiz").length, 2, recipe.id);
    for (const step of plan)
      for (const item of step.kind === "drop" ? step.items : []) assert.ok(ART[item.asset], `${item.asset} has art`);
    // Cooked recipes cook, and every cook step carries real-world timing.
    const cooks = plan.filter((s) => s.kind === "cook");
    assert.equal(cooks.length > 0, recipe.game !== "assembly", recipe.id);
    for (const c of cooks) assert.ok(c.kind === "cook" && /minutes/.test(c.real), recipe.id);
    // The whole plan can be completed, and completing it finishes each measured step.
    const dish = completeDish(recipe);
    for (const step of plan) if (step.kind !== "quiz") assert.ok(stepDone(step, dish), `${recipe.id}/${step.id}`);
    assert.doesNotThrow(() => dishSchema.parse(dish), recipe.id);
    assert.ok(finalSurface(recipe));
  }
});

test("every ingredient of every recipe is handled in its plan", () => {
  const words: Record<string, string> = {
    "Black beans": "beans", "Canned black beans": "beans", Oats: "oats", Banana: "banana", Cocoa: "cocoa", Egg: "egg",
    "Whole wheat pita": "pita", Tomato: "tomato", Mozzarella: "cheese", "Bell pepper": "pepper", "Plain yogurt": "yogurt",
    Strawberries: "strawberry", Carrots: "carrot", Cucumber: "cucumber", Hummus: "hummus", "Canned corn": "corn",
    Grapes: "grape", Blueberries: "blueberry", Orange: "orange", "Whole wheat bread": "bread", Avocado: "avocado",
    Tortillas: "tortilla", "Cheddar cheese": "cheese", Spinach: "spinach", Milk: "milk", Raisins: "raisin",
    Cinnamon: "cinnamon", Pasta: "pasta", "Tomato sauce": "sauce", "Brown rice": "rice", Peas: "peas", "Soy sauce": "soy",
  };
  for (const recipe of littleRecipes) {
    const text = JSON.stringify(planFor(recipe));
    for (const { food } of recipe.ingredients) assert.ok(text.includes(words[food]), `${recipe.id} uses ${food}`);
  }
});

test("a banana parfait is cut, layered and arranged one real action at a time", () => {
  const plan = planFor(parfait);
  const kinds = plan.map((s) => s.kind);
  assert.deepEqual(kinds, ["drop", "cut", "cut", "quiz", "scoop", "drop", "scoop", "drop", "quiz"]);
  let dish = emptyDish();
  const [place, cutBanana, , , yogurt, layer, yogurtTop, toppings] = plan;
  // Rapid input cannot place more than the step needs.
  for (let i = 0; i < 5; i++) dish = dropItem(dish, place, plan, "banana:whole");
  assert.equal(placedCount(dish, place.id), 1);
  // Cuts are idempotent and measured, not counted by taps.
  for (const index of [0, 0, 1, 1, 2, 2, 9, -1]) dish = doCut(dish, cutBanana, index);
  assert.deepEqual(dish.cuts[cutBanana.id], [0, 1, 2]);
  assert.ok(stepDone(cutBanana, dish));
  // Scoops build the glass layer by layer and stop at the requested count.
  for (let i = 0; i < 6; i++) dish = doScoop(dish, yogurt);
  assert.equal(totalScoops(dish, plan, "glass"), 2);
  for (let i = 0; i < 6; i++) dish = dropItem(dish, layer, plan, "banana:slice", { x: 400, y: glassSurfaceY(2) });
  assert.equal(placedCount(dish, layer.id), 3);
  assert.ok(dish.drops.filter((d) => d.step === layer.id).every((d) => d.lvl === 2), "banana slices belong to the base layer");
  dish = doScoop(dish, yogurtTop);
  assert.equal(totalScoops(dish, plan, "glass"), 3);
  // Slices that were already placed stay in their layer after yogurt covers them.
  assert.ok(dish.drops.filter((d) => d.step === layer.id).every((d) => d.lvl === 2));
  const before = dish.drops.length;
  dish = dropItem(dish, toppings, plan, "strawberry:slice", { x: 9999, y: -9999 });
  const topping = dish.drops.at(-1)!;
  const surface = glassSurface(3);
  assert.equal(dish.drops.length, before + 1);
  assert.equal(topping.lvl, 3);
  // Wild drop points are pulled back inside the glass surface.
  assert.ok(((topping.x - surface.cx) / surface.rx) ** 2 + ((topping.y - surface.cy) / surface.ry) ** 2 <= 1);
  // An asset the step does not offer is ignored.
  assert.equal(dropItem(dish, toppings, plan, "pepper:piece"), dish);
});

test("undo removes only the last placement of the current step", () => {
  const plan = planFor(parfait);
  const layer = plan[5];
  let dish = emptyDish();
  dish = dropItem(dish, layer, plan, "banana:slice");
  dish = dropItem(dish, layer, plan, "banana:slice");
  dish = undoDrop(dish, layer.id);
  assert.equal(placedCount(dish, layer.id), 1);
  assert.equal(undoDrop(dish, "other"), dish);
  assert.equal(trayItems(layer, dish)[0].left, 2);
});

test("spreading is measured by coverage and can be done without a pointer", () => {
  const pizza = littleRecipes.find((r) => r.id === "pizza")!;
  const plan = planFor(pizza);
  const sauce = plan.find((s) => s.id === "spread-sauce")!;
  let dish = emptyDish();
  assert.equal(stepProgress(sauce, dish).done, 0);
  dish = doPaint(dish, sauce, paintAt([], { x: 400, y: 262 }, 60));
  const some = stepProgress(sauce, dish).done;
  assert.ok(some > 0 && some < 100);
  assert.equal(doPaint(dish, sauce, []), dish, "painting nothing changes nothing");
  let cells: number[] = dish.paint[sauce.id];
  let guard = 0;
  while (paintCoverage(cells) < 0.99 && guard++ < 50) cells = paintNext(cells);
  assert.equal(paintCoverage(cells), 1);
  assert.equal(paintNext(cells), cells);
  assert.ok(cells.every((c) => PAINT_VALID.includes(c)));
});

test("mashing, stirring, cooking and flipping advance only through valid actions", () => {
  const pancakes = littleRecipes.find((r) => r.id === "pancakes")!;
  const plan = planFor(pancakes);
  const get = (id: string) => plan.find((s) => s.id === id)!;
  let dish: DishState = emptyDish();
  for (const i of [0, 1, 1, 2, 3, 3, 8]) dish = doMash(dish, get("mash-banana"), i);
  assert.ok(stepDone(get("mash-banana"), dish));
  dish = doStir(dish, get("stir"), 400);
  assert.equal(stepDone(get("stir"), dish), false);
  dish = doStir(dish, get("stir"), 9999);
  assert.equal(dish.stir.stir, 720, "stirring stops at the requested number of turns");
  assert.ok(stepDone(get("stir"), dish));
  dish = setHeat(dish, get("cook-1"), 2);
  assert.equal(dish.heat["cook-1"], 1);
  assert.equal(setHeat(dish, get("cook-1"), 1), dish);
  for (const i of [0, 0, 1, 2, 7]) dish = doFlip(dish, get("flip"), i);
  assert.deepEqual(dish.flipped, [0, 1, 2]);
});

test("geometry helpers keep food on its surface", () => {
  const e = { cx: 100, cy: 100, rx: 50, ry: 20 };
  const p = clampToEllipse(e, { x: 1000, y: 1000 });
  assert.ok(((p.x - 100) / 50) ** 2 + ((p.y - 100) / 20) ** 2 <= 1);
  assert.deepEqual(clampToEllipse(e, { x: 100, y: 100 }), { x: 100, y: 100 });
  const taken = [autoSpot(e, [])];
  const next = autoSpot(e, taken);
  assert.ok(Math.hypot(next.x - taken[0].x, next.y - taken[0].y) > 10);
  assert.ok(Math.abs(angleDelta(170, -170)) === 20);
  const cuts = cutPositions(3);
  assert.equal(cuts.length, 3);
  assert.ok(cuts[0] < cuts[1] && cuts[1] < cuts[2]);
  assert.ok(glassSurface(0).cy > glassSurface(2).cy);
  assert.ok(glassSurface(4).cy > GLASS.rimY, "a full glass still has headroom");
  assert.ok(PLATE.rx <= 200);
});

test("quiz answers show pictures only of ingredients the child handled", () => {
  assert.equal(answerAsset("Banana"), "banana:whole");
  assert.equal(answerAsset("Strawberry"), "strawberry:whole");
  assert.equal(answerAsset("A cape"), null);
  assert.equal(answerAsset("Blueberries"), "blueberry:pile");
  assert.equal(answerAsset("Bell pepper and carrot"), "pepper:whole");
  assert.equal(answerAsset("Avocado"), "avocado:half");
});

test("saved creations are stored with progress and validated", () => {
  const dish = completeDish(parfait);
  let progress = awardRecipe(emptyProgress(), "parfait", 1);
  progress = saveCreation(progress, "parfait", dish);
  assert.equal(childProgressSchema.parse(JSON.parse(JSON.stringify(progress))).creations?.parfait.drops.length, dish.drops.length);
  assert.equal(childProgressSchema.safeParse({ version: 1, completed: {}, stars: 0, creations: { x: { drops: "no" } } }).success, false);
  assert.ok(childProgressSchema.safeParse({ version: 1, completed: {}, stars: 0 }).success, "older saves still load");
});
