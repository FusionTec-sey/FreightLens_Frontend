import axios from 'axios';
const client = axios.create({ baseURL: process.env.REACT_APP_NETWORK });
const path = '/inventory/receipt-manifests';
export function receiptManifestsApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Active-Org': String(orgId) };
  return {
    list: (receiptId, page, limit, signal) => client.get(path, { headers, signal, params: { receipt_id: receiptId, page, limit } }),
    read: (key, signal) => client.get(`${path}/${encodeURIComponent(key)}`, { headers, signal }),
    sourcePreview: (body, signal) => client.post(`${path}/source-preview`, body, { headers, signal }),
    preview: (body, signal) => client.post(`${path}/preview`, body, { headers, signal }),
    create: (body, signal) => client.post(path, body, { headers, signal }),
    requestReview: (key, body, signal) => client.post(`${path}/${encodeURIComponent(key)}/request-review`, body, { headers, signal }),
    cases: (key, page, limit, view, signal) => client.get(`${path}/${encodeURIComponent(key)}/cases`, { headers, signal, params: { page, limit, view } }),
    review: (key, caseKey, body, signal) => client.post(`${path}/${encodeURIComponent(key)}/cases/${encodeURIComponent(caseKey)}/review`, body, { headers, signal }),
    evidenceDocuments: (page, limit, signal) => client.get('/inventory/cost-evidence/documents', { headers, signal, params: { page, limit } }),
    costCases: (key, page, limit, view, signal) => client.get(`${path}/${encodeURIComponent(key)}/cost-cases`, { headers, signal, params: { page, limit, view } }),
    requestCostReview: (key, body, signal) => client.post(`${path}/${encodeURIComponent(key)}/cost-cases`, body, { headers, signal }),
    reviewCost: (key, caseKey, body, signal) => client.post(`${path}/${encodeURIComponent(key)}/cost-cases/${encodeURIComponent(caseKey)}/review`, body, { headers, signal }),
    costDocument: (key, caseKey, documentId, signal) => client.get(`${path}/${encodeURIComponent(key)}/cost-cases/${encodeURIComponent(caseKey)}/documents/${encodeURIComponent(documentId)}`, { headers, signal, responseType: 'blob' }),
  };
}
