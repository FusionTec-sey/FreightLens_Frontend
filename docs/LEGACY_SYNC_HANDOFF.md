# Legacy MySQL sync handoff (2026-10-08)

## Agreed scope

- Source: **only** the remote MySQL `containermgmt` database. Do not connect to or import `usercredentials`.
- Target: the PostgreSQL database used by the current backend Docker Compose stack.
- Import matching operational tables; retain unmapped tables as source-row archives. Exclude the temporary upgrade copies `container_details02` and `bill_of_landing_backup` entirely.
- Separate records by consignee-derived organisation. Create a temporary `legacy-unknown` organisation for unresolved ownership; remap its records later, then remove it.
- All database credentials belong in the backend environment, never in React. The user will update them. Do not put the password shared in chat in code, docs or command arguments.

## Work completed

- Read-only live source inspection: 20 tables, including the two excluded upgrade copies; 797 bills of landing, 2,134 containers, 782 container/material links, 136 suppliers, plus reference tables. No product, PO, stock movement or payment tables in the source database.
- Legacy consignees: Noblecon Enterprise, Sahajanand, and a blank entry. Some bills/containers have no resolved consignee.
- Target Docker PostgreSQL initially had only the Sahaj root organisation and no rows in matching legacy business tables.
- Frontend: `src/component/Pages/Admin/LegacySyncPanel.js`, mounted root-only in `AdminOverview.js`. Check previews table counts, then Apply requires explicit confirmation.
- Backend: `Routes/LegacySyncRouter.py`, `Services/legacy_sync_service.py`, `Utils/migrate_20261008_legacy_sync.py`, wiring in `containerMgmt.py`, MySQL driver in `requirements.txt`, environment passthrough in the existing untracked `docker-compose.dev.yml`, and `docs/LEGACY_SYNC.md`.
- Backend stores every in-scope source row with source key/hash and run provenance. Supported rows import in FK order. Repeat runs skip unchanged rows; local target edits become conflicts. Audit user IDs are cleared in operational rows because the old credentials database is excluded, but remain in archived source JSON.
- Live apply run 1 imported 4,164 rows and created `legacy-unknown`, `noblecon`, and `sahajanand`; 7 `status` rows remain conflicts. The organisation insert now supplies the root organisation's required `base_currency`.
- Root platform admins now receive all active organisations in backend scope even when their stored assignment is only the root tenant. The shared header mounts the organisation switcher; BL/container lists and reference options refresh when it changes. Ordinary root users remain assignment-scoped.

## Verification

- Backend focused tests passed before the later table exclusions and currency fix. The current Docker image has no pytest installation; the excluded-table and organisation-creation paths were checked directly.
- Synthetic read-only preview against current Docker PostgreSQL succeeded.
- Frontend `npm run build` succeeded with existing lint/Browserslist warnings.
- A post-apply read-only preview reported 4,164 unchanged rows, 7 conflicts, and no organisations left to create.
- Live admin API checks returned 4 organisations, 796 visible bills of lading, and 2,133 visible containers (one of each imported record is soft-deleted). Selecting Noblecon through `X-Active-Org` returned 1,767 visible containers. The frontend production build succeeded and is bind-mounted into the nginx container on port 13000.

## Remaining before use

1. `Backend/.env.local` contains the supplied host, port, username, and password. Compose parsing succeeded and each source key occurs once. `LEGACY_MYSQL_SSL_CA` is optional and remains blank. Use a read-only MySQL account after rotating the root password shared in chat.
2. The backend Docker service was rebuilt with PyMySQL and the updated env. Rebuild/recreate the frontend service to show the button.
3. The live source has 4,171 in-scope rows after excluding 1,592 `container_details02` and 573 `bill_of_landing_backup` rows. Review the 7 remaining `status` conflicts in the authenticated root-admin UI; rerunning apply will leave them as conflicts unless they are resolved.
4. Reconcile operational row counts, foreign keys, organisation ownership, and referenced document files. The sync copies document path metadata, not file content. Review/remap `legacy-unknown` records before deleting that organisation.

## Worktree caution

Both repositories have unrelated pre-existing local changes, especially the Backend planning files and Docker files. No branch switches, commits, pushes, or broad cleanup were performed. The temporary probe/staging scripts created for this implementation were removed.
