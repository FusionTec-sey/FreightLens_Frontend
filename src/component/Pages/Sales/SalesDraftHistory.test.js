import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftHistory from './SalesDraftHistory';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));

const result = { items: [{ document_key: 'synthetic-draft', version: 2, customer_version: 1,
  customer_name: 'Synthetic historical customer', customer_key: 'synthetic-customer',
  created_at: '2026-10-04T08:00:00Z', created_by: 10, branch_id: 2 }], total: 1, pages: 1 };

test('reads saved metadata without offering historical write actions', async () => {
  const api = { history: jest.fn().mockResolvedValue({ data: result }) };
  render(<SalesDraftHistory api={api} documentKey="synthetic-draft" />);
  expect(await screen.findByText('Version 2 · Draft saved')).toBeInTheDocument();
  expect(screen.getByText(/Synthetic historical customer/)).toHaveTextContent('Customer profile v1');
  expect(api.history).toHaveBeenCalledWith('synthetic-draft', 1, 25, expect.anything());
  expect(screen.queryByRole('button', { name: /restore|save|allocate/i })).not.toBeInTheDocument();
});

test('failed refresh removes previously visible history', async () => {
  const api = { history: jest.fn().mockResolvedValueOnce({ data: result }).mockRejectedValueOnce(new Error('denied')) };
  render(<SalesDraftHistory api={api} documentKey="synthetic-draft" />);
  await screen.findByText('Version 2 · Draft saved');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('Version 2 · Draft saved')).not.toBeInTheDocument();
});

test('unmount cancels history and ignores late response', async () => {
  let resolve;
  const api = { history: jest.fn(() => new Promise(done => { resolve = done; })) };
  const view = render(<SalesDraftHistory api={api} documentKey="synthetic-draft" />);
  const signal = api.history.mock.calls[0][3];
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: result }));
});

test('explicit inspection opens exact saved version and returns to history', async () => {
  const api = { history: jest.fn().mockResolvedValue({ data: result }),
    revision: jest.fn().mockResolvedValue({ data: { ...result.items[0], read_only: true, lines: [] } }) };
  render(<SalesDraftHistory api={api} documentKey="synthetic-draft" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect version 2' }));
  expect(await screen.findByText(/Saved version 2/)).toBeInTheDocument();
  expect(api.revision).toHaveBeenCalledWith('synthetic-draft', 2, expect.anything());
  fireEvent.click(screen.getByRole('button', { name: 'Back to revisions' }));
  expect(screen.getByText('Version 2 · Draft saved')).toBeInTheDocument();
});
