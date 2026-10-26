import React, { useEffect, useState } from 'react';
import { api, type Activity, type Participant } from './api';

type OwnedLink = { participant_id: number; participant_name: string; linked_user_id: number | null; linked_user_name: string | null; request_status: string | null; expires_at: string | null };
type Invitation = { id: number; owner_name: string; participant_name: string; expires_at: string };
type Linked = { id: number; name: string; owner_name: string };
type LinkedDetail = {
  participant: { id: number; name: string }; date: string; month: string;
  routines: { id: number; name: string; group_name: string | null; percent: number }[];
  completion_percent: number | null;
  allowance: { earned_minor: number; monthly_cap_minor: number; base_minor: number; bonus_minor: number };
  recent_reviews: { review_date: string; completion_percent: number; credited_minor: number }[];
};
type PreviewType = 'participant' | 'activity' | 'event' | 'group';
type DeletePreview = { type: PreviewType; id: number; name: string; note: string; token: string; expires_at: string; effects: Record<string, number> };
type Event = { id: number; activity_name: string; occurred_at: string };
type Group = { id: number; name: string };
const types: Record<PreviewType, string> = { participant: 'Deltagare', activity: 'Aktivitet', event: 'Registrering', group: 'Grupp' };
const effectLabels: Record<string, string> = {
  events: 'Registreringar som raderas', comments: 'Kommentarer som raderas',
  observations: 'Observationer som raderas', goal_steps: 'Checklistepunkter som raderas', goals: 'Mål som raderas',
  daily_reviews: 'Godkända dagsbeslut som raderas', routine_progress: 'Rutinhistorik som raderas',
  schedule_exceptions: 'Schemaundantag som raderas', schedules: 'Scheman som raderas',
  allowance_plans: 'Ersättningsplaner som raderas', account_links: 'Kontokopplingar som raderas',
  comments_detached: 'Kommentarer som behålls utan registreringskoppling',
  observations_detached: 'Observationer som behålls utan aktivitetskoppling',
  activities_ungrouped: 'Aktiviteter som behålls och blir fristående'
};
const today = () => new Date().toLocaleDateString('sv-SE');
const money = (minor: number) => (minor / 100).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' });

