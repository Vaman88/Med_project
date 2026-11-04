import { z } from 'zod';
import { startingProfile } from './account';
import { ingredients, demoPantry } from './demo-data';
import { profileSchema } from './validation';
import { calculatePlan, convertQuantity, matchRecipes } from './planning';
import { valuePrices } from './value-prices';
import { catalogFoods, findCatalogFood, foodsInCategory, searchFoods, type CatalogFood } from './food-catalog';
import type { HouseholdProfile, PantryItem, RecipeMatch, Unit } from './domain';

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
  const known=ingredients.find(item=>item.name.toLowerCase()===text||item.id===text)?.id??(Object.hasOwn(aliases,text)?aliases[text]:undefined);
  if(known) return known;
  const catalogId=catalogFoodFor(text)?.ingredientId;
  return catalogId&&ingredients.some(item=>item.id===catalogId)?catalogId:undefined;
}
/**
 * The catalog food a typed name refers to: an exact name or alias first, otherwise a catalog
 * label that begins with the typed words ("ground beef" -> "Ground beef, 90% lean").
 */
export function catalogFoodFor(label:string):CatalogFood|undefined {
  const text=label.trim().toLowerCase().replace(/\s+/g,' ');
  const exact=findCatalogFood(text);
  if(exact||text.length<3) return exact;
  return searchFoods(text,8).find(food=>{const name=food.label.toLowerCase();return name===text||name.startsWith(`${text},`)||name.startsWith(`${text} `);});
}
export function measuredPantry(foods:KitchenFood[]):PantryItem[] {
  return foods.filter(food=>food.ingredientId&&food.quantity).map(food=>({id:food.id,ingredientId:food.ingredientId!,quantity:food.quantity!,unit:food.unit,foodState:food.foodState,quantityConfirmed:true,...(food.bestByDate?{expiryDate:food.bestByDate}:{})}));
}
export function sampleKitchen():KitchenFood[] { return [...demoPantry,{id:'sample-corn',ingredientId:'corn',quantity:400,unit:'g' as const,foodState:'ready-to-eat' as const,quantityConfirmed:true}].map(item=>({id:item.id,ingredientId:item.ingredientId,quantity:item.ingredientId==='rice'?500:item.quantity,unit:item.unit as KitchenFood['unit'],foodState:item.foodState,label:ingredients.find(food=>food.id===item.ingredientId)!.name,storage:'pantry' as const})); }
/**
 * Everyday basics most kitchens keep: cooking oil, vinegar, sugar, salt, pepper and dried spices.
 * Meal matching assumes these are on hand so a recipe is not blocked by a pinch of cumin.
 * Basics that carry an allergen (sesame oil, peanut oil, bagel seasoning) are never assumed.
 */
const BASIC_IDS = new Set(['olive-oil','canola-oil','cooking-spray','white-vinegar','sugar','brown-sugar']);
export const pantryBasicIds: string[] = [
  ...foodsInCategory('Oils, vinegar and sweeteners', 100).filter(food => BASIC_IDS.has(food.id)),
  ...foodsInCategory('Spices and seasonings', 100),
].filter(food => !food.allergens.length && food.ingredientId && ingredients.some(item => item.id === food.ingredientId)).map(food => food.ingredientId!);
const basicSet = new Set(pantryBasicIds);
export const isPantryBasic = (ingredientId: string) => basicSet.has(ingredientId);
/** Plenty, in the ingredient's own base unit, for pantry basics (oil, salt, spices). */
const ASSUMED_PLENTY = 100000;
const DEFAULT_TYPICAL: Partial<Record<Unit, number>> = { g: 454, ml: 946, each: 6 };
/**
 * A typical household amount for a food entered without an amount: the smallest store package
 * we have a price for (one bag of rice, one can of beans, one bunch of bananas), or about a pound.
 * Meal ideas use this "generalized" amount instead of pretending the family has unlimited food.
 */
