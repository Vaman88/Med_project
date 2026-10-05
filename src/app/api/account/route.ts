import { z } from 'zod';
import { accountContext, loadAccount } from '@/lib/account-server';
import { setupSchema, accountUpdateSchema } from '@/lib/account';
import { ApiError, apiHandler, apiResponse, readJson } from '@/lib/validation';

export async function GET(request: Request) {
  return apiHandler(async () => apiResponse({ account: await loadAccount(request) }));
}
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { client } = await accountContext(request);
    const setup = await readJson(request,setupSchema);
    const { error } = await client.rpc('complete_adult_account', {
      p_name:setup.details.name, p_city:setup.details.city, p_state:setup.details.state, p_age:setup.details.age,
      p_profile:setup.profile, p_signature:setup.signature, p_terms_version:setup.termsVersion,
    });
    if (error) throw new ApiError('SETUP_FAILED','Your account details could not be saved. Please try again.',503);
    const account=await loadAccount(request);
    if(!account)throw new ApiError('SETUP_FAILED','Account setup did not finish. Please try again.',503);
    return apiResponse({ account },201);
  });
}
export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const { client,userId } = await accountContext(request);
    const state = await readJson(request,accountUpdateSchema);
    const { data,error } = await client.from('adult_accounts').update({ food_profile:state.profile, pantry:state.pantry, updated_at:new Date().toISOString() }).eq('user_id',userId).select('user_id').maybeSingle();
    if (error || !data) throw new ApiError('SAVE_FAILED','Your changes were not saved. Finish account setup and try again.',503);
    return apiResponse({ saved:true });
  });
}
export async function DELETE(request: Request) {
  return apiHandler(async () => {
    const { client } = await accountContext(request);
    const confirmation = await readJson(request, z.object({ confirmation:z.literal('DELETE') }).strict());
    if (confirmation.confirmation !== 'DELETE') throw new ApiError('CONFIRM_DELETE','Type DELETE to confirm.');
    const { error } = await client.rpc('delete_my_healthy_steps_account');
    if (error) throw new ApiError('DELETE_FAILED','Your account could not be deleted. Please try again.',503);
    return apiResponse({ deleted:true });
  });
}
