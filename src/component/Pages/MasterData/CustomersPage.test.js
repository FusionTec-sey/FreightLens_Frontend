import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomersPage from './CustomersPage';
import { useAuth } from '../../../context/AuthContext';
import { customersApi } from '../../../services/customersApi';
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('../../../services/customersApi', () => ({ customersApi: jest.fn() }));
jest.mock('axios', () => ({ create: jest.fn(() => ({})) }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
const profile = { customer_key: 'synthetic', name: 'Demo Customer', kind: 'PERSON', version: 1,
  contacts: [{ kind: 'PHONE', value: '2000000', primary: true }, { kind: 'EMAIL', value: 'test@example.com' }] };
const list = jest.fn();
const read = jest.fn();
const create = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ token: 'test', orgId: 1, permissions: ['View_Customer', 'View_Personal_Data'] });
  customersApi.mockReturnValue({ list, read, create });
  read.mockResolvedValue({ data: profile });
  list.mockResolvedValue({ data: { items: [profile], total: 1, pages: 1 } });
});
test('saved customer stays directly accessible when search indexing is unconfirmed', async () => {
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'synthetic' } });
  create.mockResolvedValueOnce({ data: { customer_key: 'synthetic', version: 1, replayed: false, search_indexed: false } });
  useAuth.mockReturnValue({ token: 'test', orgId: 1, permissions: ['View_Customer', 'View_Personal_Data', 'Manage_Customer'] });
  render(<CustomersPage />);
  await screen.findByText('Demo Customer');
  fireEvent.click(screen.getByText('New customer'));
  fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Demo Customer' } });
  fireEvent.change(screen.getByLabelText('Contact value 1'), { target: { value: '2000000' } });
  fireEvent.click(screen.getByText('Save customer'));
  const open = await screen.findByText('Open saved customer');
  expect(screen.getByLabelText('Customer save result')).toHaveTextContent('Search indexing unconfirmed');
  fireEvent.click(open);
  expect(await screen.findByLabelText('Customer details')).toHaveTextContent('test@example.com');
  expect(read).toHaveBeenCalledWith('synthetic', expect.anything());
});
test('selection rechecks identity and returns its company/version', async () => {
  const onSelect = jest.fn();
  render(<CustomersPage onSelect={onSelect} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Select Demo Customer' }));
  await screen.findByRole('button', { name: 'Select Demo Customer' });
  await act(async () => {});
  expect(read).toHaveBeenCalledWith('synthetic', expect.anything());
  expect(onSelect).toHaveBeenCalledWith({ orgId: 1, customerKey: 'synthetic', version: 1, profile });
});
test.each(['denied', 'changed'])('selection fails closed when %s', async reason => {
  const onSelect = jest.fn();
  if (reason === 'denied') read.mockRejectedValueOnce(new Error('403'));
  else read.mockResolvedValueOnce({ data: { ...profile, version: 2 } });
  render(<CustomersPage onSelect={onSelect} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Select Demo Customer' }));
  await screen.findByRole('alert');
  expect(onSelect).not.toHaveBeenCalled();
});
test('company switch cancels pending selection and ignores late result', async () => {
  let resolve;
  read.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const onSelect = jest.fn();
  const view = render(<CustomersPage onSelect={onSelect} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Select Demo Customer' }));
  const signal = read.mock.calls[0][1];
  useAuth.mockReturnValue({ token: 'test', orgId: 2, permissions: ['View_Customer', 'View_Personal_Data'] });
  view.rerender(<CustomersPage onSelect={onSelect} />);
  await act(async () => resolve({ data: profile }));
  expect(signal.aborted).toBe(true);
  expect(onSelect).not.toHaveBeenCalled();
});
test('lists company customers and shows all contacts on explicit view', async () => {
  render(<CustomersPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View Demo Customer' }));
  expect(await screen.findByText(/test@example.com/)).toBeInTheDocument();
  expect(list).toHaveBeenCalledWith(1, 25, expect.anything(), '');
});
test('submitted search is server-side and clear restores browse', async () => {
  render(<CustomersPage />);
  await screen.findByText('Demo Customer');
  fireEvent.change(screen.getByLabelText('Search customers'), { target: { value: ' phone ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await act(async () => {});
  expect(list).toHaveBeenLastCalledWith(1, 25, expect.anything(), 'phone');
  fireEvent.click(screen.getByText('Clear search'));
  await act(async () => {});
  expect(list).toHaveBeenLastCalledWith(1, 25, expect.anything(), '');
});
test('no request without personal data permission', () => {
  useAuth.mockReturnValue({ orgId: 1, permissions: ['View_Customer'] });
  render(<CustomersPage />);
  expect(screen.getByRole('alert')).toHaveTextContent('personal-data');
  expect(list).not.toHaveBeenCalled();
});
test('read-only users cannot open creation; managers can', async () => {
  const view = render(<CustomersPage />);
  await screen.findByText('Demo Customer');
  expect(screen.queryByText('New customer')).not.toBeInTheDocument();
  useAuth.mockReturnValue({ token: 'test', orgId: 1, permissions: ['View_Customer', 'View_Personal_Data', 'Manage_Customer'] });
  view.rerender(<CustomersPage />);
  fireEvent.click(screen.getByText('New customer'));
  expect(screen.getByLabelText('New customer form')).toBeInTheDocument();
});
test('refresh failure hides prior customer data', async () => {
  render(<CustomersPage />);
  await screen.findByText('Demo Customer');
  list.mockRejectedValueOnce(new Error('Denied'));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Demo Customer')).not.toBeInTheDocument();
});
test('company switch removes old data and ignores late responses', async () => {
  let resolveOld;
  list.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  const view = render(<CustomersPage />);
  useAuth.mockReturnValue({ token: 'test', orgId: 2, permissions: ['View_Customer', 'View_Personal_Data'] });
  list.mockResolvedValueOnce({ data: { items: [], total: 0, pages: 1 } });
  view.rerender(<CustomersPage />);
  await screen.findByText('No customers in this company.');
  await act(async () => resolveOld({ data: { items: [profile], total: 1, pages: 1 } }));
  expect(screen.queryByText('Demo Customer')).not.toBeInTheDocument();
  expect(customersApi).toHaveBeenLastCalledWith('test', 2);
});
