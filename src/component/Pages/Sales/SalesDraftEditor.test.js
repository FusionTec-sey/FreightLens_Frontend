import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesDraftEditor from './SalesDraftEditor';
import { writeRecovery, removeRecovery } from '../../../services/salesDraftRecovery';
import { DraftNavigationContext } from '../../../context/DraftNavigationContext';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('../../../hooks/useOperationIntent', () => () => ({ payloadFor: (_, body) => ({ ...body, operation_key: 'synthetic-operation' }) }));
jest.mock('../../../services/salesDraftRecovery', () => ({ recoveryScope: () => '1:10', writeRecovery: jest.fn(), removeRecovery: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn() } }));
jest.mock('../MasterData/CustomersPage', () => () => null);
jest.mock('./DraftSourcePicker', () => () => null);
jest.mock('./SalesProductImage', () => () => null);

const initial = { document_key: 'synthetic-draft', version: 1, customer_key: 'synthetic-customer',
  expected_customer_version: 1, branch_id: 2, lines: [{ line_key: 'synthetic-line', product_id: 3,
    expected_policy_version: 1, quantity: '2', unit: 'PCS', base_unit: 'PCS' }] };
const receipt = { ...initial, version: 2, status: 'DRAFT' };

beforeEach(() => {
  jest.clearAllMocks();
  writeRecovery.mockResolvedValue({ revision: 1 });
  removeRecovery.mockResolvedValue(undefined);
});

test('invalid quantity returns tablet to cart, focuses field and retains exact typed text without sending', async () => {
  const api = { save: jest.fn() };
  render(<SalesDraftEditor api={api} orgId={1} userId={10} initial={initial} onSaved={jest.fn()} onClose={jest.fn()} />);
  const quantity = screen.getByLabelText('Quantity 1');
  fireEvent.change(quantity, { target: { value: '0.000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Products' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  expect(screen.getByRole('button', { name: 'Cart' })).toHaveAttribute('aria-pressed', 'true');
  expect(quantity).toHaveValue('0.000000');
  expect(quantity).toHaveAttribute('aria-invalid', 'true');
  expect(quantity).toHaveFocus();
  expect(screen.getByText('Quantity must be greater than zero.')).toBeInTheDocument();
  expect(api.save).not.toHaveBeenCalled();
  fireEvent.change(quantity, { target: { value: '0.000001' } });
  expect(quantity).toHaveAttribute('aria-invalid', 'false');
  await waitFor(() => expect(writeRecovery).toHaveBeenCalled());
});

test('confirmed server save retries only failed local cleanup and locks cart', async () => {
  const api = { save: jest.fn().mockResolvedValue({ data: receipt }) };
  const onSaved = jest.fn();
  removeRecovery.mockRejectedValueOnce(new Error('Storage unavailable'));
  render(<SalesDraftEditor api={api} orgId={1} userId={10} initial={initial} onSaved={onSaved} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByText(/Local recovery cleanup failed/);
  expect(screen.getByRole('status')).toHaveTextContent('Server confirmed draft version 2');
  expect(screen.queryByText(/Save outcome is unconfirmed/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('Quantity 1')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Keep locally and close' })).toBeDisabled();
  expect(onSaved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry local cleanup' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(receipt));
  expect(api.save).toHaveBeenCalledTimes(1);
  expect(removeRecovery).toHaveBeenCalledTimes(2);
});

test('mismatched receipt remains uncertain and does not delete recovery', async () => {
  const api = { save: jest.fn().mockResolvedValue({ data: { ...receipt, document_key: 'other-draft' } }) };
  render(<SalesDraftEditor api={api} orgId={1} userId={10} initial={initial} onSaved={jest.fn()} onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByText(/Save outcome is unconfirmed/);
  expect(removeRecovery).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Retry same save' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Retry local cleanup' })).not.toBeInTheDocument();
});

test('route guard retains latest exact edits and rejects unavailable local recovery', async () => {
  let guard;
  const register = value => { guard = value; return () => {}; };
  render(<DraftNavigationContext.Provider value={register}><SalesDraftEditor api={{ save: jest.fn() }} orgId={1} userId={10} initial={initial} onSaved={jest.fn()} onClose={jest.fn()} /></DraftNavigationContext.Provider>);
  expect(guard.shouldBlock()).toBe(false);
  fireEvent.change(screen.getByLabelText('Quantity 1'), { target: { value: '3.000001' } });
  expect(guard.shouldBlock()).toBe(true);
  await act(async () => guard.prepareToLeave());
  expect(writeRecovery.mock.calls.at(-1)[3].draft.lines[0].quantity).toBe('3.000001');
  writeRecovery.mockRejectedValue(new Error('Storage unavailable'));
  await act(async () => { await expect(guard.prepareToLeave()).rejects.toThrow('Storage unavailable'); });
  expect(removeRecovery).not.toHaveBeenCalled();
});

test('editor displays current branch label but does not copy it into local recovery', async () => {
  render(<SalesDraftEditor api={{ save: jest.fn() }} orgId={1} userId={10}
    initial={{ ...initial, branch_name: 'Synthetic store' }} onSaved={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Store: Synthetic store' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Quantity 1'), { target: { value: '3' } });
  await waitFor(() => expect(writeRecovery).toHaveBeenCalled());
  expect(writeRecovery.mock.calls.at(-1)[3].draft.branch_id).toBe(2);
  expect(writeRecovery.mock.calls.at(-1)[3].draft).not.toHaveProperty('branch_name');
});

test('route guard blocks running saves and preserves uncertain operation without reposting', async () => {
  let guard, reject;
  const register = value => { guard = value; return () => {}; };
  const api = { save: jest.fn(() => new Promise((_, fail) => { reject = fail; })) };
  render(<DraftNavigationContext.Provider value={register}><SalesDraftEditor api={api} orgId={1} userId={10} initial={initial} onSaved={jest.fn()} onClose={jest.fn()} /></DraftNavigationContext.Provider>);
  fireEvent.click(screen.getByText('Save draft'));
  await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
  await expect(guard.prepareToLeave()).rejects.toThrow('Wait for the current save');
  await act(async () => reject(new Error('Connection lost')));
  await screen.findByText(/Save outcome is unconfirmed/);
  await act(async () => guard.prepareToLeave());
  expect(writeRecovery.mock.calls.at(-1)[3].pending).toEqual(api.save.mock.calls[0][1]);
  expect(api.save).toHaveBeenCalledTimes(1);
  expect(removeRecovery).not.toHaveBeenCalled();
});
