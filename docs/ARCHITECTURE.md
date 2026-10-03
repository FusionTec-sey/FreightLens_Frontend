# FreightLens Frontend Architecture

## Parallel-development handoff (2026-10-03)

Backend docs/planning/TASK-QUEUE.txt, BUSINESS-DECISIONS.txt and
COLLABORATION-HANDOFF.txt are canonical; BASELINE-REVISIONS.txt pairs this checkout.
Collaborator owns new T33A count planning/blind entry/recounts/review, not existing
customer screens. No count implementation or stock posting is enabled by the
handoff. Coordinate shared navigation/clients/permissions before changes. Frontend
AGENTS.md points to the backend instructions; do not maintain another plan here.

## Status

Sales drafts -> Overdue follow-up reuses DraftReservations in due-inbox mode, with
server pagination, readable public stock/store labels and fresh checked Open draft.
Only manager review/scheduling users see the entry; backend independently enforces
the scope. Existing permission-aware request forms work on the selected source.
Backend19/frontend16 checks and build main.cd891de3.js pass with existing warnings.
Browser checks pending; evidence t07-due-followup-inbox.txt. This pull-based inbox is
not delivered manager-profile notification, and never releases stock automatically.

Reservation follow-up requests now extend DraftReservations with explicit next
date/time and reason. Device timezone is visible; API receives an aware instant.
Follow-up reviews reuses ManagerCases and PolicyActivation's confirmed-action panel
with domain-specific labels and separate scheduling API. Permissions remain backend
enforced. Latest due flags never imply cancellation or release; dates/quantities
remain visible for exact review. Backend45/frontend33 focused checks and build
main.fffd9b41.js pass with existing warnings. Browser acceptance pending; evidence:
t07-reservation-deadlines.txt. Company-wide due inbox is now implemented as above.

T15A: salesDraftRecovery stores only draft references, versions, exact quantities,
unit choices, conflict state and pending operation payload. Local records are scoped
to active company/user, carry explicit branch identity and support branch filtering.
Web Locks plus expected revisions serialize local writes/deletes. Up to100 records
per scope; unsupported browser locks or quota failure is explicit, not silent loss.
SalesDraftEditor persists before sending, restores identical pending requests and
clears only on confirmed server save or explicit discard. LocalSalesDrafts is the
permission-gated recovery entry; Keep locally and close preserves unfinished edits.
Names/contacts/tokens/prices/money/reservations/approvals are excluded. This is not
encrypted shared-device storage, server backup or offline authority. Backend checks
remain mandatory. Full frontend196 tests/40 suites and build main.cf3993a1.js pass
with existing warnings; a subsequent non-resetting revision hardening has16 affected
tests and build main.b8b7070e.js passing. Browser acceptance pending. Evidence:
t15a-local-draft-recovery.txt.

Sales drafts now links to Reservation reviews using the existing ManagerCases
component with release-specific quantities, source references and approval labels.
Request/review permissions and both SALES/INVENTORY modules control access; the
backend enforces them independently. Approval does not release stock. Requestor-only
queues default to My requests. Draft details now open a paginated Reserved stock
workspace with quantity/reason release requests. Exact decimal-string comparison,
stable retry payloads, conflict refresh and dirty-discard guard preserve intent.
No durable navigation recovery or direct release action. Focused11 tests/2 suites
and build main.50dbb2a1.js pass; evidence: t07-release-request-ui.txt.
Focused23 tests/3 suites and production build pass with existing warnings;
backend evidence: t07-reviewed-release.txt. Browser acceptance remains pending.

Sales draft detail/editor now displays reserved base quantities separately from
payment and handover. Totals are backend-derived from remaining source-linked holds;
no reserve/release button is exposed before trusted runtime and reviewed lifecycle
adapters exist. Backend protects held edits;10 affected frontend tests and production
build pass with existing warnings. Evidence: t07-source-linked-reservations.txt.

