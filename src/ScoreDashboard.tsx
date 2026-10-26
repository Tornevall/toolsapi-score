import React, { useEffect, useMemo, useState } from 'react';
import { api, type Activity, type Participant, type Summary } from './api';

type EventRow = { id: number; activity_id: number; activity_name: string; quantity: number; points_snapshot: number; occurred_at: string };
type Review = { id: number; review_date: string; completion_percent: number; credited_minor: number };
type Earnings = { month: string; base_minor: number; bonus_minor: number; earned_minor: number; monthly_cap_minor: number };
type Observation = { id: number; observed_on: string; kind: string; status: string; title: string };
const monthNow = () => new Date().toLocaleDateString('sv-SE').slice(0, 7);
const money = (minor: number) => (minor / 100).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' });
const dateKey = (value: string) => value.slice(0, 10);

export function ScoreDashboard({ participant, participants, activities, summaries }: { participant: string; participants: Participant[]; activities: Activity[]; summaries: Summary[] }) {
  const [month, setMonth] = useState(monthNow);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!participant) { setEvents([]); setReviews([]); setObservations([]); setEarnings(null); return; }
    let active = true;
    Promise.all([
      api<EventRow[]>('/participants/' + participant + '/events'),
      api<Review[]>('/participants/' + participant + '/daily-reviews'),
      api<Observation[]>('/participants/' + participant + '/observations'),
      api<Earnings>('/participants/' + participant + '/monthly-earnings?month=' + month)
    ]).then(([e, r, o, totals]) => {
      if (active) { setEvents(e); setReviews(r); setObservations(o); setEarnings(totals); setError(''); }
    }).catch(err => { if (active) setError(String(err)); });
    return () => { active = false; };
  }, [participant, month]);
  const current = summaries.find(s => String(s.participant_id) === participant);
  const monthReviews = useMemo(() => reviews.filter(r => r.review_date.startsWith(month)), [reviews, month]);
  const avg = monthReviews.length ? Math.round(monthReviews.reduce((sum, r) => sum + r.completion_percent, 0) / monthReviews.length) : null;
  const complete = monthReviews.filter(r => r.completion_percent >= 80).length;
  const monthEvents = events.filter(e => dateKey(e.occurred_at).startsWith(month));
  const activityTotals = activities.map(a => ({ name: a.name, total: monthEvents.filter(e => e.activity_id === a.id).reduce((sum, e) => sum + e.quantity, 0) })).filter(a => a.total > 0).sort((a, b) => b.total - a.total).slice(0, 6);
  const chart = monthReviews.slice().sort((a, b) => a.review_date.localeCompare(b.review_date)).slice(-14);
  const maxActivity = Math.max(1, ...activityTotals.map(a => a.total));
  const recent = observations.slice(0, 4);
  return <section className="score-dashboard">
    <div className="score-dashboard-heading">
      <div><h2>Översikt · {participants.find(p => String(p.id) === participant)?.name ?? 'Deltagare'}</h2>
        <p>Statistik och uppföljning baserad på registrerade uppgifter.</p></div>
      <label>Månad<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="score-kpis">
      <article><span>Måluppfyllelse</span><strong>{avg === null ? '–' : avg + ' %'}</strong><small>Genomsnitt av godkända dagar</small></article>
      <article><span>Utförda moment</span><strong>{current?.completed_quantity ?? 0}</strong><small>Totalt, alla datum</small></article>
      <article><span>Intjänat</span><strong>{earnings ? money(earnings.earned_minor) : '–'}</strong><small>{earnings ? 'Av ' + money(earnings.monthly_cap_minor) : 'Ingen plan'}</small></article>
      <article><span>Dagar ≥ 80 %</span><strong>{complete}</strong><small>Av {monthReviews.length} godkända dagar</small></article>
    </div>
    <div className="score-chart-grid">
      <article><h3>Måluppfyllelse per dag</h3>
        {chart.length ? <div className="score-bars" role="img" aria-label="Godkända dagars måluppfyllelse i procent">
          {chart.map(r => <div key={r.id} className="score-bar-column" title={r.review_date + ': ' + r.completion_percent + ' %'}>
            <span>{r.completion_percent}%</span><div className="score-bar-track"><div style={{ height: Math.max(0, Math.min(100, r.completion_percent)) + '%' }} /></div>
            <small>{r.review_date.slice(8)}</small></div>)}
        </div> : <p>Inga godkända dagar för månaden ännu.</p>}</article>
      <article><h3>Vanligaste aktiviteterna</h3>
        {activityTotals.length ? <div className="score-activity-bars">{activityTotals.map(a => <div key={a.name}>
          <div className="score-activity-label"><span>{a.name}</span><strong>{a.total}</strong></div>
          <div className="score-activity-track"><div style={{ width: (100 * a.total / maxActivity) + '%' }} /></div>
        </div>)}</div> : <p>Inga registrerade aktiviteter för månaden ännu.</p>}</article>
    </div>
    <h3>Senaste uppföljningar</h3>
    {recent.length ? <ul className="score-recent">{recent.map(o => <li key={o.id}><strong>{o.observed_on} · {o.title}</strong><span>{o.status === 'partial' ? 'Delvis uppfyllt' : o.status === 'completed' ? 'Uppfyllt' : o.status === 'not_completed' ? 'Inte uppfyllt' : 'Observation'}</span></li>)}</ul> : <p>Inga uppföljningar registrerade ännu.</p>}
    <p className="score-footnote">Aktivitetsstatistik visar de senaste 100 registreringarna som API:et returnerar. Dagsdiagrammet visar högst 14 godkända dagar. Värdena är därför inte fullständig historisk statistik.</p>
  </section>;
}
