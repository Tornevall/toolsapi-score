import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, submitEvent } from './api';
afterEach(() => vi.unstubAllGlobals());
describe('Score API', () => {
  it('handles successful empty 204 responses', async () => {
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
});