Sales draft workspace at /sales/drafts uses separate SALES entitlement and
draft/product/customer/personal-data permissions. Pinned company API and remount/
abort guards prevent stale company data. Reuses pagination and theme; details
render above the register. Manage_SalesDraft enables New/Edit. SalesDraftEditor
reuses CustomersPage selection and one paginated DraftSourcePicker for stores and
products. Server product search is name/SKU-only, no supplier/cost matching. Unit
choices come from reviewed policies, quantities remain strings, and save sends only
explicit source IDs/versions/units/quantities. Uncertain outcomes lock to identical
retry, conflicts stop overwrite, and dirty cancellation requires confirmation.
T15A now supplies local navigation recovery; no auto-enablement, money or stock action.
Platform settings expose a Sales drafts module toggle without altering subscriptions.
Full frontend suite179/37 passed; after display-label/unit changes, affected10 tests
and production build passed with existing warnings. Browser/provider acceptance
pending. Backend evidence: t13a-editor-integration.txt.

Frontend integration checkpoint: persistent customer-save/indexing result panel,
direct saved-customer opening independent of search results, and fresh authenticated
detail reads for View. Details render above the register rather than below a long
table. Save clears search; result can be explicitly dismissed and clears on company
change. Route constants moved into a dependency-free utility so sidebar navigation
does not instantiate the API client. Full frontend: 169 tests / 35 suites passed;
production build passed with existing warnings. Browser acceptance remains pending.
Unfinished sales, collection, returns and offline APIs are not represented as working
frontend actions; this checkpoint is not completion of all planned modules.

T10A Customers register at /master-data/customers is a create/read/inspect workspace under
Master Data, gated by customer and personal-data permissions. Dedicated API client
pins token/company; keyed screen lifetime and abort/live guards prevent cross-company
stale responses. No contact browser storage. Reuses PaginationToolbar, contained
scrolling and theme context. Manage_Customer gates the multi-contact creation form.
Existing operation-intent hook preserves exact uncertain retries; pending outcomes
lock editing/cancel, validation errors preserve fields, dirty cancel needs confirmation.
Returned identity/version must match before success. Unmount aborts and ignores late
responses. A separate search_indexed flag controls an informational warning when
the identity is saved but indexing is unconfirmed; users are directed to browse,
not recreate the customer. Unmount handling still ignores late
responses. Drafts remain in-memory: unload warning does not implement navigation recovery.
Optional onSelect mode reuses this register and rereads customer detail before
returning company/key/version/profile. Failed or changed reads cannot select;
refresh/company changes cancel pending selection. Consuming document writers must
revalidate references; no sales consumer is connected. Submitted name/phone/email
search uses a POST body (no contact values in URLs), server pagination, resets page
and clears obsolete selections. Clear
search restores DB browsing. Indexing lag/provider caps are disclosed; failed loads
hide old results. No browser-local filtering or direct search-provider credentials;
no balances or profile editing exposed.
16 focused tests and production build pass (existing warnings).
Browser acceptance remains pending; backend enforces permissions independently.

CostPoolSetup now displays central writer state and epoch in the existing table.
NOT_CONFIGURED, ACTIVE (labelled Writer assigned) and SUSPENDED come from the pool
page API; missing fields display Status unavailable. The screen states that writer
assignment does not enable live posting. Refresh failures hide prior status with
the existing error state; no extra endpoint, per-row fetch, enrollment or posting
control. Existing theme and contained-scrolling layout retained; browser acceptance
remains pending. Evidence: backend planning/evidence/t06-authority-status-verification.txt.

Evidence review now distinguishes version-2 content-bound cases from historical
metadata-only cases. ChargeEvidenceDetails uses a pool/proposal/case/document-pinned
download adapter for v2; backend verifies saved version and full byte digest before
responding. Failure never falls back to current files. Historical cases explicitly
label their downloads as current files and cannot authorise financial posting.
New request forms reuse existing controls; capture requires server-configured
COST_EVIDENCE_MAX_BYTES and version-capable storage, with failures retaining drafts.
Targeted checks: backend evidence/t06-public-versioned-evidence-verification.txt.

