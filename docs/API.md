# Backend integration contract

The frontend expects authenticated same-origin endpoints under `/api/score` (no API version path).

- `GET /participants`: Participant[]
- `GET /activities`: Activity[]
- `GET /statistics`: Summary[]
- `GET /deductions`: Deduction[]
- `POST /events`: {participant_id, activity_id, quantity, occurred_at}; send Idempotency-Key.

All response shapes are defined in `src/api.ts`. These routes are a proposed contract, not an assertion that the ToolsAPI backend already implements them.

Production deployments must use the authenticated ToolsAPI origin, secure session cookies and appropriate CSRF protection for state-changing requests. Never place a privileged API token in the browser bundle. The backend must enforce ownership and parent approvals, ledger consistency and audit logging. Rewards, schedules, corrections and approval screens will be implemented against confirmed backend contracts in later PRs.

## Planned allowance contract (not implemented)

ToolsAPI must provide owner-authorized allowance plans, eligible scheduled routines, exemption decisions, approved completion events, immutable revisions, and payout status. Frontend preview logic in `src/allowance.ts` is non-authoritative; never trust client-supplied earnings, completion percentages, or approvals. Store monetary values as integer minor units and ensure atomic cap enforcement/idempotency on the backend. An AI auditor may flag inconsistencies but must not approve, deduct, or transfer funds. Damage incidents are separate from earned allowances. No new API routes are asserted by this section.
