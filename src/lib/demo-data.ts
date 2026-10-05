import type { HouseholdProfile, Ingredient, PantryItem, PriceObservation, Recipe } from './domain';

export const ingredients: Ingredient[] = [
  ['oats', 'Rolled oats', 'g', [], true, true],
  ['banana', 'Banana', 'each', [], true, true],
  ['beans', 'Canned beans, drained', 'g', [], true, true],
  ['rice', 'Ready-to-eat cooked rice', 'g', [], true, true],
  ['tomato', 'Canned diced tomatoes', 'g', [], true, true],
  ['corn', 'Canned corn, drained', 'g', [], true, true],
  ['bread', 'Whole wheat bread', 'each', ['wheat'], true, true],
  ['peanut-butter', 'Peanut butter', 'g', ['peanut'], true, true],
  ['yogurt', 'Plain yogurt', 'g', ['milk'], true, false],
  ['carrot', 'Carrots', 'g', [], true, true],
  ['hummus', 'Hummus', 'g', ['sesame'], true, true],
].map(([id, name, baseUnit, allergenTags, vegetarian, vegan]) => ({
  id, name, baseUnit, allergenTags, vegetarian, vegan, allergenInformationKnown: true,
  foodTags: id === 'yogurt' ? ['dairy'] : id === 'bread' ? ['gluten'] : [],
  glutenStatus: id === 'bread' ? 'contains' as const : 'unknown' as const,
})) as Ingredient[];

const provenance = 'Original synthetic prototype recipe. Not professionally reviewed; check product labels and follow package directions. Not production recipe content.';
export const recipes: Recipe[] = [
  { id: 'banana-oats', title: 'Banana overnight oats', yieldServings: 2, equipment: ['refrigerator'], prepMinutes: 5, cookMinutes: 0, mealTypes: ['breakfast'], ingredients: [
    { ingredientId: 'oats', quantity: 100, unit: 'g', foodState: 'dry' }, { ingredientId: 'banana', quantity: 2, unit: 'each', foodState: 'raw' },
  ], steps: ['Divide 100 g rolled oats between two clean covered containers. Add 150 ml drinking water to each and stir.', 'Cover and refrigerate overnight. Before eating, peel and slice one banana over each portion.'], reviewStatus: 'synthetic-demo', provenance },
  { id: 'bean-rice', title: 'Microwave bean and rice bowls', yieldServings: 2, equipment: ['microwave'], prepMinutes: 5, cookMinutes: 5, mealTypes: ['lunch', 'dinner'], ingredients: [
    { ingredientId: 'beans', quantity: 240, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'rice', quantity: 250, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'tomato', quantity: 200, unit: 'g', foodState: 'ready-to-eat' },
  ], steps: ['Drain the canned beans and measure 240 g. Measure 200 g canned tomatoes.', 'Heat 250 g ready-to-eat rice following its package directions. Heat beans and tomatoes in a covered, vented microwave-safe bowl following the canned product reheating guidance; stir partway through.', 'Divide the rice and bean mixture into two portions. Eat promptly.'], reviewStatus: 'synthetic-demo', provenance },
  { id: 'bean-corn-salad', title: 'No-cook bean and corn salad', yieldServings: 2, equipment: [], prepMinutes: 10, cookMinutes: 0, mealTypes: ['lunch', 'dinner'], ingredients: [
    { ingredientId: 'beans', quantity: 240, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'corn', quantity: 200, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'tomato', quantity: 200, unit: 'g', foodState: 'ready-to-eat' },
  ], steps: ['Drain canned beans and corn. Measure 240 g beans, 200 g corn and 200 g canned tomatoes into a clean bowl.', 'Stir together and divide into two servings. Eat promptly; refrigerate unused opened ingredients according to product directions.'], reviewStatus: 'synthetic-demo', provenance },
  { id: 'banana-toast', title: 'Banana and peanut butter bread', yieldServings: 2, equipment: [], prepMinutes: 5, cookMinutes: 0, mealTypes: ['breakfast', 'snack'], ingredients: [
    { ingredientId: 'bread', quantity: 4, unit: 'each', foodState: 'ready-to-eat' }, { ingredientId: 'peanut-butter', quantity: 60, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'banana', quantity: 2, unit: 'each', foodState: 'raw' },
  ], steps: ['Spread 15 g peanut butter on each of four slices of bread.', 'Peel and slice two bananas over the bread. Serve two slices per portion.'], reviewStatus: 'synthetic-demo', provenance },
  { id: 'yogurt-banana', title: 'Yogurt and banana bowls', yieldServings: 2, equipment: [], prepMinutes: 5, cookMinutes: 0, mealTypes: ['breakfast', 'snack'], ingredients: [
    { ingredientId: 'yogurt', quantity: 340, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'banana', quantity: 2, unit: 'each', foodState: 'raw' },
  ], steps: ['Divide 340 g plain yogurt between two bowls.', 'Peel and slice one banana over each bowl. Eat promptly.'], reviewStatus: 'synthetic-demo', provenance },
  { id: 'carrot-hummus', title: 'Carrots with hummus', yieldServings: 2, equipment: [], prepMinutes: 10, cookMinutes: 0, mealTypes: ['snack'], ingredients: [
    { ingredientId: 'carrot', quantity: 200, unit: 'g', foodState: 'raw' }, { ingredientId: 'hummus', quantity: 100, unit: 'g', foodState: 'ready-to-eat' },
  ], steps: ['Wash 200 g carrots under running water, trim, and cut into pieces appropriate for the people eating.', 'Divide carrots and 100 g hummus into two portions.'], reviewStatus: 'synthetic-demo', provenance },
  { id: 'hummus-carrot-sandwich', title: 'Hummus and carrot sandwiches', yieldServings: 2, equipment: [], prepMinutes: 10, cookMinutes: 0, mealTypes: ['lunch'], ingredients: [
    { ingredientId: 'bread', quantity: 4, unit: 'each', foodState: 'ready-to-eat' }, { ingredientId: 'hummus', quantity: 100, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'carrot', quantity: 160, unit: 'g', foodState: 'raw' },
  ], steps: ['Wash and finely shred 160 g carrots.', 'Spread 25 g hummus on each of four slices of bread. Divide the shredded carrots between two slices and close each sandwich with another slice.', 'Serve promptly. Check the hummus and bread product labels for allergens.'], reviewStatus: 'synthetic-demo', provenance: 'Original unreviewed prototype combination inspired by USDA MyPlate Build a Better Sandwich: https://www.myplate.gov/sites/default/files/2024-01/BuildABetterSandwichWithMyPlate-01-03-24.pdf. Check product labels; this adaptation was not reviewed by USDA.' },
  { id: 'bean-corn-rice', title: 'Bean and corn rice bowls', yieldServings: 2, equipment: ['microwave'], prepMinutes: 5, cookMinutes: 5, mealTypes: ['lunch', 'dinner'], ingredients: [
    { ingredientId: 'beans', quantity: 240, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'rice', quantity: 250, unit: 'g', foodState: 'ready-to-eat' }, { ingredientId: 'corn', quantity: 200, unit: 'g', foodState: 'ready-to-eat' },
  ], steps: ['Drain canned beans and corn; measure 240 g beans and 200 g corn.', 'Heat the ready-to-eat rice following its package directions. Heat the beans and corn in a covered, vented microwave-safe bowl, stirring partway through.', 'Divide the rice, beans and corn between two bowls. Eat promptly.'], reviewStatus: 'synthetic-demo', provenance },
];
const recipePreferences: Record<string, { flavorTags: string[]; textureTags: string[]; cuisineTags: string[] }> = {
  'banana-oats': { flavorTags: ['sweet','mild'], textureTags: ['soft'], cuisineTags: ['breakfast bowl'] },
  'bean-rice': { flavorTags: ['savory','mild'], textureTags: ['soft'], cuisineTags: ['rice bowl'] },
  'bean-corn-salad': { flavorTags: ['savory','mild'], textureTags: ['crunchy'], cuisineTags: ['salad'] },
  'banana-toast': { flavorTags: ['sweet'], textureTags: ['crunchy'], cuisineTags: ['toast'] },
  'yogurt-banana': { flavorTags: ['sweet','mild'], textureTags: ['smooth'], cuisineTags: ['breakfast bowl'] },
  'carrot-hummus': { flavorTags: ['savory'], textureTags: ['crunchy','smooth'], cuisineTags: ['snack'] },
  'hummus-carrot-sandwich': { flavorTags: ['savory','mild'], textureTags: ['crunchy','smooth'], cuisineTags: ['sandwich'] },
  'bean-corn-rice': { flavorTags: ['savory','mild'], textureTags: ['soft'], cuisineTags: ['rice bowl'] },
};
for (const recipe of recipes) Object.assign(recipe, recipePreferences[recipe.id]);

