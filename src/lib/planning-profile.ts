import type { HouseholdProfile, MemberFoodSettings } from './domain';
import { cloudConfigured } from './cloud';
import { ApiError } from './validation';
import { GET as getSavedFoodSettings } from '../app/api/food-settings/route';

const medicalRules = new Set(['type_1_diabetes','type_2_diabetes','celiac']);
function requiresCaregiver(member: MemberFoodSettings): boolean {
  return member.rules.some(rule => medicalRules.has(rule)) || member.allergies.some(allergy => allergy.status === 'confirmed') || !!member.clinicianInstructions.trim() || member.nutrients.some(item => item.reason === 'clinician_recommended');
}
const unique = <T>(values: T[]) => [...new Set(values)];

/** Keep every hard restriction from both the saved account and an unsaved draft. */
export async function resolvePlanningProfile(request: Request, submitted: HouseholdProfile): Promise<HouseholdProfile> {
  const token = /^Bearer (.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!cloudConfigured || !token) {
    if (submitted.members?.some(requiresCaregiver)) throw new ApiError('CAREGIVER_SIGN_IN_REQUIRED', cloudConfigured ? 'Sign in and save confirmed allergies or medical settings before using them for meal suggestions.' : 'A caregiver account must be connected before medical settings or confirmed allergies can be used for meal suggestions.', 401);
    return submitted;
  }
  const response = await getSavedFoodSettings(request);
  if (!response.ok) throw new ApiError('SAVED_SETTINGS_UNAVAILABLE', 'Saved food settings could not be checked. Try again after signing in.', 503);
  const result = await response.json() as { profile: { members: MemberFoodSettings[] } | null };
  const saved = result.profile?.members ?? [];
  if (submitted.members?.some(requiresCaregiver) && !saved.length) throw new ApiError('SAVE_FIRST', 'Save the caregiver settings before planning meals.', 409);
  const members: MemberFoodSettings[] = saved.map(member => {
    const draft = submitted.members?.find(item => item.id === member.id);
    if (!draft) return member;
    const allergies = [...member.allergies];
    for (const allergy of draft.allergies) if (!allergies.some(item => item.rawText.toLowerCase() === allergy.rawText.toLowerCase())) allergies.push({ ...allergy, status: 'pending_confirmation' });
    return { ...member, rules: unique([...member.rules, ...draft.rules]), otherExclusions: unique([...member.otherExclusions, ...draft.otherExclusions]),
      eggAllowed: member.eggAllowed === false || draft.eggAllowed === false ? false : member.eggAllowed, dairyAllowed: member.dairyAllowed === false || draft.dairyAllowed === false ? false : member.dairyAllowed,
      allergies, dislikes: unique([...member.dislikes, ...draft.dislikes]) };
  });
  for (const draft of submitted.members ?? []) if (!members.some(member => member.id === draft.id)) {
    if (requiresCaregiver(draft)) throw new ApiError('SAVE_FIRST', 'Save new caregiver settings before planning meals.', 409);
    members.push(draft);
  }
  return { ...submitted, members };
}