Saved cost proposals now offer Invoice and FX evidence to users with financial,
supplier and document access and the ORDERS module. Backend field policies remain
authoritative. CostChargeEvidence preserves string amounts/rates, selects existing
records through a shared bounded EvidenceChoice picker, and reuses operation-intent
retry identity and explicit discard guards. Changing source currency clears the
foreign exchange rate; no market conversion is guessed. Only GENERAL/PO documents
are selectable in this slice. No new catalogue, invoice store or approval engine.
ManagerCases adapts the existing exact-allocation display for independent invoice/FX
review, including authenticated downloads with no raw storage URLs. Failed download
is visible. Read-only users see history without request or decision controls.
No review posts money, consumes a charge or changes prices. Immutable file versions,
atomic accounting integration and browser acceptance remain gates. Automated evidence:
backend docs/planning/evidence/t06-evidence-workspace-verification.txt.

Saved cost proposals now expose independent allocation review through the existing
PolicyReviewRequest and ManagerCases components. Cost-specific copy and exact SCR
line tables distinguish review from financial posting. Financial viewers inspect
decisions; Manage_Financials permits requests/decisions, with creator/requester
self-review blocked again by the backend. Company-pinned API methods bind pool,
proposal and case IDs. Failed requests retain their operation ID/reason, refresh
and navigation are guarded while dirty/busy, and unsaved decisions warn on unload.
No approval triggers activation, price changes or charge posting. New browser
acceptance remains pending. Backend evidence: t06-cost-review-verification.txt.

T06 Cost pools now offers a financial-permission-only Valuation history action per
row. CostPoolValuations reuses the company-pinned inventory client and shared
PaginationToolbar, with contained scrolling, dark/light styling, exact six-place
strings and explicit UNRECONCILED historical snapshots. It clears failed/obsolete
results and aborts old company requests. Empty history is not described as zero
cost. No financial write controls or selling-price updates are introduced.
Backend requires both View_Product and View_Financials; menu visibility is not
authorization. New browser acceptance remains pending.

Valuation history now permits selecting current-page sources for a freight-cost
allocation preview. The exact SCR total stays a string; weights are loaded by the
backend from immutable sources. Original goods value and same-unit base quantity
are explicit choices. Page/refresh/context changes clear selection; input edits
abort and invalidate the old calculation. Shared pool-scoped API and contained
table/footer layout are retained. Preview does not save, approve or post a charge.

An explicit Save unposted proposal action is now available to Manage_Financials
users after a successful preview. It requires declared charge reference/reason,
reuses useOperationIntent, retains uncertain-save inputs/key and prevents silent
in-panel discard. The calculation button itself still does not save. Saved cost
proposals opens a paginated historical register and exact allocation detail for
financial viewers. Request-context binding prevents list data rendering as detail
and drops obsolete company/pool/page responses. No approval/posting controls exist.

Location-stock rows now expose a Reclassification proposals workflow. It
uses existing scoped proposal APIs, the company-pinned inventory client and shared
PaginationToolbar. Summary/detail views preserve exact decimal strings, distinguish
historical snapshots from current stock or approval status. Obsolete requests abort,
failed refreshes clear prior data, and selections
are pinned to the API/company context. Internal scrolling keeps navigation and
pagination outside the scroll area. The permission-aware editor loads active/draft
policies, accepts explicit batch or serial identities, pins source versions and
retains failed-save intent keys. Own-panel discard and browser-unload warnings
protect unsaved entries; durable cross-route drafts remain a later task.
Shared PolicyReviewRequest and ManagerCases panels provide proposal-scoped
request/approve/reject actions and exact historical manifests. Approval never enables
stock execution, even if an activation prop is mistakenly supplied. No second
approval store is introduced. Browser/layout acceptance awaits confirmation.
Actual stock conversion remains disabled pending authority, valuation and lineage.
Verification: backend docs/planning/evidence/t05-proposal-workflow-verification.txt.

