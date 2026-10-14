'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { IconArrowRight, IconBasket, IconChefHat, IconClock, IconDeviceFloppy, IconHeartHandshake, IconLeaf, IconPlus, IconShoppingBag, IconUsers, IconWallet } from '@tabler/icons-react';
import { ingredients } from '@/lib/demo-data';
import { GUEST_STORAGE_KEY, guestKitchenSchema, guestProfile, kitchenMeals, measuredPantry, resolveKitchenFood, sampleKitchen, type KitchenFood } from '@/lib/guest-kitchen';
import { recommendBasket } from '@/lib/recommendations';
import { formatMoney, valuePrices } from '@/lib/value-prices';
import { foodResources } from '@/lib/resources';
import type { Equipment, FoodState, HouseholdProfile, Unit } from '@/lib/domain';
import { NumberField } from './number-field';
import { FoodPreferences } from './food-preferences';

export function GuestKitchen() {
  const [started,setStarted]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [profile,setProfile]=useState<HouseholdProfile>(guestProfile);
  const [foods,setFoods]=useState<KitchenFood[]>([]);
  const [view,setView]=useState<'kitchen'|'meals'|'help'>('kitchen');
  const [label,setLabel]=useState('');
  const [amount,setAmount]=useState('');
  const [unit,setUnit]=useState<Unit>('g');
  const [foodState,setFoodState]=useState<FoodState>('ready-to-eat');
  const [storage,setStorage]=useState<KitchenFood['storage']>('pantry');
  const [bestBy,setBestBy]=useState('');
  const [editing,setEditing]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const [saveError,setSaveError]=useState('');
  const [clearConfirm,setClearConfirm]=useState(false);
  const [checked,setChecked]=useState<string[]>([]);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    try { const raw=localStorage.getItem(GUEST_STORAGE_KEY);if(raw){const saved=guestKitchenSchema.safeParse(JSON.parse(raw));if(saved.success){setProfile(saved.data.profile);setFoods(saved.data.foods);setStarted(true);}else setNotice('Saved information could not be restored. You can start again.');} }
    catch {setSaveError('Browser saving is unavailable. You can still plan during this visit.');}
    setLoaded(true);
  },[]);
  useEffect(()=>{
    if(!loaded||!started)return;
    try { localStorage.setItem(GUEST_STORAGE_KEY,JSON.stringify({version:1,profile,foods}));setSaveError(''); }
    catch {setSaveError('Changes could not be saved in this browser. Keep this page open while planning.');}
  },[loaded,started,profile,foods]);
  const matches=started?kitchenMeals(profile,foods):[];
  const basket=started?recommendBasket(profile,measuredPantry(foods)):null;
  function go(next:typeof view){setView(next);setChecked([]);window.scrollTo({top:0,behavior:'instant'});}
  function chooseFood(text:string){setLabel(text);const id=resolveKitchenFood(text);const food=ingredients.find(item=>item.id===id);if(food){setUnit(food.baseUnit);setFoodState(id==='oats'||id==='rice'&&text.trim().toLowerCase()==='rice'?'dry':['banana','carrot'].includes(id!)?'raw':'ready-to-eat');}}
  function submit(event:FormEvent){event.preventDefault();const name=label.trim();const quantity=amount.trim()?Number(amount):undefined;
    if(!name||name.length>80){setNotice('Enter a food name up to 80 characters.');return;}
    if(quantity!==undefined&&(!Number.isFinite(quantity)||quantity<=0||quantity>100000)){setNotice('Enter a measured amount greater than zero, or leave it blank.');return;}
    if(!editing&&foods.length>=100){setNotice('Review your pantry before adding more food.');return;}
    const food:KitchenFood={id:editing??crypto.randomUUID(),label:name,ingredientId:resolveKitchenFood(name),quantity,unit:unit as KitchenFood['unit'],foodState,storage,...(bestBy?{bestByDate:bestBy}:{})};
    setFoods(current=>editing?current.map(item=>item.id===editing?food:item):[...current,food]);setEditing(null);setLabel('');setAmount('');setBestBy('');setNotice(`${name} ${editing?'updated':'added'}.`);setChecked([]);input.current?.focus();
  }
  function edit(food:KitchenFood){setLabel(food.label);setAmount(food.quantity?String(food.quantity):'');setUnit(food.unit);setFoodState(food.foodState);setStorage(food.storage);setBestBy(food.bestByDate??'');setEditing(food.id);input.current?.focus();}
  function printMeals(){const details=Array.from(document.querySelectorAll<HTMLDetailsElement>('.kitchen-app details'));const states=details.map(detail=>detail.open);details.forEach(detail=>{detail.open=true;});window.addEventListener('afterprint',()=>details.forEach((detail,index)=>{detail.open=states[index];}),{once:true});window.print();}
  function clear(){try{localStorage.removeItem(GUEST_STORAGE_KEY);}catch{setSaveError('Browser storage could not be cleared. Clear site data in your browser settings.');return;}setFoods([]);setProfile(guestProfile());setStarted(false);setView('kitchen');setEditing(null);setLabel('');setAmount('');setNotice('Your saved kitchen information was cleared.');setClearConfirm(false);setChecked([]);}
  const budgetControls = <>
    <div className="budget-fields">
      <NumberField live label="Weekly grocery budget (USD)" decimal value={profile.weeklyBudgetCents / 100} onChange={value => setProfile(current => ({...current, weeklyBudgetCents: Math.round(value * 100)}))} />
      <NumberField live label="People eating" min={1} max={20} value={profile.householdSize} onChange={value => setProfile(current => ({...current, householdSize: value}))} />
    </div>
    <fieldset><legend>Available equipment</legend><div className="chips">
      {(['microwave', 'refrigerator', 'stovetop', 'oven', 'freezer'] as Equipment[]).map(item => <label className="check-chip" key={item}>
        <input type="checkbox" checked={profile.equipment.includes(item)} onChange={() => setProfile(current => ({...current, equipment: current.equipment.includes(item) ? current.equipment.filter(value => value !== item) : [...current.equipment, item]}))} />{item}
      </label>)}
    </div><small>Leave cooking appliances unchecked for no-cook ideas.</small></fieldset>
  </>;
  const addSample = () => {
    setFoods(current => [...current, ...sampleKitchen().filter(sample => !current.some(food => food.ingredientId === sample.ingredientId)).map(sample => ({...sample, id: crypto.randomUUID()}))]);
    setNotice('Sample amounts added. Check them against your own kitchen before shopping.');
  };
  return <div className="app-shell kitchen-app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="header">
      <button className="brand brand-button" onClick={() => go('kitchen')}>Healthy Steps<span className="brand-tagline">A little planning. A better mealtime.</span></button>
      {started ? <nav className="simple-nav" aria-label="Main navigation">
        {([['kitchen', 'My Kitchen', IconBasket], ['meals', 'Meal Ideas', IconChefHat], ['help', 'Find Food Help', IconHeartHandshake]] as const).map(([id, name, Icon]) => <button key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'active' : ''} onClick={() => go(id)}><Icon size={19} aria-hidden="true" />{name}</button>)}
      </nav> : <span className="header-note">Made for everyday family meals</span>}
    </header>
    <main id="main-content" tabIndex={-1}>
      {!started ? <>
        <section className="guest-hero">
          <div className="hero-copy">
            <span className="eyebrow">Your family. Your kitchen.</span>
            <h1>Good meals from<br />what you have.</h1>
            <p>Turn your pantry and grocery budget into simple meal ideas your family can enjoy.</p>
            <div className="hero-actions"><button className="button" onClick={() => setStarted(true)}>Try Meal Planner<IconArrowRight size={20} aria-hidden="true" /></button><button className="text-button" onClick={() => {setFoods(sampleKitchen()); setStarted(true);}}>Try a sample pantry</button></div>
            <small>No account needed. Your kitchen stays in this browser.</small>
          </div>
          <div className="hero-photo"><Image src="/images/kitchen-table.png" alt="A home kitchen table with a bean, corn and rice bowl, banana oats, and carrots" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 55vw" loading="eager" fetchPriority="high" /><p>Everyday ingredients.<br /><strong>A place to start.</strong></p></div>
        </section>
        <section className="kitchen-how" aria-label="How meal planning works"><div><IconBasket size={26} aria-hidden="true" /><span><strong>Start in your pantry</strong><small>Add the foods you already have.</small></span></div><div><IconWallet size={26} aria-hidden="true" /><span><strong>Make room for your budget</strong><small>Choose what works for your family.</small></span></div><div><IconChefHat size={26} aria-hidden="true" /><span><strong>Find your next meal</strong><small>Get ideas and a simple grocery list.</small></span></div></section>
      </> : <>
        <div className="guest-storage-note"><span><IconDeviceFloppy size={16} aria-hidden="true" />Saved on this device. Anyone using this browser can see your kitchen settings.</span><button className="text-button" onClick={() => setClearConfirm(true)}>Clear my information</button></div>
        {clearConfirm && <section className="panel" aria-label="Clear saved information"><h2>Clear this kitchen?</h2><p>This removes the pantry, budget and food settings saved in this browser.</p><div className="actions"><button className="button danger" onClick={clear}>Clear my information now</button><button className="button secondary" onClick={() => setClearConfirm(false)}>Keep my kitchen</button></div></section>}
        {view === 'kitchen' && <>
          <div className="kitchen-welcome"><div className="page-heading"><h1>What's in your<br />kitchen today?</h1><p>Add what you have. Find something good to make.</p></div><Image src="/images/kitchen-table.png" alt="Simple pantry ingredients made into a family meal" width={1536} height={1024} sizes="(max-width: 650px) 100vw, 360px" /></div>
          <div className="kitchen-columns">
            <section className="panel pantry-panel">
              <div className="panel-heading"><span className="section-icon"><IconBasket size={24} aria-hidden="true" /></span><div><h2>{editing ? 'Edit food' : 'Add foods I have'}</h2><p>Your pantry, fridge, and freezer all count.</p></div></div>
              <form onSubmit={submit}>
                <label>Food name<input ref={input} list="kitchen-foods" required maxLength={80} value={label} onChange={event => chooseFood(event.target.value)} placeholder="Rice, canned beans, or another food" /></label>
                <datalist id="kitchen-foods">{ingredients.map(item => <option key={item.id} value={item.name} />)}</datalist>
                <div className="form-grid pantry-amount"><label>Amount <span className="optional">Optional</span><input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Leave blank if unsure" /></label><label>Unit<select value={unit} onChange={event => setUnit(event.target.value as Unit)}>{['g', 'kg', 'oz', 'lb', 'each'].map(value => <option key={value}>{value}</option>)}</select></label></div>
                <details className="kitchen-disclosure"><summary>Storage and preparation</summary><label>Preparation<select value={foodState} onChange={event => setFoodState(event.target.value as FoodState)}><option value="ready-to-eat">Ready to eat / canned / rice pouch</option><option value="dry">Dry / uncooked</option><option value="raw">Raw / fresh</option><option value="cooked">Cooked</option></select></label><label>Stored in<select value={storage} onChange={event => setStorage(event.target.value as KitchenFood['storage'])}><option value="pantry">Pantry</option><option value="fridge">Fridge</option><option value="freezer">Freezer</option></select></label><label>Use soon / best-by date<input type="date" value={bestBy} onChange={event => setBestBy(event.target.value)} /></label><small>Dates do not establish food safety. Canned quantities are measured after draining. Dry rice and ready-to-eat rice are counted separately.</small></details>
                <div className="actions"><button className="button" type="submit"><IconPlus size={19} aria-hidden="true" />{editing ? 'Save food' : 'Add food'}</button>{editing && <button type="button" className="text-button" onClick={() => {setEditing(null); setLabel(''); setAmount('');}}>Cancel edit</button>}</div>
              </form>
              <div className="pantry-summary"><div className="pantry-summary-heading"><h3>Your pantry</h3><span className="count-pill">{foods.length} {foods.length === 1 ? 'food' : 'foods'}</span></div>
                {foods.length ? <ul className="pantry-list">{foods.map(food => <li key={food.id}><div><strong>{food.label}</strong><small>{food.quantity ? `${food.quantity} ${food.unit}` : 'Amount not entered'} · {food.storage}{food.bestByDate ? ` · Use soon: ${food.bestByDate}` : ''}</small>{(!food.ingredientId || !food.quantity) && <small>Saved for your reference. Matching needs a catalog food and measured amount.</small>}</div><div className="pantry-item-actions"><button className="text-button" aria-label={`Edit ${food.label}`} onClick={() => edit(food)}>Edit</button><button className="text-button" aria-label={`Remove ${food.label}`} onClick={() => setFoods(current => current.filter(item => item.id !== food.id))}>Remove</button></div></li>)}</ul> : <div className="pantry-empty"><IconLeaf size={30} aria-hidden="true" /><p>A good meal starts with what you have.</p><small>Add your first food, or explore with our sample pantry.</small></div>}
                <button className="text-button" onClick={addSample}>Add sample pantry<IconArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </section>
            <aside><section className="panel kitchen-budget">
              <div className="panel-heading"><span className="section-icon"><IconWallet size={24} aria-hidden="true" /></span><div><h2>What works for your family?</h2><p>A few details to make the ideas fit.</p></div></div>
              {budgetControls}
              <details className="kitchen-disclosure"><summary>Allergies and family food needs</summary><p>Optional caregiver settings. Check product labels and cross-contact before cooking.</p><FoodPreferences profile={profile} onChange={setProfile} /></details>
              <button className="button full-width" onClick={() => go('meals')}>Find meals<IconArrowRight size={20} aria-hidden="true" /></button><small className="basket-scope-note">The suggested basket covers up to three meals, rather than a complete weekly diet.</small>
            </section><button className="food-help-link" onClick={() => go('help')}><IconHeartHandshake size={25} aria-hidden="true" /><span><strong>A little extra support?</strong><small>Find food resources near you.</small></span><IconArrowRight size={18} aria-hidden="true" /></button></aside>
          </div>
        </>}
        {view === 'meals' && <>
          <div className="page-heading meal-heading"><h1>A few useful meals.</h1><p>Ideas that start with your kitchen and make room for your budget.</p><div className="meal-context"><span><IconWallet size={18} aria-hidden="true" />{formatMoney(profile.weeklyBudgetCents)} for additions</span><span><IconUsers size={18} aria-hidden="true" />{profile.householdSize} people</span><button className="text-button" onClick={() => go('kitchen')}>Edit pantry and budget</button></div><small>These prototype recipes are unreviewed; check labels and preparation. Images are illustrative.</small></div>
          {!matches.length && <section className="panel"><h2>Let's check your food settings.</h2><p>No current recipe fits all your restrictions and equipment. Keep your restrictions, clarify any pending allergy entries, or explore food support.</p><button className="button secondary" onClick={() => go('help')}>Find food support</button></section>}
          {([['now', 'Make it now'], ['extras', 'Just 1–2 extra items'], ['later', 'Plan for later']] as const).map(([group, title]) => <section className={`kitchen-meal-group meal-group-${group}`} key={group}><div className="meal-group-heading"><h2>{title}</h2><span className="count-pill">{matches.filter(item => item.group === group).length} {matches.filter(item => item.group === group).length === 1 ? 'idea' : 'ideas'}</span></div>
            {matches.some(item => item.group === group) ? <div className="recipe-grid">{matches.filter(item => item.group === group).map(({match, plan}) => <article className="recipe-card" key={match.recipe.id}>
              <Image className="recipe-photo" src={`/images/${match.recipe.id}.png`} alt={`Illustrative serving of ${match.recipe.title.toLowerCase()}`} width={1254} height={1254} sizes="(max-width: 650px) 100vw, (max-width: 1100px) 50vw, 33vw" />
              <div className="recipe-body"><div className="recipe-topline"><span>{match.recipe.mealTypes.join(' / ')}</span><span><IconClock size={15} aria-hidden="true" />{match.recipe.prepMinutes + match.recipe.cookMinutes} min</span></div>
              <h3>{match.recipe.title}</h3><p>{match.recipe.equipment.join(', ') || 'No cooking equipment'}</p><div className="recipe-facts"><span>{profile.householdSize} servings</span><span>{match.recipe.ingredients.length - plan.shoppingItems.length} pantry ingredients</span></div>
              <strong className="recipe-cost">{!plan.shoppingItems.length ? 'No new grocery cost' : plan.budget.missingPriceCount || plan.budget.stalePriceCount ? 'Price not verified' : `${formatMoney(plan.budget.totalCents)} estimated additions`}</strong>{plan.budget.totalCents > profile.weeklyBudgetCents && <small>Above your current budget.</small>}
              <details><summary>View steps</summary><h4>Ingredients for your family</h4><ul>{match.recipe.ingredients.map(part => <li key={part.ingredientId}>{Number((part.quantity * profile.householdSize / match.recipe.yieldServings).toFixed(1))} {part.unit} {ingredients.find(food => food.id === part.ingredientId)?.name}{plan.shoppingItems.some(item => item.ingredientId === part.ingredientId) ? ' · Buy or top up' : ' · Use from pantry'}</li>)}</ul><ol>{match.recipe.steps.map(step => <li key={step}>{step}</li>)}</ol><small>Steps describe {match.recipe.yieldServings} original servings. Scale quantities shown above. {match.recipe.provenance}</small></details>
              </div>
            </article>)}</div> : <p className="empty-note">{group === 'now' ? 'No complete recipe from the measured pantry yet. Add foods or check the extra-item ideas.' : group === 'extras' ? 'No meal currently needs just one or two affordable additions.' : 'No larger-shop ideas with your current settings.'}</p>}
          </section>)}
          <section className="panel kitchen-groceries"><div className="panel-heading"><span className="section-icon"><IconShoppingBag size={24} aria-hidden="true" /></span><div><h2>Your suggested grocery list</h2><p>A short list to bring these meals together.</p></div></div>
            {basket?.plan ? <><p>{basket.message}</p><div className="basket-summary"><div><span>Estimated additions</span><strong>{formatMoney(basket.plan.budget.totalCents)}</strong></div><div><span>Budget remaining</span><strong>{formatMoney(basket.plan.budget.remainingBudgetCents ?? 0)}</strong></div><div><span>Pantry foods used</span><strong>{basket.pantryUse.length} · $0 new</strong></div></div><p>For: {basket.selected.map(item => item.recipe.title).join('; ')}.</p>
              <ul className="result-list">{basket.plan.shoppingItems.map(item => {const price = valuePrices.find(row => row.id === item.priceObservationId); return <li key={item.ingredientId}><label className="shopping-check"><input type="checkbox" checked={checked.includes(item.ingredientId)} onChange={() => setChecked(current => current.includes(item.ingredientId) ? current.filter(id => id !== item.ingredientId) : [...current, item.ingredientId])} /><span>{item.name}<small>{item.packageCount} × {price?.packageLabel} · {price?.retailer}</small>{price && <a href={price.sourceUrl} target="_blank" rel="noopener noreferrer">Reference checked {price.observedAt}</a>}</span></label><strong>{formatMoney(item.purchaseCostCents ?? 0)}</strong></li>;})}</ul>
              {!basket.plan.shoppingItems.length && <p>Nothing to buy for these meal ideas.</p>}<small>Whole-package estimates. Local prices, availability and fees may differ. Individual meal costs cannot be added together because pantry food and packages overlap.</small>
            </> : <p>{basket?.message}</p>}
            <div className="actions"><button className="button secondary" onClick={printMeals}>Print meals and list</button><button className="button secondary" onClick={() => go('help')}>Find food support</button></div>
          </section>
        </>}
        {view === 'help' && <section id="food-help"><div className="page-heading"><h1>Support for your next meal.</h1><p>Use the official locators to search by ZIP. No precise location permission is needed here. Call providers before traveling.</p></div><div className="resource-grid">{foodResources.map(resource => <article className="resource-card" key={resource.id}><IconHeartHandshake className="resource-icon" size={30} aria-hidden="true" /><span className="eyebrow">{resource.publisher}</span><h2>{resource.title}</h2><p>{resource.description}</p><div className="actions"><a className="button secondary" href={resource.url} target="_blank" rel="noopener noreferrer">Open resource<IconArrowRight size={17} aria-hidden="true" /></a>{resource.phone && <a className="button" href={`tel:${resource.phone}`}>Call {resource.phone}</a>}</div></article>)}</div></section>}
      </>}
      {notice && <p role="status" className="form-feedback">{notice}</p>}{saveError && <p role="alert" className="form-feedback">{saveError}</p>}
    </main>
    <footer><span className="brand">Healthy Steps</span><p>More meals from what you have.</p><small>Meal ideas support everyday planning, not individualized medical care.</small></footer>
  </div>;
}
