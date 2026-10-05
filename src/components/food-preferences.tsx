'use client';
import { useState } from 'react';
import { AllergyPicker } from './allergy-picker';
import { NumberField } from './number-field';
import { proposeAllergies } from '@/lib/food-settings';
import { ingredients } from '@/lib/demo-data';
import type { HouseholdProfile, MemberFoodSettings, FoodRule, NutrientInterest } from '@/lib/domain';

const dietOptions: [FoodRule, string][] = [['vegetarian','Vegetarian'],['vegan','Vegan'],['pescatarian','Pescatarian'],['exclude_pork','No pork'],['exclude_beef','No beef'],['dairy_free','Dairy-free'],['gluten_free','Gluten-free']];
const toggle = <T,>(items: T[], item: T) => items.includes(item) ? items.filter(value => value !== item) : [...items, item];

export function FoodPreferences({ profile, onChange }: { profile: HouseholdProfile; onChange: (profile: HouseholdProfile) => void }) {
  const member = profile.members![0];
  const [allergy, setAllergy] = useState('');
  const [error, setError] = useState('');
  function update(changes: Partial<MemberFoodSettings>) { onChange({ ...profile, members: [{ ...member, ...changes }] }); }
  function selectAllergy(id: string, label: string) {
    if (member.allergies.length >= 20 && !member.allergies.some(item => item.canonicalId === id)) { setError('Please review your existing allergies before adding another.'); return; }
    update({ allergies: [...member.allergies.filter(item => item.canonicalId !== id), { rawText: label, canonicalId: id, status: 'confirmed' }], noKnownAllergies: false });
    setAllergy(''); setError('');
  }
  return <div className="food-preferences">
    <fieldset><legend>Food allergies</legend><p className="muted">Choose every allergy that applies. These always come before price.</p>
      <div className="preference-allergy"><AllergyPicker value={allergy} onChange={setAllergy} onSelect={selectAllergy} /><button type="button" className="button secondary" disabled={!allergy.trim()} onClick={() => { const proposed = proposeAllergies(allergy); if (!proposed.length) return; update({ allergies: [...member.allergies, ...proposed].slice(0,20), noKnownAllergies: false }); setAllergy(''); }}>Add another food</button></div>
      <div className="chips">{member.allergies.map((item,index) => <span className="saved-chip" key={`${item.rawText}-${index}`}>{item.rawText}{item.status !== 'confirmed' && <><small>Choose the exact named food in the menu to confirm, or clarify it with your care team.</small>{item.canonicalId && <button type="button" onClick={() => selectAllergy(item.canonicalId!, item.rawText)}>Confirm {item.canonicalId}</button>}</>}<button type="button" aria-label={`Remove allergy ${item.rawText}`} onClick={() => update({ allergies: member.allergies.filter((_,i) => i !== index) })}>Remove</button></span>)}</div>
      <label className="check-line"><input type="checkbox" checked={member.noKnownAllergies} onChange={event => update({ noKnownAllergies: event.target.checked, allergies: event.target.checked ? [] : member.allergies })} />I have no known food allergies</label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </fieldset>
    <fieldset><legend>How do you eat? <span className="optional">Optional</span></legend><div className="chips">{dietOptions.map(([id,label]) => <button type="button" className={member.rules.includes(id) ? 'preference selected' : 'preference'} aria-pressed={member.rules.includes(id)} key={id} onClick={() => update({ rules: toggle(member.rules,id) })}>{label}</button>)}</div></fieldset>
    <div className="form-grid"><label>Foods you enjoy <span className="optional">Optional</span><input value={member.likes.join(', ')} onChange={event => update({ likes: event.target.value.split(',').slice(0,30) })} placeholder="Rice, beans, crunchy vegetables" /></label><label>Foods you prefer to skip <span className="optional">Optional</span><input value={member.dislikes.join(', ')} onChange={event => update({ dislikes: event.target.value.split(',').slice(0,30) })} placeholder="Separate foods with commas" /></label></div>
    <details><summary>Kitchen, exclusions and other food needs</summary>
      <div className="form-grid"><NumberField label="People you are cooking for" value={profile.householdSize} min={1} max={20} onChange={value => onChange({ ...profile, householdSize: value })} /><NumberField label="Minutes available per meal" value={profile.maxCookingMinutes} min={1} max={240} onChange={value => onChange({ ...profile, maxCookingMinutes: value })} /></div>
      <fieldset><legend>Your kitchen equipment</legend><div className="chips">{(['microwave','refrigerator','stovetop','oven','freezer','air-fryer','kettle'] as const).map(item => <label className="check-chip" key={item}><input type="checkbox" checked={profile.equipment.includes(item)} onChange={() => onChange({ ...profile, equipment: toggle(profile.equipment,item) })} />{item}</label>)}</div></fieldset>
      <fieldset><legend>Other ingredients to avoid</legend><div className="chips">{ingredients.map(item => <label className="check-chip" key={item.id}><input type="checkbox" checked={profile.excludedIngredientIds.includes(item.id)} onChange={() => onChange({ ...profile, excludedIngredientIds: toggle(profile.excludedIngredientIds,item.id) })} />{item.name}</label>)}</div></fieldset>
      <fieldset><legend>Existing care-team restrictions <span className="optional">Optional</span></legend><div className="chips">{(['celiac','type_1_diabetes','type_2_diabetes'] as FoodRule[]).map(item => <label className="check-chip" key={item}><input type="checkbox" checked={member.rules.includes(item)} onChange={() => update({ rules: toggle(member.rules,item) })} />{item.replaceAll('_',' ')}</label>)}</div><p className="muted">Only record restrictions you already follow. This app does not set carbohydrate targets or medication doses.</p><label className="check-line"><input type="checkbox" checked={!!member.medicalConsent} onChange={event => update({ medicalConsent: event.target.checked })} />I agree to store the health-related food settings I choose to enter.</label></fieldset>
      <fieldset><legend>Nutrients you are interested in <span className="optional">Optional</span></legend><div className="chips">{(['protein','iron','fiber','vitamin_d','vitamin_b12'] as NutrientInterest['nutrientId'][]).map(id => <label className="check-chip" key={id}><input type="checkbox" checked={member.nutrients.some(item => item.nutrientId === id)} onChange={event => update({ nutrients: event.target.checked ? [...member.nutrients, { nutrientId: id, reason: 'food_ideas', caregiverReported: false, reviewStatus: 'pending_confirmation' }] : member.nutrients.filter(item => item.nutrientId !== id) })} />{id.replaceAll('_',' ')}</label>)}</div></fieldset>
    </details>
  </div>;
}
