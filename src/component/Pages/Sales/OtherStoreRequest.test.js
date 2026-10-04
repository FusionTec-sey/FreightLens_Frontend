import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OtherStoreRequest from './OtherStoreRequest';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
const draft = { document_key: 'draft', version: 3, branch_id: 1, lines: [{ line_key: 'line', product_id: 7, product_name: 'Tile', base_quantity: '24', base_unit: 'PCS' }] };
function setup(working = 1) {
  const api = { workingStore: jest.fn().mockResolvedValue({ data: { branch_id: working, assignment_version: 2 } }),
    requestOtherStore: jest.fn().mockResolvedValue({ data: { case_key: 'case', status: 'REQUESTED' } }) };
  const page = items => ({ data: { items, total: items.length, pages: 1 } });
  const inventoryApi = { list: jest.fn().mockImplementation(branch => Promise.resolve(page(branch ? [{ id: 4, name: 'Warehouse bin', is_active: true }] : [{ id: 2, name: 'Other warehouse', is_active: true }]))),
    stock: jest.fn().mockResolvedValue(page([{ id: 8, product_name: 'Tile', version: 4, base_unit: 'PCS', available: '20', batch_code: 'A' }])) };
  const onClose = jest.fn();
  render(<OtherStoreRequest api={api} inventoryApi={inventoryApi} draft={draft} onClose={onClose} />);
  return { api, inventoryApi, onClose };
}
beforeEach(() => Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'synthetic-operation' } }));
async function fill() {
  await waitFor(() => expect(screen.getByLabelText('Draft line')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Draft line'), { target: { value: 'line' } });
  fireEvent.click(screen.getByText('Choose other store')); fireEvent.click(await screen.findByText('Select Other warehouse'));
  fireEvent.click(screen.getByText('Choose location')); fireEvent.click(await screen.findByText('Select Warehouse bin'));
  fireEvent.click(screen.getByText('Choose stock')); fireEvent.click(await screen.findByRole('button', { name: /Select Tile/ }));
  fireEvent.change(screen.getByLabelText('Quantity (PCS)'), { target: { value: '2.000001' } });
  fireEvent.change(screen.getByLabelText(/Follow-up/), { target: { value: '2099-01-01T10:00' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Customer requested separate warehouse pickup' } });
}
test('explicit choices submit exact saved source, stock and assignment versions', async () => {
  const { api, inventoryApi } = setup(); await fill(); fireEvent.click(screen.getByText('Request review'));
  expect(await screen.findByRole('status')).toHaveTextContent('No stock allocated');
  expect(inventoryApi.stock).toHaveBeenCalledWith(2, 4, 1, 25, expect.anything(), 7);
  expect(api.requestOtherStore).toHaveBeenCalledWith(expect.objectContaining({
    source: { document_key: 'draft', line_key: 'line', version: 3 }, assignment_version: 2,
    balance_id: 8, expected_stock_version: 4, quantity: '2.000001', input_unit: 'PCS',
  }), expect.anything());
});
test('unknown outcome locks editing and retries identical payload', async () => {
  const { api } = setup(); api.requestOtherStore.mockRejectedValueOnce(new Error('network'));
  await fill(); fireEvent.click(screen.getByText('Request review'));
  await screen.findByText(/Outcome not confirmed/);
  expect(screen.getByLabelText('Quantity (PCS)')).toBeDisabled();
  fireEvent.click(screen.getByText('Retry identical request')); await screen.findByRole('status');
  expect(api.requestOtherStore.mock.calls[1][0]).toEqual(api.requestOtherStore.mock.calls[0][0]);
});
test('wrong assigned store blocks request and selector', async () => {
  const { api } = setup(3); expect(await screen.findByRole('alert')).toHaveTextContent('not in your assigned working store');
  expect(screen.getByText('Request review')).toBeDisabled(); expect(api.requestOtherStore).not.toHaveBeenCalled();
});
test('stale state blocks replacement and close confirms dirty request', async () => {
  const { api, onClose } = setup(); api.requestOtherStore.mockRejectedValueOnce({ response: { status: 409 } });
  await fill(); fireEvent.click(screen.getByText('Request review')); await screen.findByText(/Request not accepted/);
  expect(screen.getByText('Request review')).toBeDisabled();
  fireEvent.click(screen.getByText('Back to draft')); expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Leave request')); expect(onClose).toHaveBeenCalledTimes(1);
});
