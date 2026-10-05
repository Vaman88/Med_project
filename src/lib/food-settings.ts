import type { FoodAllergy, HouseholdProfile, MemberFoodSettings } from './domain';

export const newMember = (id: string, name: string): MemberFoodSettings => ({ id, name, ageGroup: 'child', medicalConsent: false, rules: [], otherExclusions: [], eggAllowed: null, dairyAllowed: null, allergies: [], noKnownAllergies: false, likes: [], dislikes: [], flavors: [], textures: [], cuisines: [], note: '', clinicianInstructions: '', potassiumCheck: 'unknown', nutrients: [] });

const aliases: Record<string, string> = {
  peanut: 'peanut', peanuts: 'peanut', groundnut: 'peanut', groundnuts: 'peanut',
  milk: 'milk', "cow's milk": 'milk', cheese: 'milk', whey: 'milk', egg: 'egg', eggs: 'egg',
  wheat: 'wheat', soy: 'soy', soybean: 'soy', soybeans: 'soy', sesame: 'sesame',
  fish: 'fish', salmon: 'salmon', tuna: 'tuna', cod: 'cod',
  shellfish: 'shellfish', 'crustacean shellfish': 'shellfish', shrimp: 'shrimp', prawn: 'shrimp', crab: 'crab', lobster: 'lobster',
  'tree nut': 'tree-nut', 'tree nuts': 'tree-nut', treenuts: 'tree-nut',
  almond: 'almond', almonds: 'almond', walnut: 'walnut', walnuts: 'walnut', cashew: 'cashew', cashews: 'cashew', pecan: 'pecan', pecans: 'pecan',
};
export function proposeAllergies(input: string): FoodAllergy[] {
  return input.split(',').map(rawText => rawText.trim()).filter(Boolean).slice(0, 20).map(rawText => {
    const key = rawText.toLowerCase().replace(/\s+/g, ' ');
    const broad = ['nuts','seafood','dairy'].includes(key);
    const distance = (a: string, b: string) => {
      const row = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i++) { let previous = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + Number(a[i - 1] !== b[j - 1])); previous = old; } }
      return row[b.length];
    };
    const correction = !broad && key.length >= 5 ? Object.keys(aliases).filter(alias => Math.abs(alias.length - key.length) <= 2 && distance(key, alias) <= 2).sort((a,b) => distance(key,a) - distance(key,b))[0] : undefined;
    const canonicalId = broad ? null : aliases[key] ?? (correction ? aliases[correction] : null);
    return { rawText: rawText.slice(0, 80), canonicalId, status: canonicalId ? 'pending_confirmation' : 'needs_review' };
  });
}
export function effectiveAllergies(profile: HouseholdProfile): { ids: string[]; unresolved: boolean } {
  const entries = profile.members?.flatMap(member => member.allergies) ?? [];
  const ids = [...new Set([...profile.allergies, ...entries.filter(a => a.status === 'confirmed').map(a => a.canonicalId).filter((id): id is string => !!id)].map(id => id.toLowerCase()))];
  return { ids, unresolved: entries.some(a => a.status !== 'confirmed') };
}
export function effectiveRules(profile: HouseholdProfile): string[] {
  return [...new Set([...profile.dietaryRestrictions, ...(profile.members?.flatMap(member => member.rules) ?? [])])];
}
