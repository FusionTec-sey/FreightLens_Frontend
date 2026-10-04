import axios from 'axios';

const client = axios.create({ baseURL: process.env.REACT_APP_NETWORK });
const BASE = '/inventory/counts';

// Cycle counts (T33A). The blind sheet is a separate endpoint from the
// discrepancy reads, so a counter's screen never receives expected stock.
export function countsApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Active-Org': String(orgId) };
  const key = value => encodeURIComponent(value);
  return {
    plans: (page, limit, signal) => client.get(`${BASE}/plans`, { headers, params: { page, limit }, signal }),
    createPlan: (body, signal) => client.post(`${BASE}/plans`, body, { headers, signal }),
    saveScope: (planKey, body, signal) => client.put(`${BASE}/plans/${key(planKey)}/scope`, body, { headers, signal }),
    activatePlan: (planKey, body, signal) => client.post(`${BASE}/plans/${key(planKey)}/activate`, body, { headers, signal }),
    coverage: (planKey, signal) => client.get(`${BASE}/plans/${key(planKey)}/coverage`, { headers, signal }),
    sessions: (page, limit, signal, mine = false) => client.get(`${BASE}/sessions`, { headers, params: { page, limit, mine }, signal }),
    assignSession: (body, signal) => client.post(`${BASE}/sessions`, body, { headers, signal }),
    sheet: (sessionKey, signal) => client.get(`${BASE}/sessions/${key(sessionKey)}/sheet`, { headers, signal }),
    saveEntries: (sessionKey, body, signal) => client.put(`${BASE}/sessions/${key(sessionKey)}/entries`, body, { headers, signal }),
    submit: (sessionKey, body, signal) => client.post(`${BASE}/sessions/${key(sessionKey)}/submit`, body, { headers, signal }),
    recount: (sessionKey, body, signal) => client.post(`${BASE}/sessions/${key(sessionKey)}/recount`, body, { headers, signal }),
    discrepancies: (page, limit, signal, sessionKey) => client.get(`${BASE}/discrepancies`, { headers, params: { page, limit, ...(sessionKey ? { session_key: sessionKey } : {}) }, signal }),
    requestReview: (id, body, signal) => client.post(`${BASE}/discrepancies/${key(id)}/review`, body, { headers, signal }),
    decide: (id, body, signal) => client.post(`${BASE}/discrepancies/${key(id)}/decision`, body, { headers, signal }),
    // Count-authorised projections over the shared catalogue; includes warehouses.
    branches: (page, limit, signal) => client.get(`${BASE}/sources/branches`, { headers, params: { page, limit }, signal }),
    products: (page, limit, signal, search = '') => client.get(`${BASE}/sources/products`, { headers, params: { page, limit, search }, signal }),
    locations: (branchId, page, limit, signal) => client.get(`${BASE}/sources/branches/${key(branchId)}/locations`, { headers, params: { page, limit }, signal }),
  };
}