Standalone Approvals now defaults to a server-filtered Needs my review view.
My requests and All cases use the same register, pagination and decision panel;
switching views resets the page and aborts obsolete reads. A permission-aware
profile shortcut links to the queue. Contextual panels retain All by default.
No client-selected reviewer identity, second case store, notification polling or
durable unread state is introduced. New browser acceptance remains pending.

Navigation reform: Logistics and Inventory have separate sidebar groups. Inventory
contains Product Master, Branches & locations and Cost pools. A direct Approvals
entry opens the existing inventory manager-case register. New refreshable routes
`/inventory/cost-pools` and `/inventory/approvals` reuse panels via a thin
organisation-keyed adapter; existing local shortcuts and legacy URLs remain valid.
Routes retain INVENTORY plus View_Product / Review_InventoryPolicy gates; write
permissions and backend APIs are unchanged. Branch-specific settings/counters and
product policies remain contextual panels, not separate URL-persisted workspaces.
Sourcing/order detail URLs expand their menu group; inventory auto-expands and
accordions expose aria-expanded. Display branding now reads FreightLens. No Sales
placeholder or new subscription module is introduced. Limited read-only tablet
checks passed; populated workflow and dark-mode acceptance remain pending.

Read failures in protected access, document catalog and dashboard use LoadError
with explicit retry instead of displaying permission denial or empty/zero data.
Access retry remains fail-closed and reloads authoritative permissions; no backend
permission rules change. See UI-REFINEMENT-2026-10-02.txt for evidence and limits.

T05 no-history policy revisions: saved draft screens offer a read-only readiness
check with changed fields, active/draft versions and blocking reasons. It uses the
existing pinned client; edited/reloaded drafts invalidate the result, failures clear
old results, duplicate checks are blocked and unmount aborts reads. It is advisory,
never a posting authority. Manager cases show the reviewed predecessor version and
pass it through the existing confirmation/stable-intent activation component.
Only no-history, no-barcode revisions can post. Existing-stock conversion and
reviewed barcode maintenance remain pending. Browser acceptance remains deferred.

T05 unit barcodes: policy dialog opens a contained register using the same pinned
inventory client. Only active-policy units can be registered; codes remain strings
and retain case/leading zeros. Server-paginated historical rows mark eligibility;
exact lookup shows base quantity without implying a reservation/sale. Registration
uses useOperationIntent, explicit unit selection, pending-submit guards and failed
save/discard protection. Permissions are backend-enforced. No automatic catalogue
barcode adoption or barcode correction/reassignment; browser acceptance pending.

Consolidation: `useOperationIntent` owns in-memory stable retry identity for branch
settings, counters, review requests, manager decisions and policy activation.
It binds action/target plus payload and returns detached payload snapshots.
Organisation-pinned parents own lifetime. Validation, duplicate-submit guards,
abort lifecycle and discard UX remain explicit in each form. This hook is not
durable draft recovery or an offline authorization mechanism; T15A supplies recovery
before checkout. Canonical queue: backend docs/planning/TASK-QUEUE.txt.

Local T05 partial: approved manager cases offer separately permission-controlled
initial policy activation, explicit confirmation, duplicate-submit protection and
stable retry keys. Drafts show the active reviewed policy separately; failed reads
say unverified rather than inactive. Activation creates no stock and enables no
checkout. Existing-stock conversions and barcode maintenance are still pending.

Local T04: saved policy drafts expose a permission-controlled review request;
locations expose a paginated manager inbox with exact snapshots and approve/reject
reasons. Self-review is denied; failed decisions retain text and retry identity.
Leaving asks before discarding. Approval is not activation. Personal manager-profile
notifications and browser acceptance remain pending.

