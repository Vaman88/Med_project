import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guestKitchenSchema,guestProfile,measuredPantry,sampleKitchen,resolveKitchenFood,kitchenMeals,matchingPantry,typedFoodDefaults,typicalAmount,isPantryBasic,type KitchenFood} from '../src/lib/guest-kitchen';
import type {HouseholdProfile} from '../src/lib/domain';
test('guest snapshot validates and unrecognized or unmeasured foods are not deducted',()=>{
  const foods=sampleKitchen();assert.ok(guestKitchenSchema.safeParse({version:1,profile:guestProfile(),foods}).success);
  assert.equal(resolveKitchenFood('frozen corn'),undefined);
  assert.equal(measuredPantry([{id:'unknown',label:'Eggs',unit:'each',storage:'fridge',foodState:'raw'},{id:'oats',label:'Oats',ingredientId:'oats',unit:'g',storage:'pantry',foodState:'dry'}]).length,0);
  const profile=guestProfile();profile.weeklyBudgetCents=0;
  const matches=kitchenMeals(profile,foods,new Date('2026-10-09T12:00:00Z'));
  assert.ok(matches.some(item=>item.group==='now'));
  assert.ok(matches.filter(item=>item.group==='extras').every(item=>item.plan.budget.totalCents<=profile.weeklyBudgetCents));
});

test('typed foods without amounts still find meal ideas, with pantry basics assumed',()=>{
  const now=new Date('2026-10-09T12:00:00Z');
  const typed=['chicken','rice','broccoli','eggs','cheese','bread','black beans','ground beef'];
  const foods:KitchenFood[]=typed.map(label=>{const d=typedFoodDefaults(label)!;return {id:label,label,ingredientId:resolveKitchenFood(label),unit:d.unit,foodState:d.foodState,storage:d.storage};});
  assert.ok(foods.every(food=>food.ingredientId),'every common typed food is recognized');
  assert.equal(resolveKitchenFood('ground beef'),'ground-beef');
  assert.equal(typedFoodDefaults('chicken')?.foodState,'raw');
  assert.equal(typedFoodDefaults('black beans')?.foodState,'ready-to-eat');
  // Unmeasured foods stay out of the strict pantry used for grocery costs.
  assert.equal(measuredPantry(foods).length,0);
  const pantry=matchingPantry(foods);
  assert.ok(pantry.some(item=>item.ingredientId==='olive-oil'),'cooking oil is assumed');
  assert.ok(!pantry.some(item=>item.ingredientId==='sesame-oil'||item.ingredientId==='peanut-oil'),'allergen basics are never assumed');
  assert.ok(pantry.some(item=>item.ingredientId==='black-beans'),'canned beans can stand in for black beans');
  const profile={...guestProfile(),equipment:['microwave','refrigerator','stovetop','oven'] as HouseholdProfile['equipment']};
  const matches=kitchenMeals(profile,foods,now);
  assert.ok(matches.filter(item=>item.group==='extras').length>=5,'several meals need only one or two more foods');
  assert.ok(matches.every(item=>item.plan.shoppingItems.every(shop=>!isPantryBasic(shop.ingredientId))),'basics never appear as purchases');
});

test('meal ideas follow the amounts a family enters', () => {
  const profile = { ...guestProfile(), householdSize: 4 };
  const plenty = kitchenMeals(profile, [
    { id: 'r', label: 'Ready-to-eat cooked rice', ingredientId: 'rice', quantity: 2000, unit: 'g', foodState: 'ready-to-eat', storage: 'pantry' },
    { id: 'b', label: 'Canned beans', ingredientId: 'beans', quantity: 2000, unit: 'g', foodState: 'ready-to-eat', storage: 'pantry' },
    { id: 't', label: 'Canned tomatoes', ingredientId: 'tomato', quantity: 2000, unit: 'g', foodState: 'ready-to-eat', storage: 'pantry' },
  ]);
  const little = kitchenMeals(profile, [
    { id: 'r', label: 'Ready-to-eat cooked rice', ingredientId: 'rice', quantity: 300, unit: 'g', foodState: 'ready-to-eat', storage: 'pantry' },
    { id: 'b', label: 'Canned beans', ingredientId: 'beans', quantity: 2000, unit: 'g', foodState: 'ready-to-eat', storage: 'pantry' },
    { id: 't', label: 'Canned tomatoes', ingredientId: 'tomato', quantity: 2000, unit: 'g', foodState: 'ready-to-eat', storage: 'pantry' },
  ]);
  const bowl = (list: typeof plenty) => list.find(item => item.match.recipe.id === 'bean-rice');
  assert.ok(bowl(plenty), 'bean and rice bowls are offered');
  assert.equal(bowl(plenty)!.plan.shoppingItems.length, 0, 'plenty of rice and beans: nothing to buy');
  assert.ok(bowl(plenty)!.servingsPossible >= 4);
  const small = bowl(little)!;
  assert.ok(small.servingsPossible >= 1 && small.servingsPossible < 4, 'a little rice makes a smaller batch');
  assert.equal(small.group, 'now', 'a smaller batch can still be made now');
  assert.ok(small.uses.some(use => use.ingredientId === 'rice' && use.need > use.have), 'the card shows rice runs short');
});

test('foods without an amount use a typical package, not unlimited food', () => {
  const typical = typicalAmount('rice');
  assert.ok(typical.quantity > 0 && typical.quantity < 100000);
  const pantry = matchingPantry([{ id: 'r', label: 'rice', ingredientId: 'rice', unit: 'g', foodState: 'ready-to-eat', storage: 'pantry' }]);
  assert.equal(pantry.find(item => item.id === 'assumed-r')?.quantity, typical.quantity);
});
