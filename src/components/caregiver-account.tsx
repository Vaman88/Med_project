'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { browserCloud, cloudConfigured } from '@/lib/cloud';

export function CaregiverAccount({ onSession }: { onSession: (token: string | null) => void }) {
  const [email, setEmail] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!cloudConfigured) return;
    const client = browserCloud();
    void client.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); onSession(data.session?.access_token ?? null); });
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => { setSignedIn(!!session); onSession(session?.access_token ?? null); });
    return () => subscription.subscription.unsubscribe();
  }, [onSession]);
  if (!cloudConfigured) return null;
  async function sendLink(event: FormEvent) {
    event.preventDefault(); setMessage('');
    const { error } = await browserCloud().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setMessage(error ? 'The sign-in link could not be sent. Try again.' : 'Check your email for a caregiver sign-in link.');
  }
  return <section className="account-bar" aria-label="Caregiver account">{signedIn ? <><strong>Caregiver account connected</strong><button className="text-button" onClick={async () => { await browserCloud().auth.signOut(); setMessage('Signed out.'); }}>Sign out</button></> : <form onSubmit={sendLink}><label>Caregiver email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><button className="button" type="submit">Email sign-in link</button></form>}{message && <p role="status">{message}</p>}</section>;
}
