# Frontend Architecture Document

## Overview
This document outlines the high-level architecture, directory structure, and key components of the `FreightLens_Frontend` React application located in `containermgmt`.

## Technology Stack
- **Library**: React 18
- **Routing**: `react-router-dom` v6
- **Styling**: Tailwind CSS for utility-first styling.
- **State Management**: React Context API (`AuthContext`, `ThemeContext`, `OptionsContext`).

## Application Structure
The source code is organized primarily within the `src/` directory:

- `src/App.js` & `src/index.js`: The application entry points. `index.js` renders the root React tree, while `App.js` wraps the application in essential providers.
- `src/component/`: Contains the core React components, pages, and UI elements.
- `src/context/`: Holds React Context providers for global state.
- `src/hooks/`: Custom React hooks for shared logic.
- `src/utils/`: Utility functions and helper scripts (e.g., `IdleTimer`).
- `src/assets/`: Static assets like images or icons.

## Core Providers (Contexts)
The application relies on several global context providers wrapping the `<MainPage />` in `App.js`:
- **`AuthProvider`**: Manages user authentication state, tokens, and session data.
- **`ThemeProvider`**: Manages the application's UI theme (e.g., light/dark mode) and exposes Tailwind classes (like `${theme.background}`) dynamically.
- **`OptionsContext` / `OptionsProvider`**: Manages general application options or configuration settings.

## Layout and Routing (`MainPage.js`)
The `MainPage` component acts as the primary layout wrapper and routing switch.
- It features a responsive `Sidebar` (`MenuPanel/Menu`), which behaves as a fixed sidebar on desktop and a toggleable overlay on mobile devices.
- **Routing Map**:
  - `/` -> `LoginPage` (Public)
  - `/dashboard` -> `Dashboard` (Protected)
  - `/Complete` -> `CompleteContainer` (Protected, requires `View_Container` permission)
  - `/viewContainer` -> `ContainerEntry` (Protected, requires `View_Container` permission)
  - `/report` -> `ContainerForReport1` (Protected, requires `View_Report` permission)
  - `/settings` -> `Setting` (Protected)
  - `/BillOfLanding` -> `BillOfLanding` (Protected)
  - `/BillOfLanding/:Id` -> `BillOfLandingInfo` (Protected)
  - `/unauthorized` -> `Unauthorized` (Public/Fallback for unauthorized access)

## Security & Access Control
The application uses a `PrivateRoute` wrapper for authenticated routes. It checks not only if the user is authenticated (presumably via `AuthContext`) but also verifies specific roles or permissions constraints (e.g., `requiredPermissions={["View_Container"]}`) before rendering the intended component.

## Styling Approach
The project employs Tailwind CSS. The `ThemeContext` provides dynamic theme classes (`theme.background`, `theme.text`, `theme.border`), which are interpolated into `className` strings across the application to ensure consistent theming. 
