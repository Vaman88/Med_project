import type { FoodState, HouseholdProfile, Ingredient, NutrientInterest, PriceObservation, Recipe } from './domain';
import { convertQuantity, recipeExclusionReasons } from './planning';

export type CarbohydrateEstimate =
  | { status: 'unknown'; reason: string }
  | { status: 'estimated'; gramsPerServing: number; sources: string[] };

/** Uses measured recipe amounts and verified records in the same preparation state. */
export function estimateCarbohydrates(recipe: Recipe, ingredients: Ingredient[]): CarbohydrateEstimate {
  if (!(recipe.yieldServings > 0)) return { status: 'unknown', reason: 'Serving size is unknown.' };
  let total = 0;
  const sources = new Set<string>();
  for (const part of recipe.ingredients) {
    const ingredient = ingredients.find(item => item.id === part.ingredientId);
    const grams = convertQuantity(part.quantity, part.unit, 'g');
    const record = ingredient?.nutrientRecords?.find(item => item.nutrientId === 'carbohydrate' && item.foodState === part.foodState && item.unit === 'g' && item.status === 'verified' && item.source.trim());
    if (!ingredient || grams === null || !record || !Number.isFinite(record.amountPer100g) || record.amountPer100g < 0) return { status: 'unknown', reason: `Verified carbohydrate data or measured mass is missing for ${ingredient?.name ?? part.ingredientId}.` };
    total += grams * record.amountPer100g / 100;
    sources.add(record.source);
  }
  return { status: 'estimated', gramsPerServing: Math.round(total / recipe.yieldServings * 10) / 10, sources: [...sources] };
}

export interface NutrientIdea { ingredientId: string; name: string; source: string; estimatedPackageCents: number }
export function compatibleNutrientIdeas(profile: HouseholdProfile, memberId: string, nutrientId: NutrientInterest['nutrientId'], ingredients: Ingredient[], prices: PriceObservation[], state: FoodState = 'ready-to-eat'): NutrientIdea[] {
  const member = profile.members?.find(item => item.id === memberId);
  const interest = member?.nutrients.find(item => item.nutrientId === nutrientId);
  if (!member || !interest || interest.reason === 'unsure' || member.clinicianInstructions.trim()) return [];
  if (nutrientId === 'potassium' && (member.potassiumCheck === 'unknown' || member.rules.includes('type_1_diabetes') && member.potassiumCheck !== 'clinician_recommended')) return [];
  return ingredients.flatMap(ingredient => {
    const record = ingredient.nutrientRecords?.find(item => item.nutrientId === nutrientId && item.foodState === state && item.status === 'verified' && item.source.trim() && item.amountPer100g > 0);
    const price = prices.filter(item => item.ingredientId === ingredient.id && item.storeId === profile.preferredStoreId && item.priceCents <= profile.weeklyBudgetCents).sort((a,b) => a.priceCents - b.priceCents)[0];
    if (!record || !price) return [];
    const recipe: Recipe = { id: `idea-${ingredient.id}`, title: ingredient.name, yieldServings: 1, equipment: [], prepMinutes: 0, cookMinutes: 0, mealTypes: ['snack'], ingredients: [{ ingredientId: ingredient.id, quantity: 100, unit: 'g', foodState: state }], steps: ['Check the label and prepare as directed.'], reviewStatus: 'approved', provenance: record.source, celiacPreparationVerified: false };
    if (recipeExclusionReasons(recipe, profile, { ingredients, allowSyntheticDemo: false }).length) return [];
    return [{ ingredientId: ingredient.id, name: ingredient.name, source: record.source, estimatedPackageCents: price.priceCents }];
  }).sort((a,b) => a.estimatedPackageCents - b.estimatedPackageCents);
}
