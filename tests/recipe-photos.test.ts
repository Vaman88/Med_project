import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { recipes } from '../src/lib/demo-data';
import { mealPhotoSources } from '../src/components/meal-photo';

test('every planner recipe has a distinct local photograph', () => {
  const photos = new Map<string, string>();
  for (const recipe of recipes) {
    const sources = mealPhotoSources(recipe.id, recipe.title);
    assert.equal(sources.length, 1, 'no unrelated shared-photo fallbacks');
    const contents = readFileSync(`public${sources[0]}`);
    assert.ok(contents.length > 1000, `${recipe.id} has a usable image`);
    const hash = createHash('sha256').update(contents).digest('hex');
    assert.ok(!photos.has(hash), `${recipe.id} repeats ${photos.get(hash)}`);
    photos.set(hash, recipe.id);
  }
});
