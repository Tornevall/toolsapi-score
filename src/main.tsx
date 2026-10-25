import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, submitEvent, type Participant, type Activity, type Summary, type Deduction } from './api';
import './style.css';
import { Goals } from './Goals';

type ScoreComment = { id: number; body: string; created_at: string };
type AllowancePlanRecord = { participant_id: number; monthly_cap_minor: number; base_minor: number; currency: 'SEK'; completion_threshold_percent: number; daily_bonus_minor: number; show_points: boolean; allow_positive_points: boolean; allow_negative_points: boolean };
const emptyPlan = { monthly_cap_minor: 125000, base_minor: 0, currency: 'SEK' as const, completion_threshold_percent: 80, daily_bonus_minor: 0, show_points: false, allow_positive_points: false, allow_negative_points: false };

function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [plans, setPlans] = useState<AllowancePlanRecord[]>([]);
  const [comments, setComments] = useState<ScoreComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentEventId, setCommentEventId] = useState('');
  const [planDraft, setPlanDraft] = useState(emptyPlan);
  const [participant, setParticipant] = useState('');
  const [activity, setActivity] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [newParticipant, setNewParticipant] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newPoints, setNewPoints] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const found = plans.find(p => String(p.participant_id) === participant);
    setPlanDraft(found ? {
      monthly_cap_minor: found.monthly_cap_minor, base_minor: found.base_minor,
      currency: 'SEK', completion_threshold_percent: found.completion_threshold_percent,
      daily_bonus_minor: found.daily_bonus_minor, show_points: found.show_points,
      allow_positive_points: found.allow_positive_points, allow_negative_points: found.allow_negative_points
    } : emptyPlan);
  }, [participant, plans]);
  const pendingSubmission = useRef<{ signature: string; key: string; occurredAt: string } | null>(null);

  async function load() {
    try {
      const [people, tasks, totals, negatives, allowancePlans] = await Promise.all([
        api<Participant[]>('/participants'), api<Activity[]>('/activities'),
        api<Summary[]>('/statistics'), api<Deduction[]>('/deductions'), api<AllowancePlanRecord[]>('/allowance-plans')
      ]);
      setParticipants(people); setActivities(tasks); setSummaries(totals); setDeductions(negatives); setPlans(allowancePlans);
      setParticipant(old => old || String(people[0]?.id ?? ''));
      setActivity(old => old || String(tasks[0]?.id ?? ''));
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte hämta data.'); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!participant) { setComments([]); return; }
    let active = true;
    api<ScoreComment[]>('/participants/' + participant + '/comments')
      .then(rows => { if (active) setComments(rows); })
      .catch(err => { if (active) setError(String(err)); });
    return () => { active = false; };
  }, [participant]);
  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!participant || !commentText.trim()) return;
    setBusy(true);
    try {
      await api('/participants/' + participant + '/comments', {
        method: 'POST', body: JSON.stringify({ body: commentText.trim(), event_id: commentEventId ? Number(commentEventId) : null })
      });
      setCommentText('');
      setCommentEventId('');
      setComments(await api<ScoreComment[]>('/participants/' + participant + '/comments'));
      setNotice('Kommentaren sparades.');
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault(); if (!participant) return;
    setBusy(true); setError('');
    try {
      await api('/allowance-plans/' + participant, { method: 'PUT', body: JSON.stringify(planDraft) });
      setNotice('Månadspotten sparades.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Kunde inte spara planen.'); }
    finally { setBusy(false); }
  }

  async function createParticipant(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api('/participants', { method: 'POST', body: JSON.stringify({ name: newParticipant.trim() }) });
      setNewParticipant(''); setNotice('Deltagaren skapades.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Kunde inte skapa deltagaren.'); }
    finally { setBusy(false); }
  }

  async function createActivity(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api('/activities', { method: 'POST', body: JSON.stringify({ name: newActivity.trim(), points: newPoints }) });
      setNewActivity(''); setNewPoints(0); setNotice('Aktiviteten skapades.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Kunde inte skapa aktiviteten.'); }
    finally { setBusy(false); }
  }

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
    <section><h2>Administrera deltagare och aktiviteter</h2>
      <form onSubmit={createParticipant}>
        <label>Ny deltagare<input value={newParticipant} maxLength={120} onChange={e => setNewParticipant(e.target.value)} required /></label>
        <button disabled={busy || !newParticipant.trim()}>Lägg till deltagare</button>
      </form>
      <form onSubmit={createActivity}>
        <label>Ny aktivitet<input value={newActivity} maxLength={120} onChange={e => setNewActivity(e.target.value)} required /></label>
        <label>Poäng<input type="number" min="-100000" max="100000" step="1" value={newPoints} onChange={e => setNewPoints(Number(e.target.value))} required /></label>
        <button disabled={busy || !newActivity.trim() || !Number.isInteger(newPoints)}>Lägg till aktivitet</button>
      </form>
    </section>
    <section><h2>Månadspott och heldagsbonus</h2>
      <p>Inställningarna sparas per deltagare. Belopp anges i kronor och beräknas i ören.</p>
      <form onSubmit={savePlan}>
        <label>Deltagare<select value={participant} onChange={e => { setParticipant(e.target.value); const found = plans.find(p => String(p.participant_id) === e.target.value); setPlanDraft(found ? { monthly_cap_minor: found.monthly_cap_minor, base_minor: found.base_minor, currency: 'SEK', completion_threshold_percent: found.completion_threshold_percent, daily_bonus_minor: found.daily_bonus_minor, show_points: found.show_points, allow_positive_points: found.allow_positive_points, allow_negative_points: found.allow_negative_points } : emptyPlan); }}>{participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Max kr/månad<input type="number" min="0" step="0.01" value={planDraft.monthly_cap_minor / 100} onChange={e => setPlanDraft(p => ({ ...p, monthly_cap_minor: Math.round(Number(e.target.value) * 100) }))} /></label>
        <label>Garanterat kr<input type="number" min="0" step="0.01" value={planDraft.base_minor / 100} onChange={e => setPlanDraft(p => ({ ...p, base_minor: Math.round(Number(e.target.value) * 100) }))} /></label>
        <label>Heldagsgräns %<input type="number" min="0" max="100" step="1" value={planDraft.completion_threshold_percent} onChange={e => setPlanDraft(p => ({ ...p, completion_threshold_percent: Number(e.target.value) }))} /></label>
        <label>Heldagsbonus kr<input type="number" min="0" step="0.01" value={planDraft.daily_bonus_minor / 100} onChange={e => setPlanDraft(p => ({ ...p, daily_bonus_minor: Math.round(Number(e.target.value) * 100) }))} /></label>
        <label><input type="checkbox" checked={planDraft.show_points} onChange={e => setPlanDraft(p => ({ ...p, show_points: e.target.checked }))} /> Visa poäng</label>
        <label><input type="checkbox" checked={planDraft.allow_positive_points} onChange={e => setPlanDraft(p => ({ ...p, allow_positive_points: e.target.checked }))} /> Pluspoäng</label>
        <label><input type="checkbox" checked={planDraft.allow_negative_points} onChange={e => setPlanDraft(p => ({ ...p, allow_negative_points: e.target.checked }))} /> Minuspoäng</label>
        <button disabled={busy || !participant}>Spara plan</button>
      </form>
    </section>
    <section><h2>Registrera aktivitet</h2>
      <form onSubmit={register}>
        <label>Person<select value={participant} onChange={e => setParticipant(e.target.value)} required>{participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Aktivitet<select value={activity} onChange={e => setActivity(e.target.value)} required>{activities.map(a => <option key={a.id} value={a.id}>{a.name} (+{a.points})</option>)}</select></label>
        <label>Antal<input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required /></label>
        <button disabled={busy || !participant || !activity}>{busy ? 'Sparar...' : 'Registrera'}</button>
      </form>
    </section>
    <section><h2>Kommentarer</h2>
      <form onSubmit={addComment}>
        <label>Kommentar<textarea rows={3} maxLength={5000} value={commentText} onChange={e => setCommentText(e.target.value)} required /></label>
        <label>Registrerings-ID (valfritt)<input type="number" min="1" step="1" value={commentEventId} onChange={e => setCommentEventId(e.target.value)} /></label>
        <button disabled={busy || !participant || !commentText.trim()}>Spara kommentar</button>
      </form>
      <ul>{comments.map(item => <li key={item.id}>
        {new Date(item.created_at).toLocaleString('sv-SE')}: {item.body}
      </li>)}</ul>
    </section>
    <Goals participant={participant} participants={participants} />
    <section><h2>Översikt</h2><div className="cards">{summaries.map(s => <article key={s.participant_id}>
      <h3>{participants.find(p => p.id === s.participant_id)?.name ?? 'Deltagare'}</h3>
      <dl><dt>Utförda aktiviteter</dt><dd>{s.completed_count}</dd><dt>Utförd mängd</dt><dd>{s.completed_quantity}</dd>{plans.find(p => p.participant_id === s.participant_id)?.show_points !== false && <><dt>Pluspoäng</dt><dd>{s.positive_points}</dd><dt>Minuspoäng</dt><dd>{s.negative_points}</dd><dt>Netto</dt><dd>{s.net_points}</dd></>}</dl>
    </article>)}</div></section>
    {plans.some(p => p.show_points && p.allow_negative_points) && <section><h2>Separata minusposter</h2>{deductions.length ? <ul>{deductions.map(d => <li key={d.id}>{participants.find(p => p.id === d.participant_id)?.name}: {d.reason} ({d.points})</li>)}</ul> : <p>Inga minusposter registrerade.</p>}</section>}
    <footer>All data hämtas från ToolsAPI. Behörigheter och poäng beräknas på servern.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
