import type { Ingredient } from './domain';

// Conservative relationships for named ingredients only. Unspecified animal sources remain unresolved.
const namedTags: [RegExp, string[]][] = [
  [/\b(beef|beef broth|tallow)\b/i, ['beef']],
  [/\b(pork|bacon|ham|lard|pork gelatin)\b/i, ['pork']],
  [/\b(milk|cheese|yogurt|butter|cream|whey|casein|lactose.free milk)\b/i, ['dairy','milk']],
  [/\bwheat\b/i, ['gluten','wheat']],
  [/\b(barley|rye|triticale|malt)\b/i, ['gluten']],
  [/\bsalmon\b/i, ['fish','salmon']], [/\btuna\b/i, ['fish','tuna']], [/\bcod\b/i, ['fish','cod']],
  [/\b(shrimp|prawn)\b/i, ['shellfish','shrimp']], [/\bcrab\b/i, ['shellfish','crab']], [/\blobster\b/i, ['shellfish','lobster']],
  [/\balmonds?\b/i, ['tree-nut','almond']], [/\bwalnuts?\b/i, ['tree-nut','walnut']], [/\bcashews?\b/i, ['tree-nut','cashew']], [/\bpecans?\b/i, ['tree-nut','pecan']],
  [/\b(gelatin|broth)\b/i, ['animal-source-unknown']],
];
export function ingredientTags(ingredient: Ingredient): string[] {
  const name = ingredient.name.toLowerCase();
  const tags = new Set([...(ingredient.foodTags ?? []), ...ingredient.allergenTags]);
  for (const [pattern, values] of namedTags) if (pattern.test(name)) values.forEach(tag => tags.add(tag));
  if (/\bpork gelatin\b/.test(name) || /\bbeef broth\b/.test(name)) tags.delete('animal-source-unknown');
  return [...tags];
}
export function foodNameTags(name: string): string[] {
  return ingredientTags({ id: 'typed-food', name, baseUnit: 'g', allergenTags: [], allergenInformationKnown: false, vegetarian: true, vegan: true });
}
