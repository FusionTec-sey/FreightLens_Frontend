import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesReturnPanel from './SalesReturnPanel';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));

const invoice = { invoice_key: '10000000-0000-4000-8000-000000000001', invoice_number: 'INV-SYNTH-1',
  payment_status: 'PAID', fulfilment_status: 'COLLECTED' };
const lineKey = '20000000-0000-4000-8000-000000000001';
const handoverKey = '30000000-0000-4000-8000-000000000001';
const returnKey = '40000000-0000-4000-8000-000000000001';
const options = {
  invoice_key: invoice.invoice_key, invoice_number: invoice.invoice_number, invoice_version: 1,
  customer_key: '50000000-0000-4000-8000-000000000001', customer_name: 'Synthetic customer',
  branch_id: 2, branch_name: 'Synthetic branch',
  lines: [{ invoice_line_key: lineKey, product_id: 9, product_name: 'Synthetic tile', sku: 'SYN-TILE',
    base_unit: 'piece', handed_over: '4.000000', accepted_returned: '1.000000',
    pending_return: '1.000000', returnable: '2.000000' }],
  handovers: [{ handover_allocation_key: handoverKey,
    collection_key: '60000000-0000-4000-8000-000000000001', invoice_line_key: lineKey,
    balance_id: 8, location_id: 6, location_code: 'A-01', location_name: 'Main floor',
    batch_key: null, batch_code: null, shade: null, calibre: null, base_unit: 'piece',
    handed_over: '4.000000', accepted_returned: '1.000000', pending_return: '1.000000',
    returnable: '2.000000', collected_at: '2026-10-05T08:00:00Z' }],
};
const emptyPage = { items: [], page: 1, pages: 1, limit: 10, total: 0 };

