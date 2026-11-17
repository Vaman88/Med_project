import type { HouseholdProfile } from './domain';
import { findCatalogFood } from './food-catalog';
import { effectiveAllergies, effectiveRules } from './food-settings';
import { libraryIngredientTags } from './ingredient-relationships';
import { simpleFoodName } from './recipe-library';

/*
 * Compares a recipe-library (TheMealDB) recipe with the family's food settings. Library recipes are not
 * reviewed: this can only point out conflicts it recognizes. An ingredient with no recognized conflict is
 * never reported as safe, and one it cannot recognize at all is reported as unverified.
 */

export type LibraryIngredientStatus = 'conflict' | 'unverified' | 'no-known-conflict';
export interface LibraryIngredientCheck { name: string; status: LibraryIngredientStatus; reasons: string[] }
export interface LibraryRecipeCheck {
  items: LibraryIngredientCheck[];
  conflicts: LibraryIngredientCheck[];
  unverified: LibraryIngredientCheck[];
  /** Typed allergy or exclusion entries that can only be matched by name. */
  nameOnlySettings: string[];
  /** Whether the profile holds any food settings to check against. */
  hasSettings: boolean;
}

const allergyLabels: Record<string, string> = {
  peanut: 'peanuts', 'tree-nut': 'tree nuts', milk: 'milk', egg: 'egg', wheat: 'wheat', soy: 'soy', fish: 'fish',
  shellfish: 'shellfish', sesame: 'sesame', almond: 'almonds', walnut: 'walnuts', cashew: 'cashews', pecan: 'pecans',
  salmon: 'salmon', tuna: 'tuna', cod: 'cod', shrimp: 'shrimp', crab: 'crab', lobster: 'lobster',
};
/** Tags that also count for a broader allergy ("salmon" is a fish). */
const allergyMembers: Record<string, string[]> = {
  fish: ['salmon', 'tuna', 'cod'], shellfish: ['shrimp', 'crab', 'lobster'],
  'tree-nut': ['almond', 'walnut', 'cashew', 'pecan'], milk: ['dairy'],
};
const MEAT = ['meat', 'poultry', 'beef', 'pork'];
const SEAFOOD = ['fish', 'shellfish', 'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'lobster'];

/** Normalized tags for a free-text ingredient, plus whether anything about it was recognized. */
export function normalizeLibraryIngredient(name: string): { tags: string[]; recognized: boolean; ingredientIds: string[] } {
  const tags = new Set(libraryIngredientTags(name));
  const food = findCatalogFood(name) ?? findCatalogFood(simpleFoodName(name));
  if (food) {
    food.allergens.forEach(tag => tags.add(tag));
    if (!food.vegetarian) tags.add('not-vegetarian');
    if (!food.vegan) tags.add('not-vegan');
  }
  const ingredientIds = food ? [food.id, ...(food.ingredientId ? [food.ingredientId] : [])] : [];
  return { tags: [...tags], recognized: !!food || tags.size > 0, ingredientIds };
}

const words = (text: string) => ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/(\p{L}{3,})s\b/gu, '$1').trim()} `;

export function checkLibraryRecipe(ingredientNames: string[], profile?: HouseholdProfile | null): LibraryRecipeCheck {
  const members = profile?.members ?? [];
  const allergy = profile ? effectiveAllergies(profile) : { ids: [], unresolved: false };
  // Pending allergy entries that already name a known allergen are checked as allergies too.
  const allergyIds = new Set([...allergy.ids, ...members.flatMap(member => member.allergies)
    .filter(entry => entry.status !== 'confirmed' && entry.canonicalId).map(entry => entry.canonicalId!.toLowerCase())]);
  const rules = new Set<string>([...(profile ? effectiveRules(profile) : [])]);
  const excluded = new Set(profile?.excludedIngredientIds ?? []);
  const nameOnlySettings = [...new Set([
    ...members.flatMap(member => member.allergies).filter(entry => !entry.canonicalId).map(entry => entry.rawText.trim()),
    ...members.flatMap(member => member.otherExclusions).map(value => value.trim()),
  ].filter(Boolean))];
  const noEgg = members.some(member => member.eggAllowed === false);
  const noDairy = members.some(member => member.dairyAllowed === false);
  const hasSettings = !!(allergyIds.size || rules.size || excluded.size || nameOnlySettings.length || noEgg || noDairy);
  const glutenRule = rules.has('gluten_free') || rules.has('celiac');

  const items = ingredientNames.map((name): LibraryIngredientCheck => {
    const { tags, recognized, ingredientIds } = normalizeLibraryIngredient(name);
    const has = (...wanted: string[]) => wanted.some(tag => tags.includes(tag));
    const conflicts: string[] = [];
    const checks: string[] = [];
    for (const id of allergyIds) {
      if (has(id, ...(allergyMembers[id] ?? []))) conflicts.push(`Contains ${allergyLabels[id] ?? id}, listed as an allergy`);
    }
    if (rules.has('vegan') && has(...MEAT, ...SEAFOOD, 'dairy', 'milk', 'egg', 'honey', 'not-vegan')) conflicts.push('Not vegan');
    else if (rules.has('vegetarian') && has(...MEAT, ...SEAFOOD, 'not-vegetarian')) conflicts.push('Not vegetarian');
    if (rules.has('pescatarian') && has(...MEAT)) conflicts.push('Not pescatarian');
    if (rules.has('exclude_beef') && has('beef')) conflicts.push('Contains beef, which you exclude');
    if (rules.has('exclude_pork') && has('pork')) conflicts.push('Contains pork, which you exclude');
    if ((rules.has('dairy_free') || noDairy) && has('dairy', 'milk') && !allergyIds.has('milk')) conflicts.push('Contains dairy, which you avoid');
    if (noEgg && has('egg') && !allergyIds.has('egg')) conflicts.push('Contains egg, which you avoid');
    if (glutenRule && has('gluten', 'wheat')) conflicts.push('Contains gluten');
    if (ingredientIds.some(id => excluded.has(id))) conflicts.push('Excluded in your food settings');
    const nameWords = words(name);
    for (const term of nameOnlySettings) {
      const termWords = words(term);
      if (termWords.trim() && nameWords.includes(termWords)) conflicts.push(`Matches “${term}” in your food settings`);
    }
    const meatRule = ['vegan', 'vegetarian', 'pescatarian', 'exclude_beef', 'exclude_pork'].some(rule => rules.has(rule));
    if (!conflicts.length && meatRule && has('animal-source-unknown')) checks.push('Animal source unknown, check the label');
    if (!conflicts.length && glutenRule) checks.push('Gluten status not verified');
    if (conflicts.length) return { name, status: 'conflict', reasons: conflicts };
    if (!recognized) return { name, status: 'unverified', reasons: ['Not recognized, so it could not be checked', ...checks] };
    return { name, status: checks.length ? 'unverified' : 'no-known-conflict', reasons: checks };
  });
  return {
    items,
    conflicts: items.filter(item => item.status === 'conflict'),
    unverified: items.filter(item => item.status === 'unverified'),
    nameOnlySettings,
    hasSettings,
  };
}
