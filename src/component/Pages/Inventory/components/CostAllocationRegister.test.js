import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CostAllocationRegister from './CostAllocationRegister';
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
jest.mock('../../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
const pool = { id: 2, code: 'POOL' };

test('request preserves failed intent and opens company-pinned reviews after success', async () => {
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'request-key' } });
  const row = { proposal_key: 'saved', charge_reference: 'FREIGHT-1', total_scr: '1.000000', basis: 'GOODS_VALUE', status: 'PROPOSED' };
  const api = { costAllocations: jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } }),
    costAllocation: jest.fn().mockResolvedValue({ data: { ...row, reason: 'Evidence', snapshot: { lines: [] } } }),
    requestCostAllocationReview: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { case_key: 'case' } }),
    costAllocationCases: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<CostAllocationRegister api={api} pool={pool} canManage userId={4} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'View cost proposal' }));
  fireEvent.change(await screen.findByLabelText('Review request reason'), { target: { value: 'Check freight' } });
  expect(screen.getByRole('button', { name: 'View allocation reviews' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Request proposal review' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Back to proposals' }));
  expect(screen.getByRole('button', { name: 'Request proposal review' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  fireEvent.click(screen.getByRole('button', { name: 'Request proposal review' }));
  await screen.findByText(/Review requested: case/);
  expect(api.requestCostAllocationReview.mock.calls[0][2]).toEqual(api.requestCostAllocationReview.mock.calls[1][2]);
  await waitFor(() => expect(screen.getByRole('button', { name: 'View allocation reviews' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'View allocation reviews' }));
  await waitFor(() => expect(api.costAllocationCases).toHaveBeenCalledWith(2, 'saved', 1, 25, expect.any(AbortSignal), 'ALL'));
});
test('opens historical declaration and preserves exact allocations', async () => {
  const row = { proposal_key: 'saved', charge_reference: 'FREIGHT-1', total_scr: '0.000001', basis: 'GOODS_VALUE', status: 'PROPOSED' };
  const api = { costAllocations: jest.fn().mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } }),
    costAllocation: jest.fn().mockResolvedValue({ data: { ...row, reason: 'Declared evidence', snapshot: { lines: [{ valuation_id: 1, balance_id: 2, product_name: 'Tile', basis_value: '100.000000', allocated_scr: '0.000001' }] } } }) };
  render(<CostAllocationRegister api={api} pool={pool} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'View cost proposal' }));
  await screen.findByText('Declared evidence');
  expect(screen.getByText('100.000000')).toBeInTheDocument();
  expect(api.costAllocation).toHaveBeenCalledWith(2, 'saved', expect.any(AbortSignal));
  expect(screen.queryByRole('button', { name: /Approve|Post charge/ })).not.toBeInTheDocument();
});
test('load failure has refresh without showing stale records', async () => {
  const api = { costAllocations: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<CostAllocationRegister api={api} pool={pool} onClose={jest.fn()} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh cost proposals' }));
  await screen.findByText('No saved cost proposals in this pool.');
});
