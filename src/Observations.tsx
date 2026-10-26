import React, { useEffect, useState } from 'react';
import { api, type Activity } from './api';

type Observation = { id: number; observed_on: string; kind: string; status: string; title: string; notes: string | null; completed_quantity: number | null; expected_quantity: number | null };
const today = () => new Date().toLocaleDateString('sv-SE');
export function Observations({ participant, activities }: { participant: string; activities: Activity[] }) {
  const [rows, setRows] = useState<Observation[]>([]);
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState('note');
  const [status, setStatus] = useState('observation');
  const [activityId, setActivityId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [completed, setCompleted] = useState('');
  const [expected, setExpected] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!participant) { setRows([]); return; }
    let active = true;
    api<Observation[]>('/participants/' + participant + '/observations')
      .then(data => { if (active) setRows(data); })
      .catch(e => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [participant]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!participant) return;
    setBusy(true); setError('');
    try {
      await api('/participants/' + participant + '/observations', { method: 'POST', body: JSON.stringify({
        observed_on: date, kind, status, title: title.trim(), notes: notes.trim() || null,
        activity_id: activityId ? Number(activityId) : null,
        completed_quantity: completed === '' ? null : Number(completed),
        expected_quantity: expected === '' ? null : Number(expected)
      }) });
      setRows(await api<Observation[]>('/participants/' + participant + '/observations'));
      setTitle(''); setNotes(''); setCompleted(''); setExpected('');
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }
  return <section>
    <h2>Historiska observationer och uppföljningar</h2>
    <p>Dokumentera en dag, en avvikelse eller ett mål – fristående eller kopplat till en aktivitet. Dessa anteckningar ändrar inte poäng eller pengar.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <form onSubmit={save}>
      <label>Datum<input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} required /></label>
      <label>Typ<select value={kind} onChange={e => setKind(e.target.value)}>
        <option value="note">Anteckning</option><option value="activity">Aktivitet</option>
        <option value="goal">Måluppföljning</option><option value="deviation">Avvikelse</option>
      </select></label>
      <label>Resultat<select value={status} onChange={e => setStatus(e.target.value)}>
        <option value="observation">Observation</option><option value="completed">Uppfyllt</option>
        <option value="partial">Delvis uppfyllt</option><option value="not_completed">Inte uppfyllt</option>
      </select></label>
      <label>Koppla till rutin (valfritt)<select value={activityId} onChange={e => setActivityId(e.target.value)}>
        <option value="">Fristående</option>{activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
      <label>Rubrik<input maxLength={160} value={title} onChange={e => setTitle(e.target.value)} required /></label>
      <label>Uppnådda mål / antal<input type="number" min="0" max="10000" value={completed} onChange={e => setCompleted(e.target.value)} /></label>
      <label>Förväntade mål / antal<input type="number" min="1" max="10000" value={expected} onChange={e => setExpected(e.target.value)} /></label>
      <label>Beskrivning<textarea maxLength={5000} rows={3} value={notes} onChange={e => setNotes(e.target.value)} /></label>
      <button disabled={busy || !participant || !title.trim()}>{busy ? 'Sparar...' : 'Lägg till uppföljning'}</button>
    </form>
    <h3>Tidigare uppföljningar</h3>
    <ul>{rows.map(row => <li key={row.id}><strong>{row.observed_on} – {row.title}</strong> ({row.status})
      {row.completed_quantity !== null && row.expected_quantity !== null && <> · {row.completed_quantity}/{row.expected_quantity}</>}
      {row.notes && <p>{row.notes}</p>}</li>)}</ul>
  </section>;
}
