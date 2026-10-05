import { z } from "zod";
import { ingredients, recipes } from "./demo-data";
import { proposeAllergies } from './food-settings';

const boundedId = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const ingredientId = z.string().refine((id) => ingredients.some((item) => item.id === id));
const recipeId = z.string().refine((id) => recipes.some((item) => item.id === id));
const unit = z.enum(["g", "kg", "oz", "lb", "ml", "l", "cup", "tbsp", "tsp", "each"]);
const cents = z.number().int().min(0).max(1_000_000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const unique = <T>(items: T[]) => new Set(items).size === items.length;
const shortText = z.string().trim().max(80);
const memberSchema = z.object({
  id: boundedId, name: z.string().trim().min(1).max(60),
  ageGroup: z.enum(['child','teen','adult']).optional(), medicalConsent: z.boolean().optional(),
  rules: z.array(z.enum(['vegetarian','vegan','pescatarian','exclude_beef','exclude_pork','celiac','gluten_free','dairy_free','type_1_diabetes','type_2_diabetes'])).max(10).refine(unique),
  otherExclusions: z.array(shortText.min(1)).max(30), eggAllowed: z.boolean().nullable(), dairyAllowed: z.boolean().nullable(),
  allergies: z.array(z.object({ rawText: shortText.min(1), canonicalId: shortText.nullable(), status: z.enum(['pending_confirmation','confirmed','needs_review']) }).strict()).max(30),
  noKnownAllergies: z.boolean(), likes: z.array(shortText).max(30), dislikes: z.array(shortText).max(30), flavors: z.array(shortText).max(10), textures: z.array(shortText).max(10), cuisines: z.array(shortText).max(30),
  note: z.string().max(500), clinicianInstructions: z.string().max(1000), potassiumCheck: z.enum(['unknown','no_restriction_reported','clinician_recommended']),
  nutrients: z.array(z.object({ nutrientId: z.enum(['protein','iron','potassium','fiber','vitamin_d','vitamin_b12']), reason: z.enum(['food_ideas','clinician_recommended','unsure']), caregiverReported: z.boolean(), reviewStatus: z.enum(['pending_confirmation','confirmed','needs_review']) }).strict()).max(6),
}).strict().superRefine((member, context) => {
  if (member.noKnownAllergies && member.allergies.length) context.addIssue({ code: 'custom', message: 'No known allergies conflicts with listed allergies.' });
  for (const allergy of member.allergies) if (allergy.status === 'confirmed' && (!allergy.canonicalId || proposeAllergies(allergy.rawText)[0]?.canonicalId !== allergy.canonicalId)) context.addIssue({ code: 'custom', message: 'Confirmed allergy mapping is not a reviewed interpretation.' });
});

export const profileSchema = z.object({
  householdSize: z.number().int().min(1).max(20),
  weeklyBudgetCents: cents,
  allergies: z.array(z.enum(["peanut", "milk", "wheat", "sesame", "egg", "soy", "fish", "shellfish", "tree-nut"])).max(9).refine(unique),
  dietaryRestrictions: z.array(z.enum(["vegetarian", "vegan"])).max(2).refine(unique),
  excludedIngredientIds: z.array(ingredientId).max(ingredients.length).refine(unique),
  equipment: z.array(z.enum(["microwave", "oven", "stovetop", "air-fryer", "kettle", "refrigerator", "freezer"])).max(7).refine(unique),
  maxCookingMinutes: z.number().int().min(0).max(240),
  mealsCovered: z.array(z.enum(["breakfast", "lunch", "dinner", "snack"])).min(1).max(4).refine(unique),
  preferredStoreId: boundedId,
  uncertaintyBufferCents: cents,
  knownFeesCents: cents,
  members: z.array(memberSchema).max(20).refine(items => unique(items.map(item => item.id))).optional(),
  preferredStoreName: shortText.optional(), preferredStoreLocation: shortText.optional(),
}).strict();

export const pantrySchema = z.array(z.object({
  id: boundedId, ingredientId,
  quantity: z.number().finite().min(0).max(1_000_000), unit,
  foodState: z.enum(["dry", "ready-to-eat", "raw", "cooked"]),
  quantityConfirmed: z.boolean(), expiryDate: date.optional(),
}).strict()).max(100).refine((items) => unique(items.map((item) => item.id)));

export const pricesSchema = z.array(z.object({
  id: boundedId, ingredientId, storeId: boundedId,
  productName: z.string().trim().min(1).max(160),
  packageQuantity: z.number().finite().min(0.01).max(1_000_000), packageUnit: unit,
  priceCents: cents, observedAt: date,
  sourceType: z.enum(["synthetic-demo", "user-entered"]),
  locationLabel: z.string().trim().min(1).max(160),
  productTags: z.array(shortText).max(30).optional(), labelStatus: z.enum(['verified','unknown']).optional(), labelSource: z.string().trim().max(160).optional(),
}).strict()).max(100).refine((items) => unique(items.map((item) => item.id)));

export const entriesSchema = z.array(z.object({
  id: boundedId, day: z.number().int().min(0).max(6),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  recipeId, plannedServings: z.number().finite().positive().max(50),
  batchId: boundedId.optional(), batchServings: z.number().finite().positive().max(100).optional(),
  isLeftover: z.boolean().optional(),
}).strict()).min(1).max(28).refine((items) => unique(items.map((item) => item.id)))
  .refine((items) => unique(items.map((item) => `${item.day}-${item.mealType}`)));

export const planningInputSchema = z.object({
  profile: profileSchema, pantry: pantrySchema, prices: pricesSchema.optional(),
}).strict();

export const recalculateInputSchema = planningInputSchema.extend({
  entries: entriesSchema,
  swap: z.object({ entryId: boundedId, recipeId }).strict().optional(),
}).strict();

export const assistantInputSchema = planningInputSchema.extend({
  message: z.string().trim().min(1).max(2000),
}).strict();

export const MAX_JSON_BYTES = 64 * 1024;

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

export function apiResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/** Read only a bounded JSON body; do not log or persist household snapshots. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new ApiError("UNSUPPORTED_CONTENT_TYPE", "Send this request as JSON.", 415);
  }
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_JSON_BYTES) {
    throw new ApiError("BODY_TOO_LARGE", "This request is too large.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("INVALID_JSON", "Provide a JSON request body.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new ApiError("BODY_TOO_LARGE", "This request is too large.", 413);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new ApiError("INVALID_JSON", "The request contains invalid JSON.");
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError("INVALID_INPUT", "Check your ingredient IDs, quantities, restrictions, and plan settings.");
  }
  return result.data;
}

export async function apiHandler(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ApiError) {
      return apiResponse({ error: { code: error.code, message: error.message } }, error.status);
    }
    return apiResponse({ error: { code: "PLANNING_FAILED", message: "The request could not be completed. Check your inputs and try manual planning." } }, 422);
  }
}
