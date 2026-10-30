'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { searchFoods, type CatalogFood } from '@/lib/food-catalog';

const MAX_ROWS = 8;
const DEBOUNCE_MS = 120;

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return <>{text}</>;
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + q.length)}</mark>{text.slice(at + q.length)}</>;
}

export function FoodAutocomplete({ label, value, onTextChange, onPick, inputRef, placeholder, maxLength = 80 }: {
  label: string;
  value: string;
  onTextChange: (text: string) => void;
  onPick: (food: CatalogFood) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
  maxLength?: number;
}) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;
  const wrap = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<CatalogFood[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searchedFor, setSearchedFor] = useState('');
  const [suppressed, setSuppressed] = useState(false);
  const query = value.trim();

  useEffect(() => {
    if (!query || suppressed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      let found: CatalogFood[] | null = null;
      try {
        const response = await fetch(`/api/foods?q=${encodeURIComponent(query)}&limit=${MAX_ROWS}`, { signal: controller.signal });
        if (!response.ok) throw new Error('lookup failed');
        const body = await response.json() as { foods?: CatalogFood[] };
        if (!Array.isArray(body.foods)) throw new Error('bad payload');
        found = body.foods;
      } catch (error) {
        if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        try { found = searchFoods(query, MAX_ROWS); } catch { found = []; }
      }
      if (controller.signal.aborted) return;
      setResults(found.slice(0, MAX_ROWS));
      setSearchedFor(query);
      setActive(-1);
    }, DEBOUNCE_MS);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, suppressed]);

  useEffect(() => {
    function outside(event: PointerEvent) { if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  const fresh = searchedFor === query && !!query;
  const rows = fresh && open && !suppressed ? results : [];
  const showList = open && fresh && !suppressed;
  const typedIndex = rows.length; // fallback row sits after the matches
  const totalRows = showList ? rows.length + (rows.length === 0 || !rows.some(item => item.label.toLowerCase() === query.toLowerCase()) ? 1 : 0) : 0;
  const hasTyped = totalRows > rows.length;
  const optionId = (index: number) => `${listId}-opt-${index}`;

  function choose(index: number) {
    if (index < rows.length) { setSuppressed(true); onPick(rows[index]); }
    else setSuppressed(true);
    setOpen(false); setActive(-1);
  }
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!totalRows) { if (query) { setSuppressed(false); setOpen(true); } return; }
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(current => current < 0 ? (step === 1 ? 0 : totalRows - 1) : (current + step + totalRows) % totalRows);
    } else if (event.key === 'Enter' && showList && active >= 0) {
      event.preventDefault(); choose(active);
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault(); setOpen(false); setActive(-1);
    } else if (event.key === 'Tab') setOpen(false);
  }

  return <div className="food-autocomplete" ref={wrap}>
    <label htmlFor={inputId}>{label}</label>
    <input ref={inputRef} id={inputId} role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
      autoComplete="off" required maxLength={maxLength} value={value} placeholder={placeholder}
      onChange={event => { setSuppressed(false); setOpen(true); setActive(-1); onTextChange(event.target.value); }}
      onKeyDown={onKeyDown} />
    <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="autocomplete-list" hidden={!showList}>
      {rows.map((food, index) => <li key={food.id} id={optionId(index)} role="option" aria-selected={active === index} className={active === index ? 'active' : ''}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(index)} onMouseMove={() => active !== index && setActive(index)}>
        <span className="option-name"><Highlight text={food.label} query={query} /></span>
        <small>{food.category} · {food.storage}</small>
      </li>)}
      {hasTyped && <li id={optionId(typedIndex)} role="option" aria-selected={active === typedIndex} className={`typed-row${active === typedIndex ? ' active' : ''}`}
        onMouseDown={event => event.preventDefault()} onClick={() => choose(typedIndex)} onMouseMove={() => active !== typedIndex && setActive(typedIndex)}>
        <span className="option-name">Add &lsquo;{query}&rsquo; as typed</span>
        {rows.length === 0 && <small>No matching foods in the list</small>}
      </li>}
    </ul>
    <span className="visually-hidden" role="status" aria-live="polite">{showList ? `${rows.length} suggestion${rows.length === 1 ? '' : 's'} available` : ''}</span>
  </div>;
}
