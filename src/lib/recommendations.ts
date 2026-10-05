import { ingredients } from './demo-data';
import { calculatePlan, convertQuantity, matchRecipes, productConflict } from './planning';
import { valuePrices, type ValuePrice } from './value-prices';
import type { HouseholdProfile, PantryItem, MealPlan, RecipeMatch } from './domain';

export interface PantryUse { ingredientId: string; name: string; used: number; required: number; unit: string; needsTopUp: boolean }
export interface Suggestions { selected: RecipeMatch[]; alternatives: RecipeMatch[]; plan: MealPlan | null; pantryUse: PantryUse[]; prices: ValuePrice[]; pricesNeedRefresh: boolean; message: string }

export function recommendBasket(profile: HouseholdProfile, pantry: PantryItem[], prices: ValuePrice[] = valuePrices, now = new Date()): Suggestions {
  const current = { ...profile, preferredStoreId:'value-us' };
  const planningOptions = { prices,allowSyntheticDemo:true,now };
  const compatible = matchRecipes(current,pantry,planningOptions);
  let best: { matches:RecipeMatch[]; plan:MealPlan; rank:number } | null = null;
  let pricesNeedRefresh = false;
  for (let mask=1; mask < 2 ** compatible.length; mask++) {
    const matches = compatible.filter((_,index) => mask & 2 ** index);
    if (matches.length > 3) continue;
    const entries = matches.map((match,index) => ({ id:`idea-${index}`,day:index,mealType:match.recipe.mealTypes[0],recipeId:match.recipe.id,plannedServings:current.householdSize }));
    // Compute actual basket requirements first, then choose the cheapest whole-package
    // option for each missing ingredient. No assumed fractional package purchases.
    const initial = calculatePlan(current,pantry,entries,planningOptions);
    if (initial.budget.stalePriceCount) pricesNeedRefresh = true;
    const chosenPrices = initial.shoppingItems.map(item => prices.filter(price => price.ingredientId === item.ingredientId && price.storeId === current.preferredStoreId && !productConflict(price,current) && Number.isSafeInteger(price.priceCents) && price.priceCents >= 0 && price.packageQuantity > 0 && Number.isFinite(price.packageQuantity) && Number.isFinite(Date.parse(price.observedAt)) && Date.parse(price.observedAt) <= now.getTime() && now.getTime()-Date.parse(price.observedAt) <= 30*86400000).sort((a,b) => {
      const cost = (price:ValuePrice) => { const size = convertQuantity(price.packageQuantity,price.packageUnit,item.unit as PantryItem['unit']); return size ? Math.ceil((item.newQuantityNeeded-1e-8)/size)*price.priceCents : Infinity; };
      return cost(a)-cost(b) || a.id.localeCompare(b.id);
    })[0]).filter((price): price is ValuePrice => !!price);
    const plan = calculatePlan(current,pantry,entries,{prices:chosenPrices,allowSyntheticDemo:true,now});
    if (plan.budget.missingPriceCount || plan.budget.totalCents > current.weeklyBudgetCents) continue;
    const rank = matches.length*100 + new Set(matches.flatMap(match => match.recipe.mealTypes)).size*5 + matches.reduce((sum,match) => sum+match.score,0)*10 - plan.budget.totalCents/10000;
    if (!best || rank > best.rank) best = {matches,plan,rank};
  }
  if (!best) return { selected:[], alternatives:compatible, plan:null, pantryUse:[], prices, pricesNeedRefresh,
    message:pricesNeedRefresh ? 'Some retailer price references are more than 30 days old. We cannot confirm a basket fits your budget until those prices are checked again. Compatible meal ideas are below.' : compatible.length ? 'No complete basket fits this budget yet. Add foods you already have, adjust the budget, or explore food support below.' : 'No meal in the current library fits all of your food settings. Keep your restrictions and explore food support or update any information that needs checking.' };
  const requirements = new Map<string,{quantity:number;ingredientId:string;state:PantryItem['foodState']}>();
  for (const match of best.matches) for (const part of match.recipe.ingredients) {
    const ingredient = ingredients.find(item => item.id===part.ingredientId)!;
    const quantity = convertQuantity(part.quantity*current.householdSize/match.recipe.yieldServings,part.unit,ingredient.baseUnit)!;
    const key=`${ingredient.id}:${part.foodState}`;
    requirements.set(key,{ingredientId:ingredient.id,state:part.foodState,quantity:(requirements.get(key)?.quantity??0)+quantity});
  }
  const used = new Map<string,{used:number;required:number}>();
  const today = now.toISOString().slice(0,10);
  for (const needed of requirements.values()) {
    const ingredient = ingredients.find(item => item.id===needed.ingredientId)!;
    const available = pantry.filter(item => item.ingredientId===ingredient.id && item.quantityConfirmed && item.foodState===needed.state && (!item.expiryDate || item.expiryDate>=today))
      .reduce((sum,item) => sum+(convertQuantity(item.quantity,item.unit,ingredient.baseUnit)??0),0);
    const previous = used.get(ingredient.id)??{used:0,required:0};
    used.set(ingredient.id,{used:previous.used+Math.min(needed.quantity,available),required:previous.required+needed.quantity});
  }
  const pantryUse = [...used].filter(([,amount]) => amount.used>0).map(([ingredientId,amount]) => ({ ingredientId,name:ingredients.find(item=>item.id===ingredientId)!.name,...amount,
    unit:ingredients.find(item=>item.id===ingredientId)!.baseUnit, needsTopUp:amount.required-amount.used>1e-8 }));
  return { selected:best.matches, alternatives:compatible.filter(match=>!best!.matches.includes(match)), plan:best.plan, pantryUse, prices, pricesNeedRefresh:false,
    message:`${best.matches.length} meal ideas for ${current.householdSize} ${current.householdSize===1?'person':'people'}, using your pantry first. This basket covers these meals, not a full week of food.` };
}
