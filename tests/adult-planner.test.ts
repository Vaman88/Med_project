import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startingProfile, setupSchema, accountUpdateSchema, TERMS_VERSION, experienceForAge } from '../src/lib/account';
import { recommendBasket } from '../src/lib/recommendations';
import { valuePrices } from '../src/lib/value-prices';
import { recipes } from '../src/lib/demo-data';
import { siteGuideReply } from '../src/lib/site-guide';
import { GET, POST, PATCH, DELETE } from '../src/app/api/account/route';
import { POST as suggestions } from '../src/app/api/recommendations/route';

const profile = () => { const value = startingProfile('Alex Example'); value.members![0].noKnownAllergies=true; value.weeklyBudgetCents=2000; return value; };
const setup = () => ({details:{name:'Alex Example',city:'Austin',state:'TX',age:30},profile:profile(),termsVersion:TERMS_VERSION,agreed:true,signature:'Alex Example'});
test('adult account setup requires matching consent, adult age and answered allergies', () => {
  assert.equal(setupSchema.safeParse(setup()).success,true);
  assert.equal(setupSchema.safeParse({...setup(),agreed:false}).success,false);
  assert.equal(setupSchema.safeParse({...setup(),signature:'Someone Else'}).success,false);
  assert.equal(setupSchema.safeParse({...setup(),details:{...setup().details,age:17}}).success,false);
  const missing=setup();missing.profile.members![0].noKnownAllergies=false;
  assert.equal(setupSchema.safeParse(missing).success,false);
  const medical=setup();medical.profile.members![0].rules=['type_1_diabetes'];
  assert.equal(setupSchema.safeParse(medical).success,false);
  medical.profile.members![0].medicalConsent=true;
  assert.equal(setupSchema.safeParse(medical).success,true);
  medical.profile.members![0].ageGroup='child';
  assert.equal(accountUpdateSchema.safeParse({profile:medical.profile,pantry:[]}).success,false);
  assert.equal(experienceForAge(9),'child');assert.equal(experienceForAge(10),'adult');assert.equal(experienceForAge(17),'adult');
});
test('suggested baskets respect full package costs, known fees and zero budget', () => {
  const state=profile();const result=recommendBasket(state,[]);
  assert.ok(result.plan);assert.ok(result.selected.length>0&&result.selected.length<=3);
  assert.ok(result.plan.budget.totalCents<=state.weeklyBudgetCents);
  for(const item of result.plan.shoppingItems){const price=valuePrices.find(row=>row.id===item.priceObservationId)!;assert.equal(item.purchaseCostCents,item.packageCount!*price.priceCents);assert.ok(Number.isInteger(item.packageCount));}
  state.weeklyBudgetCents=0;assert.equal(recommendBasket(state,[]).plan,null);
  state.knownFeesCents=1;assert.equal(recommendBasket(state,[]).plan,null);
});
test('sufficient confirmed pantry foods are used without buying again', () => {
  const state=profile();state.weeklyBudgetCents=0;
  const result=recommendBasket(state,[{id:'oats',ingredientId:'oats',quantity:500,unit:'g',foodState:'dry',quantityConfirmed:true},{id:'banana',ingredientId:'banana',quantity:5,unit:'each',foodState:'raw',quantityConfirmed:true}]);
  assert.ok(result.plan);assert.equal(result.plan.shoppingItems.length,0);
  assert.ok(result.pantryUse.some(item=>item.ingredientId==='oats'&&!item.needsTopUp));
  assert.equal(recommendBasket(state,[{id:'oats',ingredientId:'oats',quantity:500,unit:'g',foodState:'cooked',quantityConfirmed:true},{id:'banana',ingredientId:'banana',quantity:5,unit:'each',foodState:'raw',quantityConfirmed:true}]).plan,null);
});
test('pantry amounts are reserved once across the selected meals', () => {
  const result=recommendBasket(profile(),[{id:'banana',ingredientId:'banana',quantity:1,unit:'each',foodState:'raw',quantityConfirmed:true}]);
  assert.ok(result.plan);
  const used=result.pantryUse.find(item=>item.ingredientId==='banana');
  assert.ok(!used||used.used<=1);
  for(const item of result.plan.shoppingItems)assert.ok(item.pantryQuantityUsed<=item.requiredQuantity);
});
test('allergies remain hard gates and conflicting cheap packages cannot replace eligible ones', () => {
  const state=profile();state.members![0].noKnownAllergies=false;state.members![0].allergies=[{rawText:'Peanuts',canonicalId:'peanut',status:'confirmed'}];
  const oat=valuePrices.find(item=>item.ingredientId==='oats')!;
  const prices=[{...oat,id:'unsafe-oats',priceCents:1,productTags:['peanut']},...valuePrices];
  const result=recommendBasket(state,[],prices);
  for(const match of [...result.selected,...result.alternatives])assert.equal(match.recipe.ingredients.some(item=>item.ingredientId==='peanut-butter'),false);
  assert.equal(result.plan?.shoppingItems.some(item=>item.priceObservationId==='unsafe-oats'),false);
  assert.ok(result.selected.every(match=>recipes.some(recipe=>recipe.id===match.recipe.id)));
  state.members![0].allergies[0].status='pending_confirmation';assert.equal(recommendBasket(state,[]).selected.length,0);
});
test('a newer eligible listing wins over a cheaper stale listing', () => {
  const now=new Date('2026-10-05T12:00:00Z');
  const state=profile();
  state.excludedIngredientIds=['beans','corn','rice','bread','peanut-butter','yogurt','carrot','hummus'];
  const prices=valuePrices.map(price=>price.ingredientId==='oats'&&price.retailer==='Walmart'?{...price,observedAt:'2026-08-01',priceCents:1}:price);
  const result=recommendBasket(state,[{id:'banana',ingredientId:'banana',quantity:2,unit:'each',foodState:'raw',quantityConfirmed:true}],prices,now);
  assert.ok(result.plan);
  const oats=result.plan.shoppingItems.find(item=>item.ingredientId==='oats');
  assert.ok(oats);
  assert.equal(prices.find(price=>price.id===oats.priceObservationId)?.retailer,'Target');
  assert.equal(result.plan.budget.stalePriceCount,0);
});
test('a suggested basket uses one retailer for every item it asks the user to buy', () => {
  const state=profile();
  const cheaperTargetOats=valuePrices.find(item=>item.ingredientId==='oats'&&item.retailer==='Target')!;
  const prices=valuePrices.map(price=>price.id===cheaperTargetOats.id?{...price,priceCents:1}:price);
  const result=recommendBasket(state,[],prices,new Date('2026-10-05T12:00:00Z'));
  assert.ok(result.plan);
  const stores=new Set(result.plan.shoppingItems.map(item=>prices.find(price=>price.id===item.priceObservationId)?.retailer));
  assert.ok(stores.size<=1);
});
test('new pantry meals stay eligible only when their ingredients fit the account', () => {
  const state=profile();state.weeklyBudgetCents=3000;
  const pantry=[{id:'bread',ingredientId:'bread',quantity:4,unit:'each' as const,foodState:'ready-to-eat' as const,quantityConfirmed:true}];
  const plain=recommendBasket(state,pantry,valuePrices,new Date('2026-10-05T12:00:00Z'));
  assert.ok([...plain.selected,...plain.alternatives].some(match=>match.recipe.id==='hummus-carrot-sandwich'));
  state.members![0].noKnownAllergies=false;
  state.members![0].allergies=[{rawText:'Sesame',canonicalId:'sesame',status:'confirmed'}];
  const restricted=recommendBasket(state,pantry,valuePrices,new Date('2026-10-05T12:00:00Z'));
  assert.ok(![...restricted.selected,...restricted.alternatives].some(match=>match.recipe.id==='hummus-carrot-sandwich'));
  assert.ok([...restricted.selected,...restricted.alternatives].some(match=>match.recipe.id==='bean-corn-rice'));
});
test('old price references do not produce a claimed within-budget basket', () => {
  const now=new Date('2026-10-05T12:00:00Z');
  const old=valuePrices.map(price=>({...price,observedAt:'2026-08-01'}));
  const result=recommendBasket(profile(),[],old,now);
  assert.equal(result.plan,null);
  assert.equal(result.pricesNeedRefresh,true);
  assert.match(result.message,/more than 30 days old/);
  assert.ok(result.alternatives.length>0);
  assert.ok(result.alternatives.some(match=>match.hasStalePrices));
  const covered=[{id:'oats',ingredientId:'oats',quantity:500,unit:'g',foodState:'dry',quantityConfirmed:true},{id:'banana',ingredientId:'banana',quantity:5,unit:'each',foodState:'raw',quantityConfirmed:true}] as const;
  const pantryOnly=profile();pantryOnly.weeklyBudgetCents=0;
  const pantryResult=recommendBasket(pantryOnly,covered.map(item=>({...item})),old,now);
  assert.ok(pantryResult.plan);
  assert.equal(pantryResult.plan.shoppingItems.length,0);
  assert.equal(pantryResult.pricesNeedRefresh,false);
});
test('website help describes current steps and returns usable navigation actions', () => {
  assert.equal(siteGuideReply('budget',profile(),0).actions[0].destination,'budget');
  assert.match(siteGuideReply('meal plan',profile(),0).text,/three steps/);
  assert.equal(siteGuideReply('allergies',profile(),0).actions[0].destination,'allergies');
});
test('account and recommendation endpoints fail closed without Supabase configuration', async () => {
  if(process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  for(const handler of [GET,POST,PATCH,DELETE,suggestions]){
    const response=await handler(new Request('http://localhost/api/account',{method:'POST',body:'{}'}));
    assert.equal(response.status,503);assert.equal((await response.json()).error.code,'ACCOUNTS_NOT_CONFIGURED');
  }
});
