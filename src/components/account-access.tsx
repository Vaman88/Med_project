'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { browserCloud, cloudConfigured } from '@/lib/cloud';
import { states, TERMS_VERSION, termsSections, startingProfile, detailsSchema, setupSchema, type AccountDetails, type AccountState } from '@/lib/account';
import { FoodPreferences } from './food-preferences';
import type { HouseholdProfile } from '@/lib/domain';

export async function accountRequest<T>(method:string,token:string,body?:unknown,path='/api/account'):Promise<T> {
  const response = await fetch(path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message??'Please try again.');
  return result;
}

export function AccountAccess({ onReady,onPreview }: { onReady:(account:AccountState,token:string)=>void; onPreview:()=>void }) {
  const [mode,setMode] = useState<'login'|'signup'|'recover'>('login');
  const [session,setSession] = useState<Session|null>(null);
  const [loading,setLoading] = useState(cloudConfigured);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirmPassword,setConfirmPassword] = useState('');
  const [age,setAge] = useState('');
  const [details,setDetails] = useState<AccountDetails>({name:'',city:'',state:'',age:18});
  const [profile,setProfile] = useState<HouseholdProfile>(startingProfile());
  const [signature,setSignature] = useState('');
  const [agreed,setAgreed] = useState(false);
  const [step,setStep] = useState(0);
  const [showTerms,setShowTerms] = useState(false);

  useEffect(() => {
    if (!cloudConfigured) return;
    const client=browserCloud();
    let active=true;
    const {data:subscription}=client.auth.onAuthStateChange((event,current) => { if (!active) return; if (event==='PASSWORD_RECOVERY') setMode('recover'); if(event==='SIGNED_OUT'){setProfile(startingProfile());setDetails({name:'',city:'',state:'',age:18});setAge('');setPassword('');setConfirmPassword('');setSignature('');setAgreed(false);setStep(0);setMode('login');setNotice('');} setSession(current); });
    void client.auth.getSession().then(({data,error}) => { if (!active) return; if(error) setError('Your session could not be restored. Please log in.'); setSession(data.session); setLoading(false); }).catch(() => { if(active){setError('Your session could not be restored. Please log in.');setLoading(false);} });
    return () => { active=false;subscription.subscription.unsubscribe(); };
  },[]);
  useEffect(() => {
    if (!session || busy || mode==='recover') return;
    let active=true; setLoading(true);
    void accountRequest<{account:AccountState|null}>('GET',session.access_token).then(result => {
      if (!active) return;
      if(result.account) onReady(result.account!,session.access_token);
      else {
        const metadata=session.user.user_metadata;
        const saved=detailsSchema.safeParse(metadata.account_details);
        if(saved.success) { setDetails(saved.data);setAge(String(saved.data.age));setProfile(current=>({...current,members:current.members?.map(member=>({...member,name:saved.data.name}))}));setStep(2); }
        setMode('signup');setNotice('Finish your food settings and accept the terms to complete your account.');
      }
    }).catch(error=> { if(active) setError(error.message); }).finally(()=> {if(active) setLoading(false);});
    return()=>{active=false;};
  },[session,busy,mode,onReady]);

  function validateDetails() {
    const parsed=detailsSchema.safeParse({...details,age:Number(age)});
    if(!parsed.success) {setError('Enter your full name, city, state, and an adult age from 18 to 120.');return false;}
    if (!session && (!email.includes('@') || password.length<12 || password!==confirmPassword)) {setError('Enter your email and matching passwords of at least 12 characters.');return false;}
    setDetails(parsed.data);setProfile(current=>({...current,members:current.members?.map(member=>({...member,name:parsed.data.name}))}));return true;
  }
  async function submit(event:FormEvent) {
    event.preventDefault();setError('');setNotice('');
    if(mode==='signup' && step===0) { if(!Number.isInteger(Number(age)) || Number(age)<18 || Number(age)>120) {setError('A parent or guardian age 18 or older needs to create and manage this account.');return;} setStep(1);return; }
    if(mode==='signup' && step===1) {if(validateDetails())setStep(2);return;}
    if(mode==='signup' && step===2) {
      const member=profile.members![0];
      if(!member.noKnownAllergies&&!member.allergies.length) {setError('Add your allergies or select no known food allergies.');return;}
      if(member.allergies.some(item=>item.status!=='confirmed')) {setError('Please clarify and confirm each allergy first.');return;}
      if(member.rules.some(rule=>['celiac','type_1_diabetes','type_2_diabetes'].includes(rule))&&!member.medicalConsent) {setError('Please agree to storing the health-related food settings you entered.');return;}
      setStep(3);return;
    }
    if(!cloudConfigured) {setError('Real accounts need the account service connected first. You can preview the planner below without creating an account.');return;}
    setBusy(true);
    try {
      const client=browserCloud();
      if(mode==='recover') {
        if(password.length<12||password!==confirmPassword)throw new Error('Use matching passwords with at least 12 characters.');
        const result=await client.auth.updateUser({password});if(result.error)throw result.error;
        setPassword('');setConfirmPassword('');setMode('login');setNotice('Password updated.');return;
      }
      if(mode==='login') {const result=await client.auth.signInWithPassword({email:email.trim(),password});if(result.error)throw result.error;setPassword('');return;}
      const parsed=setupSchema.safeParse({details:{...details,age:Number(age)},profile,signature,agreed,termsVersion:TERMS_VERSION});
      if(!parsed.success)throw new Error(parsed.error.issues[0]?.message??'Check your setup details.');
      let current=session;
      if(!current) {
        const result=await client.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin,data:{account_details:parsed.data.details}}});
        if(result.error)throw result.error;current=result.data.session;
        if(!current) {setNotice('Check your email to confirm your account. After confirming, log in and finish your food settings.');setMode('login');setPassword('');setConfirmPassword('');return;}
      }
      const result=await accountRequest<{account:AccountState}>('POST',current.access_token,parsed.data);
      setPassword('');setConfirmPassword('');onReady(result.account,current.access_token);
    } catch(error) {setError(error instanceof Error?error.message:'Please try again.');} finally {setBusy(false);}
  }
  return <div className="access-layout"><aside className="access-intro"><span className="eyebrow">Simple food planning</span><h1>Good meals.<br/><em>A little less guesswork.</em></h1><p>Start with what you have. Find a few useful ingredients and meals that fit your food needs and budget.</p><ol><li>Set up your food preferences</li><li>Add what is in your pantry</li><li>Choose a budget and see your options</li></ol><small>Designed for adults and families. No weight goals or calorie counting.</small></aside>
    <section className="panel access-panel" aria-label="Account access">
      {!session&&mode!=='recover'&&<div className="access-tabs"><button className={mode==='login'?'selected':''} onClick={()=>{setMode('login');setError('');}}>Log in</button><button className={mode==='signup'?'selected':''} onClick={()=>{setMode('signup');setError('');}}>Sign up</button></div>}
      {loading?<p role="status">Loading your account…</p>:<form onSubmit={submit}>
        <h2>{mode==='recover'?'Choose a new password':mode==='login'?'Welcome back':step===0?'Let’s start with your age':step===1?'A little about you':step===2?'Food that works for you':'Your information, your choice'}</h2>
        {mode==='signup'&&<div className="setup-progress" aria-label={`Account setup step ${step+1} of 4`}>Step {step+1} of 4 · {['Age','About you','Food settings','Terms'][step]}</div>}
        {mode==='signup'&&step===0&&<><p>Adult accounts are managed by someone age 18 or older. A parent or guardian can create an account for family planning.</p><label>Your age<input type="text" inputMode="numeric" value={age} onChange={event=>setAge(event.target.value)} required maxLength={3}/></label></>}
        {mode==='signup'&&step===1&&<><label>Full name<input required autoComplete="name" maxLength={60} value={details.name} onChange={event=>setDetails({...details,name:event.target.value})}/></label><div className="form-grid"><label>City<input required autoComplete="address-level2" maxLength={80} value={details.city} onChange={event=>setDetails({...details,city:event.target.value})}/></label><label>State<select required autoComplete="address-level1" value={details.state} onChange={event=>setDetails({...details,state:event.target.value})}><option value="">Choose a state</option>{states.map(state=><option key={state}>{state}</option>)}</select></label></div>{!session&&<><label>Email<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event=>setPassword(event.target.value)}/><small>Use at least 12 characters.</small></label><label>Confirm password<input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label></>}</>}
        {mode==='signup'&&step===2&&<FoodPreferences profile={profile} onChange={setProfile}/>}
        {mode==='signup'&&step===3&&<><div className="terms-copy">{termsSections.map(section=><section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}<small>Terms version: {TERMS_VERSION}</small></div><label className="check-line"><input type="checkbox" required checked={agreed} onChange={event=>setAgreed(event.target.checked)}/>I have read and accept the terms and data-use notice.</label><label>Type your full name to sign<input required autoComplete="off" value={signature} maxLength={60} onChange={event=>setSignature(event.target.value)} placeholder={details.name}/></label></>}
        {mode==='login'&&<><label>Email<input type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)}/></label><button type="button" className="text-button" disabled={busy} onClick={async()=>{setError('');if(!cloudConfigured){setError('The account service is not connected yet.');return;}if(!email.includes('@')){setError('Enter your email first.');return;}setBusy(true);try{const result=await browserCloud().auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});if(result.error)throw result.error;setNotice('If an account exists, you will receive a password reset email.');}catch(error){setError(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}}}>Forgot password?</button></>}
        {mode==='recover'&&<><label>New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)}/></label><label>Confirm new password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label></>}
        {error&&<p className="form-feedback error" role="alert">{error}</p>}{notice&&<p className="form-feedback" role="status">{notice}</p>}
        <div className="actions">{mode==='signup'&&step>0&&<button type="button" className="button secondary" disabled={busy} onClick={()=>{setStep(value=>value-1);setError('');}}>Back</button>}<button className="button" type="submit" disabled={busy}>{busy?'Please wait…':mode==='recover'?'Update password':mode==='login'?'Log in':step===3?(session?'Finish setup':'Create account'):'Continue'}</button></div>
      </form>}
      {!cloudConfigured&&<div className="account-setup-note"><p>Account service is not connected yet. Real sign-up and login will be available once it is configured.</p><button className="text-button" onClick={onPreview}>Preview the planner without an account</button><small>Preview changes stay in memory and are cleared when you leave.</small></div>}
      {session&&<button className="text-button" disabled={busy} onClick={async()=>{setBusy(true);try{await browserCloud().auth.signOut({scope:'local'});}catch{setError('Could not log out. Please try again.');}finally{setBusy(false);}}}>Log out of unfinished setup</button>}
      <button className="text-button" onClick={()=>setShowTerms(value=>!value)}>Terms and data use</button>{showTerms&&<div className="terms-copy">{termsSections.map(section=><section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}</div>}
    </section></div>;
}
