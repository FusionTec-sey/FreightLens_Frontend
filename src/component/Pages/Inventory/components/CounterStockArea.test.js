import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CounterStockArea from './CounterStockArea';
jest.mock('../../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
const props = { branch: { id: 1 }, counter: { counter_key: 'counter', version: 3, config: { name: 'Demo counter' } }, onClose: jest.fn() };
const data = { root: { name: 'Main area', code: 'MAIN' }, counter_version: 3, counter_enabled: false,
  items: [{ id: 4, name: 'Eligible bin', code: 'BIN', kind: 'BIN' }], total: 26, pages: 2 };

test('unset preference is valid and does not restrict store-wide selling', async () => {
  const api = { counterStockArea: jest.fn().mockResolvedValue({ data: { ...data, root: null, items: [], total: 0, pages: 1 } }) };
  render(<CounterStockArea {...props} api={api} />);
  expect(await screen.findByText(/No preferred picking area/)).toHaveTextContent('eligible store-wide stock');
  expect(screen.getByText(/Salespeople may sell any eligible product/)).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('versioned read, pagination and disabled-counter caveat; no posting controls', async () => {
  const api = { counterStockArea: jest.fn().mockResolvedValue({ data }) };
  render(<CounterStockArea {...props} api={api} />);
  await screen.findByText('Eligible bin');
  expect(api.counterStockArea).toHaveBeenCalledWith(1, 'counter', 3, 1, 25, expect.any(AbortSignal));
  expect(screen.getByText(/Counter disabled/)).toBeInTheDocument();
  expect(screen.getByText(/not stock availability/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /reserve|allocate|post/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByTitle('Next Page'));
  await waitFor(() => expect(api.counterStockArea).toHaveBeenLastCalledWith(1, 'counter', 3, 2, 25, expect.any(AbortSignal)));
});

test('failed refresh removes prior area and locations', async () => {
  const api = { counterStockArea: jest.fn().mockResolvedValueOnce({ data }).mockRejectedValue({ response: { data: { detail: 'Counter changed' } } }) };
  render(<CounterStockArea {...props} api={api} />);
  await screen.findByText('Eligible bin');
  fireEvent.click(screen.getByText('Refresh area'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Counter changed');
  expect(screen.queryByText('Eligible bin')).not.toBeInTheDocument();
  expect(screen.queryByText(/Root: Main/)).not.toBeInTheDocument();
});

test('old company response cannot reappear after context replacement', async () => {
  let finish;
  const oldApi = { counterStockArea: jest.fn(() => new Promise(resolve => { finish = resolve; })) };
  const nextApi = { counterStockArea: jest.fn().mockResolvedValue({ data: { ...data, items: [], total: 0, pages: 1 } }) };
  const view = render(<CounterStockArea {...props} api={oldApi} />);
  view.rerender(<CounterStockArea {...props} api={nextApi} />);
  await screen.findByText('No locations on this page.');
  await act(async () => finish({ data }));
  expect(screen.queryByText('Eligible bin')).not.toBeInTheDocument();
  expect(oldApi.counterStockArea.mock.calls[0][5].aborted).toBe(true);
});
