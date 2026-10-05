import axios from 'axios';
import { salesDraftsApi } from './salesDraftsApi';

jest.mock('axios', () => {
  const client = { get: jest.fn(), put: jest.fn(), post: jest.fn() };
  return { __esModule: true, default: { create: jest.fn(() => client), __client: client } };
});
const mockClient = axios.__client;

beforeEach(() => {
  jest.clearAllMocks();
  mockClient.get.mockResolvedValue({ data: {} });
  mockClient.put.mockResolvedValue({ data: {} });
  mockClient.post.mockResolvedValue({ data: {} });
});

test('uses the bounded invoice-return routes with company-scoped headers', () => {
  const api = salesDraftsApi('synthetic-token', 17);
  const signal = new AbortController().signal;
  api.returnOptions('invoice/key', signal);
  api.invoiceReturnClaims('invoice/key', 2, 10, signal);
  api.createReturnClaim('return/key', { return_key: 'return/key' }, signal);
  api.readReturnClaim('return/key', signal);
  api.reviewReturnClaim('return/key', { outcome: 'APPROVED' }, signal);
  api.returnProcessingOptions('return/key', signal);
  api.createReturnCreditNote('return/key', { expected_claim_version: 2 }, signal);
  api.invoiceCreditNotes('invoice/key', 1, 25, signal);
  api.readCreditNote('credit/key', signal);

  const config = { headers: { Authorization: 'Bearer synthetic-token', 'X-Active-Org': '17' }, signal };
  expect(mockClient.get).toHaveBeenNthCalledWith(1, '/sales/invoices/invoice%2Fkey/return-options', config);
  expect(mockClient.get).toHaveBeenNthCalledWith(2, '/sales/invoices/invoice%2Fkey/returns', { ...config, params: { page: 2, limit: 10 } });
  expect(mockClient.put).toHaveBeenNthCalledWith(1, '/sales/returns/return%2Fkey', { return_key: 'return/key' }, config);
  expect(mockClient.get).toHaveBeenNthCalledWith(3, '/sales/returns/return%2Fkey', config);
  expect(mockClient.post).toHaveBeenCalledWith('/sales/returns/return%2Fkey/review', { outcome: 'APPROVED' }, config);
  expect(mockClient.get).toHaveBeenNthCalledWith(4, '/sales/returns/return%2Fkey/processing-options', config);
  expect(mockClient.put).toHaveBeenNthCalledWith(2, '/sales/returns/return%2Fkey/credit-note', { expected_claim_version: 2 }, config);
  expect(mockClient.get).toHaveBeenNthCalledWith(5, '/sales/invoices/invoice%2Fkey/credit-notes', { ...config, params: { page: 1, limit: 25 } });
  expect(mockClient.get).toHaveBeenNthCalledWith(6, '/sales/credit-notes/credit%2Fkey', config);
});
