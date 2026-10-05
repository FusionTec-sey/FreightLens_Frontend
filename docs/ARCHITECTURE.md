# FreightLens Frontend Architecture

## Reviewed invoice returns and credit notes (2026-10-05)

The existing posted-sale workspace now opens a contextual Returns & credit notes
panel; it does not add another sale/cart system or top-level route. Separate
Request_SaleReturn, Review_SaleReturn and Process_SaleReturn capabilities reveal
only their actions, alongside the existing sale/customer/product/personal/financial
read requirements. The panel consumes server-owned invoice-line and exact-handover
eligibility, showing handed-over, previously accepted, pending and returnable
quantities without calculating availability or money in the browser.

The selected draft resolves its exact posted invoice through the read-only
`posted-invoice` projection before opening returns. Return staff therefore do not
need Post_Sale or access to posting options simply to inspect and request a return.

Every claim identifies the returner, contact, reason, observed condition, invoice
line and handover allocation. Manager review is mandatory. Processing displays the
server's immutable original-term credit, invoice-debt application and surplus
non-expiring customer credit separately. The UI offers no cash/card refund, credit
redemption, serial or cross-store action, and states that physical returns enter
quarantine rather than sellable stock.

Claim and credit-note requests are written to a company/user/invoice-scoped local
recovery record before transmission. Uncertain reloads recover the same operation
and request body; changed conflicts lock the action until the stale record is
explicitly discarded. The record contains no token, card data, price or credit
amount and is removed after a confirmed response. Returner contact and reason are
necessarily retained only while that exact uncertain claim needs recovery.

Focused return/API/recovery and existing sale-detail/checkout/register tests pass.
The production build succeeds with the repository's existing unrelated warnings;
browser acceptance remains separate.

## Safe sales-draft copy provenance (2026-10-05)

Copying a saved sales draft creates new document and line identities through the
existing draft editor. The exact source document/version is now included only in
the version-zero save and is retained with the stable pending request in scoped
local recovery. Later revisions display server-confirmed provenance but do not
resubmit it. Payments, reservations, approvals and collection state remain
excluded; current customer, branch, product-policy and unit references are still
revalidated by the normal save path.

A version-zero copy rejected because its current customer or reviewed product policy
changed remains editable so staff can reselect current source data without losing
the provenance reference. Destination/version, operation or identity conflicts are
locked and require a fresh copy rather than looping the same invalid destination.
Confirmed provenance is visible in saved draft details, while local drafts distinguish
a source awaiting server recording from an already recorded source. Thirty-two
focused copy/editor/recovery/detail checks, twelve register checks and the production
build pass with the repository's existing unrelated warnings. Browser acceptance
remains separate.

## Payment and receiving-account configuration (2026-10-05)

Sales > Payment configuration exposes the existing versioned T12A API as two
server-paginated registers: payment methods and exact selling-branch receiving
accounts. Editors preserve expected versions and stable operation identities across
uncertain retries. An explicit lookup reports READY or the precise blocked reason;
the screen does not accept, confirm or post money. View_Financials controls read
access and Manage_Financials controls changes. Account references are bounded opaque
accounting identifiers; no credentials or real bank details are stored by this UI.

## Reviewed stock adjustments (2026-10-04)

Location Stock opens a contained Adjustment cases workflow only for users with a
request, review or execute permission. Requests retain exact decimal strings and
the selected balance version; retries reuse the same operation identity. Review
submits the selected case version and excludes the requester. Execution requires
explicit confirmation and reports only a matching consumed response.

The screen keeps reserved quantity read-only, blocks aggregate serial correction,
states that selling price is unchanged and flags possible valuation reconciliation.
An unknown execution result stays retryable with the same identity. Twenty-six
focused frontend tests pass and the production build succeeds with existing
repository warnings; browser acceptance remains separate.

## Authoritative product quantities (2026-10-04)

