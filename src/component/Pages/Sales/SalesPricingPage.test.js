import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SalesPricingPage from './SalesPricingPage';
import { useAuth } from '../../../context/AuthContext';
import { salesPricingApi } from '../../../services/salesPricingApi';

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ isDark: false }) }));
jest.mock('../../../services/salesPricingApi', () => ({ salesPricingApi: jest.fn(), pricingError: error => error.message || 'Request failed' }));
jest.mock('../../../services/salesDraftsApi', () => ({ salesDraftsApi: () => ({ branches: jest.fn(), products: jest.fn() }) }));
jest.mock('../MasterData/CustomersPage', () => () => <div>Customer picker</div>);
jest.mock('./DraftSourcePicker', () => () => <div>Source picker</div>);

const page = items => Promise.resolve({ data: { items, total: items.length, pages: 1 } });
let api;
beforeEach(() => {
  useAuth.mockReturnValue({ token: 'token', selectedOrgId: 7, orgId: 1, permissions: [
    'View_Product', 'View_Financials', 'Manage_Financials', 'View_Customer', 'View_Personal_Data',
  ], isSuperAdmin: false, hasModule: name => name === 'SALES' });
  api = {
    taxRules: jest.fn(() => page([{ tax_rule_key: 'tax-1', code: 'VAT15', version: 2, name: 'VAT 15%', treatment: 'STANDARD', rate: '0.15', is_enabled: true }])),
    branchPrices: jest.fn(() => page([])), productTaxAssignments: jest.fn(() => page([])), customerAgreements: jest.fn(() => page([])),
    saveTaxRule: jest.fn().mockResolvedValue({ data: { tax_rule_key: 'tax-1', version: 3 } }),
  };
  salesPricingApi.mockReturnValue(api);
});

test('shows separate versioned pricing registers and no posting action', async () => {
  render(<SalesPricingPage />);
  expect(await screen.findByText('VAT 15%')).toBeInTheDocument();
  expect(screen.getByText('Tax-inclusive SCR configuration. Prices are versioned by selling store, product and unit; saving here does not post a sale.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Store prices/ }));
  expect(await screen.findByText('No store prices configured')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /post/i })).not.toBeInTheDocument();
});

test('tax editor retains exact revision intent and reports confirmed version', async () => {
  render(<SalesPricingPage />);
  await screen.findByText('VAT 15%');
  fireEvent.click(screen.getByRole('button', { name: 'Edit v2' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated VAT' } });
  fireEvent.change(screen.getByLabelText(/^Reason for this revision/), { target: { value: 'Reviewed statutory setup' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save next version' }));
  await waitFor(() => expect(api.saveTaxRule).toHaveBeenCalledTimes(1));
  const [key, body] = api.saveTaxRule.mock.calls[0];
  expect(key).toBe('tax-1'); expect(body.expected_version).toBe(2);
  expect(body.operation_key).toMatch(/^[0-9a-f-]{36}$/); expect(body.config.name).toBe('Updated VAT');
  expect(await screen.findByText(/Version 3 saved/)).toBeInTheDocument();
});

test('customer agreement register is withheld without personal-data access', async () => {
  useAuth.mockReturnValue({ token: 'token', selectedOrgId: 7, permissions: ['View_Product', 'View_Financials'],
    isSuperAdmin: false, hasModule: () => true });
  render(<SalesPricingPage />);
  await screen.findByText('VAT 15%');
  expect(screen.queryByRole('button', { name: /Customer prices/ })).not.toBeInTheDocument();
});
