import { z } from 'zod';
import { cloudConfigured, requestCloud } from '../../../lib/cloud';
import { newMember } from '../../../lib/food-settings';
import type { FoodAllergy, FoodRule, HouseholdProfile, MemberFoodSettings, NutrientInterest } from '../../../lib/domain';
import { ApiError, apiHandler, apiResponse, profileSchema, readJson } from '../../../lib/validation';

const saveSchema = z.object({ profile: profileSchema }).strict();
const medicalRules = new Set<FoodRule>(['type_1_diabetes','type_2_diabetes','celiac']);
function fail(error: { message: string } | null, action: string) { if (error) throw new ApiError('SAVE_FAILED', `${action} could not be completed.`, 503); }
function legacyName(item: { ingredient_category?: string | null; ingredient_id?: string | null; ingredients?: { canonical_name?: string } | { canonical_name?: string }[] | null }): string | null {
  const related = Array.isArray(item.ingredients) ? item.ingredients[0] : item.ingredients;
  return item.ingredient_category ?? related?.canonical_name ?? item.ingredient_id ?? null;
}

async function ownerContext(request: Request) {
  if (!cloudConfigured) throw new ApiError('NOT_CONFIGURED', 'A Supabase project is not configured.', 503);
  try { return await requestCloud(request); }
  catch { throw new ApiError('UNAUTHORIZED', 'Sign in as the household caregiver to manage saved food settings.', 401); }
}

export async function GET(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const { client, userId } = await ownerContext(request);
    const householdResult = await client.from('households').select('id,preferred_store_name,preferred_store_location').eq('owner_user_id', userId).maybeSingle();
    fail(householdResult.error, 'Loading the household');
    const household = householdResult.data;
    if (!household) return apiResponse({ configured: true, profile: null });
    const membersResult = await client.from('household_members').select('*').eq('household_id', household.id).order('client_key');
    fail(membersResult.error, 'Loading members');
    const rows = membersResult.data ?? [];
    const ids = rows.map(row => row.id as string);
    const allergyResult = ids.length ? await client.from('member_food_allergies').select('*').in('member_id', ids) : { data: [], error: null };
    const nutrientResult = ids.length ? await client.from('member_nutrient_interests').select('*').in('member_id', ids) : { data: [], error: null };
    const healthResult = ids.length ? await client.from('member_health_context').select('*').in('member_id', ids) : { data: [], error: null };
    const legacyResult = ids.length ? await client.from('member_restrictions').select('id,member_id,ingredient_id,ingredient_category,ingredients(canonical_name)').in('member_id', ids).eq('restriction_type','allergy') : { data: [], error: null };
    fail(allergyResult.error, 'Loading allergies'); fail(nutrientResult.error, 'Loading nutrients'); fail(healthResult.error, 'Loading health context'); fail(legacyResult.error, 'Loading earlier allergies');
    const members: MemberFoodSettings[] = rows.map(row => {
      const health = healthResult.data?.find(item => item.member_id === row.id);
      const allergies: FoodAllergy[] = (allergyResult.data ?? []).filter(item => item.member_id === row.id).map(item => ({ rawText: item.raw_text, canonicalId: item.canonical_ids?.[0] ?? null, status: item.mapping_status }));
      for (const item of legacyResult.data ?? []) if (item.member_id === row.id) {
        const rawText = legacyName(item);
        if (rawText && !allergies.some(allergy => allergy.rawText.toLowerCase() === rawText.toLowerCase())) allergies.push({ rawText, canonicalId: null, status: 'needs_review' });
      }
      const nutrients: NutrientInterest[] = (nutrientResult.data ?? []).filter(item => item.member_id === row.id && item.active).map(item => ({ nutrientId: item.nutrient_id, reason: item.reason, caregiverReported: item.caregiver_reported, reviewStatus: item.review_status }));
      return { ...newMember(row.client_key, row.display_name ?? 'Family member'), ageGroup: row.age_group === 'teen' || row.age_group === 'adult' ? row.age_group : 'child', medicalConsent: !!health,
        rules: [...(row.food_rules ?? []), ...(health?.medical_conditions ?? [])], otherExclusions: row.other_food_exclusions ?? [], eggAllowed: row.egg_allowed, dairyAllowed: row.dairy_allowed,
        allergies, noKnownAllergies: row.no_known_food_allergies === true, likes: row.likes ?? [], dislikes: row.dislikes ?? [], flavors: row.flavors ?? [], textures: row.textures ?? [], cuisines: row.cuisines ?? [],
        note: row.food_note ?? '', clinicianInstructions: health?.optional_clinician_notes ?? '', potassiumCheck: health?.potassium_check ?? 'unknown', nutrients };
    });
    return apiResponse({ configured: true, profile: { members, preferredStoreName: household.preferred_store_name ?? '', preferredStoreLocation: household.preferred_store_location ?? '' } });
  });
}

