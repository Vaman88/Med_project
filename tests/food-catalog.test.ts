import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogFoods, catalogMeals, findCatalogFood, listFoodCategories, searchFoods, searchMeals } from '../src/lib/food-catalog';
import { demoProfile, ingredients, recipes } from '../src/lib/demo-data';
import { resolveKitchenFood } from '../src/lib/guest-kitchen';
import { matchRecipes, recipeExclusionReasons } from '../src/lib/planning';
import { ingredientTags } from '../src/lib/ingredient-relationships';
import { GET as getFoods } from '../src/app/api/foods/route';
import { GET as getMeals } from '../src/app/api/meals/route';

const allEquipment = ['microwave', 'oven', 'stovetop', 'air-fryer', 'kettle', 'refrigerator', 'freezer'] as const;
const call = (handler: (request: Request) => Promise<Response>, path: string) => handler(new Request(`http://localhost${path}`));

test('catalog is large and ids are unique', () => {
  assert.ok(catalogFoods.length >= 300, `foods: ${catalogFoods.length}`);
  assert.ok(catalogMeals.length >= 60, `meals: ${catalogMeals.length}`);
  assert.equal(new Set(catalogFoods.map(food => food.id)).size, catalogFoods.length);
  assert.equal(new Set(catalogFoods.map(food => food.label.toLowerCase())).size, catalogFoods.length);
  assert.equal(new Set(catalogMeals.map(meal => meal.id)).size, catalogMeals.length);
  assert.equal(new Set(recipes.map(recipe => recipe.id)).size, recipes.length);
  assert.equal(new Set(ingredients.map(item => item.id)).size, ingredients.length);
  assert.ok(listFoodCategories().length >= 10);
});

test('every catalog food matches the KitchenFood schema vocabulary', () => {
  for (const food of catalogFoods) {
    assert.ok(food.label.length > 0 && food.label.length <= 80, food.id);
    assert.ok(['g', 'kg', 'oz', 'lb', 'each'].includes(food.unit), food.id);
    assert.ok(['dry', 'ready-to-eat', 'raw', 'cooked'].includes(food.foodState), food.id);
    assert.ok(['pantry', 'fridge', 'freezer'].includes(food.storage), food.id);
    assert.ok(Array.isArray(food.allergens), food.id);
    if (food.ingredientId) assert.ok(ingredients.some(item => item.id === food.ingredientId), food.id);
  }
});

test('search ranks prefix, then word prefix, then substring, then aliases', () => {
  assert.deepEqual(searchFoods(''), []);
  assert.deepEqual(searchFoods('   '), []);
  const banana = searchFoods('BAN');
  assert.equal(banana[0].id, 'banana');
  const oat = searchFoods('oat', 5);
  assert.ok(oat[0].label.toLowerCase().startsWith('oat'));
  const rank = (label: string, q: string) => label.toLowerCase().startsWith(q) ? 0 : label.toLowerCase().split(/[\s,]+/).some(word => word.startsWith(q)) ? 1 : label.toLowerCase().includes(q) ? 2 : 3;
  for (const q of ['pea', 'bean', 'tom', 'rice', 'chick']) {
    const ranks = searchFoods(q, 25).map(food => rank(food.label, q));
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), q);
  }
  assert.equal(searchFoods('garbanzo')[0].id, 'chickpeas');
  assert.ok(searchFoods('tomato').length >= 3);
  assert.equal(searchFoods('zzzzqqq').length, 0);
  assert.equal(searchFoods('rice', 3).length, 3);
  assert.equal(searchFoods('rice', 0).length, 1);
  assert.equal(searchFoods('rice', Number.NaN).length, 8);
  assert.ok(searchFoods('rice', 1000).length <= 100);
  assert.ok(searchFoods('a', 25, 'Fruit').every(food => food.category === 'Fruit'));
  assert.equal(findCatalogFood('Garbanzo Beans')?.id, 'chickpeas');
  assert.equal(findCatalogFood('apples')?.id, 'apple');
});

