import { generateWeeklyPlan } from "../../../lib/planning";
import { apiHandler, apiResponse, planningInputSchema, readJson } from "../../../lib/validation";
import { resolvePlanningProfile } from '../../../lib/planning-profile';

export async function POST(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const { profile, pantry, prices } = await readJson(request, planningInputSchema);
    const resolved = await resolvePlanningProfile(request, profile);
    const plan = generateWeeklyPlan(resolved, pantry, { prices, allowSyntheticDemo: true });
    return apiResponse({ demo: true, plan });
  });
}

