import { z } from 'zod';
import { foodsInCategory, listFoodCategories, searchFoods } from '../../../lib/food-catalog';

const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 8;
const categories = listFoodCategories();
const querySchema = z.object({
  q: z.string().trim().max(80).default(''),
  limit: z.string().regex(/^\d{1,6}$/).optional(),
  category: z.string().trim().max(60).refine(value => categories.includes(value)).optional(),
}).strict();

const headers = {
  // The catalog is static for a deployment, so shared caches may keep answers for a while.
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    q: params.get('q') ?? undefined,
    limit: params.get('limit') ?? undefined,
    category: params.get('category') ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Check the search text (80 characters or fewer), limit and category.' } }, { status: 400, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  const { q, category } = parsed.data;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parsed.data.limit ? Number(parsed.data.limit) : DEFAULT_LIMIT));
  // An empty search returns no foods, except that a category on its own lists that category.
  const foods = q ? searchFoods(q, limit, category) : category ? foodsInCategory(category, limit) : [];
  return Response.json({ foods, categories }, { headers });
}
