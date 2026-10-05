import { requestCloud, cloudConfigured } from './cloud';
import { ApiError } from './validation';
import { TERMS_VERSION, detailsSchema, accountUpdateSchema, type AccountState } from './account';

export async function accountContext(request: Request) {
  if (!cloudConfigured) throw new ApiError('ACCOUNTS_NOT_CONFIGURED', 'Account service is not connected yet. Add the Supabase project configuration to enable accounts.', 503);
  try { return await requestCloud(request); }
  catch { throw new ApiError('SIGN_IN_REQUIRED', 'Please log in again to continue.', 401); }
}
export async function loadAccount(request: Request): Promise<AccountState | null> {
  const { client, userId } = await accountContext(request);
  const [profile, consent] = await Promise.all([
    client.from('adult_accounts').select('*').eq('user_id',userId).maybeSingle(),
    client.from('account_consents').select('terms_version,accepted_at').eq('user_id',userId).eq('terms_version',TERMS_VERSION).maybeSingle(),
  ]);
  if (profile.error || consent.error) throw new ApiError('ACCOUNT_UNAVAILABLE','Your saved account could not be loaded. Please try again.',503);
  if (!profile.data || !consent.data) return null;
  const row = profile.data;
  const details = detailsSchema.parse({ name:row.full_name, city:row.city, state:row.state, age:row.age });
  const state = accountUpdateSchema.parse({ profile:row.food_profile, pantry:row.pantry });
  return { details, ...state, termsVersion:consent.data.terms_version, acceptedAt:consent.data.accepted_at };
}
