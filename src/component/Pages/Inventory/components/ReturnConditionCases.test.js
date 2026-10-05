import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReturnConditionCases from './ReturnConditionCases';

jest.mock('../../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));

const invoiceKey = '10000000-0000-4000-8000-000000000001';
const caseKey = '20000000-0000-4000-8000-000000000001';
const returnKey = '30000000-0000-4000-8000-000000000001';
const movementKey = '40000000-0000-4000-8000-000000000001';
const creditKey = '50000000-0000-4000-8000-000000000001';
const lineKey = '60000000-0000-4000-8000-000000000001';
const handoverKey = '70000000-0000-4000-8000-000000000001';
const operationKey = '80000000-0000-4000-8000-000000000001';
const source = {
  credit_note_line_id: 44, credit_note_key: creditKey, credit_note_number: 'CN-SYN-1',
  return_key: returnKey, return_operation_key: movementKey, invoice_key: invoiceKey,
  invoice_line_key: lineKey, handover_allocation_key: handoverKey, branch_id: 2,
  branch_name: 'Synthetic store', location_id: 8, location_name: 'Returns quarantine',
  product_id: 9, product_name: 'Synthetic tile', product_sku: 'SYN-TILE', base_unit: 'piece',
  tracking_policy: 'UNTRACKED', batch_key: null, source_quantity: '2.000000',
  previously_transitioned: '0.500000', pending_review_quantity: '0.250000',
  remaining_eligible: '1.250000', quarantined_available: '2.000000', stock_version: 8,
};
const requested = {
  ...source, case_key: caseKey, version: 1, status: 'REQUESTED', source_version: 8,
  quantity: '1.000000', source_return_quantity: '2.000000', from_condition: 'QUARANTINED',
  to_condition: 'DAMAGED', before_on_hand: '8.000000', before_reserved: '1.000000',
  before_damaged: '0.500000', before_quarantined: '2.000000', target_damaged: '1.500000',
  target_quarantined: '1.000000', reason: 'Verified returned damage', requestor_id: 11,
  reviewer_id: null, review_reason: null, requested_at: '2026-10-05T10:00:00Z',
};
const page = items => ({ data: { items, total: items.length, page: 1, pages: 1, limit: 25 } });

function api(overrides = {}) {
  return {
    stockConditionSources: jest.fn().mockResolvedValue(page([source])),
    stockConditionCases: jest.fn().mockResolvedValue(page([])),
    requestStockCondition: jest.fn().mockResolvedValue({ data: { case_key: caseKey, status: 'REQUESTED' } }),
    reviewStockCondition: jest.fn().mockResolvedValue({ data: { case_key: caseKey, status: 'APPROVED' } }),
    executeStockCondition: jest.fn(), ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'locks', { configurable: true,
    value: { request: jest.fn((name, work) => Promise.resolve(work())) } });
  Object.defineProperty(window, 'crypto', { configurable: true,
    value: { randomUUID: jest.fn(() => operationKey) } });
});

test('requests exact server-derived return lineage and reloads an uncertain request unchanged', async () => {
  const client = api({ requestStockCondition: jest.fn().mockRejectedValueOnce(new Error('Connection uncertain'))
    .mockResolvedValueOnce({ data: { case_key: caseKey, status: 'REQUESTED' } }) });
  const first = render(<ReturnConditionCases api={client} orgId={7} userId={9} canRequest
    invoiceKey={invoiceKey} compact />);
  fireEvent.click(await screen.findByRole('button', { name: 'Request damaged classification' }));
  fireEvent.change(screen.getByLabelText('Condition transition quantity'), { target: { value: '1.000000' } });
  fireEvent.change(screen.getByLabelText('Condition transition reason'), { target: { value: 'Verified returned damage' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request manager review' }));
  expect(await screen.findByRole('button', { name: 'Retry exact condition request' })).toBeInTheDocument();
  expect(screen.getByLabelText('Condition transition quantity')).toBeDisabled();
  first.unmount();

  render(<ReturnConditionCases api={client} orgId={7} userId={9} canRequest
    invoiceKey={invoiceKey} compact />);
  fireEvent.click(await screen.findByRole('button', { name: 'Request damaged classification' }));
  expect(screen.getByLabelText('Condition transition quantity')).toHaveValue('1.000000');
  fireEvent.click(screen.getByRole('button', { name: 'Retry exact condition request' }));
  await waitFor(() => expect(client.requestStockCondition).toHaveBeenCalledTimes(2));
  expect(client.requestStockCondition.mock.calls[1][0]).toEqual(client.requestStockCondition.mock.calls[0][0]);
  expect(client.requestStockCondition.mock.calls[0][0]).toEqual({ operation_key: operationKey,
    credit_note_line_id: 44, expected_source_version: 8, quantity: '1.000000',
    reason: 'Verified returned damage' });
  expect(client.requestStockCondition.mock.calls[0][0]).not.toHaveProperty('target_damaged');
});

test('binds independent review to the case version and hides self-review', async () => {
  const client = api({ stockConditionCases: jest.fn().mockResolvedValue(page([requested])) });
  const view = render(<ReturnConditionCases api={client} orgId={7} userId={9} canReview />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
  fireEvent.change(screen.getByLabelText('Review reason'), { target: { value: 'Inspected independently' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
  await waitFor(() => expect(client.reviewStockCondition).toHaveBeenCalledWith(caseKey, {
    operation_key: operationKey, expected_version: 1, outcome: 'APPROVED', reason: 'Inspected independently',
  }, expect.any(AbortSignal)));
  view.unmount();

  render(<ReturnConditionCases api={api({ stockConditionCases: jest.fn().mockResolvedValue(page([{ ...requested, requestor_id: 9 }])) })}
    orgId={7} userId={9} canReview />);
  expect(await screen.findByText('Independent reviewer required')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
});

test('executes only an approved case and reports backend preservation effects', async () => {
  const approved = { ...requested, status: 'APPROVED', version: 2, reviewer_id: 12 };
  const client = api({
    stockConditionCases: jest.fn().mockResolvedValue(page([approved])),
    executeStockCondition: jest.fn().mockResolvedValue({ data: { operation_key: operationKey,
      case_key: caseKey, status: 'CONSUMED', balance_id: 8, version: 9,
      on_hand: '8.000000', reserved: '1.000000', available: '5.500000', damaged: '1.500000',
      quarantined: '1.000000', replayed: false, condition_effect: 'QUARANTINED_TO_DAMAGED',
      valuation_effect: 'NONE', accounting_effect: 'NONE', pricing_effect: 'NONE' } }),
  });
  render(<ReturnConditionCases api={client} orgId={7} userId={9} canExecute />);
  fireEvent.click(await screen.findByRole('button', { name: 'Execute approved transition' }));
  expect(screen.getByRole('button', { name: 'Execute once' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Execute once' }));
  expect(await screen.findByRole('status')).toHaveTextContent('On hand 8.000000; reserved 1.000000; available 5.500000');
  expect(screen.getByRole('status')).toHaveTextContent('Valuation, accounting and pricing: no effect');
  expect(client.executeStockCondition).toHaveBeenCalledWith(caseKey, { operation_key: operationKey }, expect.any(AbortSignal));
});
