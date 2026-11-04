/**
 * Recipe library backed by TheMealDB (https://www.themealdb.com), a free, open recipe
 * database: every dish has a photo, a list of ingredients with measures and written steps.
 * The app reaches it only through /api/recipe-library, which normalizes the raw rows here.
 */
import { z } from 'zod';

export const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

export interface LibraryDish { id: string; name: string; image: string; category?: string; area?: string }
export type MeasureUnit = 'g' | 'ml' | 'each';
/** One recipe ingredient. `quantity`/`unit` are the measure read as a number (grams, millilitres or a count) when it can be. */
export interface LibraryIngredient { name: string; measure: string; quantity?: number; unit?: MeasureUnit }
export interface LibraryRecipe extends LibraryDish {
  ingredients: LibraryIngredient[];
  steps: string[];
  video?: string;
  source?: string;
}

const text = z.string().nullish();
const rawDish = z.object({ idMeal: z.string().regex(/^\d{1,8}$/), strMeal: z.string().min(1), strMealThumb: z.string().nullish(), strCategory: text, strArea: text }).passthrough();
const listSchema = z.object({ meals: z.array(z.unknown()).nullable() });

/** Only TheMealDB's own image host is trusted for photos. */
function safeImage(url: string | null | undefined): string | null {
  if (!url) return null;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && parsed.hostname === 'www.themealdb.com' && parsed.pathname.startsWith('/images/') ? parsed.href : null; }
  catch { return null; }
}
function safeLink(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined; }
  catch { return undefined; }
}
const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

/** Turns a raw list response into dishes. Rows without a usable photo are dropped, so every dish has an image. */
export function parseDishes(json: unknown): LibraryDish[] {
  const parsed = listSchema.safeParse(json);
  if (!parsed.success || !parsed.data.meals) return [];
  return parsed.data.meals.flatMap(row => {
    const dish = rawDish.safeParse(row);
    if (!dish.success) return [];
    const image = safeImage(dish.data.strMealThumb);
    if (!image) return [];
    return [{ id: dish.data.idMeal, name: clean(dish.data.strMeal), image, ...(clean(dish.data.strCategory) ? { category: clean(dish.data.strCategory) } : {}), ...(clean(dish.data.strArea) ? { area: clean(dish.data.strArea) } : {}) }];
  });
}

/** Splits TheMealDB's free-text instructions into readable steps, dropping "STEP 1" labels and blank lines. */
export function splitSteps(instructions: string): string[] {
  const lines = instructions.replace(/\r/g, '').split(/\n+/).map(line => line.replace(/^\s*(step\s*\d+[:.)-]?|\d+[.)])\s*/i, '').trim()).filter(line => line.length > 1 && !/^step\s*\d*$/i.test(line));
  if (lines.length > 1) return lines;
  // One long paragraph: break it into sentences grouped two at a time.
  const sentences = (lines[0] ?? '').match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) ?? [];
  const steps: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) steps.push(sentences.slice(i, i + 2).join(' '));
  return steps;
}

/** Turns a lookup response into one full recipe, or null when it is missing or has no photo. */
export function parseRecipe(json: unknown): LibraryRecipe | null {
  const [dish] = parseDishes(json);
  const parsed = listSchema.safeParse(json);
  if (!dish || !parsed.success || !parsed.data.meals) return null;
  const row = parsed.data.meals[0] as Record<string, string | null | undefined>;
  const ingredients: LibraryIngredient[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const name = clean(row[`strIngredient${i}`]);
    if (!name) continue;
    const measure = clean(row[`strMeasure${i}`]);
    const amount = parseMeasure(measure);
    ingredients.push({ name, measure, ...(amount ?? {}) });
  }
  const video = safeLink(row.strYoutube);
  const source = safeLink(row.strSource);
  return { ...dish, ingredients, steps: splitSteps(row.strInstructions ?? ''), ...(video ? { video } : {}), ...(source ? { source } : {}) };
}

