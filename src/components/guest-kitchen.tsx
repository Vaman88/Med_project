'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { MealPhoto } from './meal-photo';
import { CloudAccount } from './cloud-account';
import { browserCloud, cloudConfigured } from '@/lib/cloud';
import type { User } from '@supabase/supabase-js';
import { IconArrowRight, IconBasket, IconChefHat, IconClock, IconDeviceFloppy, IconHeartHandshake, IconPlus, IconSearch, IconSettings, IconShoppingBag, IconUsers, IconWallet, IconX } from '@tabler/icons-react';
import { RecipeLibrary } from './recipe-library';
import { ingredients } from '@/lib/demo-data';
import { GUEST_STORAGE_KEY, formatAmount, guestKitchenSchema, guestProfile, isPantryBasic, kitchenMeals, typicalAmount, type FoodUse, measuredPantry, resolveKitchenFood, sampleKitchen, typedFoodDefaults, type KitchenFood } from '@/lib/guest-kitchen';
import { recommendBasket } from '@/lib/recommendations';
import { formatMoney, valuePrices } from '@/lib/value-prices';
import { foodResources } from '@/lib/resources';
import type { Equipment, FoodState, HouseholdProfile, Unit } from '@/lib/domain';
import { NumberField } from './number-field';
import { FoodPreferences } from './food-preferences';
import { FoodAutocomplete } from './food-autocomplete';
import type { CatalogFood } from '@/lib/food-catalog';