Product Master, quick view, selected CSV export, catalogue selection and the older
order picker consume explicit on-hand, reserved, available, damaged and quarantined
values returned from Inventory balances. Mixed base units display unavailable and
never collapse to zero or an out-of-stock badge. Quick creation sends no opening
stock. Stock information also describes preferred same-store picking and the explicit
authorised other-store choice without inventing a central warehouse assignment.

Dashboard stock value displays the backend's latest immutable SCR cost-pool heads as
provisional and surfaces missing valuation coverage. It no longer presents catalogue
unit cost multiplied by a legacy product total. Four focused component tests and the
production build pass; browser acceptance remains pending.

## Pricing and tax configuration (2026-10-04)

Sales > Pricing & tax exposes the backend's four existing T11 records rather than
creating a client catalogue: Tax rules, Store prices, Product tax and Customer
prices. Registers are server-paginated; editors keep expected revision and a stable
operation key through uncertain retries. Existing branch, reviewed-product and
verified-customer pickers supply references. Store/customer prices include selling
unit; tax remains a separate assignment. Customer agreements are omitted without
customer and personal-data access, while writes require financial-management access.

The draft detail screen separately loads the authoritative read-only pricing preview
and displays exact selected-source, version, floor, tax and SCR totals. Below-floor
prices can be submitted for an exact manager review; authorised reviewers use the
Sales > Manager reviews > Price-floor reviews screen. Review access is not hidden by
customer-draft navigation requirements when the backend grants the narrower review.

An authorised draft editor can prepare the exact approved price/tax input for later
posting. The UI retains a stable operation identity through failure, loads an existing
prepared input for the current draft revision and clearly states that preparation is
not an invoice, payment, stock movement, collection authority or approval use.
Forty-three affected frontend tests pass and the production build succeeds with the
repository's existing unrelated warnings. Browser/tablet/dark-mode acceptance and
real tax/accounting configuration remain pending.

## Cost-pool reconciliation readiness (2026-10-04)

Valuation history now opens a separate read-only reconciliation-readiness view. It
shows current physical on-hand, the latest valuation quantity/value/version, exact
difference and explicit missing valuation, quantity mismatch or unit mismatch state.
Responses stay tied to the captured company API and pool, with cancellation, stale
result clearing, retry, empty state and server pagination. The screen states that
quantity agreement is not final accounting approval; it provides no close, posting
or override action. Twenty-two affected frontend tests pass and the production build
succeeds with the repository's existing unrelated warnings.

## Receipt valuation history (2026-10-04)

Cost-pool history now describes opening, receipt and additional-cost entries and
uses “Source quantity” rather than implying every row is an opening. Immutable
RECEIPT rows remain eligible for the existing reviewed landed-cost allocation;
CHARGE rows remain disabled. No receipt posting button, FX inference, selling-price
change or reconciliation claim is exposed. Six focused tests pass and the
production build compiles with existing repository warnings.

## Catalogue stock editing boundary (2026-10-04)

ProductMasterPage omits current_stock from metadata/create payload and presents its
legacy reference read-only. Backend rejects metadata replacement independently.
Location balances remain authoritative; legacy adjustment/create API retirement
and receiving integration are unfinished T08 work, not silently enabled here.

Follow-up: Product Master no longer offers any quick-adjust action and the legacy
direct-adjust modal/client was removed. The backend compatibility route fails closed.
Controlled location movements remain unfinished Inventory work; no product total is
presented as an editable substitute.

Follow-up: ProductCatalogSelector quick-create also omits stock. Backend now
rejects nonzero opening stock in catalogue creation; Inventory opening integration
and the adjustment writer remain separate unfinished work.

## Sales draft display metadata (2026-10-04)

Detail shows the current branch label with stable reference, plus revision save
time and staff reference. Saving staff is not an assigned salesperson. Editor uses
the label returned by current read; local recovery remains a reference-only
whitelist. Deleted/unavailable branch labels retain Branch ID fallback.

## Narrow draft editor containment (2026-10-04)

