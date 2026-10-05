import { z } from 'zod';
import { loadAccount } from '@/lib/account-server';
import { recommendBasket } from '@/lib/recommendations';
import { pantrySchema, ApiError, apiHandler, apiResponse, readJson } from '@/lib/validation';
const input = z.object({ pantry:pantrySchema,budgetCents:z.number().int().min(0).max(1_000_000),feesCents:z.number().int().min(0).max(1_000_000).default(0) }).strict();
export async function POST(request:Request) {
  return apiHandler(async () => {
    const account = await loadAccount(request);
    if (!account) throw new ApiError('SETUP_REQUIRED','Complete account setup first.',409);
    const data = await readJson(request,input);
    return apiResponse(recommendBasket({ ...account.profile,weeklyBudgetCents:data.budgetCents,knownFeesCents:data.feesCents },data.pantry));
  });
}