Local T03: branch locations now expose Trading settings and Counters panels using
the organisation-pinned inventory client. Trading settings retain exact local
cutoffs, explicit weekly trading days and bounded date exceptions with no real
defaults. Counter identities have permanent codes and versioned display/purpose/
availability settings. Writes require Manage_BranchSettings (backend enforced),
expected versions and secure UUID operation keys retained on unchanged retries.
Forms preserve failed saves, guard duplicate submits and confirm discarding edits;
counter lists use server pagination and both panels support contained scrolling
and light/dark styles. Saving does not activate checkout/payments/collection.
Automated tests/build pass; browser/layout acceptance remains skipped by owner.

This document describes the current FreightLens v2 frontend. The complete system architecture is maintained in `Backend/docs/ARCHITECTURE.md`.

## Stack

- React 19.1
- React Router DOM 7.6
- Create React App / `react-scripts` 5
- Tailwind CSS 3 plus component CSS
- Axios and browser `fetch`
- React Context for authentication, theme, confirmation, and shared options
- Chart.js, Framer Motion, Lucide, React Select, and React Toastify

## Application Shell

`src/App.js` composes the providers around `MainPage`:

```text
BrowserRouter
  AuthProvider
    ThemeProvider
      ConfirmProvider
        OptionsProvider
          MainPage
```

`src/component/MainPage.js` owns the fixed sidebar, mobile navigation, contained content scrolling, and route map. Route groups cover dashboard, logistics, sourcing, orders, receiving, defects, inventory, master data, administration, and report templates.

`PrivateRoute` performs frontend module and permission checks for navigation. These checks are user experience only; the backend must independently enforce every authorization rule.

## Authentication and Organisations

`AuthContext` stores access and refresh tokens, permissions, roles, user metadata, module subscriptions, plan, and organisation selection in local storage. It schedules token refresh and installs global Axios interceptors.

Root users may select an organisation. Requests using the global Axios interceptors include `X-Active-Org`. API clients that create separate Axios instances must also propagate that header; inconsistent clients are a known deviation being addressed by stabilization.

## API Access

ProductQuickView now opens `InventoryPolicyDraft` for unit/tracking preparation.
The org-pinned client reads/saves versioned drafts against existing product IDs.
Viewers may inspect; product editors may save. Explicit tracking choice, quantity
steps, batch expiry/shade/calibre flags and up to16 alternate-unit factors are
supported. Factor inputs remain strings. Failed saves retain fields; duplicate
submissions are blocked; unsaved close requires confirmation. Drafts do not
activate stock rules, assign barcodes or change catalogue units/stock/prices.
Keyboard focus is contained in the dialog. Browser/viewport verification remains
pending at the owner's request.

`UnitConversionPreview` tests the current unsaved draft using the scoped backend
calculation endpoint. Quantities/factors remain decimal strings; editing any
rule or test input clears the result and cancels stale requests. The test is
read-only and never confirms stock availability or activates a policy.

Inventory branch/location setup now offers View stock per physical location.
`LocationStock` uses the org-pinned inventoryLocationsApi client and the existing
PaginationToolbar. The read-only panel displays exact decimal strings for
on-hand, reserved, available, damaged and quarantined quantities. It does not
aggregate child/remote locations or substitute legacy product totals. Empty
ledger data is explicitly not proof of zero physical stock. Loading/failed
refreshes hide old rows; requests abort on unmount and late results are ignored.
Each lot remains a separate row with code/shade/calibre/expiry. The unit column
shows the snapshotted increment or an explicit review-required posting warning
for pre-policy balances. Displayed quantities and expiry are advisory; posting
must recheck batch eligibility. No client-side numeric conversion is performed.
There are no stock-posting actions. Browser verification was skipped at the
owner's request; visual acceptance is still pending.