const DESCRIPTORS = /\b(canned|drained|ready[- ]to[- ]eat|cooked|uncooked|rolled|frozen|fresh|dry|dried|raw|large|small|whole|sliced|chopped|shredded|boneless|skinless|low[- ]fat|reduced[- ]fat|plain|organic|lean|\d+%?)\b/gi;
/** A pantry label reduced to the food itself, for searching: "Canned beans, drained" -> "beans". */
export function simpleFoodName(label: string): string {
  const name = label.split(/[,(]/)[0].replace(DESCRIPTORS, ' ').replace(/[^\p{L} '&-]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return name || label.trim().toLowerCase();
}

/** A smaller photo for cards; TheMealDB serves /small, /medium and /large variants. */
export const dishThumb = (image: string, size: 'small' | 'medium' = 'medium') => `${image}/${size}`;

/** Words that name the same food in a pantry and in a recipe ("eggs" and "Egg"). */
function stem(word: string) { return word.toLowerCase().replace(/[^a-z ]/g, '').trim().replace(/ies$/, 'y').replace(/oes$/, 'o').replace(/([^s])s$/, '$1'); }
/** Whether a recipe ingredient is something the family already listed. */
export function pantryHas(pantryLabels: string[], ingredient: string): boolean {
  const target = stem(ingredient);
  if (!target) return false;
  return pantryLabels.some(label => {
    const have = stem(simpleFoodName(label));
    return !!have && (have === target || ` ${target} `.includes(` ${have} `) || ` ${have} `.includes(` ${target} `));
  });
}

const FRACTIONS: Record<string, number> = { '½': .5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': .25, '¾': .75, '⅛': .125 };
const MEASURE_UNITS: [RegExp, MeasureUnit, number][] = [
  [/^(kg|kgs|kilograms?)\b/, 'g', 1000], [/^(g|gr|grams?)\b/, 'g', 1], [/^(lbs?|pounds?)\b/, 'g', 453.59], [/^(oz|ounces?)\b/, 'g', 28.35],
  [/^(ml|millilit(er|re)s?)\b/, 'ml', 1], [/^(l|lit(er|re)s?)\b/, 'ml', 1000], [/^(cups?|c)\b/, 'ml', 236.6],
  [/^(tbsp|tbs|tblsp|tablespoons?|tbls)\b/, 'ml', 14.8], [/^(tsp|teaspoons?)\b/, 'ml', 4.93], [/^(pints?)\b/, 'ml', 473],
];
/**
 * Reads a TheMealDB measure such as "1.2 kg", "1 1/2 cups", "½ tsp", "500g" or "3 large" into a number in
 * grams, millilitres or a count. Text without a number ("to taste", "pinch") gives null.
 */
export function parseMeasure(measure: string): { quantity: number; unit: MeasureUnit } | null {
  let text = measure.toLowerCase().replace(/[½⅓⅔¼¾⅛]/g, ch => ` ${FRACTIONS[ch]}`).replace(/(\d)\s*-\s*\d+(\.\d+)?/g, '$1').trim();
  const number = text.match(/^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+)|\s+(0?\.\d+))?|^(\d+)\/(\d+)|^(0?\.\d+)/);
  if (!number) return null;
  let quantity = 0;
  if (number[5]) quantity = Number(number[5]) / Number(number[6]);
  else if (number[7]) quantity = Number(number[7]);
  else quantity = Number(number[1]) + (number[2] ? Number(number[2]) / Number(number[3]) : number[4] ? Number(number[4]) : 0);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  text = text.slice(number[0].length).trim();
  for (const [pattern, unit, factor] of MEASURE_UNITS) if (pattern.test(text)) return { quantity: Math.round(quantity * factor * 10) / 10, unit };
  return { quantity, unit: 'each' };
}

/** A food the family listed, with the amount they entered (if any). */
export interface PantryAmount { label: string; quantity?: number; unit?: string }
const TO_GRAMS: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.59 };
/**
 * Compares one recipe ingredient with the family's amount of it:
 * enough / short (with how much is missing) / assumed (no amount entered) / unknown (units don't compare).
 */
export function amountCheck(ingredient: LibraryIngredient, pantry: PantryAmount[]):
  { status: 'enough' | 'short' | 'assumed' | 'unknown'; have?: number; missing?: number; unit?: MeasureUnit } | null {
  const food = pantry.find(item => pantryHas([item.label], ingredient.name));
  if (!food) return null;
  if (!food.quantity || !food.unit) return { status: 'assumed' };
  if (!ingredient.quantity || !ingredient.unit) return { status: 'unknown' };
  const have = food.unit === 'each' ? (ingredient.unit === 'each' ? food.quantity : null)
    : TO_GRAMS[food.unit] && ingredient.unit !== 'each' ? food.quantity * TO_GRAMS[food.unit] : null; // grams ≈ millilitres for everyday foods
  if (have === null) return { status: 'unknown' };
  const missing = ingredient.quantity - have;
  return missing > 1e-6 ? { status: 'short', have, missing, unit: ingredient.unit } : { status: 'enough', have, unit: ingredient.unit };
}
/** "250 g", "1.5 kg", "30 ml", "3". */
export function formatMeasure(quantity: number, unit: MeasureUnit): string {
  if (unit === 'each') return `${Math.round(quantity * 10) / 10}`;
  const big = unit === 'g' ? 'kg' : 'L';
  return quantity >= 1000 ? `${Math.round(quantity / 100) / 10} ${big}` : `${Math.round(quantity)} ${unit}`;
}
