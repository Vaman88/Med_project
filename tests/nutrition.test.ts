import assert from 'node:assert/strict';
import test from 'node:test';
import { demoProfile, ingredients, prices, recipes } from '../src/lib/demo-data';
import { newMember } from '../src/lib/food-settings';
import { compatibleNutrientIdeas, estimateCarbohydrates } from '../src/lib/nutrition';
import { matchRecipes } from '../src/lib/planning';

test('carbohydrate estimates require measured mass, matching preparation, and provenance', () => {
  assert.equal(estimateCarbohydrates(recipes.find(r => r.id === 'bean-rice')!, ingredients).status, 'unknown');
  const bean = ingredients.find(i => i.id === 'beans')!;
  const verified = { ...bean, nutrientRecords: [{ nutrientId: 'carbohydrate' as const, amountPer100g: 20, unit: 'g' as const, foodState: 'ready-to-eat' as const, source: 'test FDC record', status: 'verified' as const }] };
  const recipe = { ...recipes[0], yieldServings: 2, ingredients: [{ ingredientId: 'beans', quantity: 200, unit: 'g' as const, foodState: 'ready-to-eat' as const }] };
  assert.deepEqual(estimateCarbohydrates(recipe, [verified]), { status: 'estimated', gramsPerServing: 20, sources: ['test FDC record'] });
  assert.equal(estimateCarbohydrates({ ...recipe, ingredients: [{ ...recipe.ingredients[0], foodState: 'dry' as const }] }, [verified]).status, 'unknown');
});

test('nutrient ideas require evidence, a matching store price, and compatible restrictions', () => {
  const member = { ...newMember('m1','Child'), nutrients: [{ nutrientId: 'protein' as const, reason: 'food_ideas' as const, caregiverReported: false, reviewStatus: 'pending_confirmation' as const }] };
  const bean = { ...ingredients.find(i => i.id === 'beans')!, nutrientRecords: [{ nutrientId: 'protein' as const, amountPer100g: 5, unit: 'g' as const, foodState: 'ready-to-eat' as const, source: 'test FDC record', status: 'verified' as const }] };
  assert.equal(compatibleNutrientIdeas({ ...demoProfile, members: [member] }, 'm1', 'protein', ingredients, prices).length, 0);
  assert.deepEqual(compatibleNutrientIdeas({ ...demoProfile, members: [member] }, 'm1', 'protein', [...ingredients.filter(i => i.id !== 'beans'), bean], prices).map(i => i.ingredientId), ['beans']);
  assert.equal(compatibleNutrientIdeas({ ...demoProfile, members: [{ ...member, otherExclusions: ['beans'] }] }, 'm1', 'protein', [...ingredients.filter(i => i.id !== 'beans'), bean], prices).length, 0);
  const interested = { ...demoProfile, members: [member] };
  const baseScore = matchRecipes(demoProfile, [], { ingredients }).find(item => item.recipe.id === 'bean-rice')!.score;
  assert.equal(matchRecipes(interested, [], { ingredients }).find(item => item.recipe.id === 'bean-rice')!.score, baseScore);
  assert.ok(matchRecipes(interested, [], { ingredients: [...ingredients.filter(i => i.id !== 'beans'), bean] }).find(item => item.recipe.id === 'bean-rice')!.score > baseScore);
});
