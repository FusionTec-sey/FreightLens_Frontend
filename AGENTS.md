# FreightLens frontend collaboration instructions

Read `docs/ARCHITECTURE.md` before changes. The canonical project instructions,
task queue, business decisions and collaboration handoff live in the backend repo:

- `AGENTS.md` and the relevant `.agents/rules/` files (especially frontend and UI layout).
- `docs/ARCHITECTURE.md` and the latest ten `docs/ARCHITECTURE_LOG.md` entries.
- `docs/planning/TASK-QUEUE.txt`
- `docs/planning/BUSINESS-DECISIONS.txt`
- `docs/planning/COLLABORATION-HANDOFF.txt`

Use the paired backend checkout, normally `../FreightLens_Backend`, or fetch these
files from the agreed backend revision. Do not invent a second plan in this repo.
Recheck published decisions before each task, PR and merge; record their revision
in the PR. Coordinate shared routes, navigation, permissions and API contracts.
Do not edit the other developer's checkout or overwrite their work.

Reuse components and clients, enforce access on the backend, paginate growing
tables on the server and contain scrolling within the fixed shell. No operational
KPI cards. Retain failed saves and stable retry identities; no placeholder success.
Browser automation requires explicit approval for the intended checks. No real
data, deployment, customer messaging or financial activation without approval.
Rule changes still require prior discussion and explicit owner approval.