function api(overrides = {}) {
  return {
    returnOptions: jest.fn().mockResolvedValue({ data: options }),
    invoiceReturnClaims: jest.fn().mockResolvedValue({ data: emptyPage }),
    invoiceCreditNotes: jest.fn().mockResolvedValue({ data: { ...emptyPage, limit: 25 } }),
    createReturnClaim: jest.fn().mockResolvedValue({ data: {} }),
    reviewReturnClaim: jest.fn().mockResolvedValue({ data: {} }),
    returnProcessingOptions: jest.fn(), createReturnCreditNote: jest.fn(),
    stockConditionSources: jest.fn().mockResolvedValue({ data: emptyPage }),
    stockConditionCases: jest.fn().mockResolvedValue({ data: emptyPage }),
    requestStockCondition: jest.fn(), reviewStockCondition: jest.fn(), executeStockCondition: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'locks', { configurable: true,
    value: { request: jest.fn((name, work) => Promise.resolve(work())) } });
  let next = 0;
  Object.defineProperty(window, 'crypto', { configurable: true, value: {
    randomUUID: jest.fn(() => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`),
  } });
});

function enterClaim() {
  fireEvent.change(screen.getByLabelText(`Return quantity for ${handoverKey}`), { target: { value: '1.500000' } });
  fireEvent.change(screen.getByLabelText(`Observed condition for ${handoverKey}`), { target: { value: 'OPENED' } });
  fireEvent.change(screen.getByLabelText('Returner name'), { target: { value: 'Synthetic Returner' } });
  fireEvent.change(screen.getByLabelText('Returner contact'), { target: { value: '2 500 000' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Wrong size selected' } });
}

test('requests a reviewed return against the exact invoice line and handover', async () => {
  const client = api();
  render(<SalesReturnPanel api={client} invoice={invoice} orgId={1} userId={2} canRequest onClose={jest.fn()} />);

  expect(await screen.findByText('Synthetic tile')).toBeInTheDocument();
  expect(screen.getByText('4.000000 piece')).toBeInTheDocument();
  expect(screen.getAllByText('1.000000 piece', { selector: 'dd' })).toHaveLength(2);
  expect(screen.getByText('2.000000 piece', { selector: 'dd' })).toBeInTheDocument();
  expect(screen.getByText(/Quarantine only/)).toBeInTheDocument();
  enterClaim();
  fireEvent.click(screen.getByRole('button', { name: 'Request return review' }));

  await waitFor(() => expect(client.createReturnClaim).toHaveBeenCalledTimes(1));
  const [key, body] = client.createReturnClaim.mock.calls[0];
  expect(key).toBe(body.return_key);
  expect(body).toMatchObject({ invoice_key: invoice.invoice_key, expected_invoice_version: 1,
    returner_name: 'Synthetic Returner', returner_contact: '2 500 000', reason: 'Wrong size selected',
    lines: [{ invoice_line_key: lineKey, handover_allocation_key: handoverKey,
      quantity: '1.500000', condition: 'OPENED' }] });
  expect(body).not.toHaveProperty('credit_total_scr');
});

test('freezes an uncertain claim and retries the identical body', async () => {
  const client = api({ createReturnClaim: jest.fn()
    .mockRejectedValueOnce(new Error('Connection uncertain'))
    .mockResolvedValueOnce({ data: {} }) });
  const view = render(<SalesReturnPanel api={client} invoice={invoice} orgId={1} userId={2} canRequest onClose={jest.fn()} />);
  await screen.findByText('Synthetic tile'); enterClaim();
  fireEvent.click(screen.getByRole('button', { name: 'Request return review' }));

  expect(await screen.findByRole('button', { name: 'Retry exact return request' })).toBeInTheDocument();
  expect(screen.getByLabelText('Returner name')).toBeDisabled();
  view.unmount();
  render(<SalesReturnPanel api={client} invoice={invoice} orgId={1} userId={2} canRequest onClose={jest.fn()} />);
  expect(await screen.findByRole('button', { name: 'Retry exact return request' })).toBeInTheDocument();
  expect(screen.getByLabelText('Returner name')).toHaveValue('Synthetic Returner');
  fireEvent.click(screen.getByRole('button', { name: 'Retry exact return request' }));
  await waitFor(() => expect(client.createReturnClaim).toHaveBeenCalledTimes(2));
  expect(client.createReturnClaim.mock.calls[1].slice(0, 2))
    .toEqual(client.createReturnClaim.mock.calls[0].slice(0, 2));
});

test('binds manager review to the exact requested claim version', async () => {
  const claim = { return_key: returnKey, operation_key: '70000000-0000-4000-8000-000000000001',
    invoice_key: invoice.invoice_key, invoice_number: invoice.invoice_number, branch_id: 2,
    customer_key: options.customer_key, returner_name: 'Synthetic Returner', returner_contact: '2 500 000',
    reason: 'Wrong size selected', status: 'REQUESTED', version: 1, requested_by: 21,
    requested_at: '2026-10-05T09:00:00Z', estimated_gross_credit_scr: '150.00',
    review: { case_key: '80000000-0000-4000-8000-000000000001', outcome: null },
    lines: [{ invoice_line_key: lineKey, handover_allocation_key: handoverKey, product_id: 9,
      product_name: 'Synthetic tile', sku: 'SYN-TILE', balance_id: 8, location_id: 6,
      batch_key: null, quantity: '1.500000', base_unit: 'piece', condition: 'OPENED' }],
  };
  const client = api({ invoiceReturnClaims: jest.fn().mockResolvedValue({ data: { ...emptyPage, items: [claim], total: 1 } }) });
  render(<SalesReturnPanel api={client} invoice={invoice} orgId={1} userId={2} canReview onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review claim' }));
  fireEvent.change(screen.getByLabelText('Review note'), { target: { value: 'Invoice and returned goods checked' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save review decision' }));
  await waitFor(() => expect(client.reviewReturnClaim).toHaveBeenCalledTimes(1));
  expect(client.reviewReturnClaim.mock.calls[0][0]).toBe(returnKey);
  expect(client.reviewReturnClaim.mock.calls[0][1]).toMatchObject({ expected_version: 1,
    outcome: 'APPROVED', reason: 'Invoice and returned goods checked' });
});

test('shows only server-calculated debt and surplus credit before processing', async () => {
  const claim = { return_key: returnKey, returner_name: 'Synthetic Returner', returner_contact: '2 500 000',
    reason: 'Wrong size selected', status: 'APPROVED', version: 2, estimated_gross_credit_scr: '150.00', lines: [] };
  const processing = { return_key: returnKey, claim_version: 2, option_version: 1,
    fingerprint: 'a'.repeat(64), branch_id: 2, gross_credit_scr: '150.00', net_credit_scr: '130.43',
    tax_credit_scr: '19.57', invoice_debt_applied_scr: '20.00', customer_credit_scr: '130.00', balances: [] };
  const client = api({
    invoiceReturnClaims: jest.fn().mockResolvedValue({ data: { ...emptyPage, items: [claim], total: 1 } }),
    returnProcessingOptions: jest.fn().mockResolvedValue({ data: processing }),
    createReturnCreditNote: jest.fn().mockRejectedValueOnce(new Error('Connection uncertain')).mockResolvedValueOnce({ data: {} }),
  });
  const view = render(<SalesReturnPanel api={client} invoice={invoice} orgId={1} userId={2} canProcess onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Preview credit note' }));
  expect(await screen.findByText('Original-term credit · SCR 150.00')).toBeInTheDocument();
  expect(screen.getByText('Applied to unpaid invoice debt: SCR 20.00')).toBeInTheDocument();
  expect(screen.getByText('Surplus non-expiring customer credit: SCR 130.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create immutable credit note' }));
  await waitFor(() => expect(client.createReturnCreditNote).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole('button', { name: 'Retry exact credit note' })).toBeInTheDocument();
  view.unmount();
  render(<SalesReturnPanel api={client} invoice={invoice} orgId={1} userId={2} canProcess onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Retry exact credit note' }));
  await waitFor(() => expect(client.createReturnCreditNote).toHaveBeenCalledTimes(2));
  expect(client.createReturnCreditNote.mock.calls[1].slice(0, 2))
    .toEqual(client.createReturnCreditNote.mock.calls[0].slice(0, 2));
  expect(client.createReturnCreditNote.mock.calls[0][0]).toBe(returnKey);
  expect(client.createReturnCreditNote.mock.calls[0][1]).toMatchObject({ expected_claim_version: 2,
    expected_option_version: 1, expected_fingerprint: 'a'.repeat(64) });
  expect(client.createReturnCreditNote.mock.calls[0][1]).not.toHaveProperty('gross_credit_scr');
});

test('offers the server-derived condition request only for an eligible processed credit-note line', async () => {
  const credit = { credit_note_key: '90000000-0000-4000-8000-000000000001',
    credit_note_number: 'CN-SYN-1', return_key: returnKey, invoice_key: invoice.invoice_key,
    invoice_number: invoice.invoice_number, branch_id: 2, customer_key: options.customer_key,
    currency: 'SCR', gross_credit_scr: '150.00', net_credit_scr: '130.43', tax_credit_scr: '19.57',
    invoice_debt_applied_scr: '20.00', customer_credit_scr: '130.00', lines: [] };
  const source = { credit_note_line_id: 44, credit_note_key: credit.credit_note_key,
    credit_note_number: credit.credit_note_number, return_key: returnKey,
    return_operation_key: '91000000-0000-4000-8000-000000000001', invoice_key: invoice.invoice_key,
    invoice_line_key: lineKey, handover_allocation_key: handoverKey, branch_id: 2,
    branch_name: 'Synthetic branch', location_id: 6, location_name: 'Returns quarantine',
    product_id: 9, product_name: 'Synthetic tile', product_sku: 'SYN-TILE', base_unit: 'piece',
    tracking_policy: 'UNTRACKED', batch_key: null, source_quantity: '1.500000',
    previously_transitioned: '0.000000', pending_review_quantity: '0.000000',
    remaining_eligible: '1.500000', quarantined_available: '1.500000', stock_version: 9 };
  const client = api({
    invoiceCreditNotes: jest.fn().mockResolvedValue({ data: { ...emptyPage, items: [credit], total: 1, limit: 25 } }),
    stockConditionSources: jest.fn().mockResolvedValue({ data: { ...emptyPage, items: [source], total: 1, limit: 100 } }),
  });
  render(<SalesReturnPanel api={client} invoice={invoice} orgId={1} userId={2}
    canRequestCondition onClose={jest.fn()} />);
  expect(await screen.findByRole('button', { name: 'Request damaged classification' })).toBeInTheDocument();
  expect(screen.getByText(/Stock remains unavailable/)).toBeInTheDocument();
  expect(screen.queryByText(/discount/i)).not.toBeInTheDocument();
  expect(client.stockConditionSources).toHaveBeenCalledWith(1, 100, expect.any(AbortSignal));
});
