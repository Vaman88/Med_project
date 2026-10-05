import assert from 'node:assert/strict';
import test from 'node:test';
import { demoPantry, demoProfile, ingredients, prices, recipes } from '../src/lib/demo-data';
import { calculatePlan, convertQuantity, generateWeeklyPlan, matchRecipes, swapMeal } from '../src/lib/planning';
import type { MealPlanEntry } from '../src/lib/domain';

const now = new Date('2026-09-30T12:00:00Z');
const options = { now };
const dinner = (id = 'a', day = 0): MealPlanEntry => ({ id, day, mealType: 'dinner', recipeId: 'bean-rice', plannedServings: 2 });

test('mass and volume conversions are compatible only within a dimension', () => {
  assert.equal(convertQuantity(1, 'kg', 'g'), 1000);
  assert.equal(convertQuantity(1, 'l', 'ml'), 1000);
  assert.equal(convertQuantity(1, 'cup', 'g'), null);
  assert.equal(convertQuantity(-1, 'g', 'g'), null);
});
test('allergy, dietary, equipment, unknown allergens and production review are hard gates', () => {
  assert.ok(!matchRecipes({ ...demoProfile, allergies: ['PEANUT'] }, [], options).some(match => match.recipe.id === 'banana-toast'));
  assert.ok(!matchRecipes({ ...demoProfile, dietaryRestrictions: ['vegan'] }, [], options).some(match => match.recipe.id === 'yogurt-banana'));
  assert.ok(!matchRecipes({ ...demoProfile, equipment: [] }, [], options).some(match => match.recipe.id === 'bean-rice'));
  assert.ok(!matchRecipes({ ...demoProfile, allergies: ['milk'] }, [], { ...options, ingredients: ingredients.map(item => item.id === 'oats' ? { ...item, allergenInformationKnown: false } : item) }).some(match => match.recipe.id === 'banana-oats'));
  assert.equal(matchRecipes(demoProfile, [], { ...options, allowSyntheticDemo: false }).length, 0);
});
test('aggregate pantry reservation and full packages prevent double counting', () => {
  const plan = calculatePlan(demoProfile, [{ id: 'beans', ingredientId: 'beans', quantity: .3, unit: 'kg', foodState: 'ready-to-eat', quantityConfirmed: true }], [dinner(), dinner('b', 1)], options);
  const beans = plan.shoppingItems.find(item => item.ingredientId === 'beans')!;
  assert.equal(beans.requiredQuantity, 480);
  assert.equal(beans.pantryQuantityUsed, 300);
  assert.equal(beans.newQuantityNeeded, 180);
  assert.equal(beans.packageCount, 1);
  assert.equal(beans.purchaseCostCents, 89);
});
test('unconfirmed, expired and preparation-mismatched pantry is not used', () => {
  const plan = calculatePlan(demoProfile, [
    { id: 'a', ingredientId: 'beans', quantity: 1000, unit: 'g', foodState: 'ready-to-eat', quantityConfirmed: false },
    { id: 'b', ingredientId: 'beans', quantity: 1000, unit: 'g', foodState: 'raw', quantityConfirmed: true },
    { id: 'c', ingredientId: 'beans', quantity: 1000, unit: 'g', foodState: 'ready-to-eat', quantityConfirmed: true, expiryDate: '2026-09-01' },
  ], [dinner()], options);
  assert.equal(plan.shoppingItems.find(item => item.ingredientId === 'beans')!.pantryQuantityUsed, 0);
});
test('missing price keeps estimate incomplete; stale prices are visibly flagged', () => {
  const missing = calculatePlan(demoProfile, [], [dinner()], { ...options, prices: prices.filter(price => price.ingredientId !== 'beans') });
  assert.equal(missing.budget.status, 'incomplete-estimate');
  assert.equal(missing.budget.remainingBudgetCents, null);
  assert.equal(missing.shoppingItems.find(item => item.ingredientId === 'beans')!.purchaseCostCents, null);
  const stale = calculatePlan(demoProfile, [], [dinner()], { ...options, prices: prices.map(price => ({ ...price, observedAt: '2026-01-01' })) });
  assert.equal(stale.budget.stalePriceCount, 3);
});
test('weekly generation covers exactly every requested slot without reducing meals for a small budget', () => {
  const profile = { ...demoProfile, weeklyBudgetCents: 1, mealsCovered: ['breakfast', 'lunch', 'dinner', 'snack'] as const };
  const plan = generateWeeklyPlan({ ...profile, mealsCovered: [...profile.mealsCovered] }, demoPantry, options);
  assert.equal(plan.entries.length, 28);
  assert.equal(plan.budget.status, 'over-budget');
  assert.ok(plan.budget.shortfallCents! > 0);
  for (let day = 0; day < 7; day++) assert.equal(plan.entries.filter(entry => entry.day === day).length, 4);
});
test('meal swap recomputes entire shopping list and rejects allergies', () => {
  const original = calculatePlan(demoProfile, [], [dinner(), dinner('b', 1)], options);
  const changed = swapMeal(demoProfile, [], original, 'a', 'bean-corn-salad', options);
  assert.equal(changed.shoppingItems.find(item => item.ingredientId === 'rice')!.requiredQuantity, 250);
  assert.equal(changed.shoppingItems.find(item => item.ingredientId === 'corn')!.requiredQuantity, 200);
  const breakfast = calculatePlan(demoProfile, [], [{ ...dinner(), mealType: 'breakfast', recipeId: 'banana-oats' }], options);
  assert.throws(() => swapMeal({ ...demoProfile, allergies: ['peanut'] }, [], breakfast, 'a', 'banana-toast', options), /allergy/);
});
test('linked leftovers count a batch once and require refrigeration and sufficient servings', () => {
  const entries: MealPlanEntry[] = [{ ...dinner(), batchId: 'batch', batchServings: 4 }, { ...dinner('lunch', 1), mealType: 'lunch', batchId: 'batch', isLeftover: true }];
  const plan = calculatePlan(demoProfile, [], entries, options);
  assert.equal(plan.shoppingItems.find(item => item.ingredientId === 'beans')!.requiredQuantity, 480);
  assert.throws(() => calculatePlan({ ...demoProfile, equipment: ['microwave'] }, [], entries, options), /refrigeration/);
  assert.throws(() => calculatePlan(demoProfile, [], [{ ...entries[0], batchServings: 2 }, entries[1]], options), /enough servings/);
  assert.throws(() => calculatePlan(demoProfile, [], [entries[1]], options), /one cooking event/);
  const changed = swapMeal(demoProfile, [], plan, 'lunch', 'bean-corn-salad', options);
  assert.ok(changed.entries.every(entry => entry.recipeId === 'bean-corn-salad'));
});
test('prices are chosen for the selected store and edited prices recompute totals', () => {
  const original = calculatePlan(demoProfile, [], [dinner()], options);
  const changed = calculatePlan(demoProfile, [], [dinner()], { ...options, prices: prices.map(price => ({ ...price, priceCents: price.priceCents + 100 })) });
  assert.equal(changed.budget.purchaseTotalCents - original.budget.purchaseTotalCents, 300);
  assert.equal(calculatePlan({ ...demoProfile, preferredStoreId: 'other-store' }, [], [dinner()], options).budget.missingPriceCount, 3);
});
test('invalid tiny packages are treated as unavailable rather than creating infinite checkout costs', () => {
  const plan = calculatePlan(demoProfile, [], [dinner()], { ...options, prices: prices.map(price => ({ ...price, packageQuantity: 1e-300 })) });
  assert.equal(plan.budget.status, 'incomplete-estimate');
  assert.equal(plan.budget.missingPriceCount, 3);
  assert.ok(Number.isFinite(plan.budget.totalCents));
});
