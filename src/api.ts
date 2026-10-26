export type Participant = { id: number; name: string; linked_user_id: number | null };
export type Activity = { id: number; name: string; points: number; category_id: number; daily_weight: number; group_id: number | null };
export type Summary = { participant_id: number; positive_points: number; negative_points: number; net_points: number; completed_count: number; completed_quantity: number };
export type Deduction = { id: number; participant_id: number; reason: string; points: number; occurred_at: string };
export type EventInput = { participant_id: number; activity_id: number; quantity: number; occurred_at: string };
const BASE = '/api/score';
function csrfHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {}; // Vitest/server-side rendering.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  if (meta) return { 'X-CSRF-TOKEN': meta };
  // Laravel's web CSRF middleware also validates X-XSRF-TOKEN from its same-origin cookie.
  const xsrf = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith('XSRF-TOKEN='));
  return xsrf ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf.slice('XSRF-TOKEN='.length)) } : {};
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(BASE + path, { ...options, credentials: 'same-origin', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.method && !['GET', 'HEAD'].includes(options.method.toUpperCase()) ? csrfHeaders() : {}), ...options.headers } });
  if (!response.ok) {
    let detail: { message?: string } = {};
    try { detail = await response.json() as { message?: string }; } catch { /* Non-JSON error */ }
    throw new Error(response.status === 401 || response.status === 419 ? 'Logga in på ToolsAPI och ladda om sidan.' : detail.message ?? `API-fel (${response.status}).`);
  }
  if (response.status === 204 || response.headers.get('Content-Length') === '0') return undefined as T;
  const body = await response.text();
  return body.trim() ? JSON.parse(body) as T : undefined as T;
}
export function submitEvent(event: EventInput, idempotencyKey: string): Promise<void> {
  return api<void>('/events', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(event) });
}
