'use client';

import { useEffect, useId, useState } from 'react';

export function NumberField({ label, value, min = 0, max = 10000, decimal = false, onChange }: {
  label: string; value: number; min?: number; max?: number; decimal?: boolean; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const id = useId();
  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  function commit() {
    const number = Number(draft);
    const valid = /^\d+(?:\.\d+)?$/.test(draft.trim()) && Number.isFinite(number) && number >= min && number <= max && (decimal || Number.isInteger(number));
    if (valid) { onChange(number); setError(''); }
    else { setError(`Enter ${decimal ? 'a number' : 'a whole number'} from ${min} to ${max}.`); setDraft(String(value)); }
    setEditing(false);
  }
  return <label htmlFor={id}>{label}<input id={id} type="text" inputMode={decimal ? 'decimal' : 'numeric'} value={draft}
    aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
    onFocus={() => setEditing(true)} onChange={event => { setDraft(event.target.value); setError(''); }} onBlur={commit}
    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
    {error && <small className="field-error" id={`${id}-error`}>{error}</small>}</label>;
}