test('every meal uses real foods with consistent units, states and allergen tags', () => {
  for (const meal of catalogMeals) {
    assert.ok(meal.mealTypes.length && meal.mealTypes.every(type => ['breakfast', 'lunch', 'dinner', 'snack'].includes(type)), meal.id);
    assert.ok(Number.isInteger(meal.servings) && meal.servings >= 1, meal.id);
    assert.ok(meal.steps.length >= 2, meal.id);
    assert.ok(meal.ingredients.length >= 2, meal.id);
    assert.equal(new Set(meal.ingredients.map(item => item.foodId)).size, meal.ingredients.length, `${meal.id} repeats a food`);
    const union = new Set<string>();
    for (const item of meal.ingredients) {
      const food = catalogFoods.find(entry => entry.id === item.foodId);
      assert.ok(food, `${meal.id} uses unknown food ${item.foodId}`);
      assert.ok(food.ingredientId, `${meal.id}: ${food.id} has no planner ingredient`);
      assert.ok(Number.isFinite(item.quantity) && item.quantity > 0, `${meal.id} ${item.foodId}`);
      assert.equal(item.unit, food.unit);
      assert.equal(item.foodState, food.foodState);
      food.allergens.forEach(allergen => union.add(allergen));
    }
    assert.deepEqual([...union].sort(), [...meal.allergens].sort(), meal.id);
    assert.ok(Array.isArray(meal.allergens));
  }
  // Spot checks of known allergens.
  const byId = (id: string) => catalogMeals.find(meal => meal.id === id)!;
  assert.ok(byId('pb-jelly-sandwich').allergens.includes('peanut') && byId('pb-jelly-sandwich').allergens.includes('wheat'));
  assert.ok(byId('shrimp-garlic-pasta').allergens.includes('shellfish'));
  assert.ok(byId('mac-and-cheese-peas').allergens.includes('milk'));
  assert.ok(byId('scrambled-eggs-toast').allergens.includes('egg'));
  assert.equal(byId('lentil-soup').vegan, true);
  assert.equal(byId('beef-chili').vegetarian, false);
});

test('planner ingredients carry the catalog allergen tags and every recipe is valid', () => {
  for (const meal of catalogMeals) {
    const recipe = recipes.find(item => item.id === meal.id)!;
    assert.ok(recipe, meal.id);
    for (const part of recipe.ingredients) assert.ok(ingredients.some(item => item.id === part.ingredientId), `${meal.id} ${part.ingredientId}`);
    const tags = new Set(recipe.ingredients.flatMap(part => ingredientTags(ingredients.find(item => item.id === part.ingredientId)!)));
    for (const allergen of meal.allergens) assert.ok(tags.has(allergen), `${meal.id} lost ${allergen}`);
  }
  for (const food of catalogFoods.filter(entry => entry.ingredientId)) {
    const ingredient = ingredients.find(item => item.id === food.ingredientId)!;
    assert.equal(ingredient.baseUnit, food.unit === 'each' ? 'each' : 'g', food.id);
    assert.ok(ingredient.allergenInformationKnown);
    for (const allergen of food.allergens) assert.ok(ingredient.allergenTags.includes(allergen), `${food.id} ${allergen}`);
  }
});

test('allergy and diet exclusion removes every catalog meal that contains the food', () => {
  const profile = { ...demoProfile, equipment: [...allEquipment], maxCookingMinutes: 240, mealsCovered: ['breakfast', 'lunch', 'dinner', 'snack'] as typeof demoProfile.mealsCovered };
  assert.ok(matchRecipes(profile, []).length >= 60);
  for (const allergen of ['peanut', 'milk', 'wheat', 'sesame', 'egg', 'soy', 'fish', 'shellfish', 'tree-nut']) {
    const matches = matchRecipes({ ...profile, allergies: [allergen] as typeof profile.allergies }, []);
    assert.ok(matches.length > 0, allergen);
    for (const { recipe } of matches) {
      const meal = catalogMeals.find(item => item.id === recipe.id);
      if (meal) assert.ok(!meal.allergens.includes(allergen), `${recipe.id} still offered for ${allergen}`);
    }
  }
  const vegan = matchRecipes({ ...profile, dietaryRestrictions: ['vegan'] }, []);
  assert.ok(vegan.length > 5);
  for (const { recipe } of vegan) { const meal = catalogMeals.find(item => item.id === recipe.id); if (meal) assert.equal(meal.vegan, true, recipe.id); }
  const vegetarian = matchRecipes({ ...profile, dietaryRestrictions: ['vegetarian'] }, []);
  for (const { recipe } of vegetarian) { const meal = catalogMeals.find(item => item.id === recipe.id); if (meal) assert.equal(meal.vegetarian, true, recipe.id); }
  const beef = recipes.find(recipe => recipe.id === 'beef-chili')!;
  assert.ok(recipeExclusionReasons(beef, { ...profile, members: [] , dietaryRestrictions: ['vegetarian'] }).length > 0);
});

