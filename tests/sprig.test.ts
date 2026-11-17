import test from 'node:test';
import assert from 'node:assert/strict';
import { dishesCooked, sprigGrowth, sprigNextGoal } from '../src/components/sprig';

test('Sprig grows a leaf per dish, then a flower at 10 and a bean pod at 15', () => {
  assert.deepEqual(sprigGrowth(0), { leaves: 2, flower: false, pod: false });
  assert.equal(sprigGrowth(3).leaves, 5);
  assert.equal(sprigGrowth(6).leaves, 8);
  assert.equal(sprigGrowth(40).leaves, 8, 'leaves stop at eight');
  assert.equal(sprigGrowth(9).flower, false);
  assert.equal(sprigGrowth(10).flower, true);
  assert.equal(sprigGrowth(14).pod, false);
  assert.equal(sprigGrowth(15).pod, true);
});

test('Sprig counts every finished dish, repeats included, and names the next goal', () => {
  assert.equal(dishesCooked({ completed: { pizza: 2, parfait: 1 } }), 3);
  assert.equal(dishesCooked({ completed: {} }), 0);
  assert.match(sprigNextGoal(0), /new leaf/);
  assert.equal(sprigNextGoal(9), '1 more dish until Sprig grows a flower.');
  assert.equal(sprigNextGoal(12), '3 more dishes until Sprig grows a bean pod.');
  assert.match(sprigNextGoal(20), /fully grown/);
});
