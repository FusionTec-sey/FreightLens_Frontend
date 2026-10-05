import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftDetails from './SalesDraftDetails';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('./SalesCollectionPanel', () => ({ api, invoice, customerName, onClose }) => <section aria-label="Collection panel"><span>{`${invoice.invoice_number} · ${customerName}`}</span><button onClick={onClose}>Close collection</button></section>);
jest.mock('./SalesInvoicePrintPanel', () => ({ invoice, canResolve, onClose }) => <section aria-label="Print panel"><span>{`${invoice.invoice_number} · ${canResolve ? 'Resolve allowed' : 'Resolve unavailable'}`}</span><button onClick={onClose}>Close printing</button></section>);

const draft = { document_key: 'synthetic-draft', customer_key: 'synthetic-customer', branch_id: 2, version: 3,
  lines: [{ line_key: 'line-1', product_id: 7, product_name: 'Sample tiles', sku: 'SAMPLE-TILE',
    quantity: '2.5', unit: 'BOX', base_quantity: '10', base_unit: 'PCS', reserved_quantity: '4', expected_policy_version: 2 }] };

test('shows current branch label and saved revision attribution without inventing salesperson assignment', () => {
  render(<SalesDraftDetails draft={{ ...draft, branch_name: 'Synthetic store', created_by: 12, created_at: '2026-10-04T10:00:00Z' }} onClose={jest.fn()} />);
  expect(screen.getByText('Synthetic store')).toBeInTheDocument();
  expect(screen.getByText('Branch reference 2')).toBeInTheDocument();
  expect(screen.getByText('Staff reference 12')).toBeInTheDocument();
  expect(screen.getByText('This revision saved by')).toBeInTheDocument();
  expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-10-04T10:00:00Z');
  expect(screen.queryByText(/Assigned salesperson/)).not.toBeInTheDocument();
});

test('shows server-confirmed copy provenance on the saved draft', () => {
  const source_reference = { document_key: '11111111-1111-4111-8111-111111111111', version: 2 };
  render(<SalesDraftDetails draft={{ ...draft, source_reference }} onClose={jest.fn()} />);
  expect(screen.getByText('Copied from — server-confirmed source')).toBeInTheDocument();
  expect(screen.getByText(`${source_reference.document_key} v2`)).toBeInTheDocument();
});

