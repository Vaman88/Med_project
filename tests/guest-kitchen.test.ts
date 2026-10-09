import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guestKitchenSchema,guestProfile,measuredPantry,sampleKitchen,resolveKitchenFood,kitchenMeals} from '../src/lib/guest-kitchen';
test('guest snapshot validates and unrecognized or unmeasured foods are not deducted',()=>{
  const foods=sampleKitchen();assert.ok(guestKitchenSchema.safeParse({version:1,profile:guestProfile(),foods}).success);
  assert.equal(resolveKitchenFood('frozen corn'),undefined);
  assert.equal(measuredPantry([{id:'unknown',label:'Eggs',unit:'each',storage:'fridge',foodState:'raw'},{id:'oats',label:'Oats',ingredientId:'oats',unit:'g',storage:'pantry',foodState:'dry'}]).length,0);
  const profile=guestProfile();profile.weeklyBudgetCents=0;
  const matches=kitchenMeals(profile,foods,new Date('2026-10-09T12:00:00Z'));
  assert.ok(matches.some(item=>item.group==='now'));
  assert.ok(matches.filter(item=>item.group==='extras').every(item=>item.plan.budget.totalCents<=profile.weeklyBudgetCents));
});
