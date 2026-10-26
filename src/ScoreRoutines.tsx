import React, { useEffect, useState } from 'react';
import { api, type Activity, type Participant } from './api';

type Group = { id: number; name: string };
type Routine = { id: number; name: string; group_name: string | null; daily_weight: number; percent: number; note: string | null };
type Day = { date: string; activities: Routine[]; expected_count: number; completion_percent: number | null };
type Schedule = { id: number; activity_id: number; starts_on: string; ends_on: string | null; frequency: 'daily' | 'interval' | 'weekdays'; interval_days: number; weekdays: string | null };
const today = () => new Date().toLocaleDateString('sv-SE');
const weekDays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

export function ScoreRoutines({ participant, participants, activities, revision, refresh }: {
  participant: string; participants: Participant[]; activities: Activity[]; revision: number; refresh: () => Promise<void>;
}) {
  const [date, setDate] = useState(today);
  const [groups, setGroups] = useState<Group[]>([]);
  const [day, setDay] = useState<Day | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupActivity, setGroupActivity] = useState('');
  const [groupId, setGroupId] = useState('');
  const [scheduleActivity, setScheduleActivity] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'interval' | 'weekdays'>('daily');
  const [intervalDays, setIntervalDays] = useState(2);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [edits, setEdits] = useState<Record<number, { percent: number; note: string }>>({});

  useEffect(() => {
    let live = true;
    Promise.all([
      api<Group[]>('/activity-groups'),
      participant ? api<Day>('/participants/' + participant + '/routine-progress?date=' + date) : Promise.resolve(null),
      participant ? api<Schedule[]>('/participants/' + participant + '/schedules') : Promise.resolve([])
    ]).then(([g, d, s]) => {
      if (!live) return;
      setGroups(g); setDay(d); setSchedules(s); setError('');
      setEdits(Object.fromEntries((d?.activities ?? []).map(a => [a.id, { percent: a.percent, note: a.note ?? '' }])));
    }).catch(e => { if (live) setError(String(e)); });
    return () => { live = false; };
  }, [participant, date, revision]);

  const mutate = async (fn: () => Promise<unknown>, updateGlobal = false) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await fn();
      const [g, d, s] = await Promise.all([
        api<Group[]>('/activity-groups'),
        participant ? api<Day>('/participants/' + participant + '/routine-progress?date=' + date) : Promise.resolve(null),
        participant ? api<Schedule[]>('/participants/' + participant + '/schedules') : Promise.resolve([])
      ]);
      setGroups(g); setDay(d); setSchedules(s);
      setEdits(Object.fromEntries((d?.activities ?? []).map(a => [a.id, { percent: a.percent, note: a.note ?? '' }])));
      if (updateGlobal) await refresh();
      setNotice('Ändringen har sparats.');
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  };

  return <section aria-label="Dagens rutiner och aktivitetsgrupper">
    <h2>Idag och återkommande rutiner</h2>
    <p>Alla kalenderdagar kan planeras, även skoldagar. Rutiner som inte är schemalagda idag räknas inte. Föräldern bestämmer och kan registrera i efterhand.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <label>Person <select value={participant} disabled aria-label="Vald deltagare">{participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Datum <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} /></label>
    {participant && day && <div>
      <p><strong>{day.expected_count} planerade rutiner · {day.completion_percent === null ? 'Ingen måluppfyllelse än' : day.completion_percent + ' % klart'}</strong></p>
      <div className="score-routine-list">
        {day.activities.map(a => {
          const edit = edits[a.id] ?? { percent: a.percent, note: a.note ?? '' };
          return <div className="score-routine-item" key={a.id}>
            <strong>{a.group_name ? a.group_name + ' / ' : ''}{a.name}</strong>
            <label>Status
              <select value={edit.percent === 0 ? '0' : edit.percent === 100 ? '100' : 'partial'} onChange={e => {
                const value = e.target.value === 'partial' ? 50 : Number(e.target.value);
                setEdits(old => ({ ...old, [a.id]: { ...edit, percent: value } }));
              }}>
                <option value="0">Inte avklarad</option><option value="partial">Delvis</option><option value="100">Avklarad</option>
              </select>
            </label>
            {edit.percent > 0 && edit.percent < 100 && <label>Uppfyllt %<input type="number" min="1" max="99" value={edit.percent} onChange={e => setEdits(old => ({ ...old, [a.id]: { ...edit, percent: Number(e.target.value) } }))} /></label>}
            <label>Kommentar<input maxLength={1000} value={edit.note} onChange={e => setEdits(old => ({ ...old, [a.id]: { ...edit, note: e.target.value } }))} /></label>
            <button disabled={busy || !Number.isInteger(edit.percent) || edit.percent < 0 || edit.percent > 100} onClick={() => void mutate(() =>
              api('/participants/' + participant + '/routine-progress/' + a.id, { method: 'PUT', body: JSON.stringify({ date, percent: edit.percent, note: edit.note }) })
            )}>Spara rutin</button>
          </div>;
        })}
      </div>
      {!day.activities.length && <p>Inga rutiner planerade denna dag. Skapa rutiner eller kontrollera deltagarens schema.</p>}
    </div>}
    <details>
      <summary>Aktivitetsgrupper</summary>
      <form onSubmit={e => { e.preventDefault(); void mutate(async () => {
        await api('/activity-groups', { method: 'POST', body: JSON.stringify({ name: groupName.trim() }) });
        setGroupName('');
      }, true); }}>
        <label>Gruppnamn<input maxLength={120} required value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Exempelvis Mat" /></label>
        <button disabled={busy || !groupName.trim()}>Lägg till grupp</button>
      </form>
      {groups.length > 0 && <ul>{groups.map(g => <li key={g.id}>{g.name} · {activities.filter(a => a.group_id === g.id).length} aktiviteter</li>)}</ul>}
      <form onSubmit={e => { e.preventDefault(); void mutate(() =>
        api('/activities/' + groupActivity + '/group', { method: 'PUT', body: JSON.stringify({ group_id: groupId ? Number(groupId) : null }) }), true); }}>
        <label>Aktivitet<select required value={groupActivity} onChange={e => setGroupActivity(e.target.value)}><option value="">Välj aktivitet</option>{activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Grupp<select value={groupId} onChange={e => setGroupId(e.target.value)}><option value="">Fristående</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <button disabled={busy || !groupActivity}>Placera i grupp</button>
      </form>
      <p className="score-footnote">Radera grupper via Säker radering nedan. Aktiviteterna och historiken blir kvar.</p>
    </details>
    <details>
      <summary>Individuella återkommande scheman</summary>
      <form onSubmit={e => { e.preventDefault(); void mutate(() =>
        api('/participants/' + participant + '/schedules/' + scheduleActivity, { method: 'PUT', body: JSON.stringify({
          starts_on: start, ends_on: end || null, frequency, interval_days: intervalDays, weekdays
        }) })); }}>
        <label>Aktivitet<select required value={scheduleActivity} onChange={e => setScheduleActivity(e.target.value)}><option value="">Välj rutin</option>{activities.filter(a => a.daily_weight > 0).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Startdatum<input type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
        <label>Slutdatum (valfritt)<input type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label>Upprepning<select value={frequency} onChange={e => setFrequency(e.target.value as typeof frequency)}><option value="daily">Alla dagar</option><option value="weekdays">Veckodagar</option><option value="interval">Var X:e dag</option></select></label>
        {frequency === 'interval' && <label>Var X:e dag<input type="number" min="1" max="365" value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))} /></label>}
        {frequency === 'weekdays' && <fieldset><legend>Veckodagar</legend>{weekDays.map((name, index) => <label key={name}><input type="checkbox" checked={weekdays.includes(index + 1)} onChange={e => setWeekdays(old => e.target.checked ? [...old, index + 1] : old.filter(d => d !== index + 1))} /> {name}</label>)}</fieldset>}
        <button disabled={busy || !participant || !scheduleActivity || (frequency === 'weekdays' && !weekdays.length)}>Spara schema</button>
      </form>
      <ul>{schedules.map(s => <li key={s.id}>{activities.find(a => a.id === s.activity_id)?.name ?? 'Rutin'} – {s.frequency === 'daily' ? 'Dagligen' : s.frequency === 'interval' ? 'Var ' + s.interval_days + ':e dag' : 'Veckodagar ' + s.weekdays} från {s.starts_on}</li>)}</ul>
    </details>
  </section>;
}