Read-only 390px browser inspection found fixed metadata collapsed cart rows.
Below768px, sales-editor-body scrolls inside the fixed action header and retains
a480px product/cart pane. Desktop/tablet use display:contents to preserve layout.
Rechecked body containment at390/768px and keyboard reachability of cart controls;
Save remains visible. No record changed. Evidence is canonical backend planning.

## Sales route navigation protection (2026-10-04)

App uses the installed data router with the existing MainPage nested routes and
providers. DraftNavigationProvider owns one route blocker; SalesDraftEditor
registers through a router-independent context. Dirty/pending drafts require Stay
or Keep locally and leave. Recovery must finish before proceeding; storage failure,
in-flight saves and confirmed-save cleanup keep the editor open. Exact uncertain
operation bodies are retained without reposting. Editor replacement revokes a
pending leave decision. Existing unload warning remains; organisation switching,
logout, native reload and multi-tab recovery are not covered by this route test.
291 frontend tests / 55 suites and build pass (existing warnings); real-router
test covers menu navigation and Back. Browser visual acceptance remains pending.

## Read-only revision line inspection (2026-10-04)

SalesDraftHistory opens SalesDraftRevision on explicit version selection. Scoped
API returns saved quantities/units/policy versions without current holds. Current
catalogue labels are disclosed; no edit/restore/allocate action appears in history.
Reads abort on leaving, validate response identity and clear stale data on failure.
10 focused tests/build pass; browser acceptance pending.

## Sales register search (2026-10-04)

SalesDraftsPage submits reference/customer search to the existing list API with
store filter and resets paging. Query changes abort stale requests; failed search
clears old rows and offers clear-search browsing. A confirmed save with pending
indexing stays confirmed and opens by key. No client-side full-dataset filtering.
Register/editor 15 tests pass; build passes. Backend owns search scope/freshness.

## Module navigation arrangement (2026-10-04)

Menu groups existing routes into Sales, Inventory, Procurement, Logistics,
Reports and Administration. Customers is under Sales; Counts under Inventory;
reservation reviews use a collapsible subgroup. Policy approvals are explicit.
Packing lists retains Orders access despite Logistics placement. Customer/count
deep links reopen their correct accordion. No API or permission contract changed.
Canonical decision: BD-20261004-06. Whole-menu browser acceptance remains pending.

## Full-build verification checkpoint (2026-10-04)

All 273 tests in 52 suites pass. Production build passes with existing warnings
after declaring BigInt for CRA lint (exact arithmetic unchanged). Updated stale
auth/router/axios mocks and Sales review-route tests. Read-only Sales/Counts tablet
navigation checked; populated workflow and touch-target refinement gates remain.
Canonical evidence: backend docs/planning/evidence/20261004-full-build-verification.txt.
Earlier deferred-test notes remain historical; owner resumed this checkpoint.

## T33A count integration repairs (2026-10-04; unverified)

Count-specific collaborator screens/routes are integrated under Stock Counts.
Assigned counter identity uses current AuthContext.userId. Pending count saves
lock inputs and navigation, retain exact retry intent, and confirmed saves with a
failed reload offer read-only refresh rather than another save. Unsaved Back asks
before discard. Inventory-authorised selectors include warehouses without Sales
or personal-customer permissions. Regression tests written, not run; browser and
full workflow acceptance remain pending. No inventory adjustment posting added.

## Draft revision-history view (2026-10-04; unverified)

SalesDraftDetails opens SalesDraftHistory only on explicit selection. The existing
scoped client reads paginated revision metadata; refresh removes stale rows and
unmount aborts requests. Reuses PaginationToolbar and the detail shell; no new
audit store or automatic actions. Historical customer labels come from the server,
and staff are explicit ID references, not guessed names. Tests written, not run.

## Compact sales register (2026-10-04; unverified)