Serial-tracked rows expose View serials. `StockSerials` reuses the org-pinned
client and PaginationToolbar for exact-balance identity/condition reads. Serial
numbers stay strings, including leading zeros. Physical condition is explicitly
not an individual reservation or a promise of unreserved quantity; assignment
at handover is not enabled. Loading/failed refreshes hide stale rows, requests
abort on navigation/org changes, and returning refreshes the stock list. No
serial creation, edit, assignment or movement action is exposed.

- `src/services/ordersApi.js` contains the orders/procurement client and legacy compatibility fallbacks.
- Pages also use Axios directly and `src/utils/authFetch.js`.
- `REACT_APP_NETWORK` is the API base URL injected at build time.

Broad fallback handlers that convert API failures into legacy calls or placeholder success can hide authorization and contract failures. New work must return explicit loading, empty, and error states and must not silently reinterpret permission failures.

## Media

Product media and supplier logos use backend-issued signed URLs. `src/utils/mediaUrl.js` is the only browser URL resolver: it accepts signed application URLs and external media URLs but refuses unsigned object keys. Order, payment, RFQ, and defect documents use their owning authenticated API endpoints.

## Build and Deployment

Development uses `npm start` on port 3000. The production Docker image builds static assets with Node 20 and serves them from nginx on port 4005. Client-side routes fall back to `index.html`.

Verification command:

```powershell
npm run build
```

The current build passes with pre-existing ESLint warnings. Warning cleanup is tracked separately from security stabilization.

POS prerequisite development extends test/build CI push coverage to
`standalone-main` and `codex/pos-development`, retaining main/master and PR checks.
No staging deployment trigger was changed.

Sustained-use UI changes also follow `docs/FRONTEND_ERGONOMICS.md`. Its evidence boundary prevents unsupported medical claims while adding zoom, readability, workflow-continuity, and layout-stability checks.

Supplier master data displays the backend's explicit scope. Root users can choose shared or tenant-specific when creating/editing a supplier; tenant users can view shared suppliers but cannot mutate them.

## Branch and location setup (C10 partial, local development)

The existing cost-pool valuation history now distinguishes OPENING and CHARGE
entries and displays the original source for additional costs. Charge rows cannot
be selected as allocation sources; the API independently enforces this restriction.
No new ledger, posting button or automatic price change is introduced. Targeted
component verification is recorded in the backend task-queue evidence for T06.

`/inventory/locations` lists branches and their SITE -> ZONE -> BIN locations.
It uses the existing pagination toolbar and paginated Inventory APIs. Creation
requires Manage_InventoryLocation; navigation requires View_Product and INVENTORY.
The API remains the permission and tenant-isolation boundary. No stock changes,
real branch seeds, editing or deletion are introduced by this screen.

The workspace resets on organisation change, cancels obsolete reads, discards
old forms and ignores late responses. Its isolated Axios client explicitly pins
the organisation and bearer token; it does not retry POST requests. AuthContext
still schedules token refresh; an expired request reports an explicit error.
Duplicate form submission is guarded, and failed saves retain input. An uncertain
response requires checking the list before retrying; this is not durable
idempotency. Site/zone row actions select a valid parent without fetching all
locations into an unbounded selector. Forms replace the list within the fixed
shell, keeping actions outside the scrollable form body.

Protected routes now wait for access resolution for the current token and selected
organisation before permission/module decisions. Failed access resolution remains
deny-by-default; previous-organisation admin access cannot bypass loading.

Browser checks cover empty-state/list and unsaved branch form at desktop/laptop
widths; populated-table, real zoom and dark-mode visual acceptance remain pending.

The same screen now includes Cost pools and per-branch initial pool assignment.
`CostPoolSetup` reuses the paginated configuration API and PaginationToolbar,
shows a confirmation step, and does not allow reassignment. Creation/assignment
visibility requires Manage_InventoryCostPool; API checks remain authoritative.
The pool list and current assignment must both load successfully before choosing
a pool. An empty assignment does not imply stock is ready for posting. No pool
or branch names, legal identifiers or real business records are seeded in code.
