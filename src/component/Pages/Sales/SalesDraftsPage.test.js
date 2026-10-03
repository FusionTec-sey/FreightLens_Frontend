import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftsPage from './SalesDraftsPage';
import { useAuth } from '../../../context/AuthContext';
import { salesDraftsApi } from '../../../services/salesDraftsApi';
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('../../../services/salesDraftsApi', () => ({ salesDraftsApi: jest.fn() }));
jest.mock('../../../services/customersApi', () => ({ customersApi: jest.fn() }));
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
const list = jest.fn(); const read = jest.fn();
const row = { document_key: 'demo-draft', version: 1, branch_id: 2, status: 'DRAFT' };
const auth = { token: 'synthetic', orgId: 1, hasModule: () => true,
  permissions: ['View_SalesDraft', 'View_Product', 'View_Customer', 'View_Personal_Data'] };
beforeEach(() => {
  jest.clearAllMocks(); useAuth.mockReturnValue(auth);
  salesDraftsApi.mockReturnValue({ list, read });
  list.mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } });
  read.mockResolvedValue({ data: { ...row, customer_key: 'demo-customer', lines: [{
    line_key: 'line', product_id: 1, quantity: '2', unit: 'BOX', base_quantity: '24', base_unit: 'PCS', reserved_quantity: '20', expected_policy_version: 1 }] } });
});
test('opens authoritative details and distinguishes demand from confirmed sale', async () => {
  render(<SalesDraftsPage />);
  fireEvent.click(await screen.findByText('View'));
  expect(await screen.findByLabelText('Sales draft details')).toHaveTextContent('Base quantity 24 PCS');
  expect(screen.getByLabelText('Sales draft details')).toHaveTextContent('Reserved: 20 PCS');
  expect(read).toHaveBeenCalledWith('demo-draft', expect.anything());
  expect(screen.getByText(/no confirmed sale/)).toBeInTheDocument();
});
test('denied permissions perform no request', () => {
  useAuth.mockReturnValue({ ...auth, permissions: [] });
  render(<SalesDraftsPage />); expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(list).not.toHaveBeenCalled();
});
test('refresh failure removes old rows', async () => {
  render(<SalesDraftsPage />); await screen.findByText('demo-draft');
  list.mockRejectedValueOnce(new Error('denied')); fireEvent.click(screen.getByText('Refresh'));
  await screen.findByRole('alert'); expect(screen.queryByText('demo-draft')).not.toBeInTheDocument();
});
test('company switch aborts detail request and discards late response', async () => {
  let resolve; read.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = render(<SalesDraftsPage />); fireEvent.click(await screen.findByText('View'));
  const signal = read.mock.calls[0][1];
  useAuth.mockReturnValue({ ...auth, orgId: 2 }); list.mockResolvedValue({ data: { items: [], total: 0, pages: 1 } });
  view.rerender(<SalesDraftsPage />);
  await act(async () => resolve({ data: { ...row, lines: [] } }));
  expect(signal.aborted).toBe(true); expect(screen.queryByLabelText('Sales draft details')).not.toBeInTheDocument();
});

test('authorised draft details open the linked reservation workspace', async () => {
  const reservations = jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } });
  salesDraftsApi.mockReturnValue({ list, read, reservations });
  useAuth.mockReturnValue({ ...auth, permissions: [...auth.permissions, 'Request_ReservationRelease'] });
  render(<SalesDraftsPage />); fireEvent.click(await screen.findByText('View'));
  fireEvent.click(await screen.findByText('Reserved stock'));
  expect(await screen.findByText('No linked reservations for this draft.')).toBeInTheDocument();
  expect(reservations).toHaveBeenCalledWith('demo-draft', 1, 25, expect.anything());
});

test('follow-up reviewers reach their own case API without release permissions', async () => {
  const deadlineCases = jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } });
  salesDraftsApi.mockReturnValue({ list, read, deadlineCases });
  useAuth.mockReturnValue({ ...auth, permissions: [...auth.permissions, 'Review_ReservationDeadline'] });
  render(<SalesDraftsPage />); fireEvent.click(screen.getByText('Follow-up reviews'));
  expect(await screen.findByText('No reservation follow-up requests waiting for your review.')).toBeInTheDocument();
  expect(deadlineCases).toHaveBeenCalledWith(1, 25, expect.anything(), 'NEEDS_MY_REVIEW');
});

test('reallocation review navigation is permission gated and uses its own API', async () => {
  const reallocationCases = jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } });
  salesDraftsApi.mockReturnValue({ list, read, reallocationCases });
  const view = render(<SalesDraftsPage />);
  expect(screen.queryByText('Reallocation reviews')).not.toBeInTheDocument();
  useAuth.mockReturnValue({ ...auth, permissions: [...auth.permissions, 'Review_ReservationReallocation'] });
  view.rerender(<SalesDraftsPage />); fireEvent.click(screen.getByText('Reallocation reviews'));
  expect(await screen.findByText('No reservation reallocation requests waiting for your review.')).toBeInTheDocument();
  expect(reallocationCases).toHaveBeenCalledWith(1, 25, expect.anything(), 'NEEDS_MY_REVIEW');
});

test('overdue inbox drills through a fresh permission-checked draft read', async () => {
  const dueReservations = jest.fn().mockResolvedValue({ data: { items: [{ ...row, reservation_key: 'hold', product_id: 1, product_name: 'Demo tile', remaining_quantity: '2', review_at: '2026-10-01T08:00:00Z', review_due: true }], total: 1, pages: 1 } });
  salesDraftsApi.mockReturnValue({ list, read, dueReservations });
  useAuth.mockReturnValue({ ...auth, permissions: [...auth.permissions, 'Review_ReservationDeadline'] });
  render(<SalesDraftsPage />); fireEvent.click(screen.getByText('Overdue follow-up'));
  fireEvent.click(await screen.findByText('Open draft'));
  expect(await screen.findByLabelText('Sales draft details')).toBeInTheDocument();
  expect(read).toHaveBeenCalledWith('demo-draft', expect.anything());
});
