'use client';

import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { allergyOptions } from '@/lib/food-settings';

export function AllergyPicker({ value, onChange, onSelect }: {
  value: string; onChange: (value: string) => void; onSelect: (id: string, label: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = value.toLowerCase().trim();
  const options = allergyOptions.filter(option => option.searchTerms.some(term => term.includes(query)));
  const expanded = open && !value.includes(',');
  useEffect(() => {
    if (expanded && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, expanded, id]);
  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onSelect(option.id, option.label); setOpen(false); setActive(-1);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActive(index => options.length ? (event.key === 'ArrowDown' ? (index + 1) % options.length : (index - 1 + options.length) % options.length) : -1);
    } else if (event.key === 'Enter' && expanded && active >= 0) { event.preventDefault(); choose(active); }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1); }
  }
  return <div className="allergy-picker"><label htmlFor={id}>Food allergy</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-options`}
      aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
      aria-describedby={`${id}-hint`} autoComplete="off" value={value} maxLength={500} placeholder="Start typing, e.g. peanuts or milk"
      onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1); }} onKeyDown={keyDown} />
    {expanded && <div className="allergy-menu"><ul id={`${id}-options`} role="listbox" aria-label="Allergy suggestions">
      {options.map((option, index) => <li role="option" id={`${id}-option-${index}`} aria-selected={active === index} key={option.id}
        className={active === index ? 'highlighted' : ''} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>{option.label}</li>)}
    </ul>{!options.length && <p>No match yet. Use Add to save this allergy for checking.</p>}</div>}
    <small id={`${id}-hint`}>Choose a named allergy from the menu, or add another food for checking.</small>
  </div>;
}
