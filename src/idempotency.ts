export type PendingEvent = { signature: string; key: string; occurredAt: string };
export type EventFields = { participant: string; activity: string; quantity: number; historicalDate: string };

// Keep an idempotency key across uncertain HTTP errors, unless the form payload changed.
export function prepareEventSubmission(
  current: PendingEvent | null, values: EventFields, uuid: () => string, clock: () => Date
): PendingEvent {
  const signature = JSON.stringify([values.participant, values.activity, values.quantity, values.historicalDate]);
  if (current && current.signature === signature) return current;
  return {
    signature, key: uuid(),
    occurredAt: values.historicalDate ? new Date(values.historicalDate + 'T12:00:00').toISOString() : clock().toISOString()
  };
}
