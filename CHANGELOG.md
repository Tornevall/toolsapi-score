# Changelog

## Unreleased
- Allow activity registration on an explicitly selected historical date, with the current timestamp as default.
- Refresh the Score visual design with responsive layouts, clear card hierarchy, keyboard focus states, and accessible form controls.
- Configure weighted daily routines and exempt individual routines when approving a day; backend calculates completion from eligible weights.
- Add parent-approved daily completion reviews with monthly capped bonus totals from ToolsAPI. Reviews are immutable and auditable; automatic payments are not included.
- Add participant and activity creation, allowance-plan editing, participant/event comments and goal/checklist approval interface.
- Display signed activity point values and comment-linked event identifiers.
- Add configurable allowance plan types, weighted percentage-based daily bonus preview calculations, monthly credit caps and focused unit tests. No server-side payouts or persistence yet.
- Bootstrap a standalone React + TypeScript Score frontend.
- Add typed API client, activity registration, participant summaries, and separate deduction display.
- Document authentication expectations and backend integration requirements.