export const prices: PriceObservation[] = ingredients.map((ingredient, index) => ({
  id: `demo-price-${ingredient.id}`, ingredientId: ingredient.id, storeId: 'demo-store',
  productName: ingredient.name, packageQuantity: [1000, 1, 240, 250, 400, 200, 20, 450, 680, 900, 200][index],
  packageUnit: ingredient.baseUnit, priceCents: [299, 30, 89, 149, 119, 99, 199, 249, 349, 179, 249][index],
  observedAt: '2026-09-30', sourceType: 'synthetic-demo', locationLabel: 'Illustrative store; no retailer connection',
}));
export const demoProfile: HouseholdProfile = {
  householdSize: 2, weeklyBudgetCents: 7500, allergies: [], dietaryRestrictions: [], excludedIngredientIds: [],
  equipment: ['microwave', 'refrigerator'], maxCookingMinutes: 30, mealsCovered: ['breakfast', 'dinner'],
  preferredStoreId: 'demo-store', uncertaintyBufferCents: 500, knownFeesCents: 0,
};
export const demoPantry: PantryItem[] = [
  { id: 'pantry-oats', ingredientId: 'oats', quantity: 500, unit: 'g', foodState: 'dry', quantityConfirmed: true },
  { id: 'pantry-beans', ingredientId: 'beans', quantity: 480, unit: 'g', foodState: 'ready-to-eat', quantityConfirmed: true },
  { id: 'pantry-rice', ingredientId: 'rice', quantity: 250, unit: 'g', foodState: 'ready-to-eat', quantityConfirmed: true },
];