export function ScoreAccountsAndDeletion({ participant, participants, activities, revision, refresh }: {
  participant: string; participants: Participant[]; activities: Activity[]; revision: number; refresh: () => Promise<void>;
}) {
  const [owned, setOwned] = useState<OwnedLink[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [linked, setLinked] = useState<Linked[]>([]);
  const [recipient, setRecipient] = useState('');
  const [linkParticipant, setLinkParticipant] = useState('');
  const [linkMessage, setLinkMessage] = useState('');
  const [selectedLinked, setSelectedLinked] = useState('');
  const [linkedDetail, setLinkedDetail] = useState<LinkedDetail | null>(null);
  const [linkedDate, setLinkedDate] = useState(today);
  const [linkedMonth, setLinkedMonth] = useState(() => today().slice(0, 7));
  const [deleteType, setDeleteType] = useState<PreviewType>('participant');
  const [deleteId, setDeleteId] = useState('');
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [typed, setTyped] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [ownedRows, pending, mine, groupRows, eventRows] = await Promise.all([
      api<OwnedLink[]>('/link-requests'), api<Invitation[]>('/me/invitations'),
      api<Linked[]>('/me/linked'), api<Group[]>('/activity-groups'),
      participant ? api<Event[]>('/participants/' + participant + '/events') : Promise.resolve([])
    ]);
    setOwned(ownedRows); setInvitations(pending); setLinked(mine);
    setGroups(groupRows); setEvents(eventRows);
    setLinkParticipant(old => ownedRows.some(r => String(r.participant_id) === old) ? old : String(ownedRows[0]?.participant_id ?? ''));
    setSelectedLinked(old => mine.some(r => String(r.id) === old) ? old : '');
    setError('');
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      api<OwnedLink[]>('/link-requests'), api<Invitation[]>('/me/invitations'),
      api<Linked[]>('/me/linked'), api<Group[]>('/activity-groups'),
      participant ? api<Event[]>('/participants/' + participant + '/events') : Promise.resolve([])
    ]).then(([o, i, m, g, e]) => {
      if (!active) return;
      setOwned(o); setInvitations(i); setLinked(m); setGroups(g); setEvents(e);
      setLinkParticipant(old => o.some(x => String(x.participant_id) === old) ? old : String(o[0]?.participant_id ?? ''));
      setSelectedLinked(old => m.some(x => String(x.id) === old) ? old : '');
    }).catch(e => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [participant, revision]);

  useEffect(() => {
    if (!selectedLinked) { setLinkedDetail(null); return; }
    let active = true;
    api<LinkedDetail>('/me/linked/' + selectedLinked + '?date=' + linkedDate + '&month=' + linkedMonth)
      .then(data => { if (active) setLinkedDetail(data); })
      .catch(e => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [selectedLinked, linkedDate, linkedMonth, revision]);

  // A changed target always invalidates an earlier irreversible-delete preview.
  useEffect(() => { setPreview(null); setTyped(''); }, [deleteType, deleteId, participant, revision]);

  async function act(operation: () => Promise<unknown>, syncOwner = false) {
    setBusy(true); setError('');
    try {
      await operation();
      await load();
      if (syncOwner) await refresh();
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  const choices: { id: number; name: string }[] = deleteType === 'participant' ? participants :
    deleteType === 'activity' ? activities :
    deleteType === 'group' ? groups :
    events.map(e => ({ id: e.id, name: 'Registrering #' + e.id + ' · ' + e.activity_name + ' (' + e.occurred_at + ')' }));
  const visibleDeleteId = choices.some(r => String(r.id) === deleteId) ? deleteId : String(choices[0]?.id ?? '');

  async function requestPreview() {
    if (!visibleDeleteId) return;
    setPreview(null); setTyped(''); setBusy(true); setError('');
    try {
      const data = await api<DeletePreview>('/deletions/' + deleteType + '/' + visibleDeleteId);
      setPreview(data);
    } catch (e) { setError(String(e)); }
    finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!preview || typed !== preview.name || !window.confirm('Radera ' + preview.name + ' permanent? Detta går inte att ångra.')) return;
    const current = preview;
    setBusy(true); setError('');
    try {
      await api('/deletions/' + current.type + '/' + current.id, {
        method: 'DELETE', body: JSON.stringify({ name: current.name, token: current.token, expires_at: current.expires_at })
      });
      setPreview(null); setTyped(''); setDeleteId('');
      await refresh(); await load();
      setLinkMessage('Posten och dess valda beroenden raderades.');
    } catch (e) {
      setPreview(null); setTyped('');
      setError(String(e) + ' Förhandsgranska igen innan du försöker radera.');
    } finally { setBusy(false); }
  }

  return <>
    <section>
      <h2>Koppla deltagare till Tools-konton</h2>
      <p>Du kan skicka en inbjudan. Den andra användaren godkänner i sin Score-vy. Registrerade föräldrar och behöriga administratörer kan koppla sina egna deltagare direkt.</p>
      {error && <p role="alert">{error}</p>}
      {linkMessage && <p role="status">{linkMessage}</p>}
      {owned.length > 0 && <form onSubmit={e => { e.preventDefault(); void act(async () => {
        const result = await api<{ status: 'pending' | 'accepted' }>('/participants/' + linkParticipant + '/link-request', {
          method: 'POST', body: JSON.stringify({ email: recipient.trim() })
        });
        setRecipient('');
        setLinkMessage(result.status === 'accepted' ? 'Kontot kopplades direkt.' : 'Om kontot finns visas en inbjudan för mottagaren.');
      }); }}>
        <label>Deltagare<select value={linkParticipant} onChange={e => setLinkParticipant(e.target.value)}>{owned.map(p => <option key={p.participant_id} value={p.participant_id}>{p.participant_name}</option>)}</select></label>
        <label>Kontots e-postadress<input type="email" required maxLength={254} value={recipient} onChange={e => setRecipient(e.target.value)} /></label>
        <button disabled={busy || !linkParticipant || !recipient.trim()}>Skicka inbjudan</button>
      </form>}
      <ul>{owned.map(p => <li key={p.participant_id}>
        {p.participant_name}: {p.linked_user_id !== null ? 'Kopplat till ' + (p.linked_user_name ?? 'Tools-konto') : p.request_status === 'pending' ? 'Väntar på samtycke' : 'Inte kopplat'}
        {(p.linked_user_id !== null || p.request_status === 'pending') && <button className="secondary" disabled={busy}
          onClick={() => { if (window.confirm('Återkalla kontokopplingen?')) void act(() => api('/participants/' + p.participant_id + '/link', { method: 'DELETE' })); }}>Återkalla</button>}
      </li>)}</ul>
      {!owned.length && <p>Skapa en deltagare för att kunna skicka inbjudningar.</p>}
    </section>

    <section>
      <h2>Inbjudningar och min läsvy</h2>
      <p>Här kan du läsa en deltagare som kopplats till ditt eget konto. Du kan inte ändra förälderns registreringar.</p>
      {!invitations.length && <p>Inga inbjudningar väntar.</p>}
      <ul>{invitations.map(i => <li key={i.id}>
        {i.owner_name} vill koppla ditt konto till {i.participant_name}.
        <button disabled={busy} onClick={() => void act(() =>
          api('/me/invitations/' + i.id + '/respond', { method: 'POST', body: JSON.stringify({ decision: 'accept' }) }))}>Godkänn</button>
        <button className="secondary" disabled={busy} onClick={() => void act(() =>
          api('/me/invitations/' + i.id + '/respond', { method: 'POST', body: JSON.stringify({ decision: 'decline' }) }))}>Avböj</button>
      </li>)}</ul>
      {linked.length > 0 && <div className="score-inline-controls">
        <label>Kopplat konto<select value={selectedLinked} onChange={e => setSelectedLinked(e.target.value)}>
          <option value="">Välj deltagare</option>{linked.map(p => <option key={p.id} value={p.id}>{p.name} · {p.owner_name}</option>)}
        </select></label>
        <label>Dag<input type="date" value={linkedDate} onChange={e => setLinkedDate(e.target.value)} /></label>
        <label>Månad<input type="month" value={linkedMonth} onChange={e => setLinkedMonth(e.target.value)} /></label>
      </div>}
      {selectedLinked && <button className="secondary" disabled={busy} onClick={() => {
        if (window.confirm('Koppla loss ditt konto?')) void act(async () => {
          await api('/me/linked/' + selectedLinked, { method: 'DELETE' });
          setSelectedLinked(''); setLinkedDetail(null);
        });
      }}>Koppla loss mitt konto</button>}
      {linkedDetail && selectedLinked && <article>
        <h3>{linkedDetail.participant.name} – {linkedDetail.date}</h3>
        <p>Avklarat: {linkedDetail.completion_percent === null ? 'Inga rutiner' : linkedDetail.completion_percent + ' %'}</p>
        <ul>{linkedDetail.routines.map(a => <li key={a.id}>{a.group_name ? a.group_name + ' / ' : ''}{a.name}: {a.percent} %</li>)}</ul>
        <strong>Intjänat för {linkedDetail.month}: {money(linkedDetail.allowance.earned_minor)} / {money(linkedDetail.allowance.monthly_cap_minor)}</strong>
        <ul>{linkedDetail.recent_reviews.map(r => <li key={r.review_date}>{r.review_date} · {r.completion_percent} % · {money(r.credited_minor)}</li>)}</ul>
      </article>}
    </section>

    <section className="score-delete-panel">
      <h2>Säker radering</h2>
      <p>Se vad som försvinner och vad som blir kvar. En signerad förhandsgranskning gäller i tio minuter. Skriv postens exakta namn och bekräfta – åtgärden kan inte ångras.</p>
      <div className="score-inline-controls">
        <label>Typ<select value={deleteType} onChange={e => { setDeleteType(e.target.value as PreviewType); setDeleteId(''); }}>
          {Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
        <label>Post<select value={visibleDeleteId} onChange={e => setDeleteId(e.target.value)}>
          {!choices.length && <option value="">Inga poster</option>}
          {choices.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select></label>
      </div>
      <button disabled={busy || !visibleDeleteId} onClick={() => void requestPreview()}>Granska konsekvenser</button>
      {preview && <div className="score-delete-confirmation">
        <h3>{preview.name}</h3><p>{preview.note}</p>
        <ul>{Object.entries(preview.effects).filter(([, value]) => value > 0).map(([key, count]) =>
          <li key={key}>{effectLabels[key] ?? key}: {count}</li>)}</ul>
        <p>Gäller till {new Date(preview.expires_at).toLocaleString('sv-SE')}</p>
        <label>Skriv namnet exakt<input autoComplete="off" maxLength={160} value={typed} onChange={e => setTyped(e.target.value)} /></label>
        <button className="danger" disabled={busy || typed !== preview.name} onClick={() => void confirmDelete()}>Radera permanent</button>
      </div>}
    </section>
  </>;
}
