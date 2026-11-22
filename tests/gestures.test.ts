import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chopAt, chopGuideX, nearestGuide, mashPress, mashProgress, mashPressesNeeded, syncPresses, scrubDue,
  turnStep, turnsAlong, stirProgress, type ChopGuide,
} from '../src/lib/gestures';

const guides: ChopGuide[] = [
  { index: 0, x: 310, top: 220, bottom: 300 },
  { index: 1, x: 400, top: 220, bottom: 300 },
  { index: 2, x: 490, top: 220, bottom: 300 },
];

test('a downward swipe through a line chops that line', () => {
  assert.deepEqual(chopAt({ x: 402, y: 230 }, { x: 404, y: 280 }, 180, guides), { kind: 'cut', index: 1 });
});

test('a near miss still chops the closest line (forgiving reach)', () => {
  assert.deepEqual(chopAt({ x: 436, y: 240 }, { x: 440, y: 285 }, 190, guides), { kind: 'cut', index: 1 });
});

test('the swipe must travel down and reach into the food', () => {
  // Too short a stroke.
  assert.equal(chopAt({ x: 400, y: 270 }, { x: 400, y: 280 }, 262, guides), null);
  // Moving up never cuts.
  assert.equal(chopAt({ x: 400, y: 290 }, { x: 400, y: 250 }, 150, guides), null);
  // Still above the food.
  assert.equal(chopAt({ x: 400, y: 150 }, { x: 400, y: 222 }, 120, guides), null);
});

test('a fast diagonal swipe that crosses a line between events still counts', () => {
  assert.deepEqual(chopAt({ x: 280, y: 200 }, { x: 345, y: 290 }, 120, guides), { kind: 'cut', index: 0 });
});

test('coming down into the food far from every line is a gentle miss, outside the food nothing', () => {
  const opts = { reach: 30, foodLeft: 220, foodRight: 580 };
  assert.deepEqual(chopAt({ x: 355, y: 230 }, { x: 355, y: 280 }, 150, guides, opts), { kind: 'miss' });
  assert.equal(chopAt({ x: 700, y: 230 }, { x: 700, y: 280 }, 150, guides, opts), null);
});

test('lines move with the pieces that have already slid apart', () => {
  assert.deepEqual(chopGuideX([300, 400, 500], [], 20), [300, 400, 500]);
  // After cutting line 1, line 0 sits on the left piece and line 2 on the right piece.
  assert.deepEqual(chopGuideX([300, 400, 500], [1], 20), [290, 390, 510]);
});

test('taps pick the closest uncut line, or the first one when far away', () => {
  assert.equal(nearestGuide(guides, 480)?.index, 2);
  assert.equal(nearestGuide(guides, 900)?.index, 0);
  assert.equal(nearestGuide(guides, null)?.index, 0);
  assert.equal(nearestGuide([], 400), null);
});

const lumps = [{ x: 265, y: 262 }, { x: 355, y: 262 }, { x: 445, y: 262 }, { x: 535, y: 262 }];

test('mashing takes several presses per lump and reports when a lump becomes mash', () => {
  const need = mashPressesNeeded(false);
  assert.equal(need, 3);
  let presses = [0, 0, 0, 0];
  for (let n = 1; n <= 3; n++) {
    const r = mashPress(presses, lumps, [], { x: 355, y: 262 }, { need });
    presses = r.presses;
    assert.deepEqual(r.hit, [1]);
    assert.deepEqual(r.finished, n === 3 ? [1] : []);
  }
  assert.equal(presses[1], 3);
  // A finished lump takes no more presses: the next press snaps to a neighbour.
  const again = mashPress(presses, lumps, [1], { x: 355, y: 262 }, { need });
  assert.equal(again.hit.length, 1);
  assert.notEqual(again.hit[0], 1);
});

test('an imprecise press snaps to the nearest lump; far away does nothing', () => {
  const near = mashPress([0, 0, 0, 0], lumps, [], { x: 445, y: 360 }, { need: 3 });
  assert.deepEqual(near.hit, [2]);
  const far = mashPress([0, 0, 0, 0], lumps, [], { x: 445, y: 500 }, { need: 3, snap: 130 });
  assert.deepEqual(far.hit, []);
  // Tap-only mode snaps from anywhere and needs fewer presses.
  const tap = mashPress([0, 0, 0, 0], lumps, [], { x: 445, y: 500 }, { need: mashPressesNeeded(true), snap: Infinity });
  assert.deepEqual(tap.hit, [2]);
  assert.equal(mashPressesNeeded(true), 2);
});

test('mash progress counts partly mashed lumps and finished spots', () => {
  assert.equal(mashProgress([0, 0, 0, 0], [], 4, 3), 0);
  assert.equal(mashProgress([3, 0, 0, 0], [0], 4, 3), 0.25);
  assert.equal(mashProgress([1, 2, 0, 0], [], 4, 3), 0.25);
  assert.equal(mashProgress([0, 0, 0, 0], [0, 1, 2, 3], 4, 3), 1);
});

test('undo un-mashes a lump and it starts over, partial presses stay', () => {
  assert.deepEqual(syncPresses([3, 2, 3, 0], [0], 3), [3, 2, 0, 0]);
});

test('scrubbing counts a press only after time and travel', () => {
  assert.equal(scrubDue(160, 20), true);
  assert.equal(scrubDue(100, 40), false);
  assert.equal(scrubDue(200, 5), false);
});

const center = { x: 400, y: 262 };
const circle = (turns: number, r = 100, steps = 48) =>
  Array.from({ length: Math.round(turns * steps) + 1 }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r };
  });

test('drawing circles counts the turns in either direction', () => {
  assert.ok(Math.abs(turnsAlong(center, circle(2)) - 720) < 1);
  assert.ok(Math.abs(turnsAlong(center, [...circle(1)].reverse()) - 360) < 1);
});

test('a straight swipe across the bowl or wiggles in the middle are not full turns', () => {
  const across = turnsAlong(center, [{ x: 250, y: 262 }, { x: 550, y: 262 }]);
  assert.ok(across <= 40);
  assert.equal(turnsAlong(center, [{ x: 402, y: 262 }, { x: 398, y: 264 }, { x: 401, y: 259 }]), 0);
  assert.deepEqual(turnStep(center, null, { x: 500, y: 262 }), { angle: 0, delta: 0 });
});

test('stir progress goes from separate to mixed', () => {
  assert.equal(stirProgress(0, 2), 0);
  assert.equal(stirProgress(360, 2), 0.5);
  assert.equal(stirProgress(9999, 2), 1);
});
