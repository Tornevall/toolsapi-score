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

**Integration status:** ToolsAPI implements the Score endpoints on the matching backend feature branch. Deploy the matching ToolsAPI and React branches together; the frontend alone cannot serve or persist data. Automatic daily earning, payout settlement and Android integration are not yet implemented.

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
