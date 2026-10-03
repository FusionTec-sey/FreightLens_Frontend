import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomerCreateForm from './CustomerCreateForm';
import { toast } from 'react-toastify';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: true }) }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
const create = jest.fn();
const onSaved = jest.fn();
const onClose = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  let sequence = 0;
  Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: jest.fn(() => `key-${++sequence}`) } });
  create.mockImplementation(async body => ({ data: { customer_key: body.operation_key, version: 1, replayed: false } }));
});
function setup() { return render(<CustomerCreateForm api={{ create }} orgId={7} onSaved={onSaved} onClose={onClose} />); }
function fill() {
  fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Demo Customer' } });
  fireEvent.change(screen.getByLabelText('Contact value 1'), { target: { value: '+248 2000000' } });
}
test('requires name and contact before sending', () => {
  setup(); fireEvent.click(screen.getByText('Save customer'));
  expect(create).not.toHaveBeenCalled();
  expect(screen.getByText('Enter a customer name.')).toBeInTheDocument();
});
test('multiple contacts have exactly one primary and receipt confirms creation', async () => {
  setup(); fill(); fireEvent.click(screen.getByText('Add contact'));
  fireEvent.change(screen.getByLabelText('Contact value 2'), { target: { value: '+248 2000001' } });
  fireEvent.click(screen.getByLabelText('Primary contact 2'));
  fireEvent.click(screen.getByText('Save customer'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  const body = create.mock.calls[0][0];
  expect(body.expected_version).toBe(0);
  expect(body.profile.contacts.map(c => c.primary)).toEqual([false, true]);
  expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('do not create a duplicate'));
});
test('uncertain save locks editing and retries identical intent', async () => {
  create.mockRejectedValueOnce(new Error('timeout'));
  setup(); fill(); fireEvent.click(screen.getByText('Save customer'));
  await screen.findByText('Retry same request');
  expect(screen.getByLabelText('Customer name')).toBeDisabled();
  expect(screen.getByText('Cancel')).toBeDisabled();
  fireEvent.click(screen.getByText('Retry same request'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(create.mock.calls[1][0]).toEqual(create.mock.calls[0][0]);
});
test('422 retains fields and allows corrected submission with new intent', async () => {
  create.mockRejectedValueOnce({ response: { status: 422, data: { detail: [{ loc: ['body', 'profile', 'contacts', 0], msg: 'Invalid phone' }] } } });
  setup(); fill(); fireEvent.click(screen.getByText('Save customer'));
  await screen.findByText('Invalid phone');
  expect(screen.getByLabelText('Customer name')).toHaveValue('Demo Customer');
  fireEvent.change(screen.getByLabelText('Contact value 1'), { target: { value: '+248 2000002' } });
  fireEvent.click(screen.getByText('Save customer'));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(create.mock.calls[1][0].operation_key).not.toBe(create.mock.calls[0][0].operation_key);
});
test('dirty cancel requires explicit discard', () => {
  setup(); fill(); fireEvent.click(screen.getByText('Cancel'));
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Keep editing'));
  expect(screen.getByLabelText('Customer name')).toHaveValue('Demo Customer');
  fireEvent.click(screen.getByText('Cancel')); fireEvent.click(screen.getByText('Discard draft'));
  expect(onClose).toHaveBeenCalledTimes(1);
});
test('unmounted save cannot notify or update a new company screen', async () => {
  let resolve;
  create.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const view = setup(); fill(); fireEvent.click(screen.getByText('Save customer'));
  fireEvent.click(screen.getByText('Saving…'));
  expect(create).toHaveBeenCalledTimes(1);
  const [body, signal] = create.mock.calls[0];
  view.unmount();
  expect(signal.aborted).toBe(true);
  resolve({ data: { customer_key: body.operation_key, version: 1 } });
  await Promise.resolve();
  expect(onSaved).not.toHaveBeenCalled();
});
