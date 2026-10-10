export type Participant = { id: number; name: string; linked_user_id: number | null };
export type Activity = { id: number; name: string; points: number; category_id: number };
export type Summary = { participant_id: number; positive_points: number; negative_points: number; net_points: number; completed_count: number; completed_quantity: number };
export type Deduction = { id: number; participant_id: number; reason: string; points: number; occurred_at: string };
export type EventInput = { participant_id: number; activity_id: number; quantity: number; occurred_at: string };
const BASE = '/api/score';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(BASE + path, { ...options, credentials: 'include', headers: { 'Accept': 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  if (!response.ok) throw new Error(response.status === 401 ? 'Logga in i ToolsAPI först.' : `API-fel (${response.status}).`);
  return response.json() as Promise<T>;
}
export function submitEvent(event: EventInput, idempotencyKey: string): Promise<unknown> {
  return api('/events', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(event) });
}
