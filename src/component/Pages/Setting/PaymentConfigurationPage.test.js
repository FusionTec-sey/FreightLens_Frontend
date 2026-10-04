import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaymentConfigurationPage from './PaymentConfigurationPage';
import { paymentConfigurationApi } from '../../../services/paymentConfigurationApi';

jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({
  token: 'synthetic-token', orgId: 1, selectedOrgId: null,
  permissions: ['View_Financials', 'Manage_Financials'], hasModule: () => true,
}) }));
jest.mock('../../../services/paymentConfigurationApi', () => ({
  paymentConfigurationApi: jest.fn(),
  paymentConfigurationError: error => error.message,
}));

const empty = { items: [], total: 0, page: 1, pages: 1, limit: 25 };

test('retains an uncertain save and retries the identical method operation', async () => {
  const saveMethod = jest.fn()
    .mockRejectedValueOnce(new Error('Connection lost'))
    .mockResolvedValueOnce({ version: 1, replayed: true });
  paymentConfigurationApi.mockReturnValue({
    methods: jest.fn().mockResolvedValue(empty), branches: jest.fn().mockResolvedValue(empty),
    mappings: jest.fn().mockResolvedValue(empty), saveMethod,
  });
  render(<PaymentConfigurationPage />);
  await screen.findByText('No configuration yet');
  fireEvent.click(screen.getByRole('button', { name: 'New method' }));
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'SYNTH_CASH' } });
  fireEvent.change(screen.getByLabelText('Display label'), { target: { value: 'Synthetic cash' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Synthetic setup' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  await screen.findByText('Connection lost');
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  await waitFor(() => expect(saveMethod).toHaveBeenCalledTimes(2));
  expect(saveMethod.mock.calls[1]).toEqual(saveMethod.mock.calls[0]);
  await screen.findByText(/Version 1 saved/);
});

test('shows an exact blocked branch lookup while composing a mapping', async () => {
  const saveMapping = jest.fn().mockResolvedValue({ version: 1, replayed: false });
  paymentConfigurationApi.mockReturnValue({
    methods: jest.fn().mockResolvedValue({ ...empty, items: [{
      method_key: '70d77731-38d0-4543-b00d-0a11241560ed', code: 'SYNTH_CASH',
      label: 'Synthetic cash', kind: 'CASH', version: 1, is_enabled: true,
    }], total: 1 }),
    branches: jest.fn().mockResolvedValue({ ...empty, items: [{
      id: 12, code: 'STORE_A', name: 'Synthetic store', is_active: true,
    }], total: 1 }),
    mappings: jest.fn().mockResolvedValue(empty),
    lookup: jest.fn().mockResolvedValue({ status: 'BLOCKED', reason: 'MAPPING_MISSING' }),
    saveMapping,
  });
  render(<PaymentConfigurationPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Branch accounts' }));
  await screen.findByText('No configuration yet');
  fireEvent.click(screen.getByRole('button', { name: 'New mapping' }));
  await waitFor(() => expect(screen.getByLabelText('Account selling branch').options.length).toBe(2));
  fireEvent.change(screen.getByLabelText('Account selling branch'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Payment method'), { target: {
    value: '70d77731-38d0-4543-b00d-0a11241560ed',
  } });
  fireEvent.click(screen.getByRole('button', { name: 'Check exact mapping' }));
  await screen.findByText('Blocked: MAPPING_MISSING');
  fireEvent.change(screen.getByLabelText('Opaque accounting reference'), { target: { value: 'SYNTH_LEDGER' } });
  fireEvent.change(screen.getByLabelText('Display label'), { target: { value: 'Synthetic account' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Synthetic setup' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  await waitFor(() => expect(saveMapping).toHaveBeenCalledTimes(1));
  expect(saveMapping.mock.calls[0][1]).toMatchObject({
    branch_id: 12, method_key: '70d77731-38d0-4543-b00d-0a11241560ed',
    config: { account_ref: 'SYNTH_LEDGER' },
  });
});
