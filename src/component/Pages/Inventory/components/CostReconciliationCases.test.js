import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CostReconciliationCases from './CostReconciliationCases';

jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
const pool = { id: 3, code: 'MAIN', name: 'Main pool' };
const candidate = { product_id: 7, product_name: 'Tile', pool_quantity: '10.000000',
  pool_value_scr: '120.000000', valuation_version: 2, valuation_base_unit: 'PCS' };
let api;
beforeEach(() => {
  let next = 0;
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => `11111111-1111-4111-8111-${String(++next).padStart(12, '0')}` } });
  api = {
    costReconciliationCases: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }),
    costReconciliationCheckpoints: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }),
    requestCostReconciliation: jest.fn().mockRejectedValueOnce(new Error('uncertain')).mockResolvedValue({ data: { case_key: 'case-1' } }),
    reviewCostReconciliation: jest.fn(), closeCostReconciliation: jest.fn(),
  };
});
const props = { api, pool, candidate, userId: 4, canRequest: true, canReview: false,
  canExecute: false, panel: 'panel', button: 'button', isDark: false, onClose: jest.fn() };

test('retains a failed request and retries the exact product state identity', async () => {
  render(<CostReconciliationCases {...props} api={api} />);
  await screen.findByText('No reconciliation cases in this view.');
  fireEvent.change(screen.getByLabelText('Reconciliation request reason'), { target: { value: 'Close checked state' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request exact checkpoint review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not be confirmed/i);
  expect(screen.getByLabelText('Reconciliation request reason')).toHaveValue('Close checked state');
  fireEvent.click(screen.getByRole('button', { name: 'Request exact checkpoint review' }));
  expect(await screen.findByText(/Reconciliation review requested/)).toBeInTheDocument();
  expect(api.requestCostReconciliation.mock.calls[1][0]).toEqual(api.requestCostReconciliation.mock.calls[0][0]);
  expect(api.requestCostReconciliation.mock.calls[0][0]).toEqual(expect.objectContaining({ cost_pool_id: 3, product_id: 7 }));
});

test('review uses returned version and close remains distinct from accounting close', async () => {
  const row = { case_key: 'case-2', version: 1, status: 'REQUESTED', requestor_id: 99,
    product_name: 'Tile', valuation_version: 2, pool_quantity: '10.000000', base_unit: 'PCS',
    pool_value_scr: '120.000000', balance_count: 1, reason: 'Inspect' };
  api.costReconciliationCases.mockResolvedValue({ data: { items: [row], total: 1, pages: 1 } });
  api.reviewCostReconciliation.mockResolvedValue({ data: { status: 'APPROVED' } });
  render(<CostReconciliationCases {...props} api={api} candidate={null} canRequest={false} canReview />);
  fireEvent.click(await screen.findByRole('button', { name: 'Approve checkpoint' }));
  fireEvent.change(screen.getByLabelText('Reconciliation decision reason'), { target: { value: 'Exact state inspected' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm approved' }));
  await waitFor(() => expect(api.reviewCostReconciliation).toHaveBeenCalledWith('case-2', expect.objectContaining({ expected_version: 1, outcome: 'APPROVED' }), expect.any(AbortSignal)));
  expect(screen.getByText(/does not rewrite weighted-average history/)).toBeInTheDocument();
});
