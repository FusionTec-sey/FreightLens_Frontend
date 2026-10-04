import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesCheckoutPanel from './SalesCheckoutPanel';

const draft = { document_key: 'draft-key', version: 3, branch_id: 2,
  customer_name: 'Synthetic customer', branch_name: 'Synthetic store' };
const pricing = { pricing_snapshot_key: 'pricing-key',
  pricing_fingerprint: 'a'.repeat(64), gross_total_scr: '2200.00' };
const options = { document_key: 'draft-key', draft_version: 3, branch_id: 2,
  branch_settings_version: 4, assignment_version: 5,
  counters: [{ counter_key: 'counter-key', code: 'MAIN', name: 'Main checkout', version: 6 }],
  payment_methods: [{ method_key: 'cash-key', method_version: 2, code: 'CASH',
    label: 'Cash', kind: 'CASH', mapping_key: 'mapping-key', mapping_version: 7 }],
  reservations: [{ source_line_key: 'line-key', reservation_key: 'hold-key', quantity: '24.000000' }],
  existing_attempt_key: null, existing_operation_key: null,
  existing_status: null, existing_invoice_key: null };

function api(overrides = {}) {
  return { postingOptions: jest.fn().mockResolvedValue({ data: options }),
    createPostingAttempt: jest.fn().mockResolvedValue({ data: { status: 'READY' } }),
    readPostingAttempt: jest.fn().mockResolvedValue({ data: { attempt_key: 'attempt-key',
      operation_key: 'operation-key', status: 'READY', tenders: [{ tender_key: 'tender-key', kind: 'CASH', amount_scr: '2200.00' }], card_confirmations: [] } }),
    finalizePostingAttempt: jest.fn().mockResolvedValue({ data: { invoice: {
      invoice_key: 'invoice-key', invoice_number: 'INV-0002-20261005-000001',
      payment_status: 'PAID', fulfilment_status: 'AWAITING_COLLECTION', gross_total_scr: '2200.00' } } }),
    readInvoice: jest.fn(), ...overrides };
}

test('posts the exact configured cash plan then keeps collection separate', async () => {
  const client = api(); render(<SalesCheckoutPanel api={client} draft={draft}
    pricing={pricing} canRecordCard={false} onClose={jest.fn()} />);
  expect(await screen.findByText('Invoice total SCR 2200.00')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment plan' }));
  await waitFor(() => expect(client.createPostingAttempt).toHaveBeenCalledTimes(1));
  const payload = client.createPostingAttempt.mock.calls[0][1];
  expect(payload).toMatchObject({ document_key: 'draft-key', expected_draft_version: 3,
    pricing_snapshot_key: 'pricing-key', expected_branch_settings_version: 4,
    expected_counter_settings_version: 6, expected_assignment_version: 5 });
  expect(payload.tenders[0]).toMatchObject({ method_key: 'cash-key',
    expected_method_version: 2, mapping_key: 'mapping-key',
    expected_mapping_version: 7, amount_scr: '2200.00' });
  fireEvent.click(await screen.findByRole('button', { name: 'Post sale and invoice' }));
  expect(await screen.findByText('Invoice INV-0002-20261005-000001')).toBeInTheDocument();
  expect(screen.getByText('PAID')).toBeInTheDocument();
  expect(screen.getByText('AWAITING COLLECTION')).toBeInTheDocument();
  expect(client.finalizePostingAttempt.mock.calls[0][1].reservations).toEqual([
    { source_line_key: 'line-key', reservation_key: 'hold-key', quantity: '24.000000' }]);
});

test('recovers a posted invoice instead of creating another payment attempt', async () => {
  const posted = { ...options, existing_attempt_key: 'attempt-key',
    existing_operation_key: 'operation-key', existing_status: 'POSTED',
    existing_invoice_key: 'invoice-key' };
  const client = api({ postingOptions: jest.fn().mockResolvedValue({ data: posted }),
    readInvoice: jest.fn().mockResolvedValue({ data: { invoice_key: 'invoice-key',
      invoice_number: 'INV-RECOVERED', payment_status: 'PAID',
      fulfilment_status: 'AWAITING_COLLECTION', gross_total_scr: '2200.00' } }) });
  render(<SalesCheckoutPanel api={client} draft={draft} pricing={pricing}
    canRecordCard={false} onClose={jest.fn()} />);
  expect(await screen.findByText('Invoice INV-RECOVERED')).toBeInTheDocument();
  expect(client.readInvoice).toHaveBeenCalledWith('invoice-key', expect.anything());
  expect(client.createPostingAttempt).not.toHaveBeenCalled();
});

test('opens invoice printing from a recovered invoice only when permitted', async () => {
  const posted = { ...options, existing_attempt_key: 'attempt-key',
    existing_operation_key: 'operation-key', existing_status: 'POSTED',
    existing_invoice_key: 'invoice-key' };
  const client = api({
    postingOptions: jest.fn().mockResolvedValue({ data: posted }),
    readInvoice: jest.fn().mockResolvedValue({ data: { invoice_key: 'invoice-key',
      invoice_number: 'INV-RECOVERED', payment_status: 'PAID',
      fulfilment_status: 'AWAITING_COLLECTION', gross_total_scr: '2200.00' } }),
    invoicePrintOptions: jest.fn().mockResolvedValue({ data: { invoice_key: 'invoice-key',
      invoice_number: 'INV-RECOVERED', template_id: 5, template_version_id: 9,
      template_name: 'Sales tax invoice', original_artifact: null } }),
    invoicePrintJobs: jest.fn().mockResolvedValue({ data: {
      items: [], page: 1, pages: 1, limit: 10, total: 0 } }),
  });
  render(<SalesCheckoutPanel api={client} draft={draft} pricing={pricing}
    canRecordCard={false} canPrint onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Invoice & printing' }));
  expect(await screen.findByRole('heading', { name: 'Invoice & printing · INV-RECOVERED' }))
    .toBeInTheDocument();
  expect(client.invoicePrintOptions).toHaveBeenCalledWith('invoice-key', expect.anything());
});

test('missing payment or reservation configuration blocks confirmation', async () => {
  const client = api({ postingOptions: jest.fn().mockResolvedValue({ data: {
    ...options, payment_methods: [], reservations: [] } }) });
  render(<SalesCheckoutPanel api={client} draft={draft} pricing={pricing}
    canRecordCard={false} onClose={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Checkout is blocked');
  expect(screen.getByRole('button', { name: 'Confirm payment plan' })).toBeDisabled();
});
