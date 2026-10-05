import { z } from 'zod';
import { newMember } from './food-settings';
import { profileSchema, pantrySchema } from './validation';
import type { HouseholdProfile, PantryItem } from './domain';

export const TERMS_VERSION = 'healthy-steps-2026-10-05';
export const states = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
export const experienceForAge = (age: number): 'child' | 'adult' => age < 10 ? 'child' : 'adult';
export interface AccountDetails { name: string; city: string; state: string; age: number }
export interface AccountState { details: AccountDetails; profile: HouseholdProfile; pantry: PantryItem[]; termsVersion: string; acceptedAt: string }
export const detailsSchema = z.object({
  name: z.string().trim().min(2).max(60), city: z.string().trim().min(2).max(80),
  state: z.string().refine(value => states.includes(value)), age: z.number().int().min(18).max(120),
}).strict();
export const adultProfileSchema = profileSchema.superRefine((profile, context) => {
  const member = profile.members?.[0];
  if (profile.members?.length !== 1 || member?.ageGroup !== 'adult') context.addIssue({ code: 'custom', message: 'This release supports one adult account profile.' });
  if (!member) return;
  if (!member.noKnownAllergies && !member.allergies.length) context.addIssue({ code: 'custom', message: 'List your allergies or choose no known food allergies.' });
  if (member.allergies.some(item => item.status !== 'confirmed')) context.addIssue({ code: 'custom', message: 'Clarify each allergy before saving.' });
  const medical = member.rules.some(rule => ['celiac','type_1_diabetes','type_2_diabetes'].includes(rule)) || !!member.note || !!member.clinicianInstructions || member.potassiumCheck === 'clinician_recommended' || member.nutrients.some(item => item.reason === 'clinician_recommended');
  if (medical && !member.medicalConsent) context.addIssue({ code: 'custom', message: 'Agree to storing the health-related food settings you entered.' });
});
export const setupSchema = z.object({
  details: detailsSchema, profile: adultProfileSchema, termsVersion: z.literal(TERMS_VERSION),
  agreed: z.literal(true), signature: z.string().trim().min(2).max(60),
}).strict().superRefine((value, context) => {
  if (value.signature.toLowerCase() !== value.details.name.toLowerCase()) context.addIssue({ code: 'custom', message: 'Sign using the full name entered for your account.' });
  const member = value.profile.members?.[0];
  if (!member || (!member.noKnownAllergies && !member.allergies.length)) context.addIssue({ code: 'custom', message: 'List your allergies or choose no known food allergies.' });
  if (member?.allergies.some(item => item.status !== 'confirmed')) context.addIssue({ code: 'custom', message: 'Clarify each allergy before completing setup.' });
  if (value.profile.members?.some(item => item.ageGroup !== 'adult')) context.addIssue({ code: 'custom', message: 'This account setup is for adults. Child profiles will be managed separately.' });
});
export const accountUpdateSchema = z.object({ profile: adultProfileSchema, pantry: pantrySchema }).strict();
export function startingProfile(name = 'Me'): HouseholdProfile {
  return { householdSize: 1, weeklyBudgetCents: 0, allergies: [], dietaryRestrictions: [], excludedIngredientIds: [],
    equipment: ['microwave', 'refrigerator'], maxCookingMinutes: 30, mealsCovered: ['breakfast','lunch','dinner'],
    preferredStoreId: 'value-us', uncertaintyBufferCents: 0, knownFeesCents: 0,
    members: [{ ...newMember('adult', name), ageGroup: 'adult' }],
  };
}
export const termsSections = [
  { title: 'What your information is used for', text: 'Your name, city, state, age, food preferences, allergies, pantry and budget are used only to operate Healthy Steps and personalize food, ingredient and meal suggestions. We do not sell your personal information, use it for advertising, or send it to retailers or external AI services.' },
  { title: 'How it is stored', text: 'Account and food information is stored privately in our account database. Our authentication, database and hosting providers process it to run the app. Passwords are handled by the authentication service. Other users cannot access your account data. This app does not collect payment details, photos, weight or location coordinates.' },
  { title: 'Your choices', text: 'You can update your food settings in Account and delete your account and saved app data there. Website-help chat is temporary and does not leave your browser. Official resource links open other websites with their own privacy policies.' },
  { title: 'Food suggestions and prices', text: 'Suggestions support practical food planning, not diagnosis, weight-loss treatment or a prescribed diet. Check ingredient labels, cross-contact and preparation instructions. Follow existing guidance from your care team. Retailer price references are estimates; local prices, availability and fees can differ.' },
  { title: 'Adult accounts', text: 'An adult age 18 or older must create and manage an account. Age-based child and adult layouts are planned; this release does not register children or collect their personal information. A typed signature records acceptance of this version of the terms.' },
];