SalesDraftRows presents the same server page as a full table or compact stacked
list when details are selected. Both retain all fields and explicit read actions;
no additional fetching/filtering or business writes. Current selection is exposed
to assistive technology; actions have labelled 44px targets. Existing parent owns
pagination, scope and cancellation. Tests written, not run; browser gate pending.

## Draft field validation (2026-10-04; unverified)

Save and quantity nudges share exact text validation without Number coercion.
Invalid saves retain input, expose field-linked errors and focus the first invalid
quantity in the visible tablet cart. Missing customer/store/products are shown
at their controls; no invalid request is sent. Backend policy increments remain
authoritative. Regression cases added, not run; browser acceptance pending.

## Confirmed draft cleanup recovery (2026-10-04; unverified)

SalesDraftEditor separates validated server receipts from failed local recovery
cleanup. Confirmed receipt locks edits and replaces save with cleanup-only retry;
it never repeats the API write in that mounted editor. Existing revision-checked
recovery deletion prevents removing another tab's edits. Original pending intent
remains durable if cleanup fails, allowing the existing exact replay after reload.
Mismatched receipts remain uncertain. No recovery schema/permission change.
Regression tests written, not run; browser/reload acceptance remains pending.

## Exact touch quantity controls (2026-10-04; unverified)

Draft cart adds labelled 44px +/- controls changing one selected unit, preserving
typed fractional quantities via six-place scaled BigInt arithmetic. No floats,
rounding, zero/negative result, overflow or implicit line removal. Invalid partial
input disables nudges without overwriting text. Functional line updates preserve
rapid clicks. Server policy increments/availability still govern eventual save.
Tests written, not run; tablet/browser accessibility acceptance remains pending.

## Authenticated recovery/reviewer identity (2026-10-04; unverified)

Login's legacy user value is a username string. AuthContext now separately exposes
userId from /auth/me/access only for the resolved current token/company context.
Sales recovery and customer/inventory reviewer props use that ID, never user.id.
Sales entry fails closed if no authenticated numeric identity is available, avoiding
undefined recovery scope. Existing username consumers and server permissions remain.
Tests updated/added but not run. Access refresh and multi-user browser checks pending.

## Sales catalogue images (2026-10-04; unverified)

Product picker, cart and saved-detail rows share SalesProductImage, consuming
only the API's signed image field through mediaUrl. Lazy loading and a package
placeholder handle missing/broken images without altering product eligibility.
Images remain in-memory display labels and are not added to recovery snapshots.
No external/raw-key fallback. Tests/build/browser/provider checks remain deferred.

## Unit-barcode draft entry (2026-10-04; unverified)

Editor now accepts keyboard-wedge/manual barcode entry via the existing scoped
Inventory resolver, then reads the active policy and retains the registered unit.
Leading zeros are preserved; no legacy-code/search fallback or stock effect.
Only Inventory-entitled sales viewers see the control. Pending/conflicted/full
carts disable it; obsolete reads abort and cannot add to a locked cart. Each scan
adds a distinct draft line, not a silent quantity merge. Server save still validates
policy/quantity increments; scanner/camera hardware acceptance is not claimed.
Tests written, not run. Images and full tablet/browser acceptance remain pending.

## Shared product/cart draft workspace (2026-10-04; unverified)

SalesDraftEditor embeds the existing server-paginated product picker beside its
existing cart on landscape/desktop layouts. Narrow layouts switch Products/Cart
without unmounting or copying draft state. Existing customer/store selection,
local recovery snapshots, save intents and uncertain-save locking are retained.
Embedded picker disables selection for locked/full carts and retains search/page
after adding a line. Quantity/unit entry remains exact and server-revalidated;
no price/payment/invoice action is fabricated. Saved customer names display only
in memory and are still excluded from recovery. Images/scanning and visual
acceptance remain unfinished. Component test added, no tests/build/browser run.

## Saved customer names in sales (2026-10-04; unverified)

Register and detail consume additive customer_name from the saved profile version,
not current customer search. Detail retains stable reference and version; missing
labels say unavailable. No new browser customer cache or client profile queries.
Tests/build/browser remain deferred; full search and media are still unfinished.

