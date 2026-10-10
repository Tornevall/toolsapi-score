# Backend integration contract

The frontend expects authenticated same-origin endpoints under `/api/score` (no API version path).

- `GET /participants`: Participant[]
- `GET /activities`: Activity[]
- `GET /statistics`: Summary[]
- `GET /deductions`: Deduction[]
- `POST /events`: {participant_id, activity_id, quantity, occurred_at}; send Idempotency-Key.

All response shapes are defined in `src/api.ts`. These routes are a proposed contract, not an assertion that the ToolsAPI backend already implements them.

Production deployments must use the authenticated ToolsAPI origin, secure session cookies and appropriate CSRF protection for state-changing requests. Never place a privileged API token in the browser bundle. The backend must enforce ownership and parent approvals, ledger consistency and audit logging. Rewards, schedules, corrections and approval screens will be implemented against confirmed backend contracts in later PRs.
