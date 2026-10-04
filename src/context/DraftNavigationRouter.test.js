import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DraftNavigationProvider from './DraftNavigationProvider';
import { useDraftNavigationGuard } from './DraftNavigationContext';

// CRA's older resolver ignores this installed package's exports map. Load its
// real CommonJS entry, not a simulated navigation implementation.
jest.mock('react-router-dom', () => {
  global.TextEncoder = require('util').TextEncoder;
  return require('../../node_modules/react-router/dist/development/index.js');
}, { virtual: true });
const { createMemoryRouter, RouterProvider, Routes, Route, Link } = require('react-router-dom');
function Editor({ prepare }) {
  useDraftNavigationGuard({ active: true, prepareToLeave: prepare });
  return <Link to="/inventory">Inventory menu</Link>;
}
test('real router preserves nested routes and blocks menu and browser-back navigation', async () => {
  const prepare = jest.fn().mockResolvedValue(undefined);
  const router = createMemoryRouter([{ path: '*', element: <DraftNavigationProvider><Routes>
    <Route path="/sales/drafts" element={<Editor prepare={prepare} />} />
    <Route path="/inventory" element={<h1>Inventory screen</h1>} />
  </Routes></DraftNavigationProvider> }], { initialEntries: ['/inventory', '/sales/drafts'] });
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByText('Inventory menu'));
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/sales/drafts');
  fireEvent.click(screen.getByText('Stay in draft'));
  await act(async () => router.navigate(-1));
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Keep locally and leave'));
  expect(await screen.findByText('Inventory screen')).toBeInTheDocument();
  expect(prepare).toHaveBeenCalledTimes(1);
  router.dispose();
});
