import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftRevision from './SalesDraftRevision';

const data = { document_key: 'draft', version: 1, read_only: true,
  customer_name: 'Historical buyer', customer_version: 2, branch_id: 7,
  created_by: 9, created_at: '2026-10-04T08:00:00Z', lines: [{ line_key: 'line',
    product_id: 1, product_name: 'Current product label', sku: 'TEST', quantity: '1.000001',
    unit: 'BOX', base_quantity: '12.000012', base_unit: 'PCS', expected_policy_version: 3 }] };

test('shows exact saved quantities without editable or financial actions', async () => {
  const api = { revision: jest.fn().mockResolvedValue({ data }) }, onClose = jest.fn();
  render(<SalesDraftRevision api={api} documentKey="draft" version={1} onClose={onClose} />);
  expect(await screen.findByText('1.000001 BOX')).toBeInTheDocument();
  expect(screen.getByText(/Saved base quantity/)).toHaveTextContent('12.000012 PCS · Policy v3');
  expect(screen.getByText(/current catalogue labels/)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /save|restore|allocate|pay/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to revisions' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('rejects mismatched revision and clears previous data on failed refresh', async () => {
  const api = { revision: jest.fn().mockResolvedValueOnce({ data }).mockResolvedValueOnce({ data: { ...data, version: 2 } }) };
  render(<SalesDraftRevision api={api} documentKey="draft" version={1} onClose={() => {}} />);
  await screen.findByText('1.000001 BOX');
  fireEvent.click(screen.getByRole('button', { name: 'Retry revision' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('1.000001 BOX')).not.toBeInTheDocument();
});

test('leaving cancels the read and late responses are ignored', async () => {
  let resolve;
  const api = { revision: jest.fn(() => new Promise(done => { resolve = done; })) };
  const view = render(<SalesDraftRevision api={api} documentKey="draft" version={1} onClose={() => {}} />);
  const signal = api.revision.mock.calls[0][2];
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data }));
});
