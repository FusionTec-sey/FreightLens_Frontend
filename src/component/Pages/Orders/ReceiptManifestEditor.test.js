import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReceiptManifestEditor from './ReceiptManifestEditor';

jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('../../../services/inventoryLocationsApi', () => ({
  inventoryLocationsApi: jest.fn(),
  locationError: error => ({ message: error.response?.data?.detail || error.message || 'Request failed.' }),
}));

const receipt = { id: 41, status: 'SUBMITTED', items: [{ id: 42, product_id: 7, description: 'Synthetic tile', received_quantity: 2, unit: 'BOX' }] };
const page = items => ({ data: { items, page: 1, limit: 25, pages: 1, total: items.length } });
const inventoryApi = {
  activePolicy: jest.fn().mockResolvedValue({ data: { version: 3, config: { tracking: 'BATCH', base_unit: 'PCS' } } }),
  list: jest.fn((branchId) => Promise.resolve(branchId ? page([{ id: 5, name: 'Receiving', code: 'RCV' }]) : page([{ id: 2, name: 'Providence Main', code: 'PROV' }]))),
};

beforeEach(() => {
  jest.clearAllMocks();
  inventoryApi.activePolicy.mockResolvedValue({ data: { version: 3, config: { tracking: 'BATCH', base_unit: 'PCS' } } });
  inventoryApi.list.mockImplementation(branchId => Promise.resolve(branchId ? page([{ id: 5, name: 'Receiving', code: 'RCV' }]) : page([{ id: 2, name: 'Providence Main', code: 'PROV' }])));
  let index = 0;
  Object.defineProperty(window, 'crypto', { configurable: true,
    value: { randomUUID: jest.fn(() => `11111111-1111-4111-8111-${String(++index).padStart(12, '0')}`) } });
});

async function prepare(api) {
  render(<ReceiptManifestEditor receipt={receipt} token="token" orgId={1} api={api} suppliedInventoryApi={inventoryApi} />);
  fireEvent.change(screen.getByLabelText('Receipt line'), { target: { value: '42' } });
  await screen.findByText(/Reviewed policy v3/);
  fireEvent.click(screen.getByRole('button', { name: 'Choose receiving branch' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select Providence Main' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose stock location' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select Receiving' }));
  await screen.findByText(/Receipt source: 2 BOX = 24.000000 PCS/);
  fireEvent.change(screen.getByLabelText('Total received in base units'), { target: { value: '24.000000' } });
  fireEvent.change(screen.getByLabelText('Classification reason'), { target: { value: 'Counted at receiving' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add received batch' }));
  fireEvent.change(screen.getByLabelText('Batch code'), { target: { value: 'LOT-01' } });
  fireEvent.change(screen.getByLabelText('On-hand'), { target: { value: '24.000000' } });
}

test('validates exact receipt classification before saving and retains stable retry identity', async () => {
  const api = {
    sourcePreview: jest.fn().mockResolvedValue({ data: { receipt_id: 41, receipt_item_id: 42, product_id: 7,
      branch_id: 2, location_id: 5, policy_version: 3, received_quantity: '2', unit: 'BOX', base_unit: 'PCS',
      base_quantities: { received_quantity: '24.000000', damaged_quantity: '0.000000', incorrect_quantity: '0.000000' }, physical_posting_enabled: false } }),
    preview: jest.fn(body => Promise.resolve({ data: { manifest: body, quantities: { on_hand: '24.000000', available: '24.000000' }, source: { base_unit: 'PCS' }, condition_review_required: false } })),
    create: jest.fn().mockRejectedValueOnce(new Error('Connection uncertain')).mockResolvedValueOnce({ data: { manifest_key: 'saved', physical_posting_enabled: false } }),
  };
  await prepare(api);
  fireEvent.click(screen.getByRole('button', { name: 'Validate classification' }));
  expect(await screen.findByText(/Validated against the current receipt/)).toBeInTheDocument();
  expect(api.preview).toHaveBeenCalledWith(expect.objectContaining({
    source: { receipt_id: 41, receipt_item_id: 42, branch_id: 2, location_id: 5, expected_policy_version: 3 },
    on_hand: '24.000000', damaged: '0', quarantined: '0',
  }), expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button', { name: 'Save manifest' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection uncertain');
  fireEvent.click(screen.getByRole('button', { name: 'Save manifest' }));
  expect(await screen.findByText(/saved—not posted/)).toBeInTheDocument();
  expect(api.create.mock.calls[0][0].operation_key).toBe(api.create.mock.calls[1][0].operation_key);
  expect(api.create.mock.calls[1][0].batches[0]).toMatchObject({ on_hand: '24.000000', identity: { code: 'LOT-01' } });
});

test('blocks draft receipts and receipt lines without a product identity', () => {
  const api = { preview: jest.fn(), create: jest.fn() };
  const view = render(<ReceiptManifestEditor receipt={{ ...receipt, status: 'DRAFT' }} api={api} suppliedInventoryApi={inventoryApi} />);
  expect(screen.getByText(/Submit the goods receipt/)).toBeInTheDocument();
  view.rerender(<ReceiptManifestEditor receipt={{ ...receipt, items: [{ id: 42, description: 'Legacy line' }] }} api={api} suppliedInventoryApi={inventoryApi} />);
  expect(screen.getByText(/linked product identities/)).toBeInTheDocument();
  expect(api.preview).not.toHaveBeenCalled();
});

test('edits after validation invalidate the save gate', async () => {
  const api = {
    sourcePreview: jest.fn().mockResolvedValue({ data: { receipt_id: 41, receipt_item_id: 42, product_id: 7,
      branch_id: 2, location_id: 5, policy_version: 3, received_quantity: '2', unit: 'BOX', base_unit: 'PCS',
      base_quantities: { received_quantity: '24.000000', damaged_quantity: '0.000000', incorrect_quantity: '0.000000' }, physical_posting_enabled: false } }),
    preview: jest.fn(body => Promise.resolve({ data: { manifest: body, quantities: { on_hand: '24.000000', available: '24.000000' }, source: { base_unit: 'PCS' } } })), create: jest.fn() };
  await prepare(api);
  fireEvent.click(screen.getByRole('button', { name: 'Validate classification' }));
  await screen.findByText(/Validated against the current receipt/);
  fireEvent.change(screen.getByLabelText('Classification reason'), { target: { value: 'Changed after validation' } });
  expect(screen.getByRole('button', { name: 'Save manifest' })).toBeDisabled();
  expect(api.create).not.toHaveBeenCalled();
});