## Sales register store filter (2026-10-04; unverified)

The register reuses DraftSourcePicker for a paginated selling-store filter and
shows backend-projected store names. Filters pass through the existing client
to the server, reset pagination and cancel obsolete list reads. Clear returns
to all stores in the active company, never other companies. Customer labels and
full search are still unfinished. Tests/build/browser remain deferred.

## Approved sales split-view foundation (2026-10-04; unverified)

SalesDraftsPage retains its server-paginated register beside SalesDraftDetails
on desktop; smaller screens focus the selected detail with an explicit close.
The extracted detail panel is read-only and reuses existing permission-gated
edit/allocation/reservation callbacks. Header/footer stay outside item scrolling.
Exact unit quantities and policy details are retained; no invented invoice number,
customer label, payment or collection status. A route guard now retains a selected
draft opened from the overdue inbox instead of immediately navigating it away.
Component tests added but not run. Build/browser checks remain deferred. Richer
register filters, labels/media and tablet cart remain unfinished T14B-D work.

## Restored sales presentation and route navigation (2026-10-04; unverified)

Selectively restored RegisterShell from pos-ui-theme commit03678ed without replacing
current sales logic. Sales register/editor reuse its header, surfaces and controls.
Grouped Sales sidebar now routes drafts, local recovery, overdue follow-up and
release/deadline/reallocation/other-store reviews separately. Super Admin menu
visibility matches the sales screen. Views retain action-specific permission gates.
Newer store-wide allocation, other-store requests, runtime execution, exact retries
and recovery remain in place; no legacy reservation writer was imported.
Tests/build/browser deferred. Existing tests expecting header navigation require
updates before verification; UI adaptation is not a wholesale branch merge.

## Local demo entry (2026-10-04)

Owner requested credential-free local preview. Development loopback login shows
Enter local demo only when the server confirms its isolated preview configuration.
This obtains ordinary tokens for the existing demo reviewer; no auth/RBAC bypass,
password embedded in frontend, production button or role grant. Normal sign-in
remains available. Automated tests/browser acceptance deferred.

## Customer duplicate assessments (2026-10-04; automated verification complete)

Customers now offers Request duplicate review and Duplicate reviews under separate
permissions. Selection reuses the customer register; the form pins both versions
with an explicit SAME_CUSTOMER/DISTINCT_CUSTOMERS assessment and reason. Reviews
reuse ManagerCases, loading exact historical profiles and withholding decisions
until both reads succeed. Unknown request/decision intents stay fixed for retries;
results remain visible. Approval does not merge records or balances. Exact-profile
readiness, mismatch denial and uncertain same-intent retry are now covered within
23 focused customer tests. Production build succeeds with existing warnings;
browser acceptance remains pending and canonical T10 remains in progress.

## Customer profile edits and history (2026-10-04; automated verification complete)

Customers -> View offers Edit profile and Profile history. The existing contact
form handles both creation and editing, requiring an edit reason and expected
version. Unknown requests retain exact retries; stale/access rejection blocks
editing until reopened. Results stay visible. A separately paginated history view
shows immutable profile versions, actors and reasons without balances or merging.
Backend remains the personal-data and company boundary. No new browser storage.
Focused tests cover retained failed refresh, exact revisions, create/edit recovery,
company changes and permission-driven actions. Backend concurrency and immutability
tests remain canonical evidence. Browser acceptance remains pending.

## Reviewed cost posting (2026-10-04; unverified, runtime disabled)

Evidence review cases offer a separate Post_InventoryCost-gated confirmation for
approved version-2 evidence. ChargePosting uses current backend stream versions,
stable operation identity and strict response matching. Unknown outcomes keep the
same intent; explicit rejection blocks replacement until reopening. Success stays
visible and is labelled UNRECONCILED, not final profit/accounts or supplier payment.
No tests/build/browser run. Runtime config remains blank; no real posting performed.
Canonical record: backend planning/evidence/t06-local-cost-runtime.txt.

