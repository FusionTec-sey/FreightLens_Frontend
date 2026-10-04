import axios from 'axios';
import { receiptManifestsApi } from './receiptManifestsApi';

jest.mock('axios', () => ({ create: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })) }));
const client = axios.create.mock.results[0].value;

test('pins company and manifest identities for reads and review actions', () => {
  const api = receiptManifestsApi('receipt-token', 8), signal = new AbortController().signal;
  const headers = { Authorization: 'Bearer receipt-token', 'X-Active-Org': '8' };
  api.list(41, 2, 10, signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/receipt-manifests', {
    headers, signal, params: { receipt_id: 41, page: 2, limit: 10 },
  });
  api.cases('manifest/key', 3, 10, 'NEEDS_MY_REVIEW', signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/receipt-manifests/manifest%2Fkey/cases', {
    headers, signal, params: { page: 3, limit: 10, view: 'NEEDS_MY_REVIEW' },
  });
  api.requestReview('manifest/key', { operation_key: 'stable', reason: 'Inspect' }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/receipt-manifests/manifest%2Fkey/request-review',
    { operation_key: 'stable', reason: 'Inspect' }, { headers, signal });
  api.preview({ source: { receipt_id: 41 } }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/receipt-manifests/preview',
    { source: { receipt_id: 41 } }, { headers, signal });
  api.sourcePreview({ receipt_id: 41 }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/receipt-manifests/source-preview',
    { receipt_id: 41 }, { headers, signal });
  api.create({ operation_key: 'save', source: { receipt_id: 41 } }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/receipt-manifests',
    { operation_key: 'save', source: { receipt_id: 41 } }, { headers, signal });
  api.review('manifest/key', 'case/key', { operation_key: 'decision' }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/receipt-manifests/manifest%2Fkey/cases/case%2Fkey/review',
    { operation_key: 'decision' }, { headers, signal });
  api.evidenceDocuments(2, 25, signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/cost-evidence/documents', { headers, signal, params: { page: 2, limit: 25 } });
  api.costCases('manifest/key', 1, 10, 'MY_REQUESTS', signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/receipt-manifests/manifest%2Fkey/cost-cases', { headers, signal, params: { page: 1, limit: 10, view: 'MY_REQUESTS' } });
  api.requestCostReview('manifest/key', { operation_key: 'cost' }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/receipt-manifests/manifest%2Fkey/cost-cases', { operation_key: 'cost' }, { headers, signal });
  api.reviewCost('manifest/key', 'case/key', { operation_key: 'cost-decision' }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/receipt-manifests/manifest%2Fkey/cost-cases/case%2Fkey/review', { operation_key: 'cost-decision' }, { headers, signal });
  api.costDocument('manifest/key', 'case/key', 'document/key', signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/receipt-manifests/manifest%2Fkey/cost-cases/case%2Fkey/documents/document%2Fkey', { headers, signal, responseType: 'blob' });
});
