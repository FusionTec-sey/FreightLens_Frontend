# Supplier plan — amendments to make before P0 starts

Amendments to `SUPPLIER_VENDOR_IMPROVEMENT_PLAN.docx` (that file is unchanged; this
sits beside it). Driven by the future scope in
`../../Backend/docs/planning/CONNECTED-VENDOR-NETWORK-FUTURE-SCOPE.md`.

Full review, with the code checks and the revised sequence:
https://claude.ai/code/artifact/a0cad4cd-e5a9-4f6e-81e9-0a7b8b9e6f76

## What a clean supplier master makes easy later

The case for this work is not tidier screens. A supplier master held as **one row per
legal entity, group-scoped, with its commercial facts on the product link**, is what
turns each of the next growth moves into data entry instead of a project.

| Growth move | Easy because the master already holds | Without it |
| --- | --- | --- |
| A fourth company joins the group | Suppliers are a group-level master — 136 of 136 rows are already shared — so the new company opens on day one with the whole vendor base, its own product costs, its own order history | Re-entering vendors per company, which is how the duplicates just merged away came into being |
| A second or third vendor for the same product | `product_suppliers` carries SKU, cost, MOQ and lead time per vendor, so a competing source is one row and comparison improves on its own | Sourcing stays single-vendor by habit, and price comparison has nothing to compare |
| Buying from a new country | Identifiers, addresses and contacts as child rows; currency and payment terms per supplier | A schema change per regime, or region-specific fields made mandatory for everyone |
| Ten times the vendors | Server paging, server search, suppliers in the Meilisearch index | A directory that loads every row into the browser stops being usable in the high hundreds |
| Supplier performance and spend reporting | One identity per vendor, so spend, lead-time adherence and defects aggregate to the right counterparty | Every metric is wrong by however much history sits under a duplicate, and wrong quietly |
| Linking a vendor's own tenant | One clean row per legal entity, identifiers to prove who they are, `linked_org_id` waiting | Linking starts with a data-cleanup project, and ambiguous rows have nowhere to route an RFQ |
| Receiving a vendor's catalogue | `factory_code` mapping accumulated on the product link, confirmed once and reused | Every quote cycle re-matches descriptions by eye, which is where wrong-line errors come from |
| An audit, or a buyer's due diligence on you | Registration numbers with `verified_at`, bank changes versioned and re-verified, every edit audited | No answer to "who changed this account, and who approved it" |
| A public profile, if the marketplace ever happens | Fields already classified internal, partner-visible or public | Deciding visibility field by field across a populated table, under time pressure |

The pattern is one idea: **identity is held once and never re-keyed, while everything
commercial hangs off the link between a supplier and a product.** That is what lets the
group add a company, a country, a vendor or a channel without touching the supplier
table's shape.

What it does *not* buy: a clean master does not find new vendors, win better prices or
make anyone quote faster. It removes the re-entry, the reconciliation, the duplicate
history and the migration that make each of those harder than it should be.

## The amendments

Nine changes. Six are a line in a table the plan already has. Three touch the data
model, and they are cheap only while the supplier table is still as the import left
it: as of 14 Oct 2026, **0 of its 136 rows carry a supplier code, and none carries a
country** — nobody has typed anything there yet to conflict with.

| Plan section | Amendment | Why now |
| --- | --- | --- |
| §5 Create and edit, §7 | The server generates the supplier code — group-unique, immutable, behind a unique index, backfilled across the existing rows. **Built 14 Oct as `VEND-0042`, not `SUP-00042`:** the directory had been displaying that exact form all along, so the backfill wrote down what people were already reading rather than re-coding 136 vendors | Settles §11's first decision. `supplier.code` is nullable with no constraint and nothing in it; the moment buyers type their own, uniqueness becomes conflict resolution across live documents |
| §7, new P0 row | A `supplier_identifiers` child table — type, country, value, `verified_at` — instead of tax and registration columns on the supplier | Country plus registration number is how deduplication, verification and any later network identity work. Rows also answer §11's Seychelles-versus-overseas question without a mandatory field for everyone |
| §4 Overview, §5 | Supplier fields stay buyer-owned. Anything a vendor publishes about itself lands in a separate, display-only partner profile carrying `source` and `synced_at` | The one failure that would be unrecoverable: a linked vendor's published name or address overwriting the master record your POs were issued against |
| §7, §8 | Classify every new field as internal, partner-visible or public as the child tables are built. Bank accounts are internal permanently | Three visibility tiers decided per field cost nothing on an empty table and are painful to retrofit across a populated one |
| §7, P1 | A merge-two-suppliers action inside the product, matching on country plus identifier, not name | `Utils/migrate_20261013_unique_shared_suppliers.py` merged on name once. New near-duplicates keep arriving, and merge is a prerequisite for linking: one link per supplier record |
| §4 Products tab | Name the real column. The supplier SKU is `product_suppliers.factory_code`, beside `vendor_product_name`, `min_order_qty` and `lead_time_days`. Capture all four at quote entry and at award | They are the join key a shared catalogue maps onto, and the fields that today let a minimum-order deviation surface only when the quote arrives |
| §4 Quotes tab | A provenance column on every quote — typed, imported, received over a link — shown as a badge | Unbackfillable. A quote's origin cannot be reconstructed later |
| §2, §7 | A nullable `linked_org_id` on the supplier record, unused | One column now against a migration over a live supplier table later |
| §10 Acceptance | Three checks added: code uniqueness rejected at the API, not the form; bank fields absent from every partner-visible payload; a merge leaves no orphaned reference | Each is the test that proves one of the amendments above actually holds |

