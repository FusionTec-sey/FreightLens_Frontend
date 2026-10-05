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
  api.postedInvoice('draft/key', 4, signal);
  api.invoiceReturnClaims('invoice/key', 2, 10, signal);
  api.createReturnClaim('return/key', { return_key: 'return/key' }, signal);
  api.readReturnClaim('return/key', signal);
  api.reviewReturnClaim('return/key', { outcome: 'APPROVED' }, signal);
  api.returnProcessingOptions('return/key', signal);
  api.createReturnCreditNote('return/key', { expected_claim_version: 2 }, signal);
  api.invoiceCreditNotes('invoice/key', 1, 25, signal);
  api.readCreditNote('credit/key', signal);
  api.stockConditionSources(3, 25, signal, 'invoice/key', 'credit/key');
  api.stockConditionCases(2, 10, signal, 'NEEDS_MY_REVIEW', 44);
  api.requestStockCondition({ credit_note_line_id: 44 }, signal);
  api.reviewStockCondition('case/key', { outcome: 'APPROVED' }, signal);
  api.executeStockCondition('case/key', { operation_key: 'operation' }, signal);

  const config = { headers: { Authorization: 'Bearer synthetic-token', 'X-Active-Org': '17' }, signal };
  expect(mockClient.get).toHaveBeenNthCalledWith(1, '/sales/invoices/invoice%2Fkey/return-options', config);
  expect(mockClient.get).toHaveBeenNthCalledWith(2, '/sales/drafts/draft%2Fkey/posted-invoice', { ...config, params: { draft_version: 4 } });
  expect(mockClient.get).toHaveBeenNthCalledWith(3, '/sales/invoices/invoice%2Fkey/returns', { ...config, params: { page: 2, limit: 10 } });
  expect(mockClient.put).toHaveBeenNthCalledWith(1, '/sales/returns/return%2Fkey', { return_key: 'return/key' }, config);
  expect(mockClient.get).toHaveBeenNthCalledWith(4, '/sales/returns/return%2Fkey', config);
  expect(mockClient.post).toHaveBeenCalledWith('/sales/returns/return%2Fkey/review', { outcome: 'APPROVED' }, config);
  expect(mockClient.get).toHaveBeenNthCalledWith(5, '/sales/returns/return%2Fkey/processing-options', config);
  expect(mockClient.put).toHaveBeenNthCalledWith(2, '/sales/returns/return%2Fkey/credit-note', { expected_claim_version: 2 }, config);
  expect(mockClient.get).toHaveBeenNthCalledWith(6, '/sales/invoices/invoice%2Fkey/credit-notes', { ...config, params: { page: 1, limit: 25 } });
  expect(mockClient.get).toHaveBeenNthCalledWith(7, '/sales/credit-notes/credit%2Fkey', config);
  expect(mockClient.get).toHaveBeenNthCalledWith(8, '/inventory/stock-condition-cases/sources', { ...config,
    params: { page: 3, limit: 25, invoice_key: 'invoice/key', credit_note_key: 'credit/key' } });
  expect(mockClient.get).toHaveBeenNthCalledWith(9, '/inventory/stock-condition-cases', { ...config,
    params: { page: 2, limit: 10, view: 'NEEDS_MY_REVIEW', credit_note_line_id: 44 } });
  expect(mockClient.post).toHaveBeenCalledWith('/inventory/stock-condition-cases', { credit_note_line_id: 44 }, config);
  expect(mockClient.post).toHaveBeenCalledWith('/inventory/stock-condition-cases/case%2Fkey/review', { outcome: 'APPROVED' }, config);
  expect(mockClient.post).toHaveBeenCalledWith('/inventory/stock-condition-cases/case%2Fkey/execute', { operation_key: 'operation' }, config);
});
