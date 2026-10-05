'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AccountAccess, accountRequest } from './account-access';
import { NumberField } from './number-field';
import { FoodPreferences } from './food-preferences';
import { SupportChat } from './support-chat';
import { browserCloud, cloudConfigured } from '@/lib/cloud';
import { startingProfile, termsSections, adultProfileSchema, type AccountState } from '@/lib/account';
import { ingredients } from '@/lib/demo-data';
import { recommendBasket, type Suggestions } from '@/lib/recommendations';
import { formatMoney } from '@/lib/value-prices';
import { foodResources } from '@/lib/resources';
import type { GuideDestination } from '@/lib/site-guide';
import type { PantryItem, FoodState, Unit } from '@/lib/domain';

const foodStates: Record<string,FoodState> = { oats:'dry',banana:'raw',carrot:'raw',beans:'ready-to-eat',rice:'ready-to-eat',tomato:'ready-to-eat',corn:'ready-to-eat',bread:'ready-to-eat','peanut-butter':'ready-to-eat',yogurt:'ready-to-eat',hummus:'ready-to-eat' };
const amounts: Record<string,number> = { oats:500,banana:1,carrot:450,beans:240,rice:250,tomato:400,corn:200,bread:2,'peanut-butter':100,yogurt:200,hummus:100 };
export function AdultPlanner() {
  const [account,setAccount] = useState<AccountState|null>(null);
  const [accountUserId,setAccountUserId] = useState('');
  const [token,setToken] = useState('');
  const [preview,setPreview] = useState(false);
  const [view,setView] = useState<'home'|'help'|'account'>('home');
  const [step,setStep] = useState(0);
  const [pantry,setPantry] = useState<PantryItem[]>([]);
  const [profile,setProfile] = useState(startingProfile());
  const [suggestions,setSuggestions] = useState<Suggestions|null>(null);
  const [busy,setBusy] = useState(false);
  const [feedback,setFeedback] = useState('');
  const [ingredientId,setIngredientId] = useState('oats');
  const [amount,setAmount] = useState('500');
  const [unit,setUnit] = useState<Unit>('g');
  const [foodState,setFoodState] = useState<FoodState>('dry');
  const [deleteText,setDeleteText] = useState('');
  const [showSources,setShowSources] = useState(false);
  const [checked,setChecked] = useState<string[]>([]);
  const [showMore,setShowMore] = useState(false);
  const [accountTab,setAccountTab] = useState<'food'|'privacy'>('food');
  const [sessionKey,setSessionKey] = useState(0);
  const ready=useCallback((saved:AccountState,currentToken:string,userId:string)=>{setAccount(saved);setAccountUserId(userId);setProfile(saved.profile);setPantry(saved.pantry);setToken(currentToken);setPreview(false);setView('home');setStep(0);setSuggestions(null);setFeedback('');setIngredientId('oats');setAmount('500');setUnit('g');setFoodState('dry');setDeleteText('');setChecked([]);},[]);
  useEffect(()=>{
    if(!cloudConfigured)return;
    const {data}=browserCloud().auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'||(session&&accountUserId&&session.user.id!==accountUserId)){
        setAccount(null);setAccountUserId('');setToken(session?.access_token??'');setPreview(false);
        setPantry([]);setProfile(startingProfile());setSuggestions(null);setChecked([]);
        setDeleteText('');setIngredientId('oats');setAmount('500');setUnit('g');
        setFoodState('dry');setFeedback('');setView('home');setStep(0);setSessionKey(key=>key+1);
      } else if(session)setToken(session.access_token);
    });
    return()=>data.subscription.unsubscribe();
  },[accountUserId]);
  useEffect(()=>{
    function startAtHome(){setView('home');setStep(0);setFeedback('');window.scrollTo({top:0,behavior:'instant'});}
    window.addEventListener('pageshow',startAtHome);return()=>window.removeEventListener('pageshow',startAtHome);
  },[]);
  function navigate(destination:GuideDestination){
    if(destination==='food'||destination==='allergies'){setView('account');setAccountTab('food');}
    else if(destination==='help'||destination==='learn')setView('help');
    else {setView('home');setStep(destination==='budget'?1:destination==='suggestions'?(suggestions?2:1):0);}
    setFeedback('');window.scrollTo({top:0,behavior:'instant'});
  }
  function invalidate(){if(step===2)setStep(0);setSuggestions(null);setChecked([]);setFeedback('');}
  async function saveChanges(){const valid=adultProfileSchema.safeParse(profile);if(!valid.success)throw new Error(valid.error.issues[0]?.message??'Check your food settings.');if(!preview)await accountRequest('PATCH',token,{profile,pantry});}
  async function advance(){setBusy(true);setFeedback('');try{await saveChanges();setStep(1);window.scrollTo({top:0,behavior:'instant'});}catch(error){setFeedback(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}}
  async function getSuggestions(){setBusy(true);setFeedback('');try{
    await saveChanges();
    const result=preview?recommendBasket(profile,pantry):await accountRequest<Suggestions>('POST',token,{pantry,budgetCents:profile.weeklyBudgetCents,feesCents:profile.knownFeesCents},'/api/recommendations');
    setSuggestions(result);setStep(2);setChecked([]);setShowMore(false);window.scrollTo({top:0,behavior:'instant'});
  }catch(error){setFeedback(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}}
  function addPantry(event:FormEvent){event.preventDefault();const quantity=Number(amount);
    if(!/^\d+(?:\.\d+)?$/.test(amount.trim())||!Number.isFinite(quantity)||quantity<=0||quantity>100000){setFeedback('Enter an amount greater than zero, up to 100,000.');return;}
    if(pantry.length>=100){setFeedback('Review your pantry items before adding more.');return;}
    setPantry(current=>[...current,{id:crypto.randomUUID(),ingredientId,quantity,unit,foodState,quantityConfirmed:true}]);invalidate();
  }
  async function logOut(){if(!preview)await browserCloud().auth.signOut({scope:'local'});setAccount(null);setAccountUserId('');setPreview(false);setToken('');setPantry([]);setProfile(startingProfile());setSuggestions(null);setIngredientId('oats');setAmount('500');setUnit('g');setFoodState('dry');setDeleteText('');setChecked([]);setSessionKey(key=>key+1);setView('home');setStep(0);}
  const entered=!!account||preview;
  return <div className="app-shell rebuilt-app"><a className="skip-link" href="#main-content">Skip to content</a>
    <header className="header"><button className="brand brand-button" onClick={()=>navigate('home')} aria-label="Healthy Steps home"><span className="brand-icon" aria-hidden="true">✳</span>Healthy Steps</button><span className="header-note">Small steps. Everyday meals.</span>{entered&&<button className="text-button" onClick={()=>{void logOut().catch(()=>setFeedback('Could not log out. Please try again.'));}}>{preview?'Exit preview':'Log out'}</button>}</header>
    {entered&&<nav className="simple-nav" aria-label="Main navigation">{(['home','help','account'] as const).map(item=><button key={item} aria-current={view===item?'page':undefined} className={view===item?'active':''} onClick={()=>{setView(item);if(item==='home')setStep(0);setFeedback('');}}>{item==='home'?'Home':item==='help'?'Help':'Account'}</button>)}</nav>}
    <main id="main-content" tabIndex={-1}>{!entered?<AccountAccess onReady={ready} onPreview={()=>{setPreview(true);setProfile({...startingProfile('Preview'),members:[{...startingProfile('Preview').members![0],noKnownAllergies:true}]});setPantry([]);setView('home');setStep(0);setFeedback('');}}/>:<>
      {preview&&<div className="preview-note">Preview · No account created. Changes are temporary.</div>}
      {view==='home'&&<>
        <div className="journey-heading"><div><span className="eyebrow">{account?`Welcome, ${account.details.name.split(' ')[0]}`:'Try the new planner'}</span><h1>{step===0?'What is in your pantry?':step===1?'What can you spend?':'A little shopping. A few good meals.'}</h1><p>{step===0?'Add the foods you already have. We’ll use them before suggesting anything new.':step===1?'Choose a budget for the food you want to buy. We’ll keep the suggested basket within it.':'Use what you have, buy only what is missing, and see what you can make.'}</p></div></div>
        <ol className="journey-steps" aria-label="Planning steps">{['Your pantry','Your budget','Your suggestions'].map((label,index)=><li key={label}><button aria-current={step===index?'step':undefined} className={step===index?'current':index<step?'done':''} disabled={index===2&&!suggestions} onClick={()=>{setStep(index);setFeedback('');}}><span>{index+1}</span>{label}</button></li>)}</ol>
        {step===0&&<section className="panel pantry-step"><h2>Add a food</h2><form onSubmit={addPantry}>
          <label>Food<select value={ingredientId} onChange={event=>{const id=event.target.value;setIngredientId(id);setUnit(ingredients.find(item=>item.id===id)!.baseUnit);setAmount(String(amounts[id]));setFoodState(foodStates[id]);}}>{ingredients.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="pantry-entry"><label>Amount<input type="text" inputMode="decimal" required value={amount} onChange={event=>setAmount(event.target.value)}/></label><label>Unit<select value={unit} onChange={event=>setUnit(event.target.value as Unit)}>{(ingredients.find(item=>item.id===ingredientId)!.baseUnit==='each'?['each']:['g','kg','oz','lb']).map(value=><option key={value}>{value}</option>)}</select></label><button className="button" type="submit">Add to pantry</button></div>
          <details><summary>Check preparation and amount</summary><label>Preparation state<select value={foodState} onChange={event=>setFoodState(event.target.value as FoodState)}><option value="dry">Dry / uncooked</option><option value="ready-to-eat">Ready to eat / canned</option><option value="raw">Raw / fresh</option><option value="cooked">Cooked</option></select></label><p className="muted">Enter the measured amount you can use. For canned beans and corn, use the amount after draining. Check product labels and food storage before using an item.</p></details>
        </form><div className="pantry-summary"><h3>Your pantry <span>{pantry.length} {pantry.length===1?'item':'items'}</span></h3>{pantry.length?<ul className="pantry-list">{pantry.map(item=><li key={item.id}><div><strong>{ingredients.find(ingredient=>ingredient.id===item.ingredientId)?.name}</strong><small>{item.quantity} {item.unit} · {item.foodState.replaceAll('-',' ')}</small></div><button className="text-button" aria-label={`Remove ${ingredients.find(ingredient=>ingredient.id===item.ingredientId)?.name}`} onClick={()=>{setPantry(current=>current.filter(food=>food.id!==item.id));invalidate();}}>Remove</button></li>)}</ul>:<p className="empty-note">Nothing added yet. An empty pantry is fine too.</p>}</div><button className="button full-width" disabled={busy} onClick={()=>{void advance();}}>{busy?'Saving…':pantry.length?'Continue to budget':'My pantry is empty — continue'}</button></section>}
        {step===1&&<section className="panel budget-step"><span className="eyebrow">Step 2</span><h2>Your food budget</h2><p>Type the amount you have available for this shopping trip.</p><NumberField label="Food budget (USD)" decimal value={profile.weeklyBudgetCents/100} onChange={value=>{setProfile(current=>({...current,weeklyBudgetCents:Math.round(value*100)}));invalidate();}}/><small>A zero budget is okay. We’ll look for meals that need no purchases.</small><details><summary>Known fees or taxes</summary><NumberField label="Known fees and taxes (USD)" decimal value={profile.knownFeesCents/100} onChange={value=>{setProfile(current=>({...current,knownFeesCents:Math.round(value*100)}));invalidate();}}/><p className="muted">Unentered delivery charges, travel costs and local taxes are not included.</p></details><div className="actions"><button className="button secondary" onClick={()=>setStep(0)}>Back to pantry</button><button className="button" disabled={busy} onClick={()=>{void getSuggestions();}}>{busy?'Finding your options…':'Find my suggestions'}</button></div></section>}
        {step===2&&suggestions&&<div className="suggestions-step"><p className="results-summary">{suggestions.message}</p>{suggestions.plan?<>
          <div className="basket-summary"><div><span>Estimated basket</span><strong>{formatMoney(suggestions.plan.budget.totalCents)}</strong></div><div><span>Your budget</span><strong>{formatMoney(profile.weeklyBudgetCents)}</strong></div><div><span>Left after these meals</span><strong>{formatMoney(suggestions.plan.budget.remainingBudgetCents??0)}</strong></div></div>
          <div className="two-column"><section className="panel"><h2>Use what you have</h2>{suggestions.pantryUse.length?<ul className="result-list">{suggestions.pantryUse.map(item=><li key={item.ingredientId}><div><strong>{item.name}</strong><small>Use {Number(item.used.toFixed(1))} {item.unit} from your pantry.</small></div><span className="use-status">{item.needsTopUp?'Top up only the missing amount':'No need to buy again'}</span></li>)}</ul>:<p>No usable amounts from your pantry are needed for this basket.</p>}</section>
          <section className="panel"><h2>Buy only what is missing</h2>{suggestions.plan.shoppingItems.length?<ul className="result-list">{suggestions.plan.shoppingItems.map(item=>{const price=suggestions.prices.find(price=>price.id===item.priceObservationId);return <li key={item.ingredientId}><label className="shopping-check"><input type="checkbox" checked={checked.includes(item.ingredientId)} onChange={()=>setChecked(current=>current.includes(item.ingredientId)?current.filter(id=>id!==item.ingredientId):[...current,item.ingredientId])}/><span><strong>{item.name}</strong><small>{item.packageCount} × {price?.packageLabel??'package'} · {price?.retailer}</small>{price&&<a href={price.sourceUrl} target="_blank" rel="noopener noreferrer">Price reference</a>}</span></label><strong>{formatMoney(item.purchaseCostCents??0)}</strong></li>;})}</ul>:<p className="empty-note">Nothing to buy for these meals. Your pantry has enough.</p>}</section></div>
          <section className="meal-ideas"><div className="section-heading"><div><span className="eyebrow">Make these with this basket</span><h2>Your meal ideas</h2></div><span className="count-pill">{profile.householdSize} {profile.householdSize===1?'person':'people'}</span></div><div className="recipe-grid">{suggestions.selected.map(match=><article className="recipe-card" key={match.recipe.id}><span className="eyebrow">{match.recipe.prepMinutes+match.recipe.cookMinutes} minutes</span><h3>{match.recipe.title}</h3><p>{match.explanation?.replace(' with a grown-up','')}</p><details><summary>Ingredients and steps</summary><ul>{match.recipe.ingredients.map(part=><li key={part.ingredientId}>{Number((part.quantity*profile.householdSize/match.recipe.yieldServings).toFixed(1))} {part.unit} {ingredients.find(item=>item.id===part.ingredientId)?.name}</li>)}</ul><ol>{match.recipe.steps.map(text=><li key={text}>{text}</li>)}</ol><small>Instructions above describe the original {match.recipe.yieldServings}-serving recipe. Ingredient amounts shown are scaled to {profile.householdSize} people. Adjust quantities and follow package directions.</small></details></article>)}</div></section>
          <section className="price-note"><p>Estimates use dated public Walmart and Target listings. Prices and stock vary by location; local fees may be extra. Check labels and cross-contact before buying.</p><button className="text-button" onClick={()=>setShowSources(value=>!value)} aria-expanded={showSources}>How these prices are estimated</button>{showSources&&<ul>{suggestions.prices.filter(price=>suggestions.plan!.shoppingItems.some(item=>item.priceObservationId===price.id)).map(price=><li key={price.id}><a href={price.sourceUrl} target="_blank" rel="noopener noreferrer">{price.productName} · {price.retailer}</a> — {formatMoney(price.priceCents)} per {price.packageLabel}; reference checked {price.observedAt}.{price.quantityNote&&<small>{price.quantityNote}</small>}</li>)}</ul>}<small>Original prototype recipes have not undergone professional content review.</small></section>
        </>:<section className="panel"><h2>Let’s try another approach</h2><p>Add more pantry foods or change your budget to find another basket. Your allergies and restrictions remain in place.</p><button className="button secondary" onClick={()=>navigate('help')}>Find food support</button></section>}
        {!!suggestions.alternatives.length&&<section className="alternative-meals"><button className="button secondary" onClick={()=>setShowMore(value=>!value)} aria-expanded={showMore}>{showMore?'Hide other options':'See other compatible meals'}</button>{showMore&&<div className="recipe-grid">{suggestions.alternatives.map(match=><article className="recipe-card" key={match.recipe.id}><h3>{match.recipe.title}</h3><p>{match.hasMissingPrices?'Some ingredient prices need checking.':`Estimated purchases for this meal on its own: ${formatMoney(match.estimatedPurchaseCents)}`}</p><small>These alternatives are not included in the basket above. Costs cannot be added together because pantry amounts and packages may overlap.</small></article>)}</div>}</section>}
        <div className="actions"><button className="button secondary" onClick={()=>setStep(0)}>Edit pantry</button><button className="button secondary" onClick={()=>setStep(1)}>Edit budget</button></div></div>}
      </>}
      <div hidden={view!=='help'} className="combined-help"><SupportChat key={sessionKey} profile={profile} pantryCount={pantry.length} onNavigate={navigate}/><section className="food-support"><div className="page-heading"><h2>Food support near you</h2><p>Official resources, with no additional questions or personal details required.</p></div><div className="resource-grid">{foodResources.map(resource=><article className="resource-card" key={resource.id}><span className="eyebrow">{resource.publisher}</span><h3>{resource.title}</h3><p>{resource.description}</p><a className="button secondary" href={resource.url} target="_blank" rel="noopener noreferrer">Open resource</a>{resource.phone&&<a className="button" href={`tel:${resource.phone}`}>Call {resource.phone}</a>}</article>)}</div></section></div>
      {view==='account'&&<><div className="page-heading"><span className="eyebrow">Your account</span><h1>Your food, your choices.</h1><p>{account?`${account.details.name} · ${account.details.city}, ${account.details.state} · Age ${account.details.age}`:'Preview settings. No personal profile is saved.'}</p></div><div className="account-sections"><button className={accountTab==='food'?'selected':''} onClick={()=>setAccountTab('food')}>Food settings</button><button className={accountTab==='privacy'?'selected':''} onClick={()=>setAccountTab('privacy')}>Privacy and terms</button></div>{accountTab==='food'?<section className="panel"><FoodPreferences profile={profile} onChange={next=>{setProfile(next);invalidate();}}/><button className="button" disabled={busy} onClick={async()=>{setBusy(true);setFeedback('');try{await saveChanges();setFeedback(preview?'Preview settings updated.':'Food settings saved.');}catch(error){setFeedback(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}}}>Save food settings</button></section>:<section className="panel terms-copy">{termsSections.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}{account&&<><p>Accepted terms {account.termsVersion} on {new Date(account.acceptedAt).toLocaleDateString()}.</p><details><summary>Delete your account and saved data</summary><p>This permanently removes your account, food settings, pantry and consent receipt.</p><label>Type DELETE to confirm<input value={deleteText} onChange={event=>setDeleteText(event.target.value)}/></label><button className="button danger" disabled={busy||deleteText!=='DELETE'} onClick={async()=>{setBusy(true);try{await accountRequest('DELETE',token,{confirmation:'DELETE'});await logOut();}catch(error){setFeedback(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}}}>Delete my account</button></details></>}</section>}</>}
      {feedback&&<p className="form-feedback" role="status">{feedback}</p>}
    </>}</main><footer><span className="brand">Healthy Steps</span><p>Simple food planning for your family.</p><small>Student prototype · Food ideas support everyday planning, not prescribed medical care.</small></footer>
  </div>;
}
