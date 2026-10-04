# Checkout Wave 1 handoff

Decision revision: BD-20261005-01. Frontend base: `33c94b53b63f1ad1655a8a7c7c781c16f7c0d797`.

## Delivered frontend foundation

- A readable, saved `DRAFT` can be copied from its existing detail view into the existing editor. The new draft and every line receive new UUIDs. Only customer identity/version, selling store, product/policy, exact quantity/unit and display labels are carried forward. Historical reservations, payments, approvals, prepared prices and collection are excluded.
- The exact source `(document_key, version)` is retained in the company/user-scoped local recovery envelope and shown in the copy editor and Local drafts. It is deliberately absent from the existing `PUT /sales/drafts/{document_key}` body, which forbids unknown fields. Save keeps the normal expected-version and stable operation-key retry behavior. Backend source validation occurs through the existing draft save path.
- The editor states that server persistence of provenance is unavailable. It makes no invoice, payment, reservation or handover claim. The existing split status display remains authoritative only for the current draft contract.

## Integrator-owned contract needed for durable T15 provenance

Add an optional typed copy-source reference to the sales intent creation contract, scoped to the same company and exact source revision. Persist it immutably on the new document or first revision, return it from the detail/history reads, and bind it to the stable operation fingerprint so retries cannot change the source. Reject foreign or missing sources and changed source intent; never copy payment, hold, approval, prepared pricing or collection records. Provide an additive migration and register it in the integrator-owned startup order. Then the frontend client can send the reference and display confirmed server provenance. No protected shared file or migration was changed here.

## Acceptance remaining

T14B-D native browser checks for desktop/tablet and dark mode, route/back/reload, multi-tab recovery, uncertain saves, barcode/media providers and permission-specific controls require separate browser approval. T14/T15 completion still depends on backend checkout and durable provenance. Provider, Epson, accounting, pilot and live financial activation remain separate gates.
