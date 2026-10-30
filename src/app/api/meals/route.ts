import { z } from 'zod';
import { searchMeals } from '../../../lib/food-catalog';

const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 8;
const querySchema = z.object({
  q: z.string().trim().max(80).default(''),
  limit: z.string().regex(/^\d{1,6}$/).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
}).strict();

const headers = {
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    q: params.get('q') ?? undefined,
    limit: params.get('limit') ?? undefined,
    mealType: params.get('mealType') ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Check the search text (80 characters or fewer), limit and meal type.' } }, { status: 400, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  const { q, mealType } = parsed.data;
  const limit = Math.min(MAX_LIMIT, Math.max(1, parsed.data.limit ? Number(parsed.data.limit) : DEFAULT_LIMIT));
  // Empty search with a meal type lists that type; empty search alone returns nothing.
  return Response.json({ meals: searchMeals(q, limit, mealType) }, { headers });
}
