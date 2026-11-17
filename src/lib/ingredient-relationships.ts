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

/*
 * Free-text recipe-library ingredients ("2 tbsp Parmesan", "Egg noodles") are matched more widely than
 * planner foods. Matching can only find conflicts: an ingredient with no match is unverified, never safe.
 */
const libraryTags: [RegExp, string[]][] = [
  [/\beggs?\b|\b(mayonnaise|mayo|meringue|aioli)\b/i, ['egg']],
  [/\bpeanuts?\b|\bgroundnuts?\b|\bsatay\b/i, ['peanut']],
  [/\b(soy|soya|soybeans?|tofu|tempeh|edamame|miso|tamari)\b/i, ['soy']],
  [/\b(sesame|tahini)\b/i, ['sesame']],
  [/\b(hazelnuts?|pistachios?|macadamias?|brazil nuts?|pine nuts?|marzipan|praline|nuts)\b/i, ['tree-nut']],
  [/\b(fish|anchov(y|ies)|sardines?|haddock|mackerel|trout|tilapia|halibut|herring|pollock|monkfish|sea bass|kipper)\b/i, ['fish']],
  [/\b(mussels?|clams?|scallops?|oysters?|squid|calamari|octopus|crayfish|langoustines?|king prawns?)\b/i, ['shellfish']],
  [/\b(parmesan|parmigiano|mozzarella|cheddar|feta|ricotta|mascarpone|ghee|buttermilk|cr[eè]me fra[iî]che|paneer|custard|gruyere|gruyère|brie|camembert|halloumi|stilton|creme|quark)\b/i, ['dairy', 'milk']],
  [/\b(flour|bread|breadcrumbs?|pasta|spaghetti|linguine|fettuccine|tagliatelle|penne|macaroni|lasagne|lasagna|noodles?|couscous|bulgur|semolina|pastry|filo|phyllo|tortillas?|pitta|pita|naan|biscuits?|crackers?|cake)\b/i, ['gluten', 'wheat']],
  [/\b(beer|ale|stout)\b/i, ['gluten']],
  [/\b(chicken|turkey|duck|goose|poussin)\b/i, ['poultry', 'meat']],
  [/\b(lamb|mutton|goat|venison|veal|rabbit|kidneys?|liver|minced meat|mince|meatballs?)\b/i, ['meat']],
  [/\b(beef|steak|brisket|oxtail)\b/i, ['beef', 'meat']],
  [/\b(pork|bacon|ham|lard|prosciutto|pancetta|chorizo|salami|pepperoni|gammon)\b/i, ['pork', 'meat']],
  [/\b(sausages?|stock|gelatine?|suet|worcestershire)\b/i, ['animal-source-unknown']],
  [/\bhoney\b/i, ['honey']],
];
/** Plant "milks" and nut "butters" are not dairy; the nut part still counts. */
const notDairy = /\b(coconut|almond|oat|soy|soya|rice|cashew|peanut|cocoa|apple|nut|shea) (milk|butter|cream)\b|\bbutter beans?\b|\bbutternut\b|\bcream of tartar\b/i;
/** Flours and noodles named for a gluten-free grain; still unverified for cross-contact. */
const notWheat = /\b(rice|corn|maize|gram|chickpea|almond|coconut|buckwheat|tapioca|potato)( \w+)? (flour|noodles?|pasta|tortillas?|crackers?)\b|\bcornflour\b|\bcorn tortillas?\b/i;
const notMeat = /\b(vegetable|veg|mushroom) stock\b|\b(vegetarian|vegan|plant[- ]based) (sausages?|mince)\b/i;

export function libraryIngredientTags(name: string): string[] {
  const tags = new Set(foodNameTags(name));
  for (const [pattern, values] of libraryTags) if (pattern.test(name)) values.forEach(tag => tags.add(tag));
  if (notDairy.test(name)) { tags.delete('dairy'); tags.delete('milk'); }
  if (notWheat.test(name)) { tags.delete('wheat'); tags.delete('gluten'); }
  if (notMeat.test(name)) { ['meat', 'poultry', 'beef', 'pork', 'animal-source-unknown'].forEach(tag => tags.delete(tag)); }
  if (/\b(chicken|beef|lamb|pork|fish) stock\b/i.test(name)) tags.delete('animal-source-unknown');
  return [...tags];
}
