import { z } from 'zod';
import { MEALDB_BASE, parseDishes, parseRecipe, type LibraryDish } from '@/lib/recipe-library';

/**
 * GET /api/recipe-library?q=chicken   -> { dishes: LibraryDish[] }   dishes named after, or made with, the food
 * GET /api/recipe-library?id=52795    -> { recipe: LibraryRecipe }   photo, ingredients and steps
 * Proxies TheMealDB so the browser never calls a third party directly, and caches answers for a day.
 */
const querySchema = z.object({
  q: z.string().trim().min(1).max(60).regex(/^[\p{L}\p{N} ,'&-]+$/u).optional(),
  id: z.string().regex(/^\d{1,8}$/).optional(),
}).strict().refine(value => !!value.q !== !!value.id);

const okHeaders = { 'Cache-Control': 'public, max-age=600, s-maxage=86400, stale-while-revalidate=86400', 'X-Content-Type-Options': 'nosniff' };
const errorHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const MAX_DISHES = 24;
/** TheMealDB's dish categories and cuisines, so "pasta", "dessert" or "Mexican" bring back a full set. */
const CATEGORIES = ['Beef', 'Breakfast', 'Chicken', 'Dessert', 'Goat', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian'];
const CATEGORY_ALIASES: Record<string, string> = { fish: 'Seafood', noodle: 'Pasta', spaghetti: 'Pasta', sweet: 'Dessert', cake: 'Dessert', salad: 'Side', soup: 'Starter', veggie: 'Vegetarian' };
const AREAS = ['American', 'British', 'Canadian', 'Chinese', 'Croatian', 'Dutch', 'Egyptian', 'Filipino', 'French', 'Greek', 'Indian', 'Irish', 'Italian', 'Jamaican', 'Japanese', 'Kenyan', 'Malaysian', 'Mexican', 'Moroccan', 'Polish', 'Portuguese', 'Russian', 'Spanish', 'Thai', 'Tunisian', 'Turkish', 'Ukrainian', 'Vietnamese'];

async function mealDb(path: string): Promise<unknown> {
  const response = await fetch(`${MEALDB_BASE}/${path}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Recipe library answered ${response.status}`);
  return response.json();
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return Response.json({ error: { code: 'INVALID_INPUT', message: 'Search for a food or dish name (letters and numbers, up to 60 characters).' } }, { status: 400, headers: errorHeaders });
  try {
    if (parsed.data.id) {
      const recipe = parseRecipe(await mealDb(`lookup.php?i=${parsed.data.id}`));
      return recipe ? Response.json({ recipe }, { headers: okHeaders }) : Response.json({ error: { code: 'NOT_FOUND', message: 'That recipe is no longer available.' } }, { status: 404, headers: errorHeaders });
    }
    const q = parsed.data.q!.toLowerCase();
    // Search dish names ("chicken curry") and main ingredients ("chicken") together, so a food
    // name brings back a wide variety of dishes. Ingredient search also tries the singular form.
    const ingredient = q.replace(/\s+/g, '_');
    const singular = ingredient.replace(/ies$/, 'y').replace(/oes$/, 'o').replace(/([^s])s$/, '$1');
    const word = singular.replace(/_/g, ' ');
    const category = CATEGORIES.find(name => name.toLowerCase() === word || name.toLowerCase() === q) ?? CATEGORY_ALIASES[word];
    const area = AREAS.find(name => name.toLowerCase() === word || name.toLowerCase() === q);
    const paths = [
      `search.php?s=${encodeURIComponent(q)}`,
      `filter.php?i=${encodeURIComponent(ingredient)}`,
      ...(singular !== ingredient ? [`filter.php?i=${encodeURIComponent(singular)}`] : []),
      ...(category ? [`filter.php?c=${encodeURIComponent(category)}`] : []),
      ...(area ? [`filter.php?a=${encodeURIComponent(area)}`] : []),
    ];
    const results = await Promise.allSettled(paths.map(mealDb));
    if (results.every(result => result.status === 'rejected')) throw new Error('Recipe library unavailable');
    const seen = new Set<string>();
    const dishes: LibraryDish[] = [];
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const dish of parseDishes(result.value)) {
        if (seen.has(dish.id)) continue;
        seen.add(dish.id);
        dishes.push(dish);
      }
    }
    return Response.json({ dishes: dishes.slice(0, MAX_DISHES), total: dishes.length }, { headers: okHeaders });
  } catch {
    return Response.json({ error: { code: 'UNAVAILABLE', message: 'The recipe library is not answering right now. Try again in a moment.' } }, { status: 502, headers: errorHeaders });
  }
}