type GuestKitchenProps = { storageKey?: string; initialKitchen?: {profile:HouseholdProfile;foods:KitchenFood[]} };
export function GuestKitchen(props: GuestKitchenProps = {}) {
  const allowCloud = cloudConfigured && !props.initialKitchen;
  const [user, setUser] = useState<User | null | undefined>(allowCloud ? undefined : null);
  useEffect(() => {
    if (!allowCloud) return;
    const client = browserCloud();
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (active) setUser(session?.user ?? null);
    });
    void client.auth.getSession().then(({ data }) => {
      if (active && !authEventReceived) setUser(data.session?.user ?? null);
    }).catch(() => { if (active && !authEventReceived) setUser(null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [allowCloud]);
  if (user === undefined) return <div className="cloud-account-loading" role="status">Opening your kitchen…</div>;
  return <GuestKitchenView key={user?.id ?? 'guest'} {...props} initialKitchen={user ? undefined : props.initialKitchen} user={user} />;
}

function GuestKitchenView({ storageKey = GUEST_STORAGE_KEY, initialKitchen, user }: GuestKitchenProps & { user: User | null }) {
  const [started,setStarted]=useState(!!initialKitchen || !!user);
  const [loaded,setLoaded]=useState(false);
  const [profile,setProfile]=useState<HouseholdProfile>(initialKitchen?.profile??guestProfile);
  const [foods,setFoods]=useState<KitchenFood[]>(initialKitchen?.foods??[]);
  const [view,setView]=useState<'kitchen'|'meals'|'recipes'|'help'>('kitchen');
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
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
  const [picked,setPicked]=useState<CatalogFood|null>(null);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    if(user){setLoaded(true);return;}
    try { const raw=localStorage.getItem(storageKey);if(raw){const saved=guestKitchenSchema.safeParse(JSON.parse(raw));if(saved.success){setProfile(saved.data.profile);setFoods(saved.data.foods);setStarted(true);}else setNotice('Saved information could not be restored. You can start again.');} }
    catch {setSaveError('Browser saving is unavailable. You can still plan during this visit.');}
    setLoaded(true);
  },[storageKey,user]);
  useEffect(()=>{
    if(user||!loaded||!started)return;
    try { localStorage.setItem(storageKey,JSON.stringify({version:1,profile,foods}));setSaveError(''); }
    catch {setSaveError('Changes could not be saved in this browser. Keep this page open while planning.');}
  },[loaded,started,profile,foods,storageKey,user]);
  useEffect(()=>{if(!notice)return;const timer=window.setTimeout(()=>setNotice(''),5000);return()=>window.clearTimeout(timer);},[notice]);
  const matches=started?kitchenMeals(profile,foods):[];
  const groupRank={now:0,extras:1,later:2} as const;
  const picks=[...matches].sort((a,b)=>groupRank[a.group]-groupRank[b.group]).slice(0,3);
  const pantryLabels=foods.map(food=>food.label);
  const knownLabels=foods.filter(food=>food.ingredientId).map(food=>food.label);
  const pantryAmounts=foods.map(food=>({label:food.label,quantity:food.quantity,unit:food.unit}));
  const hour=new Date().getHours();
  const greeting=hour<11?'Good morning':hour<16?'Good afternoon':'Good evening';
  const basket=started?recommendBasket(profile,measuredPantry(foods)):null;
  function go(next:typeof view){setView(next);setChecked([]);window.scrollTo({top:0,behavior:'instant'});}
  function pickFood(item:CatalogFood){setPicked(item);setLabel(item.label);setUnit(item.unit);setFoodState(item.foodState);setStorage(item.storage);}
  function chooseFood(text:string){setLabel(text);setPicked(null);const id=resolveKitchenFood(text);const food=ingredients.find(item=>item.id===id);const defaults=typedFoodDefaults(text);if(defaults){setUnit(defaults.unit);setFoodState(defaults.foodState);setStorage(defaults.storage);}else if(food){setUnit(food.baseUnit);setFoodState(id==='oats'?'dry':['banana','carrot'].includes(id!)?'raw':'ready-to-eat');}}
  function submit(event:FormEvent){event.preventDefault();const name=label.trim();const quantity=amount.trim()?Number(amount):undefined;
    if(!name||name.length>80){setNotice('Enter a food name up to 80 characters.');return;}
    if(quantity!==undefined&&(!Number.isFinite(quantity)||quantity<=0||quantity>100000)){setNotice('Enter a measured amount greater than zero, or leave it blank.');return;}
    if(!editing&&foods.length>=100){setNotice('Review your pantry before adding more food.');return;}
    const food:KitchenFood={id:editing??crypto.randomUUID(),label:name,ingredientId:(picked&&picked.label===name?picked.ingredientId:undefined)??resolveKitchenFood(name),quantity,unit:unit as KitchenFood['unit'],foodState,storage,...(bestBy?{bestByDate:bestBy}:{})};
    setFoods(current=>editing?current.map(item=>item.id===editing?food:item):[...current,food]);setEditing(null);setPicked(null);setLabel('');setAmount('');setBestBy('');setNotice(`${name} ${editing?'updated':'added'}.`);setChecked([]);input.current?.focus();
  }
  function edit(food:KitchenFood){setPicked(null);setLabel(food.label);setAmount(food.quantity?String(food.quantity):'');setUnit(food.unit);setFoodState(food.foodState);setStorage(food.storage);setBestBy(food.bestByDate??'');setEditing(food.id);input.current?.focus();}
  function printMeals(){const details=Array.from(document.querySelectorAll<HTMLDetailsElement>('.kitchen-app details'));const states=details.map(detail=>detail.open);details.forEach(detail=>{detail.open=true;});window.addEventListener('afterprint',()=>details.forEach((detail,index)=>{detail.open=states[index];}),{once:true});window.print();}
  function clear(){try{if(!user)localStorage.removeItem(storageKey);}catch{setSaveError('Browser storage could not be cleared. Clear site data in your browser settings.');return;}setFoods([]);setProfile(guestProfile());setStarted(!!user);setView('kitchen');setEditing(null);setLabel('');setAmount('');setNotice(user ? 'Current kitchen cleared. Your online save is unchanged until you choose Save online.' : 'Your saved kitchen information was cleared.');setClearConfirm(false);setChecked([]);}
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
        {([['kitchen', 'My Kitchen', IconBasket], ['meals', 'Meal Ideas', IconChefHat], ['recipes', 'Recipes', IconSearch], ['help', 'Find Food Help', IconHeartHandshake]] as const).map(([id, name, Icon]) => <button key={id} aria-current={view === id ? 'page' : undefined} className={view === id ? 'active' : ''} onClick={() => go(id)}><Icon size={19} aria-hidden="true" />{name}</button>)}
      </nav> : <span className="header-note">Made for everyday family meals</span>}
      {started && !initialKitchen && <button type="button" className="header-settings" aria-expanded={accountOpen} aria-controls="kitchen-account" onClick={() => setAccountOpen(open => !open)}><IconSettings size={19} aria-hidden="true" /><span>Account</span></button>}
    </header>
    <main id="main-content" tabIndex={-1}>
      {!initialKitchen && (!started || accountOpen) && <div id="kitchen-account"><CloudAccount user={user} kitchen={{version:1,profile,foods}} storageKey={storageKey} onLoad={saved => {setProfile(saved.profile);setFoods(saved.foods);setStarted(true);setEditing(null);setPicked(null);setLabel('');setAmount('');setChecked([]);setView('kitchen');}} /></div>}
      {!started ? <>
        <section className="guest-hero">
          <div className="hero-copy">
            <span className="eyebrow">Your family. Your kitchen.</span>
            <h1>Good meals from<br />what you have.</h1>
            <p>Turn your pantry and grocery budget into simple meal ideas your family can enjoy.</p>
            <div className="hero-actions"><button className="button" onClick={() => setStarted(true)}>Try Meal Planner<IconArrowRight size={20} aria-hidden="true" /></button><button className="text-button" onClick={() => {setFoods(sampleKitchen()); setStarted(true);}}>Try a sample pantry</button></div>
            <small>No account needed. Your kitchen stays in this browser.</small>
          </div>
          <div className="hero-photo"><Image src="/images/adult/kitchen-table.jpg" alt="A home kitchen table with a bean, corn and rice bowl, banana oats, and carrots" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 55vw" loading="eager" fetchPriority="high" /><p>Everyday ingredients.<br /><strong>A place to start.</strong></p></div>
        </section>
        <section className="kitchen-how" aria-label="How meal planning works"><div><IconBasket size={26} aria-hidden="true" /><span><strong>Start in your pantry</strong><small>Add the foods you already have.</small></span></div><div><IconWallet size={26} aria-hidden="true" /><span><strong>Make room for your budget</strong><small>Choose what works for your family.</small></span></div><div><IconChefHat size={26} aria-hidden="true" /><span><strong>Find your next meal</strong><small>Get ideas and a simple grocery list.</small></span></div></section>
      </> : <>
        {view === 'kitchen' && <>
          <section className="welcome-hero" aria-labelledby="welcome-title">
            <span className="eyebrow">{greeting}</span>
            <h1 id="welcome-title">What's in your <em>kitchen</em> today?</h1>
            <p>Add what you have. We’ll find something good to make.</p>
            <form className="welcome-add" onSubmit={submit}>
              <FoodAutocomplete label="Food name" inputRef={input} value={label} onTextChange={chooseFood} onPick={pickFood} placeholder="Type a food — rice, chicken, black beans…" />
              <label className="welcome-amount"><span className="visually-hidden">Amount (optional)</span><input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Amount" /></label>
              <label className="welcome-unit"><span className="visually-hidden">Unit</span><select value={unit} onChange={event => setUnit(event.target.value as Unit)}>{['g', 'kg', 'oz', 'lb', 'each'].map(value => <option key={value}>{value}</option>)}</select></label>
              <button className="button" type="submit"><IconPlus size={18} aria-hidden="true" />{editing ? 'Save food' : 'Add food'}</button>
            </form>
            <details className="welcome-more" open={!!editing || undefined}><summary>Storage, preparation and use-by date</summary><div className="welcome-more-grid"><label>Preparation<select value={foodState} onChange={event => setFoodState(event.target.value as FoodState)}><option value="ready-to-eat">Ready to eat / canned / rice pouch</option><option value="dry">Dry / uncooked</option><option value="raw">Raw / fresh</option><option value="cooked">Cooked</option></select></label><label>Stored in<select value={storage} onChange={event => setStorage(event.target.value as KitchenFood['storage'])}><option value="pantry">Pantry</option><option value="fridge">Fridge</option><option value="freezer">Freezer</option></select></label><label>Use soon / best-by date<input type="date" value={bestBy} onChange={event => setBestBy(event.target.value)} /></label></div><small>Dates do not establish food safety. Canned quantities are measured after draining.</small></details>
            {editing && <button type="button" className="text-button" onClick={() => {setEditing(null); setPicked(null); setLabel(''); setAmount('');}}>Cancel edit</button>}
            {foods.length ? <ul className="pantry-list welcome-chips" aria-label="Your pantry">{foods.map(food => <li key={food.id} className={!food.ingredientId ? 'unknown' : undefined} title={!food.ingredientId ? 'We don’t know this food yet, so meal ideas can’t use it.' : undefined}>
              <button type="button" className="chip-main" aria-label={`Edit ${food.label}`} onClick={() => edit(food)}><span>{food.label}</span>{food.quantity ? <small>{food.quantity} {food.unit}</small> : food.ingredientId ? <small title="No amount entered, so meal ideas use a typical package size">≈{formatAmount(typicalAmount(food.ingredientId).quantity, typicalAmount(food.ingredientId).unit)}</small> : null}</button>
              <button type="button" className="chip-remove" aria-label={`Remove ${food.label}`} onClick={() => setFoods(current => current.filter(item => item.id !== food.id))}><IconX size={14} aria-hidden="true" /></button>
            </li>)}</ul> : <p className="welcome-empty">Your kitchen list is empty. Add a food above to get started.</p>}
            {foods.some(food => !food.ingredientId) && <small className="welcome-unknown">Faded foods aren’t recognized yet, so meal ideas can’t use them. Try picking a name from the list.</small>}
            <p className="welcome-stat"><span><strong>{formatMoney(profile.weeklyBudgetCents)}</strong> budget</span><span aria-hidden="true">·</span><span><strong>{profile.householdSize}</strong> {profile.householdSize === 1 ? 'person' : 'people'}</span><span aria-hidden="true">·</span><button type="button" className="text-button" aria-expanded={settingsOpen} aria-controls="welcome-settings" onClick={() => setSettingsOpen(open => !open)}>Change budget and family</button><span aria-hidden="true">·</span><button type="button" className="text-button" onClick={addSample}>Add sample pantry</button></p>
            {settingsOpen && <section id="welcome-settings" className="panel kitchen-budget welcome-settings" aria-label="Budget and family">
              {budgetControls}
              <details className="kitchen-disclosure"><summary>Allergies and family food needs</summary><p>Optional caregiver settings. Check product labels and cross-contact before cooking.</p><FoodPreferences profile={profile} onChange={setProfile} /></details>
              <button type="button" className="button secondary" onClick={() => setSettingsOpen(false)}>Done</button>
            </section>}
          </section>
          <section className="welcome-picks" aria-labelledby="welcome-picks-title">
            <div className="welcome-rowhead"><h2 id="welcome-picks-title">{picks.some(item => item.group === 'now') ? 'You can make these' : 'Closest to ready'}</h2><button type="button" className="text-button" onClick={() => go('meals')}>Find meals<IconArrowRight size={16} aria-hidden="true" /></button></div>
            {picks.length ? <div className="welcome-grid">{picks.map(({match, plan, servingsPossible}) => <button type="button" className="welcome-card" key={match.recipe.id} onClick={() => go('meals')}>
              <MealPhoto id={match.recipe.id} title={match.recipe.title} />
              <span className="welcome-card-meta">{match.recipe.prepMinutes + match.recipe.cookMinutes} min · {profile.householdSize} servings</span>
              <strong>{match.recipe.title}</strong>
              <small>{!plan.shoppingItems.length ? 'Nothing to buy' : servingsPossible >= 1 ? `Makes ${servingsPossible} of ${profile.householdSize} servings with your amounts` : `Needs: ${plan.shoppingItems.map(item => item.name).join(', ')}`}</small>
            </button>)}</div> : <p className="empty-note">Add a few foods and meal ideas will show up here.</p>}
          </section>
          <RecipeLibrary compact pantry={knownLabels} amounts={pantryAmounts} limit={8} onSeeAll={() => go('recipes')} />
        </>}
        {view === 'recipes' && <>
          <div className="page-heading"><h1>Find a recipe.</h1><p>Search by food or dish name. Every recipe comes with a photo, ingredients and step-by-step instructions, and shows which ingredients you already have.</p></div>
          <RecipeLibrary pantry={pantryLabels} amounts={pantryAmounts} />
        </>}
        {view === 'meals' && <>
          <div className="page-heading meal-heading"><h1>A few useful meals.</h1><p>Ideas that start with your kitchen and make room for your budget.</p><div className="meal-context"><span><IconWallet size={18} aria-hidden="true" />{formatMoney(profile.weeklyBudgetCents)} for additions</span><span><IconUsers size={18} aria-hidden="true" />{profile.householdSize} people</span><button className="text-button" onClick={() => go('kitchen')}>Edit pantry and budget</button></div><small>Meal ideas assume you keep pantry basics like cooking oil, salt, pepper and dried spices, and that foods without an amount are enough for one meal. These prototype recipes are unreviewed; check labels and preparation. Images are illustrative.</small></div>
          {!matches.length && <section className="panel"><h2>Let's check your food settings.</h2><p>No current recipe fits all your restrictions and equipment. Keep your restrictions, clarify any pending allergy entries, or explore food support.</p><button className="button secondary" onClick={() => go('help')}>Find food support</button></section>}
          {([['now', 'Make it now'], ['extras', 'Just 1–2 extra items'], ['later', 'Plan for later']] as const).map(([group, title]) => <section className={`kitchen-meal-group meal-group-${group}`} key={group}><div className="meal-group-heading"><h2>{title}</h2><span className="count-pill">{matches.filter(item => item.group === group).length} {matches.filter(item => item.group === group).length === 1 ? 'idea' : 'ideas'}</span></div>
            {matches.some(item => item.group === group) ? <div className="recipe-grid">{matches.filter(item => item.group === group).map(({match, plan, basicsUsed, servingsPossible, uses}) => <article className="recipe-card" key={match.recipe.id}>
              <MealPhoto id={match.recipe.id} title={match.recipe.title} />
              <div className="recipe-body"><div className="recipe-topline"><span>{match.recipe.mealTypes.join(' / ')}</span><span><IconClock size={15} aria-hidden="true" />{match.recipe.prepMinutes + match.recipe.cookMinutes} min</span></div>
              <h3>{match.recipe.title}</h3><p>{match.recipe.equipment.join(', ') || 'No cooking equipment'}</p><div className="recipe-facts"><span>{profile.householdSize} servings</span><span>{match.recipe.ingredients.length - plan.shoppingItems.length} pantry ingredients</span></div>
              <AmountSummary uses={uses} servingsPossible={servingsPossible} servings={profile.householdSize} toBuy={plan.shoppingItems.length} />
              <strong className="recipe-cost">{!plan.shoppingItems.length ? 'No new grocery cost' : plan.budget.missingPriceCount || plan.budget.stalePriceCount ? 'Price not verified' : `${formatMoney(plan.budget.totalCents)} estimated additions`}</strong>{plan.budget.totalCents > profile.weeklyBudgetCents && <small>Above your current budget.</small>}{plan.shoppingItems.length > 0 && plan.shoppingItems.length <= 3 && <small className="recipe-needs">Needs: {plan.shoppingItems.map(item => item.name).join(', ')}</small>}{basicsUsed.length > 0 && <small className="recipe-basics">Plus pantry basics: {basicsUsed.join(', ')}</small>}
              <details><summary>View steps</summary><h4>Ingredients for your family</h4><ul>{match.recipe.ingredients.map(part => <li key={part.ingredientId}>{Number((part.quantity * profile.householdSize / match.recipe.yieldServings).toFixed(1))} {part.unit} {ingredients.find(food => food.id === part.ingredientId)?.name}{plan.shoppingItems.some(item => item.ingredientId === part.ingredientId) ? ' · Buy or top up' : isPantryBasic(part.ingredientId) ? ' · Pantry basic' : ' · Use from pantry'}</li>)}</ul><ol>{match.recipe.steps.map(step => <li key={step}>{step}</li>)}</ol><small>Steps describe {match.recipe.yieldServings} original servings. Scale quantities shown above. {match.recipe.provenance}</small></details>
              </div>
            </article>)}</div> : <p className="empty-note">{group === 'now' ? 'Nothing uses only what you have yet. The ideas just below need one or two more foods, and each card says which.' : group === 'extras' ? 'No meal currently needs just one or two affordable additions.' : 'No larger-shop ideas with your current settings.'}</p>}
          </section>)}
          <section className="panel kitchen-groceries"><div className="panel-heading"><span className="section-icon"><IconShoppingBag size={24} aria-hidden="true" /></span><div><h2>Your suggested grocery list</h2><p>A short list to bring these meals together.</p></div></div>
            {basket?.plan ? <><p>{basket.message}</p><div className="basket-summary"><div><span>Estimated additions</span><strong>{formatMoney(basket.plan.budget.totalCents)}</strong></div><div><span>Budget remaining</span><strong>{formatMoney(basket.plan.budget.remainingBudgetCents ?? 0)}</strong></div><div><span>Pantry foods used</span><strong>{basket.pantryUse.length} · $0 new</strong></div></div><p>For: {basket.selected.map(item => item.recipe.title).join('; ')}.</p>
              <ul className="result-list">{basket.plan.shoppingItems.map(item => {const price = valuePrices.find(row => row.id === item.priceObservationId); return <li key={item.ingredientId}><label className="shopping-check"><input type="checkbox" checked={checked.includes(item.ingredientId)} onChange={() => setChecked(current => current.includes(item.ingredientId) ? current.filter(id => id !== item.ingredientId) : [...current, item.ingredientId])} /><span>{item.name}<small>{item.packageCount} × {price?.packageLabel} · {price?.retailer}</small>{price && <a href={price.sourceUrl} target="_blank" rel="noopener noreferrer">Reference checked {price.observedAt}</a>}</span></label><strong>{formatMoney(item.purchaseCostCents ?? 0)}</strong></li>;})}</ul>
              {!basket.plan.shoppingItems.length && <p>Nothing to buy for these meal ideas.</p>}<small>Whole-package estimates. Local prices, availability and fees may differ. Individual meal costs cannot be added together because pantry food and packages overlap. Foods without an amount are not subtracted here, so add amounts for a tighter list.</small>
            </> : <p>{basket?.message}</p>}
            <div className="actions"><button className="button secondary" onClick={printMeals}>Print meals and list</button><button className="button secondary" onClick={() => go('help')}>Find food support</button></div>
          </section>
        </>}
        {view === 'help' && <section id="food-help"><div className="page-heading"><h1>Support for your next meal.</h1><p>Use the official locators to search by ZIP. No precise location permission is needed here. Call providers before traveling.</p></div><div className="resource-grid">{foodResources.map(resource => <article className="resource-card" key={resource.id}><IconHeartHandshake className="resource-icon" size={30} aria-hidden="true" /><span className="eyebrow">{resource.publisher}</span><h2>{resource.title}</h2><p>{resource.description}</p><div className="actions"><a className="button secondary" href={resource.url} target="_blank" rel="noopener noreferrer">Open resource<IconArrowRight size={17} aria-hidden="true" /></a>{resource.phone && <a className="button" href={`tel:${resource.phone}`}>Call {resource.phone}</a>}</div></article>)}</div></section>}
        <div className="guest-storage-note welcome-footnote"><span><IconDeviceFloppy size={16} aria-hidden="true" />{user ? 'Account kitchen: choose Save online to keep changes. Unsaved changes are cleared when you leave or sign out.' : 'Saved on this device. Anyone using this browser can see your kitchen settings.'}</span><button className="text-button" onClick={() => setClearConfirm(true)}>{user ? 'Clear current kitchen' : 'Clear my information'}</button></div>
        {clearConfirm && <section className="panel" aria-label="Clear saved information"><h2>Clear this kitchen?</h2><p>{user ? 'This clears the current pantry and settings. Your online save stays unchanged until you choose Save online.' : 'This removes the pantry, budget and food settings saved in this browser.'}</p><div className="actions"><button className="button danger" onClick={clear}>Clear my information now</button><button className="button secondary" onClick={() => setClearConfirm(false)}>Keep my kitchen</button></div></section>}
      </>}
      {notice && <p role="status" className="form-feedback kitchen-toast">{notice}</p>}{saveError && <p role="alert" className="form-feedback">{saveError}</p>}
    </main>
    <footer><span className="brand">Healthy Steps</span><p>More meals from what you have.</p><small>Meal ideas support everyday planning, not individualized medical care.</small></footer>
  </div>;
}

