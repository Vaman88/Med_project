'use client';
import { useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { browserCloud, cloudConfigured } from '@/lib/cloud';
import { loadKitchenOnline, saveKitchenOnline, type SavedKitchen } from '@/lib/kitchen-sync';
import { guestKitchenSchema } from '@/lib/guest-kitchen';

export function CloudAccount({ user, kitchen, storageKey, onLoad }: { user: User | null; kitchen: unknown; storageKey: string; onLoad: (kitchen: SavedKitchen) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmLoad, setConfirmLoad] = useState<'cloud' | 'guest' | null>(null);
  if (!cloudConfigured) return null;

  async function perform(action: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  function authenticate(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const client = browserCloud();
      const credentials = { email: email.trim(), password };
      if (mode === 'signup') {
        const { data, error: authError } = await client.auth.signUp(credentials);
        if (authError) throw new Error(authError.message);
        setPassword('');
        if (!data.session) setMessage('Check your email to confirm your account, then come back and sign in.');
      } else {
        const { error: authError } = await client.auth.signInWithPassword(credentials);
        if (authError) throw new Error(authError.message);
        setPassword('');
      }
    });
  }
  function restore(source: 'cloud' | 'guest') {
    setConfirmLoad(null);
    void perform(async () => {
      let saved: SavedKitchen | null = null;
      if (source === 'cloud' && user) saved = await loadKitchenOnline(user.id);
      else {
        let raw: string | null;
        try { raw = localStorage.getItem(storageKey); } catch { throw new Error('This browser could not read the guest pantry.'); }
        if (raw) {
          const parsed = guestKitchenSchema.safeParse(JSON.parse(raw));
          if (!parsed.success) throw new Error('The guest pantry could not be read.');
          saved = parsed.data;
        }
      }
      if (!saved) { setMessage(source === 'cloud' ? 'No kitchen has been saved to this account yet.' : 'No guest pantry is saved on this device.'); return; }
      onLoad(saved);
      setMessage(source === 'cloud' ? 'Your saved kitchen is loaded. Choose Save online after making changes.' : 'Guest pantry copied into this visit. Choose Save online to keep it in your account.');
    });
  }
  return <section className="cloud-account" aria-label="Save your kitchen online">
    <div className="cloud-account-heading"><div><strong>{user ? 'Your online kitchen' : 'Keep your kitchen across devices'}</strong><p>{user ? `Signed in as ${user.email ?? 'your account'}. Changes save only when you choose Save online.` : 'Optional adult account. Your guest pantry stays on this device until you choose to copy it.'}</p></div>
      {!user && <button type="button" className="button secondary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Close account form' : 'Sign in or create account'}</button>}
    </div>
    {user ? <>
      <div className="cloud-account-actions">
        <button type="button" className="button" disabled={busy} onClick={() => void perform(async () => { await saveKitchenOnline(user.id, kitchen); setMessage('Kitchen saved online.'); })}>Save online</button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => setConfirmLoad('cloud')}>Load saved kitchen</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => setConfirmLoad('guest')}>Copy guest pantry from this device</button>
        <button type="button" className="text-button" disabled={busy} onClick={() => void perform(async () => { const { error: authError } = await browserCloud().auth.signOut({ scope: 'local' }); if (authError) throw new Error('Sign out failed. Please try again.'); })}>Sign out</button>
      </div>
      {confirmLoad && <div className="cloud-account-confirm"><p>Replace the pantry and household settings currently open with {confirmLoad === 'cloud' ? 'your online save' : 'this device’s guest pantry'}? Unsaved changes will be replaced.</p><div className="cloud-account-actions"><button type="button" className="button secondary" disabled={busy} onClick={() => restore(confirmLoad)}>Replace current kitchen</button><button type="button" className="text-button" onClick={() => setConfirmLoad(null)}>Cancel</button></div></div>}
    </> : expanded && <form onSubmit={authenticate}>
      <div className="cloud-account-fields"><label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : 1} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label></div>
      <p className="cloud-account-help">{mode === 'signup' ? 'Use at least 8 characters. We may email you a confirmation link.' : 'Sign in with your adult account email and password.'}</p>
      <div className="cloud-account-actions"><button type="submit" className="button" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create adult account'}</button><button type="button" className="text-button" disabled={busy} onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>{mode === 'signin' ? 'Create an account instead' : 'I already have an account'}</button></div>
    </form>}
    {busy && <p role="status">Connecting…</p>}
    {message && <p className="cloud-account-success" role="status">{message}</p>}
    {error && <p className="cloud-account-error" role="alert">{error}</p>}
  </section>;
}
