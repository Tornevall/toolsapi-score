# Score API contract (existing ToolsAPI endpoints)

All relative paths below use the canonical unversioned `/api/score` prefix. ToolsAPI enforces web-session authentication, CSRF on writes, parent/recipient authorization and resource ownership. This React repository does not supply its own backend or privileged tokens.

## Owner workflows

- `GET/POST /participants`; `GET/POST /activities`; `GET /statistics`; `GET /deductions`; `GET /allowance-plans`; `PUT /allowance-plans/{participant}`.
- `GET /participants/{participant}/events`; `POST /events` with a stable `Idempotency-Key` for uncertain retries; `GET/POST /participants/{participant}/comments` and `/observations`.
- `GET/POST /participants/{participant}/goals`; `POST /goals/{goal}/steps/{step}/complete`; `POST /goals/{goal}/approve`.
- `GET/POST /participants/{participant}/daily-reviews`; `GET /participants/{participant}/monthly-earnings?month=YYYY-MM`. ToolsAPI computes eligible routines and caps, not the browser.
- `GET/POST /activity-groups`; `PUT /activities/{activity}/group` with nullable `group_id`. Activities share a household owner and retain their point-value history.
- `GET /participants/{participant}/routine-progress?date=YYYY-MM-DD`; `PUT /participants/{participant}/routine-progress/{activity}` with `{date, percent, note}`. Percent may be 0-100.
- `GET /participants/{participant}/schedules`; `PUT /participants/{participant}/schedules/{activity}` with `{starts_on, ends_on, frequency, interval_days, weekdays}`. Frequency is `daily`, `weekdays` or `interval`.

## Consent and read-only recipient

- Owner: `GET /link-requests`; `POST /participants/{participant}/link-request` `{email}`; `DELETE /participants/{participant}/link`.
- Recipient: `GET /me/invitations`; `POST /me/invitations/{invitation}/respond` `{decision}`; `GET /me/linked`; `GET /me/linked/{participant}?date=YYYY-MM-DD&month=YYYY-MM`; `DELETE /me/linked/{participant}`.
- Recipient read access to a linked participant never grants permission to mutate its owner records.

## Impact preview and irreversible delete

- `GET /deletions/{type}/{id}` yields `{type,id,name,note,effects,token,expires_at}`; `DELETE /deletions/{type}/{id}` requires the unchanged `{name,token,expires_at}`.
- Allowed types: `participant`, `activity`, `event`, `group`. A signed impact token expires after ten minutes; changed dependent state produces HTTP 409 and requires a fresh preview.
- Legacy `DELETE /activity-groups/{group}` requires the same signed confirmation. All deletions are owner-only, atomic and independently audited; linked users cannot delete.

## Deployment

This client must be built and served on the same trusted ToolsAPI origin, with a real web login/CSRF session. The Vite development `/api` proxy does not replace login. Merge of this standalone repository does not install a production `/score-client` route. The existing native Tools Score web page at `/score` remains the available deployed entry point until a separate release integrates the React bundle.
No API URL versions are used.
