# Tools Score

Open-source React + TypeScript frontend for ToolsAPI's individual activity and scoring system. Designed for parent-managed participants (including children without their own accounts), and general-purpose tracking.

## Current features

- Participant selection and activity registration with quantity
- Per-participant completed activity counts and completed quantities
- Positive points, separate negative points and net score
- Read-only list of negative events
- Participant and activity administration, monthly allowance plan settings and comments on participants or events
- Goal cards, checklists, progress tracking and manual goal approval
- Parent-approved daily completion reviews and monthly earned allowance overview
- Activity event history with direct comment-to-event selection
- Typed HTTP client with session credentials and an idempotency key for registrations

**Integration status:** The unversioned Score owner, routine, account-consent and deletion endpoints are implemented in Tornevall/toolsApi on master. This React project is a separate client, not yet automatically deployed on /score merely by merging this PR. Serve on the authenticated ToolsAPI origin with normal web sessions and CSRF protection. Payout settlement and the separate Today/calendar-day buffering PR #2505 are not included.

## Development

Requires Node.js 20+.

```sh
npm install
npm run dev
npm run build
npm test
```

Vite proxies `/api` to `http://localhost:8000` by default. Override with `TOOLSAPI_DEV_ORIGIN` in the shell or local `.env`. Production should serve the frontend under the same trusted origin as ToolsAPI or configure authenticated CORS/CSRF correctly.

Do not put API tokens, credentials or secrets in frontend environment variables.

## Repository boundaries

- **This repository:** Public frontend and UI tests.
- **Tornevall/toolsApi:** Laravel persistence, account ownership, authorization, event ledger, approvals, audit, schedules, rewards and API.
- **Android app:** Consumes the same backend contract, independently of this React bundle.

See [AGENTS.md](AGENTS.md) for contributor rules and [CHANGELOG.md](CHANGELOG.md) for changes.

## License

No license has been selected yet. Public visibility alone does not grant redistribution or modification rights; the repository owner should select an open-source license before inviting external reuse.

## Allowance calculation foundation

`src/allowance.ts` contains pure, frontend-only preview calculations for a configurable monthly cap, optional base amount, and weighted daily completion bonus with a percentage threshold. Point visibility and positive/negative settings are modeled independently. A day without eligible routines does not qualify. Money uses integer minor units. No backend endpoints, bank transfers, or approval workflow are implemented by these calculations; ToolsAPI must independently validate and authorize every ledger mutation.

## Goals and planning (work in progress)
The React client now has visual goal cards with category (personal, reward, planning), level and achievability ratings (1–5), a due date, a checklist and progress indicator. Owners can complete steps and approve completed goals using ToolsAPI session-authenticated endpoints. Completing or approving a goal does not automatically grant network access, pay money, or redeem a reward.

## Visual design

The interface uses responsive cards, accessible focus outlines, 44px minimum control heights, high-contrast notices and a mobile single-column layout. Styling is maintained in `src/style.css` without additional UI dependencies.

Activity registration supports an optional historical date. Leaving it blank records the current time; choosing a date records local noon on that date. Already approved daily reviews are immutable and are not recalculated by backdated entries.

Historical observations can be independent or linked to a routine. Choose note, activity, goal or deviation; mark complete, partial, incomplete or observation; optionally enter completed/expected counts and explanatory text. These entries do not change score points or allowance.

The Score overview now includes monthly earnings, approved-day completion percentage, completed-quantity totals, recent observations, and lightweight CSS bar charts. Event-based activity totals are limited to the latest 100 events returned by the backend; the interface explicitly labels this limitation. The 80% dashboard counter is illustrative of that threshold and does not yet follow each participant's configured bonus threshold.

## Score Today, account links and safe deletion

The React interface supports dated routine completion (0/partial/100 percent), custom groups, per-participant recurring schedules, Tools account consent invitations and a recipient-only read view. Owners can preview and permanently delete a participant, activity, event or group only after entering the exact name and confirming a short-lived signed preview. Deleting a participant removes that participant's history/links, not shared activity definitions; deleting an event/activity keeps its detached comments or observations. The backend enforces authentication, ownership, transactions, audit and permanent-deletion rules.

Browser mutations authenticate through the current ToolsAPI web session using a CSRF meta token or same-origin Laravel XSRF cookie. Never embed a long-lived bearer token, service token, account JWT or credentials in the React app.
