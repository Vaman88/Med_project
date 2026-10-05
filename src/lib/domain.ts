export type Unit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l' | 'cup' | 'tbsp' | 'tsp' | 'each';
export type Equipment = 'microwave' | 'oven' | 'stovetop' | 'air-fryer' | 'kettle' | 'refrigerator' | 'freezer';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodState = 'dry' | 'ready-to-eat' | 'raw' | 'cooked';
export type FoodRule = 'vegetarian' | 'vegan' | 'pescatarian' | 'exclude_beef' | 'exclude_pork' | 'celiac' | 'gluten_free' | 'dairy_free' | 'type_1_diabetes' | 'type_2_diabetes';
export type FoodAllergy = { rawText: string; canonicalId: string | null; status: 'pending_confirmation' | 'confirmed' | 'needs_review' };
export type NutrientInterest = { nutrientId: 'protein' | 'iron' | 'potassium' | 'fiber' | 'vitamin_d' | 'vitamin_b12'; reason: 'food_ideas' | 'clinician_recommended' | 'unsure'; caregiverReported: boolean; reviewStatus: 'pending_confirmation' | 'confirmed' | 'needs_review' };
export interface MemberFoodSettings {
  id: string; name: string; rules: FoodRule[]; otherExclusions: string[];
  ageGroup?: 'child' | 'teen' | 'adult'; medicalConsent?: boolean;
  eggAllowed: boolean | null; dairyAllowed: boolean | null;
  allergies: FoodAllergy[]; noKnownAllergies: boolean;
  likes: string[]; dislikes: string[]; flavors: string[]; textures: string[]; cuisines: string[];
  note: string; clinicianInstructions: string; potassiumCheck: 'unknown' | 'no_restriction_reported' | 'clinician_recommended';
  nutrients: NutrientInterest[];
}
export interface HouseholdProfile {
  householdSize: number;
  weeklyBudgetCents: number;
  allergies: string[];
  dietaryRestrictions: ('vegetarian' | 'vegan')[];
  excludedIngredientIds: string[];
  equipment: Equipment[];
  maxCookingMinutes: number;
  mealsCovered: MealType[];
  preferredStoreId: string;
  uncertaintyBufferCents: number;
  knownFeesCents: number;
  members?: MemberFoodSettings[];
  preferredStoreName?: string;
  preferredStoreLocation?: string;
}
export interface Ingredient {
  id: string; name: string; baseUnit: Unit; allergenTags: string[];
  allergenInformationKnown: boolean; vegetarian: boolean; vegan: boolean;
  foodTags?: string[]; glutenStatus?: 'contains' | 'unknown' | 'verified-free';
  nutrientRecords?: NutrientRecord[];
}
export interface NutrientRecord {
  nutrientId: 'carbohydrate' | NutrientInterest['nutrientId'];
  amountPer100g: number;
  unit: 'g' | 'mg' | 'mcg';
  foodState: FoodState;
  source: string;
  status: 'verified';
}
export interface PantryItem {
  id: string; ingredientId: string; quantity: number; unit: Unit;
  foodState: FoodState; quantityConfirmed: boolean; expiryDate?: string;
}
export interface RecipeIngredient { ingredientId: string; quantity: number; unit: Unit; foodState: FoodState }
export interface Recipe {
  id: string; title: string; yieldServings: number; equipment: Equipment[];
  prepMinutes: number; cookMinutes: number; mealTypes: MealType[];
  ingredients: RecipeIngredient[]; steps: string[]; reviewStatus: 'synthetic-demo' | 'approved';
  provenance: string;
  flavorTags?: string[]; textureTags?: string[]; cuisineTags?: string[];
  celiacPreparationVerified?: boolean;
}
export interface PriceObservation {
  id: string; ingredientId: string; storeId: string; productName: string;
  packageQuantity: number; packageUnit: Unit; priceCents: number;
  observedAt: string; sourceType: 'synthetic-demo' | 'user-entered' | 'reviewed' | 'retailer-reference'; locationLabel: string;
  productTags?: string[]; labelStatus?: 'verified' | 'unknown'; labelSource?: string;
}
export interface MealPlanEntry {
  id: string; day: number; mealType: MealType; recipeId: string; plannedServings: number;
  batchId?: string; batchServings?: number; isLeftover?: boolean;
}
export interface ShoppingItem {
  ingredientId: string; name: string; unit: Unit; requiredQuantity: number;
  pantryQuantityUsed: number; newQuantityNeeded: number; packageCount: number | null;
  purchaseCostCents: number | null; priceObservationId: string | null;
  priceStatus: 'current' | 'stale' | 'missing'; purchasedQuantity: number | null;
  productCheckStatus?: 'verified' | 'needs-checking';
}
export interface BudgetEstimate {
  purchaseTotalCents: number; knownFeesCents: number; uncertaintyBufferCents: number;
  totalCents: number; remainingBudgetCents: number | null; shortfallCents: number | null;
  missingPriceCount: number; stalePriceCount: number;
  status: 'estimated-within-budget' | 'over-budget' | 'incomplete-estimate';
  estimateDate: string; storeId: string; feesIncluded: boolean;
}
export interface MealPlan { entries: MealPlanEntry[]; shoppingItems: ShoppingItem[]; budget: BudgetEstimate; warnings: string[] }
export interface RecipeMatch { recipe: Recipe; score: number; missingIngredients: string[]; pantryMatch: number; estimatedPurchaseCents: number; hasMissingPrices: boolean; explanation?: string }
