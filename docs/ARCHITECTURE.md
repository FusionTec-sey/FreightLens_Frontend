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

Product media and supplier logos currently use `/blobs/{key}` URLs. The stabilization plan replaces these with backend-issued signed URLs and one shared `mediaUrl` helper. Order, payment, RFQ, and defect documents use their owning authenticated API endpoints.

## Build and Deployment

Development uses `npm start` on port 3000. The production Docker image builds static assets with Node 20 and serves them from nginx on port 4005. Client-side routes fall back to `index.html`.

Verification command:

```powershell
npm run build
```

The current build passes with pre-existing ESLint warnings. Warning cleanup is tracked separately from security stabilization.