## The two that change the data model

**Identifiers as rows, not columns.** A supplier may hold a tax number, a company
registration number, and later a GLN or DUNS; an overseas supplier holds a different
set from a Seychelles one. As columns this becomes a widening table where most cells
are empty and no field can be made mandatory. As `supplier_identifiers` rows it is
one table, one shape, with `verified_at` sitting where verification will eventually
be recorded — and "same country, same registration number" becomes a far stronger
duplicate check than the name match the system uses today.

**Received data never writes to your record.** The plan treats the supplier row as
the single master, which is right today. A link introduces a second author, and the
rule has to be decided before the row is designed: your fields are yours, the
vendor's published profile is a separate container shown beside them, and a buyer
promotes a value from theirs to yours deliberately. Without that separation the
first sync either overwrites buyer-entered data or has to be built as a one-way
import nobody trusts.

None of this delays P0. The supplier code, the identifiers table and the
`linked_org_id` column belong in the same migration window as the P0 work; the rest
are design decisions taken while the screens are being drawn.

## The defect that blocked P0a (fixed)

`MasterDataRouter.py` wrote `org_id=None` for a shared supplier against a `NOT NULL`
column, so creating a vendor with Shared ticked raised a 500 — on the normal case,
since 136 of 136 live rows are shared. Settled the way the update path already worked:
the creating company stays the owner and `is_shared` decides visibility. No migration.

## Built so far (14 Oct 2026, branch `feature/supplier-master`)

**P0a — unblock**
- Shared-supplier create no longer 500s: `org_id` is always the creating company,
  `is_shared` alone decides visibility.
- Supplier codes are real data. All 136 rows backfilled with the code the screen was
  already displaying (`VEND-0042`), unique index `ux_supplier_code_ci`, issued by the
  server, 409 if edited or already taken. The serialiser no longer invents one.
- Directory is server-side: paging, search, new `status` and `currency` filters, an
  always-visible pager. A vendor can be deactivated (form toggle and row action)
  instead of `is_active: true` on every save.

**P0b — the profile**
- `GET /master-data/suppliers/{id}/profile` plus paged `/products`, `/orders`,
  `/quotes`; `/identifiers` with add, verify and remove; `/merge-preview`, `/merge`,
  `/retire`.
- `SupplierProfilePage` at `/master-data/suppliers/:id`, reached from the vendor name:
  Overview (contact, terms, what depends on this vendor, record completeness),
  Products, Purchase orders, Quotes, Identity.
- Costs and PO values are shown only with financial access; the quote tab is refused
  outright without it, because a quote with no price is not a quote.
- Retire and merge each require a reason (422 below five characters) and write an
  audit row. Merge repoints every FK found in the live schema, fills only empty
  fields on the survivor, consolidates identifiers, de-duplicates
  `product_suppliers`, and aborts if anything still points at the merged-away row.

**P0c — procurement inputs**
- At award, the vendor's terms are written back to `product_suppliers`:
  `factory_code`, `vendor_product_name`, cost, lead time, and a minimum order
  quantity **only when the vendor offered more than was asked**. Existing values are
  topped up, never overwritten. Both the single award and the split award learn.
- `GET /master-data/products/supplier-terms?product_ids=…` (batched) feeds a caution
  on the order entry screen: "asking 3, 3H INC's minimum is 5 (VEND-0179)", while the
  quantity is still being typed. Never blocking.

**Deduplication and search**
- Suppliers are indexed in Meilisearch (`suppliers`), searchable by name, code,
  contact, email, phone, country and identifier values, filtered by "shared or mine".
  `matchingStrategy: all`, because the default matched all 136 vendors for
  `VEND-0181`. SQL remains the fallback when the engine is unavailable.
- `supplier_identifiers` holds tax and registration numbers; the same number in the
  same country is refused with the holder named, which is how the next duplicate gets
  caught before it exists.

**Verified**: 28 unit tests pass (6 identity, 12 master, plus the existing award and
scope suites); every new endpoint exercised against the live local database; create,
identifier dedupe, reason gates, merge and retire run end to end on throwaway records
and cleaned up. `pytest` is installed in neither the host nor the container, so the
tests were run through a small harness — the full 206/76 suites still have not been
run end to end.

**Not built, deliberately**: P1's contacts, addresses, bank accounts, documents and
activity feed. Bank accounts are the highest-risk item in the plan (encryption at
rest, masked reads, re-verification on change, and a verifier who is not the editor),
and the roles for them are still an open decision — better unbuilt than half-built.
