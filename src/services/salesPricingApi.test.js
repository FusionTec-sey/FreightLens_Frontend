import axios from 'axios';
import { pricingError, salesPricingApi } from './salesPricingApi';

jest.mock('axios', () => ({ create: jest.fn(() => ({ get: jest.fn(), put: jest.fn() })) }));
const client = axios.create.mock.results[0].value;

test('pricing reads and retry-safe writes remain pinned to the active company', () => {
  const api = salesPricingApi('pricing-token', 17);
  const signal = new AbortController().signal;
  const headers = { Authorization: 'Bearer pricing-token', 'X-Active-Org': '17' };
  api.branchPrices(2, 25, signal, { branch_id: 4, product_id: 9, unit: 'BOX' });
  expect(client.get).toHaveBeenLastCalledWith('/sales/pricing/branch-prices', {
    headers, signal, params: { page: 2, limit: 25, branch_id: 4, product_id: 9, unit: 'BOX' },
  });
  const body = { operation_key: 'stable-operation', expected_version: 3 };
  api.saveBranchPrice('price-key', body, signal);
  expect(client.put).toHaveBeenLastCalledWith('/sales/pricing/branch-prices/price-key', body, { headers, signal });
});

test('pricing API exposes each authoritative register without fallback endpoints', () => {
  const api = salesPricingApi('token', 2); const signal = new AbortController().signal;
  api.taxRules(1, 10, signal); api.productTaxAssignments(1, 10, signal, { product_id: 8 });
  api.customerAgreements(1, 10, signal, { customer_key: 'customer' });
  expect(client.get.mock.calls.map(call => call[0])).toEqual([
    '/sales/pricing/tax-rules', '/sales/pricing/product-tax-assignments', '/sales/pricing/customer-agreements',
  ]);
});

test('pricing failures preserve actionable server conflict details', () => {
  expect(pricingError({ response: { data: { detail: 'Expected version is stale' }, status: 409 } })).toBe('Expected version is stale');
  expect(pricingError({ response: { data: { detail: [{ msg: 'Price is invalid' }] } } })).toBe('Price is invalid');
  expect(pricingError({}).toLowerCase()).toContain('retry');
});
