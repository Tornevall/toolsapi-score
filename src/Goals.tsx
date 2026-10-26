import React, { useEffect, useState } from 'react';
import { api, type Participant } from './api';

type Step = { id: number; title: string; completed_at: string | null };
type Goal = { id: number; title: string; description: string | null; category: string; level: number; achievability: number; icon: string; target_date: string | null; approved_at: string | null; steps: Step[]; completed_steps: number; total_steps: number };
const icons: Record<string, string> = { vr: '🥽', friends: '🤝', wifi: '📶', target: '🎯', game: '🎮', outdoors: '🌳' };
export function Goals({ participant, participants }: { participant: string; participants: Participant[] }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState('');
  const [category, setCategory] = useState('personal');
  const [level, setLevel] = useState(1);
  const [achievability, setAchievability] = useState(3);
  const [icon, setIcon] = useState('target');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    if (!participant) { setGoals([]); return; }
    setGoals(await api<Goal[]>('/participants/' + participant + '/goals'));
  }
  useEffect(() => {
    let active = true;
    if (!participant) { setGoals([]); return; }
    api<Goal[]>('/participants/' + participant + '/goals')
      .then(data => { if (active) setGoals(data); })
      .catch(err => { if (active) setError(String(err)); });
    return () => { active = false; };
  }, [participant]);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await api('/participants/' + participant + '/goals', {
        method: 'POST', body: JSON.stringify({
          title: title.trim(), category, level, achievability, icon,
          target_date: targetDate || null,
          steps: steps.split('\n').map(s => s.trim()).filter(Boolean)
        })
      });
      setTitle(''); setSteps(''); await refresh();
    } catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  }
  async function action(path: string) {
    setBusy(true); setError('');
    try { await api(path, { method: 'POST' }); await refresh(); }
    catch (err) { setError(String(err)); }
    finally { setBusy(false); }
  }
  return <section>
    <h2>Målbilder och checklistor</h2>
    <p>Planering för {participants.find(p => String(p.id) === participant)?.name ?? 'vald deltagare'}. Nivå 1–5 och uppnåbarhet 1–5. Belöningar kräver godkännande.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <form onSubmit={create}>
      <label>Mål eller belöning<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="Exempel: Spela VR" /></label>
      <label>Typ<select value={category} onChange={e => setCategory(e.target.value)}><option value="personal">Personligt mål</option><option value="reward">Belöning</option><option value="planning">Planering</option></select></label>
      <label>Symbol<select value={icon} onChange={e => setIcon(e.target.value)}>{Object.entries(icons).map(([key, symbol]) => <option key={key} value={key}>{symbol} {key}</option>)}</select></label>
      <label>Nivå<input type="number" min="1" max="5" value={level} onChange={e => setLevel(Number(e.target.value))} /></label>
      <label>Uppnåbarhet<input type="number" min="1" max="5" value={achievability} onChange={e => setAchievability(Number(e.target.value))} /></label>
      <label>Måldatum<input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></label>
      <label>Checklista (ett steg per rad)<textarea required rows={4} value={steps} onChange={e => setSteps(e.target.value)} placeholder="Planera tid\nUtför uppgiften\nStäm av" /></label>
      <button disabled={busy || !participant || !title.trim() || !steps.trim()}>Skapa mål</button>
    </form>
    <div className="cards">{goals.map(goal => <article key={goal.id}>
      <h3>{icons[goal.icon] ?? '🎯'} {goal.title}</h3>
      <p>{goal.category === 'reward' ? 'Belöning' : goal.category === 'planning' ? 'Planering' : 'Personligt mål'} · Nivå {goal.level}/5 · Uppnåbarhet {goal.achievability}/5</p>
      <progress value={goal.completed_steps} max={Math.max(1, goal.total_steps)} />
      <p>{goal.completed_steps} av {goal.total_steps} steg klara</p>
      {goal.target_date && <p>Måldatum: {goal.target_date}</p>}
      <ul>{goal.steps.map(step => <li key={step.id}>
        <label><input type="checkbox" checked={Boolean(step.completed_at)} disabled={busy || Boolean(step.completed_at)}
          onChange={() => void action('/goals/' + goal.id + '/steps/' + step.id + '/complete')} /> {step.title}</label>
      </li>)}</ul>
      {goal.approved_at ? <p>Godkänt</p> : <button disabled={busy || goal.completed_steps !== goal.total_steps}
        onClick={() => void action('/goals/' + goal.id + '/approve')}>Godkänn mål</button>}
    </article>)}</div>
  </section>;
}