## Reallocation execution (2026-10-04; unverified)

Sales draft reallocation reviews uses separate execution access and the shared
runtime-aware confirmation component. Stock remains in its original location;
the result describes source remaining and new target hold, not payment/handover.
Missing historical target snapshot blocks the UI action. Tests/build/browser checks
remain deferred. Canonical record: backend planning/evidence/t07-reallocation-runtime.txt.

## Other-store execution (2026-10-04; unverified)

Sales drafts -> Other-store reviews now admits Execute_OtherStoreFulfilment users
independently of review permission. Shared PolicyActivation loads protected runtime
context, requires explicit confirmation, preserves retry identity and displays a
retained reservation receipt through ManagerCases. No stock target or approved
quantity is editable. Missing runtime/configuration blocks execution; server guards
remain authoritative. No tests/build/browser checks run at owner request. Canonical
record: backend planning/evidence/t07-other-store-runtime.txt.

## Approved release execution (2026-10-04; verification pending)

Sales drafts release reviews now uses separate Execute_ReservationRelease access
and shared confirmation UI to execute exact approved holds. Execution-only users
start in All cases. The result remains visible until dismissed, independently of
list refresh. Unknown responses retain the operation identity; no payment/handover.
Owner requested no further tests. Earlier 35 focused frontend tests passed before
the final receipt/default-view refinements; those refinements and build remain
unverified. Canonical evidence: backend planning/evidence/t07-release-runtime.txt.

## Same-store allocation screen (local follow-up to checkpoint)

Saved draft details offers Allocate same-store stock under INVENTORY and
Allocate_SalesDraftStock. DraftAllocation reads self runtime context, selects a
counter through the existing paginated picker and posts exact source/settings
versions and decimal strings. Unset preference permits store-wide allocation.
Unknown outcomes freeze edits for identical retry; stale state blocks replacement.
Receipts show per-location holds, not payment or handover. Disabled runtime cannot
submit. Backend31/frontend15/build main.dfa28a45.js pass with existing warnings.
Browser acceptance pending; canonical evidence: backend t07-store-allocation-ui.txt.

## GitHub checkpoint 2026-10-04

Decision BD-20261003-06. This checkpoint includes all currently developed UI:
preferred picking areas, staff working-store assignments, compatible reservation
reviews, other-store request entry and review queue. Full frontend suite: 230
tests / 44 suites pass; production build main.85e1b2b3.js passes with existing
ESLint/Browserslist warnings. Native browser acceptance is not included.
The newest same-store allocation endpoint is backend-only at this checkpoint;
tablet allocation controls and public approved execution remain unfinished.
No runtime activation or deployment. Paired revision/evidence lives in backend
docs/planning/CHECKPOINT-20261004.txt; PRs target codex/pos-development.

## Explicit other-store request entry (2026-10-04)

Saved draft detail now offers Request other-store stock to authorised requestors.
OtherStoreRequest reuses DraftSourcePicker and the scoped inventory client for
branch/location/product-filtered bucket selection. Self working-store read does
not need user-directory access. Exact source/assignment/stock versions and string
quantity are submitted; uncertain requests freeze edits for identical retry.
Stale state requires reopening; dirty close warns. No allocation or transfer.
Backend22/frontend27/build pass; browser acceptance pending. Canonical evidence:
backend docs/planning/evidence/t07-other-store-request-entry.txt.

## Other-store review queue (2026-10-04)

Sales drafts -> Other-store reviews is guarded by INVENTORY and explicit request
or review permission. Company-pinned API and shared ManagerCases show exact draft,
selling/fulfilment branch, stock version, input/base quantities and follow-up.
Independent review uses the existing operation-intent helper. No activation
control; approval alone cannot reserve or transfer stock. Request-entry is added
above; trusted runtime execution remains pending. Focused26 tests and production
build main.2942ce66.js passed with existing warnings. Browser acceptance pending.
Canonical evidence: backend planning/evidence/t07-other-store-review-api.txt.

