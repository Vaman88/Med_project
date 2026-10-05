'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { HouseholdProfile } from '@/lib/domain';
import { siteGuideReply, type GuideDestination, type GuideAction } from '@/lib/site-guide';

type Message = { role: 'user' | 'guide'; text: string; actions?: GuideAction[] };
const welcome: Message = { role: 'guide', text: 'Hi, I’m your Healthy Steps guide. I can help you find your way around, set up your food settings, and understand the meal planner. What would you like help with?' };
const prompts = ['How do I get started?', 'How do I add allergies?', 'How do I find meal ideas?', 'Where can I find food support?'];

export function SupportChat({ profile, pantryCount, onNavigate }: {
  profile: HouseholdProfile; pantryCount: number; onNavigate: (destination: GuideDestination) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [draft, setDraft] = useState('');
  const [previousTopic, setPreviousTopic] = useState('');
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages]);
  function ask(value: string) {
    const text = value.trim().slice(0, 1000);
    if (!text) return;
    const reply = siteGuideReply(text, profile, pantryCount, previousTopic);
    setMessages(current => [...current, { role: 'user', text }, { role: 'guide', ...reply }]);
    if (!/^(how|where|show me|take me there|tell me more|yes)[?.! ]*$/i.test(text)) setPreviousTopic(text);
    setDraft('');
  }
  function submit(event: FormEvent) { event.preventDefault(); ask(draft); }
  return <><div className="page-heading"><span className="eyebrow">Your website guide</span><h1>A little help,<br /><em>one message away.</em></h1><p>Ask how to use Healthy Steps, find a feature, or take the next step.</p></div>
    <section className="panel chat-panel" aria-label="Healthy Steps chat">
      <div className="chat-header"><div><h2>Healthy Steps guide</h2><small>Built-in website help</small></div><button className="text-button" onClick={() => { setMessages([welcome]); setPreviousTopic(''); setDraft(''); }}>New chat</button></div>
      <div className="chat-log" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions" ref={log}>
        {messages.map((message, index) => <div className={`chat-message ${message.role}`} key={index}><span className="chat-author">{message.role === 'user' ? 'You' : 'Healthy Steps guide'}</span><p>{message.text}</p>
          {!!message.actions?.length && <div className="chat-actions">{message.actions.map(action => <button className="button secondary" key={action.destination} onClick={() => onNavigate(action.destination)}>{action.label}</button>)}</div>}</div>)}
      </div>
      <div className="chat-prompts" aria-label="Suggested questions">{prompts.map(prompt => <button key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
      <form className="chat-composer" onSubmit={submit}><label htmlFor="chat-message">Your message</label><div><input id="chat-message" value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} placeholder="Ask about allergies, your pantry, or planning…" autoComplete="off" /><button className="button" type="submit" disabled={!draft.trim()}>Send</button></div></form>
    </section></>;
}
