# Sales UI checks to run when requested

The first visual pass was deployed to the local frontend container on 2026-10-04. These checks were deferred at Parth's request.

- [ ] Sales and MasterData Jest suites: `npx jest src/component/Pages/Sales src/component/Pages/MasterData --watchAll=false`
- [ ] Inventory Jest suite for shared styling impact: `npx jest src/component/Pages/Inventory --watchAll=false`
- [ ] Manual light and dark comparison of Sales drafts, reservations, local drafts, and Customers against Purchase Orders on localhost:3000. Browser automation requires separate approval under AGENTS.md rule 13.
- [ ] T07 work-area preview: select a configured checkout counter from a saved Sales draft; check same-company/store scope, disabled or missing area rejection, descendant locations, shared product demand across lines, untracked balance suggestions, quantity steps, tracked-stock review label, balance-limit warning, and shortfall display. Confirm the preview never creates a hold.

The frontend Docker production build completed successfully during deployment. It reported ESLint warnings.