## Compatible multi-location reservation supplements

Reallocation request and manager review now explain that existing destination
holds may span compatible same-store locations while the reassigned quantity
stays in its original stock location. Combined quantity caps and exact review
remain backend-enforced; approval alone never posts. Older snapshots require
fresh review. Canonical evidence: t07-multi-location-supplements.txt in backend.

## Staff working stores (2026-10-04)

Selected branches in Locations now offer Staff working stores to View_User users.
Writes additionally require Edit_User and Manage_BranchSettings; backend enforces
all permissions plus INVENTORY/View_Product. Paginated company-pinned projection
shows current assignment and revision without requesting password/role data.
Editor explicitly targets the selected store, uses the existing paginated counter
picker, allows no usual counter and separates assignment enablement from checkout
activation. Shared operation-intent helper preserves identical uncertain retries;
conflicts block overwrite, cancellation asks before discarding and read failures
clear rows. Parent remounts on company/token/branch changes; obsolete requests abort.
Backend66/frontend36 focused checks and production build main.095008bd.js pass
with existing warnings. Browser acceptance pending; canonical evidence:
backend docs/planning/evidence/t07-staff-store-assignments.txt.

## Preferred picking area (BD-20261003-06)

Counters now show View picking preference even when unset. Null-root inspection
shows no preference, not a blocked sale. Settings explain store-wide eligible
selling, compatible local splits and separate staff/store permissions. Other
branches/warehouses remain explicit choices requiring applicable approval. The
existing JSON field/API route remain stable; response root may now be null.
No checkout writer or staff-assignment UI is implied. Browser acceptance pending.

## Earlier counter stock-area inspection (historical T07 preparation)

Branch counters with a saved default area now offer View stock area. The existing
company-pinned inventory client reads the exact saved counter revision and paged
active root/descendants. CounterStockArea retains contained scrolling, fixed
navigation/pagination and light/dark styling. Failed refreshes or changed context
clear results; obsolete requests abort. Disabled counters remain explicitly marked.
This is scope inspection, not availability, staff assignment or stock allocation.
Automated backend48/frontend21 checks and build passed; new browser acceptance is
pending. Canonical evidence: backend planning/evidence/t07-counter-area-scope.txt.

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

BD-20261004-09 refines the existing Sales presentation using current contracts.
Register and split-view rows lead with saved customer/store and Draft vN, retaining
the exact UUID as a secondary reference. Draft details group saved customer, store,
audit actor and save time, then show independent Demand, per-line Reservation,
Payment and Collection facts. Product lines retain image, SKU, exact selling and
base quantities, reviewed unit/policy and reservation facts. Pricing remains pending
and all totals remain not calculated until T11; no currency, invoice, payment or
collection state is inferred in the client. Existing search, paging, permissions,
history, allocation and local recovery contracts are reused unchanged.

Goods Receiving receipt details now provide an explicit, initially closed physical
manifest inspector. It reads the server-paginated, company-pinned receipt-manifest
API, validates receipt/key context, aborts obsolete requests and shows exact historical
policy, quantity and batch/serial classifications. Saved manifests are labelled as
not posted; saved condition-review requirements are not current approvals. Authorised
users can request review and an independent manager can approve/reject the exact saved
classification. Failed action input and stable retry identity are retained, dirty/busy
review forms block panel exit, and case paging stays company pinned. Verify_Receipt
users can also prepare a classification from a submitted receipt line: its linked
product loads the reviewed policy; shared server-paginated pickers choose branch and
location; the server supplies the exact converted received total without inferring
damaged/incorrect disposition; exact condition, batch or serial input reuses the same
controls as stock reclassification. A second server preview is required for the
current classification before stable-key save, but save revalidates everything. Approval, preview and save still
post no stock or value. Supplier/cost data and physical/financial actions are absent.
Browser acceptance remains pending.

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
