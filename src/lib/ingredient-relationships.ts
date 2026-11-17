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
  // Worcestershire sauce is made with anchovies.
  [/\b(fish|anchov(y|ies)|sardines?|haddock|mackerel|trout|tilapia|halibut|herring|pollock|monkfish|sea bass|kipper|worcestershire)\b/i, ['fish']],
  [/\b(mussels?|clams?|scallops?|oysters?|squid|calamari|octopus|crayfish|langoustines?)\b/i, ['shellfish']],
  [/\b(shrimps|prawns)\b/i, ['shellfish', 'shrimp']], [/\bcrabs\b/i, ['shellfish', 'crab']], [/\blobsters\b/i, ['shellfish', 'lobster']],
  [/\b(salmon|tuna|cod)s\b/i, ['fish']],
  [/\b(parmesan|parmigiano|mozzarella|cheddar|feta|ricotta|mascarpone|ghee|buttermilk|cr[eè]me fra[iî]che|paneer|custard|gruyere|gruyère|brie|camembert|halloumi|stilton|creme|quark)\b/i, ['dairy', 'milk']],
  [/\b(flour|bread|breadcrumbs?|pasta|spaghetti|linguine|fettuccine|tagliatelle|penne|macaroni|lasagne|lasagna|noodles?|couscous|bulgur|semolina|pastry|filo|phyllo|tortillas?|pitta|pita|naan|biscuits?|crackers?|cake)\b/i, ['gluten', 'wheat']],
  [/\b(beer|ale|stout)\b/i, ['gluten']],
  [/\b(chicken|turkey|duck|goose|poussin)\b/i, ['poultry', 'meat']],
  [/\b(lamb|mutton|goat|venison|veal|rabbit|kidneys?|liver|minced meat|mince|meatballs?)\b/i, ['meat']],
  [/\b(beef|steak|brisket|oxtail)\b/i, ['beef', 'meat']],
  [/\b(pork|bacon|ham|lard|prosciutto|pancetta|chorizo|salami|pepperoni|gammon)\b/i, ['pork', 'meat']],
  [/\b(sausages?|stock|gelatine?|suet)\b/i, ['animal-source-unknown']],
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

/** Group tags: a typed specific food ("salmon") must not match every member of its group ("tuna"). */
const GROUP_TAGS = new Set(['fish', 'shellfish', 'tree-nut', 'dairy', 'milk', 'gluten', 'wheat', 'meat', 'poultry', 'animal-source-unknown']);
/** Typed words that name a whole allergen or food group, and the tags they cover. */
const broadTerms: Record<string, string[]> = {
  nut: ['tree-nut', 'peanut'], 'tree nut': ['tree-nut'], seafood: ['fish', 'shellfish'], shellfish: ['shellfish'],
  'shell fish': ['shellfish'], crustacean: ['shellfish'], fish: ['fish'], dairy: ['dairy', 'milk'], 'dairy product': ['dairy', 'milk'],
  milk: ['milk', 'dairy'], lactose: ['milk', 'dairy'], 'cow milk': ['milk', 'dairy'], gluten: ['gluten', 'wheat'], wheat: ['wheat'],
  egg: ['egg'], soy: ['soy'], soya: ['soy'], sesame: ['sesame'], peanut: ['peanut'], groundnut: ['peanut'],
  meat: ['meat', 'poultry', 'beef', 'pork'], 'red meat': ['beef', 'pork'], poultry: ['poultry'], pork: ['pork'], beef: ['beef'],
};

/** A parent's typed list ("kiwi, mango and nuts") as separate terms, in the order written. */
export function splitFoodTerms(text: string, limit = 20): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const part of text.split(/[,;\n/&+]|\band\b|\bor\b/i)) {
    const term = part.replace(/^\s*(no|avoid|allergic to|allergy to)\s+/i, '').replace(/[.!]+$/, '').trim().slice(0, 80);
    if (!term || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    terms.push(term);
    if (terms.length >= limit) break;
  }
  return terms;
}

/**
 * Tags a typed allergy or exclusion stands for. Group words ("nuts", "seafood", "dairy") cover their members;
 * a specific food ("almonds", "prawns") keeps only its own specific tags, so it matches by name and kind.
 */
export function typedTermTags(term: string): string[] {
  const key = term.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const singular = key.replace(/(e?s)$/, '');
  const broad = broadTerms[key] ?? broadTerms[key.replace(/s$/, '')] ?? broadTerms[singular] ?? broadTerms[key.replace(/ products?$/, '')];
  if (broad) return broad;
  return libraryIngredientTags(term).filter(tag => !GROUP_TAGS.has(tag));
}
