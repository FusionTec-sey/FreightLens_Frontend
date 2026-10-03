import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftEditor from './SalesDraftEditor';
import { readRecovery } from '../../../services/salesDraftRecovery';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn() } }));
jest.mock('../MasterData/CustomersPage', () => ({ onSelect }) => <button onClick={() => onSelect({ orgId: 1, customerKey: 'customer', version: 1, profile: { name: 'Demo' } })}>Choose Demo customer</button>);
const initial = { document_key: 'doc', version: 1, customer_key: 'customer', expected_customer_version: 1,
  branch_id: 2, lines: [{ line_key: 'line', product_id: 3, expected_policy_version: 1, quantity: '2', unit: 'BOX', base_unit: 'PCS' }] };
const save = jest.fn(); const onSaved = jest.fn(); const onClose = jest.fn();
const api = { save, branches: jest.fn(), products: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks(); let id = 0;
  window.localStorage.clear(); let tail = Promise.resolve();
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: { request: (name, work) => {
    const task = tail.then(work); tail = task.catch(() => {}); return task;
  } } });
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => `uuid-${++id}` } });
  save.mockResolvedValue({ data: { document_key: 'doc', version: 2, status: 'DRAFT' } });
  api.branches.mockResolvedValue({ data: { items: [{ id: 2, name: 'Demo store', code: 'DEMO' }], total: 1, pages: 1 } });
  api.products.mockResolvedValue({ data: { items: [{ id: 3, name: 'Demo tile', sku: 'TILE', policy_version: 1, units: ['PCS', 'BOX'], base_unit: 'PCS' }], total: 1, pages: 1 } });
});
function mount(value = initial, recovery = null) { return render(<SalesDraftEditor api={api} orgId={1} userId={7} initial={value} recovery={recovery} onSaved={onSaved} onClose={onClose} />); }
test('revisions submit stable line identity and exact quantity without financial or stock data', async () => {
  mount(); fireEvent.change(screen.getByLabelText('Quantity 1'), { target: { value: '3.125' } });
  fireEvent.click(screen.getByText('Save draft')); await act(async () => {});
  expect(save.mock.calls[0][1].draft.lines[0]).toEqual({ line_key: 'line', product_id: 3, expected_policy_version: 1, quantity: '3.125', unit: 'BOX' });
  expect(save.mock.calls[0][1].expected_version).toBe(1); expect(onSaved).toHaveBeenCalled();
});
test('uncertain save locks entries and retries identical operation', async () => {
  save.mockRejectedValueOnce(new Error('network')); mount(); fireEvent.click(screen.getByText('Save draft'));
  fireEvent.click(await screen.findByText('Retry same save')); await act(async () => {});
  expect(save.mock.calls[1][1]).toEqual(save.mock.calls[0][1]); expect(onSaved).toHaveBeenCalledTimes(1);
});
test('validation retains fields and permits correction; conflicts retain but stop overwrite', async () => {
  save.mockRejectedValueOnce({ response: { status: 422 } }); mount(); fireEvent.click(screen.getByText('Save draft'));
  await screen.findByRole('alert'); expect(screen.getByLabelText('Quantity 1')).not.toBeDisabled();
  save.mockRejectedValueOnce({ response: { status: 409 } }); fireEvent.click(screen.getByText('Save draft'));
  await act(async () => {}); expect(screen.getByText('Save draft')).toBeDisabled();
  expect(screen.getByLabelText('Quantity 1')).toHaveValue('2'); expect(onSaved).not.toHaveBeenCalled();
});
test('new draft uses customer, store and product selectors', async () => {
  mount(null); fireEvent.click(screen.getByText('Select customer')); fireEvent.click(screen.getByText('Choose Demo customer'));
  fireEvent.click(screen.getByText('Select selling store')); fireEvent.click(await screen.findByText('Select Demo store'));
  fireEvent.click(screen.getByText('Add product')); fireEvent.click(await screen.findByText('Select Demo tile'));
  save.mockImplementationOnce((key) => Promise.resolve({ data: { document_key: key, version: 1, status: 'DRAFT' } }));
  fireEvent.click(screen.getByText('Save draft')); await act(async () => {});
  expect(save.mock.calls[0][1].expected_version).toBe(0); expect(save.mock.calls[0][1].draft.customer_key).toBe('customer');
  expect(onSaved).toHaveBeenCalled();
});
test('dirty cancellation requires explicit discard', async () => {
  mount(); fireEvent.change(screen.getByLabelText('Quantity 1'), { target: { value: '4' } });
  fireEvent.click(screen.getByText('Cancel')); expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Discard edits')); await act(async () => {}); expect(onClose).toHaveBeenCalled();
});
test('unmount aborts save and ignores late success', async () => {
  let resolve; save.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = mount(); fireEvent.click(screen.getByText('Save draft')); await act(async () => {}); const signal = save.mock.calls[0][2];
  view.unmount(); await act(async () => resolve({ data: { document_key: 'doc', version: 2, status: 'DRAFT' } }));
  expect(signal.aborted).toBe(true); expect(onSaved).not.toHaveBeenCalled();
});

test('navigation/reload restores edits and exact uncertain save identity', async () => {
  save.mockRejectedValueOnce(new Error('network'));
  let view = mount(); fireEvent.change(screen.getByLabelText('Quantity 1'), { target: { value: '3.125' } });
  fireEvent.click(screen.getByText('Save draft')); await screen.findByText('Retry same save'); await act(async () => {});
  const sent = save.mock.calls[0][1]; view.unmount();
  const recovery = readRecovery('1:7', 'doc'); expect(recovery.snapshot.pending).toEqual(sent);
  view = mount(null, recovery);
  expect(screen.getByLabelText('Quantity 1')).toHaveValue('3.125'); expect(screen.getByLabelText('Quantity 1')).toBeDisabled();
  fireEvent.click(screen.getByText('Retry same save')); await act(async () => {});
  expect(save.mock.calls[1][1]).toEqual(sent); expect(readRecovery('1:7', 'doc')).toBeNull();
});

test('storage failure prevents network save and retains the form', async () => {
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: undefined });
  mount(); fireEvent.click(screen.getByText('Save draft')); await act(async () => {});
  expect(save).not.toHaveBeenCalled(); expect(screen.getByLabelText('Quantity 1')).toHaveValue('2');
  expect(screen.getByText(/Local recovery unavailable/)).toBeInTheDocument();
});
