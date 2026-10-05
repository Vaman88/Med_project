import { ingredients as demoIngredients, prices as demoPrices, recipes as demoRecipes } from './demo-data';
import type { HouseholdProfile, Ingredient, MealPlan, MealPlanEntry, PantryItem, PriceObservation, Recipe, RecipeMatch, ShoppingItem, Unit } from './domain';
import { effectiveAllergies, effectiveRules } from './food-settings';
import { ingredientTags } from './ingredient-relationships';

export interface PlanningOptions { ingredients?: Ingredient[]; recipes?: Recipe[]; prices?: PriceObservation[]; now?: Date; maxPriceAgeDays?: number; allowSyntheticDemo?: boolean }
const units: Record<Unit, { dimension: string; factor: number }> = {
  g: { dimension: 'mass', factor: 1 }, kg: { dimension: 'mass', factor: 1000 }, oz: { dimension: 'mass', factor: 28.349523125 }, lb: { dimension: 'mass', factor: 453.59237 },
  ml: { dimension: 'volume', factor: 1 }, l: { dimension: 'volume', factor: 1000 }, cup: { dimension: 'volume', factor: 236.5882365 }, tbsp: { dimension: 'volume', factor: 14.78676478125 }, tsp: { dimension: 'volume', factor: 4.92892159375 }, each: { dimension: 'count', factor: 1 },
};
export function convertQuantity(quantity: number, from: Unit, to: Unit): number | null {
  if (!Number.isFinite(quantity) || quantity < 0 || !units[from] || !units[to] || units[from].dimension !== units[to].dimension) return null;
  return quantity * units[from].factor / units[to].factor;
}
function context(options: PlanningOptions) { return { ingredients: options.ingredients ?? demoIngredients, recipes: options.recipes ?? demoRecipes, prices: options.prices ?? demoPrices, now: options.now ?? new Date(), maxPriceAgeDays: options.maxPriceAgeDays ?? 30, allowSyntheticDemo: options.allowSyntheticDemo ?? true }; }
export function productConflict(price: PriceObservation, profile: HouseholdProfile): boolean {
  const tags = price.productTags ?? [];
  const allergies = effectiveAllergies(profile).ids;
  const rules = effectiveRules(profile);
  return tags.some(tag => allergies.includes(tag) || ['salmon','tuna','cod'].includes(tag) && allergies.includes('fish') || ['shrimp','crab','lobster'].includes(tag) && allergies.includes('shellfish') || ['almond','walnut','cashew','pecan'].includes(tag) && allergies.includes('tree-nut')) ||
    rules.includes('dairy_free') && tags.some(tag => tag === 'milk' || tag === 'dairy') ||
    (rules.includes('gluten_free') || rules.includes('celiac')) && tags.includes('gluten') ||
    rules.includes('exclude_beef') && tags.includes('beef') || rules.includes('exclude_pork') && tags.includes('pork') ||
    rules.includes('pescatarian') && tags.some(tag => ['beef','pork','poultry'].includes(tag));
}
export function validateProfile(profile: HouseholdProfile): void {
  if (!Number.isInteger(profile.householdSize) || profile.householdSize < 1 || profile.householdSize > 30) throw new Error('Household size must be a whole number from 1 to 30.');
  for (const value of [profile.weeklyBudgetCents, profile.knownFeesCents, profile.uncertaintyBufferCents]) if (!Number.isSafeInteger(value) || value < 0) throw new Error('Money amounts must be nonnegative whole cents.');
  if (!Number.isFinite(profile.maxCookingMinutes) || profile.maxCookingMinutes < 0) throw new Error('Cooking time must be nonnegative.');
  if (!profile.mealsCovered.length || new Set(profile.mealsCovered).size !== profile.mealsCovered.length || profile.mealsCovered.some(slot => !['breakfast', 'lunch', 'dinner', 'snack'].includes(slot))) throw new Error('Select distinct meal slots.');
}
export function recipeExclusionReasons(recipe: Recipe, profile: HouseholdProfile, options: PlanningOptions = {}): string[] {
  const data = context(options); const reasons: string[] = [];
  const allergy = effectiveAllergies(profile); const rules = effectiveRules(profile);
  const members = profile.members ?? [];
  if (allergy.unresolved) reasons.push('An allergy needs caregiver clarification.');
  if (recipe.reviewStatus !== 'approved' && !data.allowSyntheticDemo) reasons.push('Recipe has not been reviewed.');
  for (const appliance of recipe.equipment) if (!profile.equipment.includes(appliance)) reasons.push(`Requires ${appliance}.`);
  for (const part of recipe.ingredients) {
    const ingredient = data.ingredients.find(item => item.id === part.ingredientId);
    if (!ingredient) { reasons.push('Ingredient information is unresolved.'); continue; }
    if (allergy.ids.length && !ingredient.allergenInformationKnown) reasons.push(`Allergen information unresolved for ${ingredient.name}.`);
    const tags = ingredientTags(ingredient);
    const allergenConflict = tags.some(tag => allergy.ids.includes(tag) || (['salmon','tuna','cod'].includes(tag) && allergy.ids.includes('fish')) || (['shrimp','crab','lobster'].includes(tag) && allergy.ids.includes('shellfish')) || (['almond','walnut','cashew','pecan'].includes(tag) && allergy.ids.includes('tree-nut')));
    if (allergenConflict) reasons.push(`Conflicts with a declared allergy: ${ingredient.name}.`);
    if (profile.excludedIngredientIds.includes(ingredient.id)) reasons.push(`Excluded ingredient: ${ingredient.name}.`);
    if (profile.dietaryRestrictions.includes('vegetarian') && !ingredient.vegetarian || profile.dietaryRestrictions.includes('vegan') && !ingredient.vegan) reasons.push(`Conflicts with dietary restriction: ${ingredient.name}.`);
    if (rules.includes('vegetarian') && !ingredient.vegetarian || rules.includes('vegan') && !ingredient.vegan || rules.includes('pescatarian') && tags.some(tag => ['beef','pork','poultry'].includes(tag))) reasons.push(`Conflicts with dietary pattern: ${ingredient.name}.`);
    if (rules.includes('exclude_beef') && tags.includes('beef') || rules.includes('exclude_pork') && tags.includes('pork')) reasons.push(`Excluded meat or derivative: ${ingredient.name}.`);
    if (rules.includes('dairy_free') && tags.includes('dairy')) reasons.push(`Contains dairy: ${ingredient.name}.`);
    if (members.some(member => member.eggAllowed === false) && tags.includes('egg') || members.some(member => member.dairyAllowed === false) && tags.some(tag => tag === 'milk' || tag === 'dairy')) reasons.push(`Not allowed for a household member: ${ingredient.name}.`);
    if ((rules.includes('exclude_beef') || rules.includes('exclude_pork') || rules.includes('pescatarian')) && tags.includes('animal-source-unknown')) reasons.push(`Animal source needs checking: ${ingredient.name}.`);
    if ((rules.includes('gluten_free') || rules.includes('celiac')) && (tags.includes('gluten') || ingredient.glutenStatus !== 'verified-free')) reasons.push(`Gluten status needs checking: ${ingredient.name}.`);
    if (rules.includes('celiac') && ingredient.id === 'oats') reasons.push('Oats require verified gluten-free labeling and caregiver review.');
    if (profile.members?.some(member => member.otherExclusions.some(value => value.toLowerCase() === ingredient.name.toLowerCase() || value.toLowerCase() === ingredient.id))) reasons.push(`Other food exclusion: ${ingredient.name}.`);
  }
  if (rules.includes('celiac') && !recipe.celiacPreparationVerified) reasons.push('Celiac preparation and cross-contact need caregiver label review.');
  return reasons;
}

