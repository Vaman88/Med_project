import { calculatePlan, swapMeal } from "../../../../lib/planning";
import { apiHandler, apiResponse, readJson, recalculateInputSchema } from "../../../../lib/validation";
import { resolvePlanningProfile } from '../../../../lib/planning-profile';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const { profile, pantry, prices, entries, swap } = await readJson(request, recalculateInputSchema);
    const resolved = await resolvePlanningProfile(request, profile);
    const options = { prices, allowSyntheticDemo: true };
    // Rebuild costs and inventory from the submitted snapshot, never trust client totals.
    const original = calculatePlan(resolved, pantry, entries, options);
    const plan = swap ? swapMeal(resolved, pantry, original, swap.entryId, swap.recipeId, options) : original;
    return apiResponse({ demo: true, plan });
  });
}