test('pescatarian and meat rules exclude every meat meal', () => {
  const profile = { ...demoProfile, equipment: [...allEquipment], members: [{ id: 'm', name: 'M', rules: ['pescatarian'] as const, otherExclusions: [], ageGroup: 'adult' as const, medicalConsent: false, eggAllowed: null, dairyAllowed: null, allergies: [], noKnownAllergies: true, likes: [], dislikes: [], flavors: [], textures: [], cuisines: [], note: '', clinicianInstructions: '', potassiumCheck: 'unknown' as const, nutrients: [] }] };
  const meatFoods = new Set(['ground-lamb', 'lamb-steaks']);
  for (const { recipe } of matchRecipes({ ...profile, members: profile.members.map(member => ({ ...member, rules: [...member.rules] })) }, [])) {
    for (const part of recipe.ingredients) {
      const food = catalogFoods.find(item => item.id === part.ingredientId);
      assert.ok(!meatFoods.has(part.ingredientId));
      if (food) assert.ok(!['poultry', 'beef', 'pork', 'meat'].some(tag => ingredientTags(ingredients.find(item => item.id === food.id)!).includes(tag)), `${recipe.id} ${food.id}`);
    }
  }
});

test('catalog labels and aliases resolve to planner ingredient ids', () => {
  assert.equal(resolveKitchenFood('Spaghetti'), 'spaghetti');
  assert.equal(resolveKitchenFood('garbanzo beans'), 'chickpeas');
  assert.equal(resolveKitchenFood('Eggs'), 'eggs');
  assert.equal(resolveKitchenFood('black beans'), 'beans');
  assert.equal(resolveKitchenFood('oatmeal'), 'oats');
  assert.equal(resolveKitchenFood('constructor'), undefined);
  assert.equal(resolveKitchenFood('__proto__'), undefined);
  assert.equal(resolveKitchenFood('unobtainium'), undefined);
  // Catalog foods that no meal uses are searchable but have no planner ingredient.
  const unused = catalogFoods.find(food => !food.ingredientId)!;
  assert.equal(resolveKitchenFood(unused.label), undefined);
});

test('searchMeals finds meals by title and ingredient', () => {
  assert.deepEqual(searchMeals(''), []);
  assert.ok(searchMeals('pasta').length > 0);
  assert.ok(searchMeals('lentil').some(meal => meal.id === 'lentil-soup'));
  assert.ok(searchMeals('', 50, 'breakfast').every(meal => meal.mealTypes.includes('breakfast')));
});

test('foods API validates input, clamps limit and sets cache headers', async () => {
  const response = await call(getFoods, '/api/foods?q=tom&limit=500');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control') ?? '', /public/);
  const body = await response.json() as { foods: { id: string }[] };
  assert.ok(body.foods.length > 0 && body.foods.length <= 25);
  assert.equal((await (await call(getFoods, '/api/foods')).json() as { foods: unknown[] }).foods.length, 0);
  assert.equal((await (await call(getFoods, '/api/foods?q=rice&limit=0')).json() as { foods: unknown[] }).foods.length, 1);
  assert.equal((await (await call(getFoods, '/api/foods?q=rice&limit=abc')).json() as { error: unknown }).error !== undefined, true);
  assert.equal((await call(getFoods, `/api/foods?q=${'x'.repeat(200)}`)).status, 400);
  assert.equal((await call(getFoods, '/api/foods?q=a&category=Nope')).status, 400);
  const browse = await (await call(getFoods, '/api/foods?category=Fruit&limit=5')).json() as { foods: { category: string }[] };
  assert.equal(browse.foods.length, 5);
  assert.ok(browse.foods.every(food => food.category === 'Fruit'));
});

test('meals API validates input and filters by meal type', async () => {
  const body = await (await call(getMeals, '/api/meals?q=egg&mealType=breakfast&limit=100')).json() as { meals: { mealTypes: string[] }[] };
  assert.ok(body.meals.length > 0 && body.meals.length <= 25);
  assert.ok(body.meals.every(meal => meal.mealTypes.includes('breakfast')));
  assert.equal((await call(getMeals, '/api/meals?mealType=brunch')).status, 400);
  assert.equal((await (await call(getMeals, '/api/meals')).json() as { meals: unknown[] }).meals.length, 0);
});
