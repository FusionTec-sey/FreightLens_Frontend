# FreightLens Frontend Architecture

## Status

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

Sustained-use UI changes also follow `docs/FRONTEND_ERGONOMICS.md`. Its evidence boundary prevents unsupported medical claims while adding zoom, readability, workflow-continuity, and layout-stability checks.

Supplier master data displays the backend's explicit scope. Root users can choose shared or tenant-specific when creating/editing a supplier; tenant users can view shared suppliers but cannot mutate them.

## Procurement Catalogue Identity

Sourcing/RFQ and purchase-order lines (`OrderEntryPage`), order-template lines, and
Store Request requisition lines can retain a `product_id` from the product catalogue.
When that link exists, the SKU/code, product description/name, and catalogue unit
are read-only; quantity, price (where applicable), and notes remain editable.
Manually entered lines without a `product_id` remain editable. Duplicating a
catalogue-linked template line preserves its product link and read-only identity.

Store Request items persist the optional product link. The API validates that the
selected product is active, not soft-deleted, and shared or visible to the current
organisation, then derives the stored code, name, and unit from that product rather
than trusting client text. Historical free-text request items remain unlinked.
