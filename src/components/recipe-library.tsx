'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IconArrowRight, IconCheck, IconExternalLink, IconPlayerPlay, IconSearch, IconShoppingBag, IconX } from '@tabler/icons-react';
import { amountCheck, dishThumb, formatMeasure, pantryHas, simpleFoodName, type LibraryDish, type LibraryRecipe, type PantryAmount } from '@/lib/recipe-library';

type Status = 'idle' | 'loading' | 'done' | 'error';
const cache = new Map<string, LibraryDish[]>();

async function searchLibrary(q: string): Promise<LibraryDish[]> {
  const key = q.trim().toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const response = await fetch(`/api/recipe-library?q=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error('search failed');
  const { dishes } = await response.json() as { dishes: LibraryDish[] };
  cache.set(key, dishes);
  return dishes;
}

/** Library search keeps only letters, numbers and simple punctuation, matching the API. */
const cleanQuery = (value: string) => value.replace(/[^\p{L}\p{N} ,'&-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

/** One dish card: photo first, name in serif, quiet metadata. */
function DishCard({ dish, onOpen }: { dish: LibraryDish; onOpen: (dish: LibraryDish) => void }) {
  return <button type="button" className="library-card" onClick={() => onOpen(dish)} aria-label={`Open recipe: ${dish.name}`}>
    {/* eslint-disable-next-line @next/next/no-img-element -- remote recipe photos, already sized by the library */}
    <img src={dishThumb(dish.image)} alt="" loading="lazy" width={500} height={500} />
    <span className="library-card-meta">{[dish.area, dish.category].filter(Boolean).join(' · ') || 'Recipe'}</span>
    <strong>{dish.name}</strong>
  </button>;
}

/** Full recipe in a dialog: photo, ingredients (marked when already in the pantry) and steps. */
function RecipeDialog({ dish, pantry, amounts, onClose }: { dish: LibraryDish | null; pantry: string[]; amounts: PantryAmount[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [recipe, setRecipe] = useState<LibraryRecipe | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (dish && !dialog.open) dialog.showModal();
    if (!dish && dialog.open) dialog.close();
  }, [dish]);
  useEffect(() => {
    if (!dish) return;
    let active = true;
    setRecipe(null); setStatus('loading');
    fetch(`/api/recipe-library?id=${dish.id}`).then(async response => {
      if (!response.ok) throw new Error('lookup failed');
      const { recipe: found } = await response.json() as { recipe: LibraryRecipe };
      if (active) { setRecipe(found); setStatus('done'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [dish]);
  const have = recipe ? recipe.ingredients.filter(item => pantryHas(pantry, item.name)) : [];
  const checks = recipe ? recipe.ingredients.map(item => amountCheck(item, amounts)) : [];
  const shortCount = checks.filter(check => check?.status === 'short').length;
  const assumedCount = checks.filter(check => check?.status === 'assumed').length;
  return <dialog ref={ref} className="library-dialog" aria-labelledby="library-dialog-title" onClose={onClose} onClick={event => { if (event.target === ref.current) ref.current?.close(); }}>
    {dish && <div className="library-dialog-inner">
      <button type="button" className="library-close" onClick={() => ref.current?.close()} aria-label="Close recipe"><IconX size={20} aria-hidden="true" /></button>
      <div className="library-dialog-photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote recipe photo */}
        <img src={dish.image} alt={dish.name} width={700} height={700} />
      </div>
      <div className="library-dialog-body">
        <span className="eyebrow">{[dish.area, dish.category].filter(Boolean).join(' · ') || 'Recipe'}</span>
        <h2 id="library-dialog-title">{dish.name}</h2>
        {status === 'loading' && <p role="status">Loading the recipe…</p>}
        {status === 'error' && <p role="alert">This recipe could not be loaded. Close it and try again.</p>}
        {recipe && <>
          {pantry.length > 0 && <p className="library-have">You have {have.length} of {recipe.ingredients.length} ingredients.</p>}
          {have.length > 0 && <p className="library-amount-note">{shortCount ? `With your amounts, ${shortCount} ${shortCount === 1 ? 'food runs' : 'foods run'} short for the full recipe. Make a smaller batch or top up.` : assumedCount ? 'Foods without an amount are assumed to be a typical package — usually enough for this recipe.' : 'Your amounts cover everything you have for this recipe.'}</p>}
          <h3>Ingredients</h3>
          <ul className="library-ingredients">{recipe.ingredients.map((item, index) => {
            const owned = pantryHas(pantry, item.name);
            const check = checks[index];
            return <li key={item.name + item.measure} className={owned ? check?.status === 'short' ? 'owned short' : 'owned' : undefined}>
              {owned ? <IconCheck size={16} aria-label="In your kitchen" /> : <IconShoppingBag size={16} aria-label="To buy" />}
              <span>{item.name}{check?.status === 'short' && <em>you have {formatMeasure(check.have!, check.unit!)} · need {formatMeasure(check.missing!, check.unit!)} more</em>}{check?.status === 'enough' && <em>you have {formatMeasure(check.have!, check.unit!)} · enough</em>}</span>
              <small>{item.measure}</small>
            </li>;
          })}</ul>
          <h3>How to make it</h3>
          <ol className="library-steps">{recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
          <div className="actions">
            {recipe.video && <a className="button secondary" href={recipe.video} target="_blank" rel="noopener noreferrer"><IconPlayerPlay size={17} aria-hidden="true" />Watch video</a>}
            {recipe.source && <a className="text-button" href={recipe.source} target="_blank" rel="noopener noreferrer">Original recipe<IconExternalLink size={15} aria-hidden="true" /></a>}
          </div>
          <small>Recipe and photo from TheMealDB, a free community recipe library. Check labels for allergens; these recipes are not reviewed for your family’s food needs.</small>
        </>}
      </div>
    </div>}
  </dialog>;
}

/**
 * Search a large recipe library by food or dish name. Every result has a photo; choosing one
 * opens its ingredients and steps. `compact` shows a short row with no search box (home page).
 */
export function RecipeLibrary({ pantry, amounts = [], initialQuery, compact = false, limit, onSeeAll }: { pantry: string[]; amounts?: PantryAmount[]; initialQuery?: string; compact?: boolean; limit?: number; onSeeAll?: () => void }) {
  // Simple food names from the pantry ("Ready-to-eat cooked rice" -> "rice"), most recent first.
  const terms = [...new Set([...pantry].reverse().map(simpleFoodName).map(cleanQuery).filter(Boolean))];
  const termKey = terms.join('|');
  const starter = cleanQuery(initialQuery || terms[0] || 'chicken') || 'chicken';
  const [query, setQuery] = useState(starter);
  const [searched, setSearched] = useState(starter);
  const [usedTerms, setUsedTerms] = useState<string[]>([]);
  const [dishes, setDishes] = useState<LibraryDish[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [open, setOpen] = useState<LibraryDish | null>(null);
  useEffect(() => {
    if (compact) return;
    let active = true;
    setStatus('loading');
    searchLibrary(searched).then(found => { if (active) { setDishes(found); setStatus('done'); } }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [searched, compact]);
  // Home row: mix dishes from several pantry foods, a few from each, until the row is full.
  useEffect(() => {
    if (!compact) return;
    let active = true;
    const want = limit ?? 8;
    const pool = termKey ? termKey.split('|').slice(0, 6) : ['chicken'];
    setStatus('loading');
    Promise.allSettled(pool.map(searchLibrary)).then(results => {
      if (!active) return;
      const lists = results.map(result => result.status === 'fulfilled' ? result.value : []);
      if (results.every(result => result.status === 'rejected')) { setStatus('error'); return; }
      const seen = new Set<string>(); const mixed: LibraryDish[] = []; const used = new Set<string>();
      for (let round = 0; mixed.length < want && round < 24; round += 1) {
        lists.forEach((list, index) => { const dish = list[round]; if (dish && mixed.length < want && !seen.has(dish.id)) { seen.add(dish.id); mixed.push(dish); used.add(pool[index]); } });
      }
      setDishes(mixed); setUsedTerms(pool.filter(term => used.has(term))); setStatus('done');
    });
    return () => { active = false; };
  }, [compact, termKey, limit]);
  function submit(event: FormEvent) { event.preventDefault(); const q = cleanQuery(query); if (q) setSearched(q); }
  const shown = limit ? dishes.slice(0, limit) : dishes;
  const suggestions = terms.slice(0, 8);
  const rowTitle = usedTerms.length > 3 ? `${usedTerms.slice(0, 3).join(', ')} and more` : usedTerms.length > 1 ? `${usedTerms.slice(0, -1).join(', ')} and ${usedTerms.at(-1)}` : usedTerms[0] ?? 'your food';
  return <section className={`recipe-library${compact ? ' compact' : ''}`} aria-label={compact ? 'More recipes with your food' : 'Recipe library'}>
    {compact ? <div className="welcome-rowhead"><h2>More recipes with {rowTitle}</h2>{onSeeAll && <button type="button" className="text-button" onClick={onSeeAll}>Browse all recipes<IconArrowRight size={16} aria-hidden="true" /></button>}</div> : <>
      <form className="library-search" role="search" onSubmit={submit}>
        <label className="sr-only" htmlFor="library-q">Search recipes</label>
        <IconSearch size={19} aria-hidden="true" />
        <input id="library-q" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a food or dish — chicken, rice, pasta, curry…" maxLength={60} />
        <button className="button" type="submit">Search</button>
      </form>
      {suggestions.length > 0 && <div className="library-suggest"><span>From your kitchen:</span>{suggestions.map(item => <button type="button" key={item} className={`chip-button${item.toLowerCase() === searched.toLowerCase() ? ' on' : ''}`} onClick={() => { setQuery(item); setSearched(item); }}>{item}</button>)}</div>}
    </>}
    {status === 'loading' && <p className="library-status" role="status">Finding recipes…</p>}
    {status === 'error' && <p className="library-status" role="alert">The recipe library is not answering right now. Check your connection and try again.</p>}
    {status === 'done' && !shown.length && <p className="library-status">No recipes found for “{searched}”. Try a single food, like chicken, rice or beans.</p>}
    {status === 'done' && shown.length > 0 && <>
      {!compact && <p className="library-status">{dishes.length} {dishes.length === 1 ? 'recipe' : 'recipes'} for “{searched}”. Choose one to see ingredients and steps.</p>}
      <div className="library-grid">{shown.map(dish => <DishCard key={dish.id} dish={dish} onOpen={setOpen} />)}</div>
    </>}
    <RecipeDialog dish={open} pantry={pantry} amounts={amounts} onClose={() => setOpen(null)} />
  </section>;
}