export function calculatePlan(profile: HouseholdProfile, pantry: PantryItem[], entries: MealPlanEntry[], options: PlanningOptions = {}): MealPlan {
  validateProfile(profile); const data = context(options); const warnings: string[] = []; const requirements = new Map<string, { ingredientId: string; state: string; quantity: number }>();
  const batches = new Map<string, MealPlanEntry[]>(); const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error('Plan entry IDs must be unique.'); ids.add(entry.id);
    if (!Number.isInteger(entry.day) || entry.day < 0 || entry.day > 6 || !['breakfast','lunch','dinner','snack'].includes(entry.mealType) || !Number.isFinite(entry.plannedServings) || entry.plannedServings <= 0) throw new Error('Invalid meal slot or serving quantity.');
    if (entry.isLeftover && !entry.batchId) throw new Error('Leftovers must reference a cooking batch.');
    const key = entry.batchId ?? `entry:${entry.id}`; const group = batches.get(key) ?? []; group.push(entry); batches.set(key, group);
  }
  for (const group of batches.values()) {
    const cooks = group.filter(entry => !entry.isLeftover); if (cooks.length !== 1) throw new Error('Each batch needs exactly one cooking event.');
    const cook = cooks[0]; const recipe = data.recipes.find(item => item.id === cook.recipeId);
    if (!recipe) throw new Error('Unknown recipe.');
    const reasons = recipeExclusionReasons(recipe, profile, options); if (reasons.length) throw new Error(reasons.join(' '));
    if (group.some(entry => entry.recipeId !== cook.recipeId)) throw new Error('A leftover must use its original batch recipe.');
    if (group.some(entry => !recipe.mealTypes.includes(entry.mealType))) throw new Error('Recipe does not support this meal slot.');
    if (!Number.isFinite(recipe.yieldServings) || recipe.yieldServings <= 0) throw new Error('Recipe yield must be positive.');
    const servings = cook.batchServings ?? cook.plannedServings;
    if (!Number.isFinite(servings) || servings < group.reduce((sum, entry) => sum + entry.plannedServings, 0)) throw new Error('Batch does not contain enough servings.');
    if (group.some(entry => entry.isLeftover)) {
      if (!profile.equipment.includes('refrigerator')) throw new Error('Stored leftovers require confirmed refrigeration.');
      if (group.some(entry => entry.day < cook.day || entry.day - cook.day > 3)) throw new Error('Leftovers must follow cooking within three days; check reviewed storage guidance.');
      warnings.push('Linked leftovers require safe handling and prompt refrigeration; follow reviewed storage guidance.');
    }
    for (const part of recipe.ingredients) {
      const ingredient = data.ingredients.find(item => item.id === part.ingredientId)!;
      const amount = convertQuantity(part.quantity * servings / recipe.yieldServings, part.unit, ingredient.baseUnit);
      if (amount === null || !Number.isFinite(amount)) throw new Error(`Cannot convert the recipe unit for ${ingredient.name}.`);
      const key = `${ingredient.id}:${part.foodState}`; const existing = requirements.get(key);
      requirements.set(key, { ingredientId: ingredient.id, state: part.foodState, quantity: (existing?.quantity ?? 0) + amount });
    }
    if (recipe.reviewStatus === 'synthetic-demo') warnings.push('Synthetic demo recipes are unreviewed and must be reviewed before public release.');
  }
  const inventory = pantry.map(item => ({ ...item, remaining: item.quantity })); const aggregate = new Map<string, { required: number; used: number }>();
  for (const required of requirements.values()) {
    const ingredient = data.ingredients.find(item => item.id === required.ingredientId)!; let remaining = required.quantity;
    for (const item of inventory) {
      if (item.ingredientId !== ingredient.id || !item.quantityConfirmed || item.foodState !== required.state || (item.expiryDate && item.expiryDate < data.now.toISOString().slice(0, 10))) continue;
      const amount = convertQuantity(item.remaining, item.unit, ingredient.baseUnit);
      if (amount === null) { warnings.push(`Confirm compatible units for pantry ${ingredient.name}; its quantity was not deducted.`); continue; }
      const used = Math.min(amount, remaining); item.remaining -= convertQuantity(used, ingredient.baseUnit, item.unit)!; remaining -= used;
    }
    const previous = aggregate.get(ingredient.id) ?? { required: 0, used: 0 };
    aggregate.set(ingredient.id, { required: previous.required + required.quantity, used: previous.used + required.quantity - remaining });
  }
  const shoppingItems: ShoppingItem[] = [];
  for (const [ingredientId, amount] of aggregate) {
    const ingredient = data.ingredients.find(item => item.id === ingredientId)!; const needed = Math.max(0, amount.required - amount.used);
    if (needed <= 1e-8) continue;
    const price = data.prices.filter(price => price.ingredientId === ingredientId && price.storeId === profile.preferredStoreId && !productConflict(price, profile) && Number.isSafeInteger(price.priceCents) && price.priceCents >= 0 && Number.isFinite(price.packageQuantity) && price.packageQuantity >= .01 && convertQuantity(price.packageQuantity, price.packageUnit, ingredient.baseUnit) !== null && Number.isFinite(Date.parse(price.observedAt)) && Date.parse(price.observedAt) <= data.now.getTime()).sort((a,b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
    const packageSize = price ? convertQuantity(price.packageQuantity, price.packageUnit, ingredient.baseUnit)! : null;
    const count = packageSize ? Math.ceil((needed - 1e-8) / packageSize) : null;
    if (count !== null && (!Number.isSafeInteger(count) || (price && !Number.isSafeInteger(count * price.priceCents)))) throw new Error('Purchase quantity or cost is too large to calculate safely.');
    const stale = price && (data.now.getTime() - Date.parse(price.observedAt)) / 86400000 > data.maxPriceAgeDays;
    shoppingItems.push({ ingredientId, name: ingredient.name, unit: ingredient.baseUnit, requiredQuantity: amount.required, pantryQuantityUsed: amount.used, newQuantityNeeded: needed, packageCount: count, purchaseCostCents: price && count !== null ? price.priceCents * count : null, priceObservationId: price?.id ?? null, priceStatus: !price ? 'missing' : stale ? 'stale' : 'current', productCheckStatus: price?.labelStatus === 'verified' && price.labelSource && price.sourceType === 'reviewed' ? 'verified' : 'needs-checking', purchasedQuantity: count !== null && packageSize !== null ? count * packageSize : null });
  }
  const missingPriceCount = shoppingItems.filter(item => item.priceStatus === 'missing').length; const stalePriceCount = shoppingItems.filter(item => item.priceStatus === 'stale').length;
  const purchaseTotalCents = shoppingItems.reduce((sum, item) => sum + (item.purchaseCostCents ?? 0), 0); const totalCents = purchaseTotalCents + profile.knownFeesCents + profile.uncertaintyBufferCents;
  if (!Number.isSafeInteger(totalCents)) throw new Error('Total cost is too large to calculate safely.');
  if (missingPriceCount) warnings.push('Unknown costs are not zero: the displayed total is only the priced portion.');
  if (stalePriceCount) warnings.push('Some saved prices are stale; confirm them before shopping.');
  if (shoppingItems.some(item => item.productCheckStatus === 'needs-checking')) warnings.push('Product labels and cross-contact information need checking before purchase. Prices are illustrative.');
  if (totalCents > profile.weeklyBudgetCents) warnings.push('The priced portion exceeds the budget. Keep requested meals and consider compatible swaps or food support.');
  return { entries: entries.map(entry => ({ ...entry })), shoppingItems, warnings: [...new Set(warnings)], budget: { purchaseTotalCents, knownFeesCents: profile.knownFeesCents, uncertaintyBufferCents: profile.uncertaintyBufferCents, totalCents, remainingBudgetCents: missingPriceCount ? null : profile.weeklyBudgetCents - totalCents, shortfallCents: missingPriceCount ? null : Math.max(0,totalCents - profile.weeklyBudgetCents), missingPriceCount, stalePriceCount, status: missingPriceCount ? 'incomplete-estimate' : totalCents <= profile.weeklyBudgetCents ? 'estimated-within-budget' : 'over-budget', estimateDate: data.now.toISOString().slice(0,10), storeId: profile.preferredStoreId, feesIncluded: profile.knownFeesCents > 0 } };
}

export function matchRecipes(profile: HouseholdProfile, pantry: PantryItem[], options: PlanningOptions = {}): RecipeMatch[] {
  validateProfile(profile); const data = context(options);
  return data.recipes.filter(recipe => !recipeExclusionReasons(recipe, profile, options).length).map(recipe => {
    const entry: MealPlanEntry = { id: 'preview', day: 0, mealType: recipe.mealTypes[0], recipeId: recipe.id, plannedServings: profile.householdSize };
    const result = calculatePlan(profile, pantry, [entry], options);
    const missingIngredients = result.shoppingItems.map(item => item.ingredientId); const pantryMatch = 1 - missingIngredients.length / recipe.ingredients.length;
    const estimatedPurchaseCents = result.budget.purchaseTotalCents;
    const affordability = Math.max(0,1 - estimatedPurchaseCents / Math.max(1,profile.weeklyBudgetCents));
    const preparationFit = Math.max(0,1 - (recipe.prepMinutes + recipe.cookMinutes) / Math.max(1,profile.maxCookingMinutes));
    const settings = profile.members ?? [];
    const foodIds = recipe.ingredients.map(part => part.ingredientId);
    const likes = settings.flatMap(member => member.likes).filter(value => foodIds.some(id => id === value.toLowerCase() || data.ingredients.find(i => i.id === id)?.name.toLowerCase().includes(value.toLowerCase()))).length;
    const dislikes = settings.flatMap(member => member.dislikes).filter(value => foodIds.some(id => id === value.toLowerCase() || data.ingredients.find(i => i.id === id)?.name.toLowerCase().includes(value.toLowerCase()))).length;
    const preferredStyles = settings.reduce((sum, member) => sum + member.flavors.filter(v => recipe.flavorTags?.includes(v)).length + member.textures.filter(v => recipe.textureTags?.includes(v)).length + member.cuisines.filter(v => recipe.cuisineTags?.some(tag => tag.toLowerCase() === v.toLowerCase())).length, 0);
    const nutrients = settings.flatMap(member => member.clinicianInstructions.trim() ? [] : member.nutrients.filter(n => n.reason !== 'unsure' && (n.nutrientId !== 'potassium' || member.potassiumCheck === 'clinician_recommended' || member.potassiumCheck === 'no_restriction_reported' && !member.rules.includes('type_1_diabetes')))).filter(n => recipe.ingredients.some(part => data.ingredients.find(item => item.id === part.ingredientId)?.nutrientRecords?.some(record => record.nutrientId === n.nutrientId && record.foodState === part.foodState && record.status === 'verified' && record.source.trim() && record.amountPer100g > 0))).length;
    const explanation = dislikes ? 'Includes a food you would rather skip. You can choose another option.' : likes ? 'Uses an ingredient from your foods you like. Check product labels with a grown-up.' : nutrients ? 'Uses an ingredient with a verified nutrient record. Check the serving and source details.' : 'Uses listed ingredients and available equipment. Check product labels with a grown-up.';
    return { recipe, missingIngredients, pantryMatch, estimatedPurchaseCents, hasMissingPrices: result.budget.missingPriceCount > 0, hasStalePrices: result.budget.stalePriceCount > 0, explanation, score: .35 * pantryMatch + .30 * affordability + .15 * preparationFit + .08 * likes - .08 * dislikes + .03 * nutrients + .025 * preferredStyles };
  }).sort((a,b) => Number(a.hasMissingPrices) - Number(b.hasMissingPrices) || Number(a.hasStalePrices) - Number(b.hasStalePrices) || b.score - a.score || a.recipe.id.localeCompare(b.recipe.id));
}
export function generateWeeklyPlan(profile: HouseholdProfile, pantry: PantryItem[], options: PlanningOptions = {}): MealPlan {
  const matches = matchRecipes(profile, pantry, options); const entries: MealPlanEntry[] = []; const counts = new Map<string,number>();
  for (let day = 0; day < 7; day++) for (const mealType of profile.mealsCovered) {
    const candidates = matches.filter(match => match.recipe.mealTypes.includes(mealType));
    if (!candidates.length) throw new Error(`No compatible ${mealType} recipe. Update preferences or add reviewed recipe options.`);
    const ranked = candidates.map(match => { const entry: MealPlanEntry = { id: `day-${day}-${mealType}`, day, mealType, recipeId: match.recipe.id, plannedServings: profile.householdSize }; const plan = calculatePlan(profile, pantry, [...entries,entry], options); return { entry, rank: plan.budget.purchaseTotalCents + plan.budget.missingPriceCount * 100000 + (counts.get(match.recipe.id) ?? 0) * 150 - match.score * 1000 }; }).sort((a,b) => a.rank - b.rank || a.entry.recipeId.localeCompare(b.entry.recipeId));
    const entry = ranked[0].entry; entries.push(entry); counts.set(entry.recipeId,(counts.get(entry.recipeId) ?? 0) + 1);
  }
  return calculatePlan(profile, pantry, entries, options);
}
export function swapMeal(profile: HouseholdProfile, pantry: PantryItem[], plan: MealPlan, entryId: string, recipeId: string, options: PlanningOptions = {}): MealPlan {
  const target = plan.entries.find(entry => entry.id === entryId); if (!target) throw new Error('Meal slot not found.');
  const entries = plan.entries.map(entry => entry.id === entryId || (target.batchId && entry.batchId === target.batchId) ? { ...entry, recipeId } : { ...entry });
  return calculatePlan(profile, pantry, entries, options);
}