export function typicalAmount(ingredientId: string): { quantity: number; unit: Unit } {
  const ingredient = ingredients.find(item => item.id === ingredientId);
  const unit = (ingredient?.baseUnit ?? 'g') as Unit;
  const packages = valuePrices.filter(price => price.ingredientId === ingredientId)
    .map(price => convertQuantity(price.packageQuantity, price.packageUnit as Unit, unit))
    .filter((value): value is number => value !== null && value > 0);
  return { quantity: packages.length ? Math.min(...packages) : DEFAULT_TYPICAL[unit] ?? 454, unit };
}
/** Short, friendly amount text: "340 g", "1.2 kg", "6", "250 ml". */
export function formatAmount(quantity: number, unit: Unit): string {
  if (unit === 'each') return `${Math.round(quantity * 10) / 10}`;
  if (unit === 'g') return quantity >= 1000 ? `${Math.round(quantity / 100) / 10} kg` : `${Math.round(quantity)} g`;
  if (unit === 'ml') return quantity >= 1000 ? `${Math.round(quantity / 100) / 10} L` : `${Math.round(quantity)} ml`;
  return `${Math.round(quantity * 10) / 10} ${unit}`;
}
const STATES = ['dry','ready-to-eat','raw','cooked'] as const;

/**
 * The pantry used for finding meal ideas. Measured foods count as entered. Recognized foods
 * without an amount count as "enough for a family meal", and pantry basics are assumed.
 * measuredPantry stays strict for anything that needs real quantities.
 */
export function matchingPantry(foods:KitchenFood[], includeBasics=true):PantryItem[] {
  const measured=measuredPantry(foods);
  const unmeasured=foods.filter(food=>food.ingredientId&&!food.quantity).map(food=>{
    const typical=typicalAmount(food.ingredientId!);
    return {id:`assumed-${food.id}`,ingredientId:food.ingredientId!,quantity:typical.quantity,unit:typical.unit,foodState:food.foodState,quantityConfirmed:true,...(food.bestByDate?{expiryDate:food.bestByDate}:{})};
  });
  const basics=includeBasics?pantryBasicIds.flatMap(id=>{const ingredient=ingredients.find(item=>item.id===id)!;return STATES.map(state=>({id:`basic-${id}-${state}`,ingredientId:id,quantity:ASSUMED_PLENTY,unit:ingredient.baseUnit,foodState:state,quantityConfirmed:true}));}):[];
  // Canned beans are interchangeable for meal ideas: "beans" can make a black bean bowl, and black beans can fill a generic bean recipe.
  const beanSwaps=[...measured,...unmeasured].filter(item=>BEANS.includes(item.ingredientId)).flatMap(item=>BEANS.filter(id=>id!==item.ingredientId&&ingredients.some(food=>food.id===id)).map(id=>({...item,id:`${item.id}-as-${id}`,ingredientId:id})));
  return [...measured,...unmeasured,...beanSwaps,...basics];
}
const BEANS=['beans','black-beans','pinto-beans','kidney-beans','cannellini-beans'];

