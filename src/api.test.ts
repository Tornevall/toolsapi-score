import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, submitEvent } from './api';
afterEach(() => vi.unstubAllGlobals());

describe('Score API', () => {
  it('handles empty 204 responses with a preserved idempotency header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(submitEvent({ participant_id: 1, activity_id: 2, quantity: 1, occurred_at: '2026-10-11T00:00:00Z' }, 'same-key')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('same-key');
  });
  it('handles empty 201 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 201 })));
    await expect(submitEvent({ participant_id: 1, activity_id: 2, quantity: 1, occurred_at: '2026-10-11T00:00:00Z' }, 'key')).resolves.toBeUndefined();
  });
  it('reports authentication errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(api('/participants')).rejects.toThrow('Logga in');
  });
  it('keeps the signed deletion request on the canonical session URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const confirm = { name: 'Emily', token: 'signed', expires_at: '2026-10-26T20:00:00+01:00' };
    await api('/deletions/participant/9', { method: 'DELETE', body: JSON.stringify(confirm) });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/score/deletions/participant/9');
    expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin');
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify(confirm));
  });
  it('provides server detail for stale deletion confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Granska igen' }), { status: 409 })));
    await expect(api('/deletions/event/5', { method: 'DELETE', body: '{}' })).rejects.toThrow('Granska igen');
  });
});