/** What the family's own amounts can make: servings covered and how much of each food the meal uses. */
function AmountSummary({ uses, servingsPossible, servings, toBuy }: { uses: FoodUse[]; servingsPossible: number; servings: number; toBuy: number }) {
  if (!uses.length) return null;
  const headline = !toBuy || servingsPossible >= servings ? `Your amounts cover all ${servings} servings`
    : servingsPossible >= 1 ? `Your amounts make ${servingsPossible} of ${servings} servings — a smaller batch you can cook now`
    : null;
  return <div className="recipe-amounts">
    {headline && <strong>{headline}</strong>}
    <ul>{uses.slice(0, 4).map(use => {
      const short = use.need > use.have + 1e-6;
      return <li key={use.ingredientId} className={short ? 'short' : undefined}>
        <span>{use.name}</span>
        <small>{short ? `needs ${formatAmount(use.need, use.unit)}, you have ${use.assumed ? 'about ' : ''}${formatAmount(use.have, use.unit)}` : `uses ${formatAmount(use.need, use.unit)} of your ${use.assumed ? 'typical ' : ''}${formatAmount(use.have, use.unit)}`}</small>
      </li>;
    })}</ul>
    {uses.some(use => use.assumed) && <small>“Typical” means no amount was entered, so we used one usual package.</small>}
  </div>;
}