/** How much of one of the family's own foods a meal uses, at the family's serving count. */
export interface FoodUse { ingredientId:string; name:string; need:number; have:number; unit:Unit; assumed:boolean }
export interface KitchenMatch {
  match:RecipeMatch; plan:ReturnType<typeof calculatePlan>; group:'now'|'extras'|'later'; basicsUsed:string[];
  /** Whole servings the family's own amounts can make right now (0 when a food is missing). */
  servingsPossible:number;
  /** The family's foods this meal uses, with the amount needed and the amount on hand. */
  uses:FoodUse[];
}
/** Servings a pantry can make of a recipe, and how much of each of the family's foods it uses. */
export function recipeAmounts(recipe:RecipeMatch['recipe'],pantry:PantryItem[],servings:number):{servingsPossible:number;uses:FoodUse[]} {
  const uses:FoodUse[]=[];let possible=Infinity;
  const parts=new Map<string,{ingredientId:string;state:string;perServing:number}>();
  for(const part of recipe.ingredients){
    if(isPantryBasic(part.ingredientId))continue;
    const ingredient=ingredients.find(item=>item.id===part.ingredientId);if(!ingredient)continue;
    const perServing=convertQuantity(part.quantity/recipe.yieldServings,part.unit,ingredient.baseUnit);if(perServing===null||perServing<=0)continue;
    const key=`${part.ingredientId}:${part.foodState}`;const prior=parts.get(key);
    parts.set(key,{ingredientId:part.ingredientId,state:part.foodState,perServing:(prior?.perServing??0)+perServing});
  }
  for(const {ingredientId,state,perServing} of parts.values()){
    const ingredient=ingredients.find(item=>item.id===ingredientId)!;
    const items=pantry.filter(item=>item.ingredientId===ingredientId&&item.foodState===state&&!item.id.startsWith('basic-'));
    const have=items.reduce((sum,item)=>sum+(convertQuantity(item.quantity,item.unit,ingredient.baseUnit)??0),0);
    possible=Math.min(possible,have/perServing);
    if(have>0)uses.push({ingredientId,name:ingredient.name,need:perServing*servings,have,unit:ingredient.baseUnit as Unit,assumed:items.every(item=>item.id.startsWith('assumed-'))});
  }
  return {servingsPossible:Number.isFinite(possible)?Math.floor(possible+1e-9):0,uses};
}
export function kitchenMeals(profile:HouseholdProfile,foods:KitchenFood[],now=new Date()):KitchenMatch[] {
  const pantry=matchingPantry(foods);
  return matchRecipes(profile,pantry,{prices:valuePrices,now}).map(match=>{
    const entries=[{id:'preview',day:0,mealType:match.recipe.mealTypes[0],recipeId:match.recipe.id,plannedServings:profile.householdSize}];
    const plans=[...new Set(valuePrices.map(price=>price.retailer))].map(retailer=>calculatePlan(profile,pantry,entries,{prices:valuePrices.filter(price=>price.retailer===retailer),now}));
    const plan=plans.sort((a,b)=>a.budget.missingPriceCount-b.budget.missingPriceCount||a.budget.stalePriceCount-b.budget.stalePriceCount||a.budget.totalCents-b.budget.totalCents)[0];
    const basicsUsed=match.recipe.ingredients.filter(part=>isPantryBasic(part.ingredientId)).map(part=>ingredients.find(item=>item.id===part.ingredientId)!.name);
    const {servingsPossible,uses}=recipeAmounts(match.recipe,pantry,profile.householdSize);
    // "Make it now" when the family's amounts cover every serving, or at least one serving with
    // every food on hand (a smaller batch). Missing prices are shown on the card, not hidden.
    const group=!plan.shoppingItems.length||servingsPossible>=1?'now':plan.shoppingItems.length<=2&&plan.budget.totalCents<=profile.weeklyBudgetCents?'extras':'later';
    return {match,plan,group,basicsUsed,servingsPossible,uses} as KitchenMatch;
  });
}

/** Catalog defaults (unit, preparation, storage) for a typed food name, when the catalog knows it. */
export function typedFoodDefaults(label:string):{unit:KitchenFood['unit'];foodState:KitchenFood['foodState'];storage:KitchenFood['storage']}|null {
  // Prefer the catalog entry for the ingredient the name resolves to, so "black beans" (which the
  // planner reads as canned beans) gets canned-bean defaults rather than another catalog bean's.
  const resolved=resolveKitchenFood(label);
  const food=(resolved?catalogFoods.find(item=>item.ingredientId===resolved):undefined)??catalogFoodFor(label);
  return food?{unit:food.unit as KitchenFood['unit'],foodState:food.foodState,storage:food.storage}:null;
}
