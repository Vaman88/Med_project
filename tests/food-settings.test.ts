import assert from 'node:assert/strict';
import test from 'node:test';
import { demoProfile, ingredients, prices, recipes } from '../src/lib/demo-data';
import { newMember, proposeAllergies } from '../src/lib/food-settings';
import { calculatePlan, matchRecipes, recipeExclusionReasons } from '../src/lib/planning';
import { foodNameTags, ingredientTags } from '../src/lib/ingredient-relationships';

test('allergy aliases are proposals, and unresolved entries stop suggestions', () => {
  const items = proposeAllergies('groundnuts, nuts, milk');
  assert.equal(items[0].canonicalId, 'peanut');
  assert.equal(items[0].status, 'pending_confirmation');
  assert.equal(items[1].status, 'needs_review');
  assert.equal(proposeAllergies('peenuts')[0].canonicalId, 'peanut');
  assert.equal(proposeAllergies('seafood')[0].canonicalId, null);
  assert.equal(proposeAllergies('tree nuts')[0].canonicalId, 'tree-nut');
  const member = { ...newMember('m1','Child'), allergies: items };
  assert.equal(matchRecipes({ ...demoProfile, members: [member] }, []).length, 0);
});

test('member rules exclude dairy and celiac holds unverified recipes', () => {
  const dairy = { ...newMember('m1','Child'), rules: ['dairy_free' as const] };
  assert.ok(!matchRecipes({ ...demoProfile, members: [dairy] }, []).some(m => m.recipe.id === 'yogurt-banana'));
  assert.ok(matchRecipes({ ...demoProfile, members: [dairy] }, []).some(m => m.recipe.id === 'bean-rice'));
  const celiac = { ...newMember('m1','Child'), rules: ['celiac' as const] };
  assert.equal(matchRecipes({ ...demoProfile, members: [celiac] }, []).length, 0);
});

test('pescatarian and fish allergy combine without dropping the allergy', () => {
  const member = { ...newMember('m1','Child'), rules: ['pescatarian' as const], allergies: [{ rawText: 'fish', canonicalId: 'fish', status: 'confirmed' as const }] };
  const fish = { ...ingredients[0], id: 'salmon', name: 'Salmon', foodTags: ['salmon'], allergenTags: ['fish'], vegetarian: false, vegan: false };
  const recipe = { ...recipes[0], ingredients: [{ ingredientId: 'salmon', quantity: 100, unit: 'g' as const, foodState: 'raw' as const }] };
  assert.ok(recipeExclusionReasons(recipe, { ...demoProfile, members: [member] }, { ingredients: [...ingredients, fish] }).some(reason => reason.includes('allergy')));
});
test('named meat, dairy, and gluten derivatives are recognized conservatively', () => {
  const sample = { ...ingredients[0], foodTags: [], allergenTags: [] };
  assert.ok(ingredientTags({ ...sample, name: 'Pork gelatin' }).includes('pork'));
  assert.ok(ingredientTags({ ...sample, name: 'Lactose-free milk' }).includes('dairy'));
  assert.ok(ingredientTags({ ...sample, name: 'Barley malt' }).includes('gluten'));
  assert.ok(ingredientTags({ ...sample, name: 'Unspecified broth' }).includes('animal-source-unknown'));
  assert.ok(foodNameTags('macaroni and cheese').includes('dairy'));
  assert.ok(foodNameTags('salmon').includes('fish'));
  assert.ok(foodNameTags('almonds').includes('tree-nut'));
});
test('favorites and sensory preferences change scores only after eligibility', () => {
  const baseline = matchRecipes(demoProfile, []).find(item => item.recipe.id === 'bean-rice')!.score;
  const member = { ...newMember('m1','Child'), likes: ['beans'], flavors: ['savory'], textures: ['soft'] };
  const preferred = matchRecipes({ ...demoProfile, members: [member] }, []).find(item => item.recipe.id === 'bean-rice')!.score;
  assert.ok(preferred > baseline);
  assert.match(matchRecipes({ ...demoProfile, members: [member] }, []).find(item => item.recipe.id === 'bean-rice')!.explanation!, /foods you like/);
  const restricted = { ...member, otherExclusions: ['beans'] };
  assert.ok(!matchRecipes({ ...demoProfile, members: [restricted] }, []).some(item => item.recipe.id === 'bean-rice'));
});
test('shopping prices never select a product with known conflicting tags', () => {
  const member = { ...newMember('m1','Child'), rules: ['dairy_free' as const] };
  const conflicted = prices.map(price => price.ingredientId === 'beans' ? { ...price, productTags: ['milk'] } : price);
  const plan = calculatePlan({ ...demoProfile, members: [member] }, [], [{ id: 'one', day: 0, mealType: 'lunch', recipeId: 'bean-rice', plannedServings: 2 }], { prices: conflicted });
  assert.equal(plan.shoppingItems.find(item => item.ingredientId === 'beans')?.priceStatus, 'missing');
  assert.ok(plan.shoppingItems.some(item => item.productCheckStatus === 'needs-checking'));
});
