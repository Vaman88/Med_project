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