test('inspection preserves exact units and does not expose unavailable write actions', () => {
  render(<SalesDraftDetails draft={draft} onClose={jest.fn()} />);
  expect(screen.getByText('2.5 BOX')).toBeInTheDocument();
  expect(screen.getByText('Reserved: 4 PCS')).toBeInTheDocument();
  expect(screen.getByText('Demand')).toBeInTheDocument();
  expect(screen.getByText('Reservations')).toBeInTheDocument();
  expect(screen.getByText('Not recorded')).toBeInTheDocument();
  expect(screen.getByText('Not authorised')).toBeInTheDocument();
  expect(screen.getByLabelText('Draft identity')).toHaveTextContent('synthetic-draft');
  expect(screen.queryByRole('button', { name: 'Edit draft' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Allocate same-store stock' })).not.toBeInTheDocument();
});

test('opening details and expanding policy information have no business side effects', () => {
  const allocate = jest.fn(); const edit = jest.fn(); const close = jest.fn();
  render(<SalesDraftDetails draft={draft} onAllocate={allocate} onEdit={edit} onClose={close} />);
  fireEvent.click(screen.getByText('Unit and policy details'));
  expect(allocate).not.toHaveBeenCalled(); expect(edit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Allocate same-store stock' }));
  expect(allocate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Close details' }));
  expect(close).toHaveBeenCalledTimes(1);
});

test('history hides current-draft mutation actions until returning to current items', async () => {
  const api = { history: jest.fn().mockResolvedValue({ data: { items: [], total: 0, pages: 1 } }) };
  render(<SalesDraftDetails draft={draft} api={api} onEdit={jest.fn()} onAllocate={jest.fn()} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Revision history' }));
  await screen.findByText('No revisions on this page.');
  expect(screen.queryByRole('button', { name: 'Edit draft' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Allocate same-store stock' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Items', exact: true }));
  expect(screen.getByRole('button', { name: 'Edit draft' })).toBeInTheDocument();
});

const pricing = { document_key: 'synthetic-draft', draft_version: 3, status: 'READY', currency: 'SCR',
  policy: 'best-eligible-tax-inclusive-invoice-round-v1', priced_at: '2026-10-04T10:30:00Z',
  gross_total_scr: '2200.00', net_total_scr: '1913.04', tax_total_scr: '286.96',
  requires_floor_approval: true, posting_enabled: false, lines: [{ line_key: 'line-1', product_id: 7,
    quantity: '2.5', selected_source: 'CUSTOMER_AGREEMENT', selected_reference_key: 'agreement-1',
    selected_version: 2, gross_unit_scr: '1100.000000', store_price_key: 'store-price-1',
    store_price_version: 3, store_gross_unit_scr: '1200.000000', floor_gross_unit_scr: '1150.000000',
    requires_floor_approval: true, tax_code: 'VAT15', tax_version: 1, tax_treatment: 'STANDARD',
    tax_rate: '0.15000000', gross_scr: '2200.00', net_scr: '1913.04', tax_scr: '286.96' }] };

test('loads authoritative unit pricing and keeps preview distinct from posting', async () => {
  const api = { pricingPreview: jest.fn().mockResolvedValue({ data: pricing }) };
  render(<SalesDraftDetails draft={draft} api={api} onClose={jest.fn()} />);
  expect(await screen.findByText('SCR 1100.000000')).toBeInTheDocument();
  expect(screen.getByText('Line total SCR 2200.00')).toBeInTheDocument();
  expect(screen.getByText(/customer agreement/)).toBeInTheDocument();
  expect(screen.getByText(/included tax SCR 286.96/)).toBeInTheDocument();
  expect(screen.getByLabelText('Draft totals')).toHaveTextContent('SCR 2200.00');
  expect(screen.getByLabelText('Draft totals')).toHaveTextContent('Preview only—no payment, invoice or stock posting');
  expect(screen.getByRole('alert')).toHaveTextContent('below its approval floor');
  expect(api.pricingPreview).toHaveBeenCalledWith('synthetic-draft', expect.any(AbortSignal));
});

test('shows an actionable incomplete-pricing state and retries without changing the draft', async () => {
  const failure = { response: { data: { detail: 'Pricing configuration incomplete: BOX price is missing' } } };
  const api = { pricingPreview: jest.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce({ data: pricing }) };
  render(<SalesDraftDetails draft={draft} api={api} onClose={jest.fn()} />);
  expect(await screen.findByText(/BOX price is missing/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry pricing' }));
  expect(await screen.findByText('Line total SCR 2200.00')).toBeInTheDocument();
  expect(api.pricingPreview).toHaveBeenCalledTimes(2);
});

test('requests exact below-floor review and preserves the operation identity', async () => {
  const api = { pricingPreview: jest.fn().mockResolvedValue({ data: pricing }),
    requestFloorCase: jest.fn().mockResolvedValue({ data: { case_key: 'floor-case', version: 1, status: 'REQUESTED' } }) };
  render(<SalesDraftDetails draft={draft} api={api} canRequestFloor onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Request price-floor review' }));
  fireEvent.change(screen.getByLabelText('Reason for manager review'), { target: { value: 'Customer signed terms' } });
  fireEvent.click(screen.getByRole('button', { name: 'Request exact review' }));
  await waitFor(() => expect(api.requestFloorCase).toHaveBeenCalledTimes(1));
  expect(api.requestFloorCase.mock.calls[0][0]).toMatchObject({ document_key: 'synthetic-draft',
    expected_draft_version: 3, reason: 'Customer signed terms' });
  expect(api.requestFloorCase.mock.calls[0][0].operation_key).toMatch(/^[0-9a-f-]{36}$/);
  expect(await screen.findByText(/No sale, payment or stock movement was posted/)).toBeInTheDocument();
});

test('prepares immutable pricing with the approved case without presenting it as a sale', async () => {
  const prepared = { pricing_snapshot_key: 'snapshot-1', document_key: draft.document_key,
    draft_version: 3, gross_total_scr: '2200.00', pricing_fingerprint: 'a'.repeat(64) };
  const api = { pricingPreview: jest.fn().mockResolvedValue({ data: pricing }),
    latestPricingSnapshot: jest.fn().mockRejectedValue({ response: { status: 404 } }),
    preparePricingSnapshot: jest.fn().mockResolvedValue({ data: prepared }) };
  render(<SalesDraftDetails draft={draft} api={api} canPreparePricing onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Prepare exact pricing' }));
  fireEvent.change(screen.getByLabelText('Approved price-floor case'), { target: { value: 'approved-floor-case' } });
  fireEvent.click(screen.getByRole('button', { name: 'Prepare exact pricing' }));
  await waitFor(() => expect(api.preparePricingSnapshot).toHaveBeenCalledTimes(1));
  expect(api.preparePricingSnapshot.mock.calls[0][0]).toBe('synthetic-draft');
  expect(api.preparePricingSnapshot.mock.calls[0][1]).toMatchObject({
    expected_draft_version: 3, floor_case_key: 'approved-floor-case' });
  expect(api.preparePricingSnapshot.mock.calls[0][1].operation_key).toMatch(/^[0-9a-f-]{36}$/);
  expect(await screen.findByText(/Exact pricing prepared for draft v3/)).toBeInTheDocument();
  expect(screen.getByText(/No invoice, payment, stock movement or collection authority was created/)).toBeInTheDocument();
});

test('opens a posted invoice return for condition-only contextual access', async () => {
  const documentKey = '10000000-0000-4000-8000-000000000001';
  const invoiceKey = '20000000-0000-4000-8000-000000000001';
  const posted = { invoice_key: invoiceKey, invoice_number: 'INV-RETURN-ONLY', document_key: documentKey,
    draft_version: 3, payment_status: 'PAID', fulfilment_status: 'COLLECTED', gross_total_scr: '100.00' };
  const api = {
    postedInvoice: jest.fn().mockResolvedValue({ data: posted }),
    returnOptions: jest.fn().mockResolvedValue({ data: { invoice_key: invoiceKey,
      invoice_number: posted.invoice_number, invoice_version: 1,
      customer_key: '30000000-0000-4000-8000-000000000001', customer_name: 'Synthetic customer',
      branch_id: 2, branch_name: 'Synthetic store', lines: [], handovers: [] } }),
    invoiceReturnClaims: jest.fn().mockResolvedValue({ data: { items: [], total: 0, page: 1, pages: 1, limit: 10 } }),
    invoiceCreditNotes: jest.fn().mockResolvedValue({ data: { items: [], total: 0, page: 1, pages: 1, limit: 25 } }),
  };
  render(<SalesDraftDetails draft={{ ...draft, document_key: documentKey }} api={api}
    orgId={7} userId={12} canRequestCondition onClose={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Returns & credit notes' }));
  expect(await screen.findByRole('heading', { name: 'Returns · INV-RETURN-ONLY' })).toBeInTheDocument();
  expect(api.postedInvoice).toHaveBeenCalledWith(documentKey, 3);
  expect(api.returnOptions).toHaveBeenCalledWith(invoiceKey, expect.anything());
});

const postedReference = { invoice_key: 'posted-invoice', document_key: draft.document_key, draft_version: draft.version };
const postedSale = { ...postedReference, invoice_number: 'INV-POSTED', payment_status: 'PAID', fulfilment_status: 'RESERVED' };
const postedApi = () => ({ postedInvoiceReference: jest.fn().mockResolvedValue({ data: postedReference }),
  readInvoice: jest.fn().mockResolvedValue({ data: postedSale }) });

test('shows direct post-sale actions by permission without requiring checkout or prepared pricing', () => {
  const api = postedApi();
  const view = render(<SalesDraftDetails draft={draft} api={api} onClose={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Open collection' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Invoice & printing' })).not.toBeInTheDocument();
  view.rerender(<SalesDraftDetails draft={draft} api={api} canCollect onClose={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Open collection' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Invoice & printing' })).not.toBeInTheDocument();
  view.rerender(<SalesDraftDetails draft={draft} api={api} canPrint onClose={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Open collection' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Invoice & printing' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).not.toBeInTheDocument();
});

test('opens collection from the exact posted draft revision without entering checkout', async () => {
  const api = postedApi();
  render(<SalesDraftDetails draft={{ ...draft, customer_name: 'Synthetic customer' }} api={api} canCollect onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open collection' }));
  expect(await screen.findByRole('region', { name: 'Collection panel' })).toHaveTextContent('INV-POSTED · Synthetic customer');
  expect(api.postedInvoiceReference).toHaveBeenCalledWith(draft.document_key, draft.version, expect.any(AbortSignal));
  expect(api.readInvoice).toHaveBeenCalledWith(postedReference.invoice_key, expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', { name: 'Close collection' }));
  expect(screen.getByRole('heading', { name: 'Draft version 3' })).toBeInTheDocument();
});

test('opens existing invoice printing with resolution permission from the exact posted revision', async () => {
  const api = postedApi();
  render(<SalesDraftDetails draft={draft} api={api} canPrint canResolvePrint onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Invoice & printing' }));
  expect(await screen.findByRole('region', { name: 'Print panel' })).toHaveTextContent('INV-POSTED · Resolve allowed');
  expect(api.postedInvoiceReference).toHaveBeenCalledWith(draft.document_key, draft.version, expect.any(AbortSignal));
  expect(api.readInvoice).toHaveBeenCalledWith(postedReference.invoice_key, expect.any(AbortSignal));
});

test('reports an unposted draft without opening collection', async () => {
  const api = { postedInvoiceReference: jest.fn().mockRejectedValue({ response: { status: 404 } }), readInvoice: jest.fn() };
  render(<SalesDraftDetails draft={draft} api={api} canCollect onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open collection' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No posted invoice exists for this draft revision.');
  expect(api.readInvoice).not.toHaveBeenCalled();
  expect(screen.queryByRole('region', { name: 'Collection panel' })).not.toBeInTheDocument();
});

test('reports lookup failure and rejects a mismatched invoice reference', async () => {
  const api = { postedInvoiceReference: jest.fn().mockRejectedValueOnce(new Error('Network unavailable'))
    .mockResolvedValueOnce({ data: { ...postedReference, draft_version: 2 } }), readInvoice: jest.fn() };
  render(<SalesDraftDetails draft={draft} api={api} canPrint onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Invoice & printing' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Invoice & printing' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Posted invoice reference does not match this sale revision.');
  expect(api.readInvoice).not.toHaveBeenCalled();
});
