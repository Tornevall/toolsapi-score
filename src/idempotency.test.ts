import { describe, expect, it } from 'vitest';
import { prepareEventSubmission } from './idempotency';
const fields = { participant: '1', activity: '11', quantity: 1, historicalDate: '' };
const now = () => new Date('2026-10-26T18:00:00Z');

describe('event idempotency on uncertain responses', () => {
  it('reuses the same key and timestamp across network failure/retry with unchanged form fields', () => {
    let allocated = 0;
    const uuid = () => String(++allocated);
    const first = prepareEventSubmission(null, fields, uuid, now);
    const retry = prepareEventSubmission(first, fields, uuid, () => new Date('2026-10-26T18:10:00Z'));
    expect(retry).toBe(first);
    expect(retry.key).toBe('1');
    expect(retry.occurredAt).toBe('2026-10-26T18:00:00.000Z');
    expect(allocated).toBe(1);
  });
  it('allocates a fresh key only when the logical payload changes', () => {
    let allocated = 0;
    const uuid = () => String(++allocated);
    const first = prepareEventSubmission(null, fields, uuid, now);
    const change = prepareEventSubmission(first, { ...fields, quantity: 2 }, uuid, now);
    expect(change.key).toBe('2');
    expect(change.signature).not.toBe(first.signature);
  });
  it('uses local noon for a backdated entry, avoiding midnight date-boundary rollovers', () => {
    const item = prepareEventSubmission(null, { ...fields, historicalDate: '2026-10-24' }, () => 'x', now);
    expect(item.occurredAt).toContain('2026-10-24');
  });
});
