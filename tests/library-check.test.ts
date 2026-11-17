import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLibraryRecipe, normalizeLibraryIngredient } from '../src/lib/library-check';
import { newMember } from '../src/lib/food-settings';
import { guestProfile } from '../src/lib/guest-kitchen';
import { childPlannerSnapshot, type Family } from '../src/lib/little-kitchen';
import type { HouseholdProfile } from '../src/lib/domain';

const profile = (change: Partial<HouseholdProfile> = {}): HouseholdProfile => ({ ...guestProfile(), ...change });
const status = (check: ReturnType<typeof checkLibraryRecipe>, name: string) => check.items.find(item => item.name === name)?.status;

test('ingredient names are normalized to allergen and food tags', () => {
  assert.ok(normalizeLibraryIngredient('Parmesan').tags.includes('milk'));
  assert.ok(normalizeLibraryIngredient('Eggs').tags.includes('egg'));
  assert.ok(normalizeLibraryIngredient('Egg Noodles').tags.includes('wheat'));
  assert.ok(normalizeLibraryIngredient('Tahini').tags.includes('sesame'));
  assert.ok(normalizeLibraryIngredient('Chicken Breast').tags.includes('meat'));
  // Plant milks and butter beans are not dairy; rice noodles are not wheat.
  assert.ok(!normalizeLibraryIngredient('Coconut Milk').tags.includes('milk'));
  assert.ok(!normalizeLibraryIngredient('Butter Beans').tags.includes('dairy'));
  assert.ok(!normalizeLibraryIngredient('Rice Noodles').tags.includes('wheat'));
  assert.equal(normalizeLibraryIngredient('Sumac').recognized, false);
});

test('a milk allergy flags dairy ingredients as known conflicts', () => {
  const check = checkLibraryRecipe(['Butter', 'Parmesan', 'Spaghetti', 'Garam Masala', 'Coconut Milk'], profile({ allergies: ['milk'] }));
  assert.equal(check.hasSettings, true);
  assert.deepEqual(check.conflicts.map(item => item.name), ['Butter', 'Parmesan']);
  assert.match(check.conflicts[0].reasons[0], /milk, listed as an allergy/);
  assert.equal(status(check, 'Coconut Milk'), 'no-known-conflict');
});

test('unknown ingredients stay unverified and are never reported as safe', () => {
  const check = checkLibraryRecipe(['Sumac', 'Xanthan Gum'], profile({ allergies: ['peanut'] }));
  assert.equal(check.conflicts.length, 0);
  assert.deepEqual(check.unverified.map(item => item.name), ['Sumac', 'Xanthan Gum']);
  assert.ok(check.items.every(item => item.status !== 'no-known-conflict'));
});

test('broader allergies cover named members, and diets flag meat and animal products', () => {
  assert.equal(status(checkLibraryRecipe(['Salmon'], profile({ allergies: ['fish'] })), 'Salmon'), 'conflict');
  assert.equal(status(checkLibraryRecipe(['Pistachios'], profile({ allergies: ['tree-nut'] })), 'Pistachios'), 'conflict');
  const veg = checkLibraryRecipe(['Chicken Thighs', 'Bacon', 'Vegetable Stock', 'Chicken Stock'], profile({ dietaryRestrictions: ['vegetarian'] }));
  assert.deepEqual(veg.conflicts.map(item => item.name), ['Chicken Thighs', 'Bacon', 'Chicken Stock']);
  const vegan = checkLibraryRecipe(['Honey', 'Eggs', 'Sausages'], profile({ dietaryRestrictions: ['vegan'] }));
  assert.deepEqual(vegan.conflicts.map(item => item.name), ['Honey', 'Eggs', 'Sausages']);
});

test('gluten-free settings flag wheat and leave everything else unverified', () => {
  const member = { ...newMember('a', 'A'), rules: ['gluten_free' as const] };
  const check = checkLibraryRecipe(['Plain Flour', 'Banana'], profile({ members: [member] }));
  assert.equal(status(check, 'Plain Flour'), 'conflict');
  assert.equal(status(check, 'Banana'), 'unverified');
});

test('typed allergies and exclusions are matched by name and listed as name-only', () => {
  const member = { ...newMember('a', 'A'), otherExclusions: ['mushroom'], allergies: [{ rawText: 'kiwi', canonicalId: null, status: 'needs_review' as const }] };
  const check = checkLibraryRecipe(['Mushrooms', 'Kiwi Fruit', 'Rice'], profile({ members: [member] }));
  assert.deepEqual(check.conflicts.map(item => item.name), ['Mushrooms', 'Kiwi Fruit']);
  assert.deepEqual(check.nameOnlySettings, ['kiwi', 'mushroom']);
});

test('the child profile restrictions reach the library check', () => {
  const family: Family = { version: 1, age: 7, pantry: ['Banana'], allergies: ['Egg'], otherAllergies: 'kiwi', allergyConfirmed: true, parentConfirmed: true, dietary: ['Dairy-free'] };
  const check = checkLibraryRecipe(['Eggs', 'Cheddar Cheese', 'Kiwi', 'Rice'], childPlannerSnapshot(family).profile);
  assert.deepEqual(check.conflicts.map(item => item.name), ['Eggs', 'Cheddar Cheese', 'Kiwi']);
});

test('without food settings nothing is compared', () => {
  const check = checkLibraryRecipe(['Butter'], profile());
  assert.equal(check.hasSettings, false);
  assert.equal(check.conflicts.length, 0);
  assert.equal(checkLibraryRecipe(['Butter']).hasSettings, false);
});
