import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DraftAllocation from './DraftAllocation';
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
const draft = { document_key: 'draft', version: 3, branch_id: 1, lines: [{ line_key: 'line', product_id: 7, product_name: 'Tile', base_quantity: '24', base_unit: 'PCS' }] };
function setup(error) {
  const api = { allocationContext: jest.fn().mockResolvedValue({ data: { branch_id: 1, assignment_version: 2, branch_version: 4 } }),
    allocateDraft: jest.fn().mockImplementation(body => Promise.resolve({ data: { operation_key: body.operation_key, branch_id: 1, quantity: '2.000001', base_unit: 'PCS', reservations: [{ reservation_key: 'hold', location_id: 5, quantity: '2.000001' }] } })) };
  if (error) api.allocationContext.mockRejectedValue(error);
  const inventoryApi = { counters: jest.fn().mockResolvedValue({ data: { items: [{ id: 2, counter_key: 'counter', version: 6,
    config: { name: 'Tools counter', is_enabled: true, purpose: 'CHECKOUT', default_stock_location_id: null } }], total: 1, pages: 1 } }) };
  const onClose = jest.fn();
  render(<DraftAllocation api={api} inventoryApi={inventoryApi} draft={draft} onClose={onClose} />);
  return { api, inventoryApi, onClose };
}
beforeEach(() => Object.defineProperty(window, 'crypto', { configurable: true, value: { randomUUID: () => 'operation' } }));
async function fill() {
  await waitFor(() => expect(screen.getByLabelText('Draft line')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Draft line'), { target: { value: 'line' } });
  fireEvent.click(screen.getByText('Choose counter')); fireEvent.click(await screen.findByText('Select Tools counter'));
  expect(screen.getByText(/No preferred picking area/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Quantity (PCS)'), { target: { value: '2.000001' } });
  fireEvent.change(screen.getByLabelText(/Follow-up/), { target: { value: '2099-01-01T10:00' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Customer-agreed reservation' } });
}
test('sends exact source and settings without authority or business date', async () => {
  const { api } = setup(); await fill(); fireEvent.click(screen.getByText('Allocate stock'));
  expect(await screen.findByRole('status')).toHaveTextContent('not payment or physical handover');
  const payload = api.allocateDraft.mock.calls[0][0];
  expect(payload).toMatchObject({ source: { document_key: 'draft', line_key: 'line', version: 3 },
    quantity: '2.000001', input_unit: 'PCS', counter_key: 'counter', counter_version: 6, branch_version: 4, assignment_version: 2 });
  expect(payload).not.toHaveProperty('authority'); expect(payload).not.toHaveProperty('business_date');
  expect(screen.getByText(/Location #5/)).toBeInTheDocument();
});
test('disabled runtime cannot submit', async () => {
  const { api } = setup({ response: { status: 503 } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Allocation is disabled');
  expect(screen.getByText('Allocate stock')).toBeDisabled(); expect(api.allocateDraft).not.toHaveBeenCalled();
});
test('unknown outcome freezes changes and reuses operation identity', async () => {
  const { api } = setup(); api.allocateDraft.mockRejectedValueOnce(new Error('network'));
  await fill(); fireEvent.click(screen.getByText('Allocate stock')); await screen.findByText(/Outcome not confirmed/);
  expect(screen.getByLabelText('Quantity (PCS)')).toBeDisabled();
  fireEvent.click(screen.getByText('Retry identical allocation')); await screen.findByRole('status');
  expect(api.allocateDraft.mock.calls[1][0]).toEqual(api.allocateDraft.mock.calls[0][0]);
});
test('conflict blocks overwrite and dirty close needs confirmation', async () => {
  const { api, onClose } = setup(); api.allocateDraft.mockRejectedValueOnce({ response: { status: 409 } });
  await fill(); fireEvent.click(screen.getByText('Allocate stock')); await screen.findByText(/Allocation rejected/);
  expect(screen.getByText('Allocate stock')).toBeDisabled(); fireEvent.click(screen.getByText('Back to draft'));
  expect(onClose).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Leave allocation')); expect(onClose).toHaveBeenCalled();
});
