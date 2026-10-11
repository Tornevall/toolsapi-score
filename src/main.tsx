import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, submitEvent, type Participant, type Activity, type Summary, type Deduction } from './api';
import './style.css';

function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [participant, setParticipant] = useState('');
  const [activity, setActivity] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const pendingSubmission = useRef<{ signature: string; key: string; occurredAt: string } | null>(null);

  async function load() {
    try {
      const [people, tasks, totals, negatives] = await Promise.all([
        api<Participant[]>('/participants'), api<Activity[]>('/activities'),
        api<Summary[]>('/statistics'), api<Deduction[]>('/deductions')
      ]);
      setParticipants(people); setActivities(tasks); setSummaries(totals); setDeductions(negatives);
      setParticipant(old => old || String(people[0]?.id ?? ''));
      setActivity(old => old || String(tasks[0]?.id ?? ''));
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte hämta data.'); }
  }
  useEffect(() => { void load(); }, []);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (!participant || !activity || !Number.isInteger(quantity) || quantity < 1) return;
    setBusy(true); setNotice('');
    const signature = JSON.stringify([participant, activity, quantity]);
    if (!pendingSubmission.current || pendingSubmission.current.signature !== signature) pendingSubmission.current = { signature, key: crypto.randomUUID(), occurredAt: new Date().toISOString() };
    const submission = pendingSubmission.current;
    try {
      await submitEvent({ participant_id: Number(participant), activity_id: Number(activity), quantity, occurred_at: submission.occurredAt }, submission.key);
      pendingSubmission.current = null;
      setNotice('Aktiviteten registrerades.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Registreringen misslyckades.'); }
    finally { setBusy(false); }
  }

  return <main>
    <header><h1>Tools Score</h1><p>Aktiviteter, antal, poäng och belöningar</p></header>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <section><h2>Registrera aktivitet</h2>
      <form onSubmit={register}>
        <label>Person<select value={participant} onChange={e => setParticipant(e.target.value)} required>{participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Aktivitet<select value={activity} onChange={e => setActivity(e.target.value)} required>{activities.map(a => <option key={a.id} value={a.id}>{a.name} (+{a.points})</option>)}</select></label>
        <label>Antal<input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required /></label>
        <button disabled={busy || !participant || !activity}>{busy ? 'Sparar...' : 'Registrera'}</button>
      </form>
    </section>
    <section><h2>Översikt</h2><div className="cards">{summaries.map(s => <article key={s.participant_id}>
      <h3>{participants.find(p => p.id === s.participant_id)?.name ?? 'Deltagare'}</h3>
      <dl><dt>Utförda aktiviteter</dt><dd>{s.completed_count}</dd><dt>Utförd mängd</dt><dd>{s.completed_quantity}</dd><dt>Pluspoäng</dt><dd>{s.positive_points}</dd><dt>Minuspoäng</dt><dd>{s.negative_points}</dd><dt>Netto</dt><dd>{s.net_points}</dd></dl>
    </article>)}</div></section>
    <section><h2>Separata minusposter</h2>{deductions.length ? <ul>{deductions.map(d => <li key={d.id}>{participants.find(p => p.id === d.participant_id)?.name}: {d.reason} ({d.points})</li>)}</ul> : <p>Inga minusposter registrerade.</p>}</section>
    <footer>All data hämtas från ToolsAPI. Behörigheter och poäng beräknas på servern.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
