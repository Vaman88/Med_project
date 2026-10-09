import { z } from 'zod';
import { startingProfile } from './account';
import { ingredients, demoPantry } from './demo-data';
import { profileSchema } from './validation';
import { calculatePlan, matchRecipes } from './planning';
import { valuePrices } from './value-prices';
import type { HouseholdProfile, PantryItem, RecipeMatch } from './domain';

export const GUEST_STORAGE_KEY = 'healthy-steps-kitchen-v1';
const foodSchema = z.object({
  id:z.string().min(1).max(80), label:z.string().trim().min(1).max(80),
  ingredientId:z.string().refine(id=>ingredients.some(item=>item.id===id)).optional(),
  quantity:z.number().positive().max(100000).optional(),
  unit:z.enum(['g','kg','oz','lb','each']),
  foodState:z.enum(['dry','ready-to-eat','raw','cooked']),
  storage:z.enum(['pantry','fridge','freezer']),
  bestByDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();
export const guestKitchenSchema=z.object({version:z.literal(1),profile:profileSchema,foods:z.array(foodSchema).max(100).refine(foods=>new Set(foods.map(food=>food.id)).size===foods.length)}).strict();
export type KitchenFood=z.infer<typeof foodSchema>;
export function guestProfile():HouseholdProfile { return {...startingProfile('Family'),householdSize:4,weeklyBudgetCents:2500}; }
export function resolveKitchenFood(label:string):string|undefined {
  const text=label.trim().toLowerCase();
  const aliases:Record<string,string>={'rice':'rice','cooked rice pouch':'rice','black beans':'beans','canned black beans':'beans','canned beans':'beans','beans':'beans','oatmeal':'oats','oats':'oats','bananas':'banana','canned corn':'corn','canned tomatoes':'tomato','carrots':'carrot'};
  return ingredients.find(item=>item.name.toLowerCase()===text||item.id===text)?.id??aliases[text];
}
export function measuredPantry(foods:KitchenFood[]):PantryItem[] {
  return foods.filter(food=>food.ingredientId&&food.quantity).map(food=>({id:food.id,ingredientId:food.ingredientId!,quantity:food.quantity!,unit:food.unit,foodState:food.foodState,quantityConfirmed:true,...(food.bestByDate?{expiryDate:food.bestByDate}:{})}));
}
export function sampleKitchen():KitchenFood[] { return [...demoPantry,{id:'sample-corn',ingredientId:'corn',quantity:400,unit:'g' as const,foodState:'ready-to-eat' as const,quantityConfirmed:true}].map(item=>({id:item.id,ingredientId:item.ingredientId,quantity:item.ingredientId==='rice'?500:item.quantity,unit:item.unit as KitchenFood['unit'],foodState:item.foodState,label:ingredients.find(food=>food.id===item.ingredientId)!.name,storage:'pantry' as const})); }
export interface KitchenMatch { match:RecipeMatch; plan:ReturnType<typeof calculatePlan>; group:'now'|'extras'|'later' }
export function kitchenMeals(profile:HouseholdProfile,foods:KitchenFood[],now=new Date()):KitchenMatch[] {
  const pantry=measuredPantry(foods);
  return matchRecipes(profile,pantry,{prices:valuePrices,now}).map(match=>{
    const entries=[{id:'preview',day:0,mealType:match.recipe.mealTypes[0],recipeId:match.recipe.id,plannedServings:profile.householdSize}];
    const plans=[...new Set(valuePrices.map(price=>price.retailer))].map(retailer=>calculatePlan(profile,pantry,entries,{prices:valuePrices.filter(price=>price.retailer===retailer),now}));
    const plan=plans.sort((a,b)=>a.budget.missingPriceCount-b.budget.missingPriceCount||a.budget.stalePriceCount-b.budget.stalePriceCount||a.budget.totalCents-b.budget.totalCents)[0];
    const complete=!plan.budget.missingPriceCount&&!plan.budget.stalePriceCount;
    return {match,plan,group:!plan.shoppingItems.length?'now':complete&&plan.shoppingItems.length<=2&&plan.budget.totalCents<=profile.weeklyBudgetCents?'extras':'later'} as KitchenMatch;
  });
}
