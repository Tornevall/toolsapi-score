import React, { useEffect, useState } from 'react';
import { api, type Activity } from './api';

type DailyReview = { id: number; review_date: string; expected_quantity: number; completed_quantity: number; completion_percent: number; credited_minor: number };
type Earnings = { month: string; base_minor: number; bonus_minor: number; earned_minor: number; monthly_cap_minor: number };
const sek = (minor: number) => (minor / 100).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' });

export function DailyEarnings({ participant, activities }: { participant: string; activities: Activity[] }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expected, setExpected] = useState(1);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!participant) { setReviews([]); setEarnings(null); return; }
    let active = true;
    Promise.all([
      api<DailyReview[]>('/participants/' + participant + '/daily-reviews'),
      api<Earnings>('/participants/' + participant + '/monthly-earnings?month=' + month)
    ]).then(([days, totals]) => {
      if (active) { setReviews(days); setEarnings(totals); setError(''); }
    }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [participant, month]);
  async function approve(e: React.FormEvent) {
    e.preventDefault();
    if (!participant || !Number.isInteger(expected) || expected < 1) return;
    setBusy(true); setError('');
    try {
      await api('/participants/' + participant + '/daily-reviews', {
        method: 'POST', body: JSON.stringify({ review_date: date, expected_quantity: expected, excluded_activity_ids: excluded })
      });
      const [days, totals] = await Promise.all([
        api<DailyReview[]>('/participants/' + participant + '/daily-reviews'),
        api<Earnings>('/participants/' + participant + '/monthly-earnings?month=' + month)
      ]);
      setReviews(days); setEarnings(totals);
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }
  return <section>
    <h2>Heldagsbonus och intjänat</h2>
    <p>Föräldern anger dagens förväntade antal rutiner. Systemet räknar registrerad mängd, jämför procentgränsen och låser dagens beslut. Inga automatiska straffavdrag.</p>
    {error && <p role="alert" className="error">{error}</p>}
    <label>Redovisningsmånad<input type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
    {earnings && <dl>
      <dt>Grundbelopp</dt><dd>{sek(earnings.base_minor)}</dd>
      <dt>Godkända bonusar</dt><dd>{sek(earnings.bonus_minor)}</dd>
      <dt>Totalt intjänat</dt><dd><strong>{sek(earnings.earned_minor)}</strong></dd>
      <dt>Månadstak</dt><dd>{sek(earnings.monthly_cap_minor)}</dd>
    </dl>}
    <form onSubmit={approve}>
      <label>Datum<input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)} required /></label>
      <label>Förväntat antal rutiner<input type="number" min="1" max="10000" step="1" value={expected} onChange={e => setExpected(Number(e.target.value))} required /></label>
      <button disabled={busy || !participant || expected < 1 || !Number.isInteger(expected)}>Godkänn dagen</button>
    </form>
    <h3>Godkända dagar</h3>
    <ul>{reviews.map(r => <li key={r.id}>{r.review_date}: {r.completed_quantity}/{r.expected_quantity} ({r.completion_percent} %) – {sek(r.credited_minor)}</li>)}</ul>
  </section>;
}
