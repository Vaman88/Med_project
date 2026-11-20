import { z } from "zod";
import {
  allergyChoices,
  dietaryChoices,
  equipmentChoices,
  familySchema,
  pantryFoods,
  type Family,
} from "./little-kitchen";
import { keptChefFields } from "./family-setup";

/**
 * The one sign-up flow for the whole app, parent side and kids side. One question per screen, in
 * this order. "account" (optional online save) only appears when Supabase keys are configured;
 * without them the flow ends on the Parent PIN and everything stays on this device.
 * After the last step the family chooses which account to enter: child or parent.
 */
export const ONBOARDING_STEPS = [
  "welcome",
  "parent",
  "age",
  "household",
  "pantry",
  "equipment",
  "avoid",
  "diet",
  "budget",
  "pin",
  "account",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function onboardingSteps(cloud: boolean): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => cloud || step !== "account");
}

/** In-progress answers, kept on this device so a reload does not lose them. The PIN is never stored here. */
export const ONBOARDING_DRAFT_KEY = "healthy-steps-signup-draft-v1";

export const AGE_CHOICES = Array.from({ length: 13 }, (_, i) => i + 5);
export const HOUSEHOLD_CHOICES = Array.from({ length: 12 }, (_, i) => i + 1);
export const BUDGET_CHOICES = [25, 50, 75, 100, 150] as const;
/** The nine major allergens, shown as big cards. Other foods can be typed. */
export const MAJOR_ALLERGENS = allergyChoices.slice(0, 9);
/** Everyday foods offered as one-tap cards on the pantry screen; search finds the rest. */
export const QUICK_PANTRY = [
  "Banana", "Apple", "Strawberries", "Carrots", "Tomato", "Spinach",
  "Egg", "Milk", "Plain yogurt", "Oats", "Brown rice", "Pasta",
  "Whole wheat bread", "Black beans", "Chicken", "Peanut butter",
] as const satisfies readonly (typeof pantryFoods)[number][];

const draftSchema = z.object({
  step: z.enum(ONBOARDING_STEPS),
  parentName: z.string().max(40),
  age: z.number().int().min(5).max(17).nullable(),
  householdSize: z.number().int().min(1).max(12).nullable(),
  pantry: z.array(z.string().trim().min(1).max(80)).max(100),
  equipment: z.array(z.enum(equipmentChoices)),
  allergies: z.array(z.enum(allergyChoices)),
  otherAllergies: z.string().max(200),
  noAllergies: z.boolean(),
  allergyChecked: z.boolean(),
  dietary: z.array(z.enum(dietaryChoices)),
  noDiet: z.boolean(),
  budget: z.union([z.number().int().min(0).max(1000), z.literal("unsure")]).nullable(),
});
export type OnboardingDraft = z.infer<typeof draftSchema>;

export function emptyDraft(): OnboardingDraft {
  return {
    step: "welcome", parentName: "", age: null, householdSize: null, pantry: [],
    equipment: ["Oven", "Stove"], allergies: [], otherAllergies: "", noAllergies: false,
    allergyChecked: false, dietary: [], noDiet: false, budget: null,
  };
}

export function parseDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Whether something is on the foods-to-avoid list at all. */
export const hasAvoidList = (d: Pick<OnboardingDraft, "allergies" | "otherAllergies">) =>
  d.allergies.length > 0 || d.otherAllergies.trim().length > 0;

/** The allergy confirmation the Family schema needs: an explicit "none", or a checked list. */
export function allergyConfirmed(d: OnboardingDraft): boolean {
  return hasAvoidList(d) ? d.allergyChecked : d.noAllergies;
}

/**
 * Adds a typed food to the avoid list: a known choice (any case) becomes a tagged allergy, anything
 * else joins the free-text list. Adding a food clears the "checked" tick and the "none" choice.
 */
export function addAvoidFood(d: OnboardingDraft, typed: string): OnboardingDraft | { error: string } {
  const entry = typed.trim();
  if (!entry) return d;
  const known = allergyChoices.find((food) => food.toLowerCase() === entry.toLowerCase());
  if (known) {
    if (d.allergies.includes(known)) return d;
    return { ...d, allergies: [...d.allergies, known], noAllergies: false, allergyChecked: false };
  }
  const others = d.otherAllergies.split(",").map((food) => food.trim()).filter(Boolean);
  if (others.some((food) => food.toLowerCase() === entry.toLowerCase())) return d;
  const next = [...others, entry].join(", ");
  if (next.length > 200) return { error: "Other foods to avoid can be up to 200 characters." };
  return { ...d, otherAllergies: next, noAllergies: false, allergyChecked: false };
}

export function removeOtherFood(d: OnboardingDraft, food: string): OnboardingDraft {
  const others = d.otherAllergies.split(",").map((item) => item.trim()).filter((item) => item && item !== food);
  return { ...d, otherAllergies: others.join(", "), allergyChecked: false };
}

/** What is still missing on a step, in friendly words, or "" when the step can continue. */
export function stepProblem(step: OnboardingStep, d: OnboardingDraft): string {
  switch (step) {
    case "parent": {
      const name = d.parentName.trim();
      if (!name) return "Type your first name so I know what to call you.";
      if (name.length > 40) return "Use 40 characters or fewer.";
      return "";
    }
    case "age":
      return d.age === null ? "Pick your child’s age." : "";
    case "household":
      return d.householdSize === null ? "Pick how many people eat at home." : "";
    case "pantry":
      return d.pantry.length ? "" : "Add at least one food you have at home.";
    case "equipment":
      return d.equipment.length ? "" : "Pick at least one way you can cook, or No-cook.";
    case "avoid":
      if (!hasAvoidList(d) && !d.noAllergies) return "Pick the foods to avoid, or choose No known food allergies.";
      if (hasAvoidList(d) && !d.allergyChecked) return "Please check the list, then tick the box to confirm it.";
      return "";
    case "diet":
      return d.dietary.length || d.noDiet ? "" : "Pick a diet, or choose No special diet.";
    case "budget":
      return d.budget === null ? "Pick a budget, or choose Not sure yet." : "";
    default:
      return "";
  }
}

/** Builds the saved family profile from finished answers and the new Parent PIN fields. */
export function draftToFamily(
  d: OnboardingDraft,
  lock: { pinSalt: string; pinHash: string },
): ReturnType<typeof familySchema.safeParse> {
  return familySchema.safeParse({
    version: 1,
    parentName: d.parentName.trim(),
    age: d.age,
    ...keptChefFields(null),
    pantry: d.pantry,
    allergies: d.allergies,
    otherAllergies: d.otherAllergies.trim(),
    allergyConfirmed: allergyConfirmed(d),
    parentConfirmed: true,
    householdSize: d.householdSize ?? undefined,
    weeklyBudget: typeof d.budget === "number" ? d.budget : undefined,
    equipment: d.equipment,
    dietary: d.noDiet ? [] : d.dietary,
    ...lock,
  } satisfies Record<string, unknown>);
}

export type { Family };