export async function PUT(request: Request): Promise<Response> {
  return apiHandler(async () => {
    const { client, userId } = await ownerContext(request);
    const { profile } = await readJson(request, saveSchema) as { profile: HouseholdProfile };
    const householdResult = await client.from('households').select('id').eq('owner_user_id', userId).maybeSingle();
    fail(householdResult.error, 'Finding the household');
    let householdId: string;
    if (householdResult.data) householdId = householdResult.data.id;
    else {
      const created = await client.from('households').insert({ owner_user_id: userId, household_size: profile.householdSize, weekly_budget_cents: profile.weeklyBudgetCents }).select('id').single();
      fail(created.error, 'Creating the household'); householdId = created.data!.id;
    }
    const update = await client.from('households').update({ preferred_store_name: profile.preferredStoreName ?? null, preferred_store_location: profile.preferredStoreLocation ?? null }).eq('id', householdId);
    fail(update.error, 'Saving the store');
    for (const member of profile.members ?? []) {
      const conditions = member.rules.filter(rule => medicalRules.has(rule));
      const medicalContent = conditions.length || member.clinicianInstructions.trim() || member.potassiumCheck !== 'unknown' || member.nutrients.some(n => n.reason === 'clinician_recommended');
      if (medicalContent && !member.medicalConsent) throw new ApiError('CONSENT_REQUIRED', `Choose health storage consent for ${member.name} before saving medical settings.`, 422);
      const memberResult = await client.from('household_members').upsert({ household_id: householdId, client_key: member.id, display_name: member.name, age_group: member.ageGroup ?? 'child', food_rules: member.rules.filter(rule => !medicalRules.has(rule)), other_food_exclusions: member.otherExclusions,
        egg_allowed: member.eggAllowed, dairy_allowed: member.dairyAllowed, likes: member.likes, dislikes: member.dislikes, flavors: member.flavors, textures: member.textures, cuisines: member.cuisines, food_note: member.note, no_known_food_allergies: member.noKnownAllergies }, { onConflict: 'household_id,client_key' }).select('id').single();
      fail(memberResult.error, `Saving ${member.name}`); const memberDbId = memberResult.data!.id;
      if (member.medicalConsent) {
        const health = await client.from('member_health_context').upsert({ member_id: memberDbId, consent_version: 'food-settings-2026-10', medical_conditions: conditions, optional_clinician_notes: member.clinicianInstructions || null, potassium_check: member.potassiumCheck }, { onConflict: 'member_id' });
        fail(health.error, `Saving ${member.name}'s health context`);
      } else {
        const health = await client.from('member_health_context').delete().eq('member_id', memberDbId);
        fail(health.error, `Clearing ${member.name}'s health context`);
      }
      const oldAllergies = await client.from('member_food_allergies').select('id').eq('member_id', memberDbId);
      fail(oldAllergies.error, 'Loading previous allergies');
      if (member.allergies.length) {
        const inserted = await client.from('member_food_allergies').insert(member.allergies.map(item => ({ member_id: memberDbId, raw_text: item.rawText, canonical_ids: item.canonicalId ? [item.canonicalId] : [], mapping_status: item.status, confirmed_at: item.status === 'confirmed' ? new Date().toISOString() : null })));
        fail(inserted.error, 'Saving allergies');
      }
      const oldIds = (oldAllergies.data ?? []).map(item => item.id);
      if (oldIds.length) { const deleted = await client.from('member_food_allergies').delete().in('id', oldIds); fail(deleted.error, 'Replacing previous allergies'); }
      const legacyAllergies = await client.from('member_restrictions').select('id,ingredient_id,ingredient_category,ingredients(canonical_name)').eq('member_id', memberDbId).eq('restriction_type','allergy');
      fail(legacyAllergies.error, 'Loading earlier allergies');
      for (const item of legacyAllergies.data ?? []) {
        const rawText = legacyName(item);
        if (rawText && !member.allergies.some(allergy => allergy.rawText.toLowerCase() === rawText.toLowerCase())) {
          const removed = await client.from('member_restrictions').delete().eq('id', item.id);
          fail(removed.error, 'Removing an earlier allergy');
        }
      }
      if (member.nutrients.length) { const saved = await client.from('member_nutrient_interests').upsert(member.nutrients.map(item => ({ member_id: memberDbId, nutrient_id: item.nutrientId, reason: item.reason, caregiver_reported: item.caregiverReported, review_status: item.reviewStatus, active: true })), { onConflict: 'member_id,nutrient_id' }); fail(saved.error, 'Saving nutrient interests'); }
      const kept = member.nutrients.map(item => item.nutrientId);
      const oldNutrients = await client.from('member_nutrient_interests').select('nutrient_id').eq('member_id', memberDbId);
      fail(oldNutrients.error, 'Loading previous nutrient interests');
      for (const item of oldNutrients.data ?? []) if (!kept.includes(item.nutrient_id as NutrientInterest['nutrientId'])) { const deleted = await client.from('member_nutrient_interests').delete().eq('member_id', memberDbId).eq('nutrient_id', item.nutrient_id); fail(deleted.error, 'Removing a nutrient interest'); }
    }
    return apiResponse({ saved: true });
  });
}
