import test from 'node:test';
import assert from 'node:assert/strict';
import { amountCheck, pantryHas, parseDishes, parseMeasure, parseRecipe, simpleFoodName, splitSteps } from '../src/lib/recipe-library';

const photo = 'https://www.themealdb.com/images/media/meals/abc123.jpg';

test('library dishes keep only rows with a trusted photo', () => {
  const dishes = parseDishes({ meals: [
    { idMeal: '1', strMeal: ' Chicken  Curry ', strMealThumb: photo, strCategory: 'Chicken', strArea: 'Indian' },
    { idMeal: '2', strMeal: 'No photo', strMealThumb: null },
    { idMeal: '3', strMeal: 'Wrong host', strMealThumb: 'https://evil.example/x.jpg' },
    { idMeal: 'x', strMeal: 'Bad id', strMealThumb: photo },
  ] });
  assert.deepEqual(dishes, [{ id: '1', name: 'Chicken Curry', image: photo, category: 'Chicken', area: 'Indian' }]);
  assert.deepEqual(parseDishes({ meals: null }), []);
  assert.deepEqual(parseDishes('nonsense'), []);
});

test('a full recipe lists ingredients with measures and readable steps', () => {
  const recipe = parseRecipe({ meals: [{
    idMeal: '52795', strMeal: 'Chicken Handi', strMealThumb: photo, strCategory: 'Chicken', strArea: 'Indian',
    strInstructions: 'STEP 1\r\nHeat the oil.\r\n\r\nSTEP 2\r\nAdd the chicken and cook.',
    strIngredient1: 'Chicken', strMeasure1: '1.2 kg', strIngredient2: 'Onion', strMeasure2: '5 thinly sliced', strIngredient3: '', strMeasure3: ' ',
    strYoutube: 'https://www.youtube.com/watch?v=IO0issT0Rmc', strSource: 'javascript:alert(1)',
  }] });
  assert.ok(recipe);
  assert.deepEqual(recipe.ingredients, [{ name: 'Chicken', measure: '1.2 kg', quantity: 1200, unit: 'g' }, { name: 'Onion', measure: '5 thinly sliced', quantity: 5, unit: 'each' }]);
  assert.deepEqual(recipe.steps, ['Heat the oil.', 'Add the chicken and cook.']);
  assert.equal(recipe.video, 'https://www.youtube.com/watch?v=IO0issT0Rmc');
  assert.equal(recipe.source, undefined, 'non-web links are dropped');
});

test('one-paragraph instructions are split into short steps', () => {
  assert.deepEqual(splitSteps('Boil water. Add pasta. Drain it. Serve hot.'), ['Boil water. Add pasta.', 'Drain it. Serve hot.']);
});

test('pantry matching tolerates plurals and longer ingredient names', () => {
  assert.equal(pantryHas(['eggs'], 'Egg'), true);
  assert.equal(pantryHas(['tomatoes'], 'Tomato'), true);
  assert.equal(pantryHas(['chicken'], 'Chicken Breast'), true);
  assert.equal(pantryHas(['ground beef'], 'Beef'), true);
  assert.equal(pantryHas(['rice'], 'Onion'), false);
  assert.equal(pantryHas([], 'Rice'), false);
});

test('pantry labels become simple search words', () => {
  assert.equal(simpleFoodName('Canned beans, drained'), 'beans');
  assert.equal(simpleFoodName('Ready-To-Eat Cooked Rice'), 'rice');
  assert.equal(simpleFoodName('Rolled oats'), 'oats');
  assert.equal(simpleFoodName('Ground beef, 90% lean'), 'ground beef');
  assert.equal(simpleFoodName('chicken'), 'chicken');
});

test('recipe measures are read as grams, millilitres or counts', () => {
  assert.deepEqual(parseMeasure('1.2 kg'), { quantity: 1200, unit: 'g' });
  assert.deepEqual(parseMeasure('500g'), { quantity: 500, unit: 'g' });
  assert.deepEqual(parseMeasure('1 1/2 cups'), { quantity: 354.9, unit: 'ml' });
  assert.deepEqual(parseMeasure('½ tsp'), { quantity: 2.5, unit: 'ml' });
  assert.deepEqual(parseMeasure('3 large'), { quantity: 3, unit: 'each' });
  assert.equal(parseMeasure('to taste'), null);
});

test('pantry amounts are compared with what a recipe needs', () => {
  const chicken = { name: 'Chicken Breast', measure: '500 g', quantity: 500, unit: 'g' as const };
  assert.equal(amountCheck(chicken, [{ label: 'chicken', quantity: 1, unit: 'lb' }])?.status, 'short');
  assert.equal(Math.round(amountCheck(chicken, [{ label: 'chicken', quantity: 1, unit: 'lb' }])!.missing!), 46);
  assert.equal(amountCheck(chicken, [{ label: 'chicken', quantity: 2, unit: 'lb' }])?.status, 'enough');
  assert.equal(amountCheck(chicken, [{ label: 'chicken' }])?.status, 'assumed');
  assert.equal(amountCheck(chicken, [{ label: 'rice', quantity: 2, unit: 'lb' }]), null);
});
