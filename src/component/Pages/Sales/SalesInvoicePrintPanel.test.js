import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesInvoicePrintPanel from './SalesInvoicePrintPanel';

const invoice = { invoice_key: 'invoice-key', invoice_number: 'INV-1' };
const artifact = { artifact_key: 'artifact-original', invoice_key: 'invoice-key',
  template_id: 5, template_version_id: 9, artifact_kind: 'ORIGINAL', copy_number: 0,
  source_artifact_key: null, pdf_sha256: 'a'.repeat(64), file_size: 123,
  created_at: '2026-10-05T10:00:00Z' };
const options = { invoice_key: 'invoice-key', invoice_number: 'INV-1',
  template_id: 5, template_version_id: 9, template_name: 'Sales tax invoice',
  original_artifact: null };
const empty = { items: [], page: 1, pages: 1, limit: 10, total: 0 };
const job = { job_key: 'job-key', artifact, status: 'READY', version: 1,
  handed_off_at: null, resolved_at: null, resolved_by: null, failure_code: null,
  resolution_note: null, events: [] };

function api(overrides = {}) {
  return { invoicePrintOptions: jest.fn().mockResolvedValue({ data: options }),
    invoicePrintJobs: jest.fn().mockResolvedValue({ data: empty }),
    createInvoicePrintJob: jest.fn().mockResolvedValue({ data: {} }),
    handoffInvoicePrint: jest.fn(), resolveInvoicePrint: jest.fn(), ...overrides };
}

beforeEach(() => {
  let next = 0;
  Object.defineProperty(window, 'crypto', { configurable: true,
    value: { randomUUID: jest.fn(() => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`) } });
  window.open = jest.fn(() => ({ location: {}, close: jest.fn() }));
  window.URL.createObjectURL = jest.fn(() => 'blob:invoice');
  window.URL.revokeObjectURL = jest.fn();
});

test('retains one exact original intent after an uncertain create failure', async () => {
  const client = api({ createInvoicePrintJob: jest.fn()
    .mockRejectedValueOnce(new Error('Connection uncertain'))
    .mockResolvedValueOnce({ data: {} }) });
  render(<SalesInvoicePrintPanel api={client} invoice={invoice} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Create invoice original' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection uncertain');
  fireEvent.click(screen.getByRole('button', { name: 'Create invoice original' }));
  await waitFor(() => expect(client.createInvoicePrintJob).toHaveBeenCalledTimes(2));
  expect(client.createInvoicePrintJob.mock.calls[0].slice(0, 3))
    .toEqual(client.createInvoicePrintJob.mock.calls[1].slice(0, 3));
  expect(client.createInvoicePrintJob.mock.calls[0][2]).toMatchObject({
    invoice_key: 'invoice-key', kind: 'ORIGINAL', expected_template_id: 5,
    expected_template_version_id: 9, source_artifact_key: null,
  });
});

test('hands off READY before opening the exact PDF and reloads uncertain state', async () => {
  const uncertain = { ...job, status: 'UNCERTAIN', version: 2,
    handed_off_at: '2026-10-05T10:01:00Z' };
  const client = api({
    invoicePrintOptions: jest.fn().mockResolvedValue({ data: { ...options, original_artifact: artifact } }),
    invoicePrintJobs: jest.fn()
      .mockResolvedValueOnce({ data: { ...empty, items: [job], total: 1 } })
      .mockResolvedValue({ data: { ...empty, items: [uncertain], total: 1 } }),
    handoffInvoicePrint: jest.fn().mockResolvedValue({ data: new Blob(['pdf']) }),
  });
  render(<SalesInvoicePrintPanel api={client} invoice={invoice} canResolve onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open print PDF' }));
  await waitFor(() => expect(client.handoffInvoicePrint).toHaveBeenCalledTimes(1));
  expect(window.open).toHaveBeenCalledWith('', '_blank');
  expect(window.URL.createObjectURL).toHaveBeenCalled();
  expect(await screen.findByText(/Do not print again until this uncertain handoff/)).toBeInTheDocument();
});

test('requires an explicit observation to resolve an uncertain handoff', async () => {
  const uncertain = { ...job, status: 'UNCERTAIN', version: 2,
    handed_off_at: '2026-10-05T10:01:00Z' };
  const client = api({
    invoicePrintOptions: jest.fn().mockResolvedValue({ data: { ...options, original_artifact: artifact } }),
    invoicePrintJobs: jest.fn().mockResolvedValue({ data: { ...empty, items: [uncertain], total: 1 } }),
    resolveInvoicePrint: jest.fn().mockResolvedValue({ data: {} }),
  });
  render(<SalesInvoicePrintPanel api={client} invoice={invoice} canResolve onClose={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm printed' }));
  fireEvent.change(screen.getByLabelText('Resolution note'), { target: { value: 'Printed page checked by cashier' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save printed outcome' }));
  await waitFor(() => expect(client.resolveInvoicePrint).toHaveBeenCalledTimes(1));
  expect(client.resolveInvoicePrint.mock.calls[0][1]).toMatchObject({
    expected_version: 2, outcome: 'PRINTED', note: 'Printed page checked by cashier',
    failure_code: null,
  });
});
