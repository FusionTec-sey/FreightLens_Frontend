import axios from 'axios';
import { SALES_DRAFTS_ROUTE } from '../utils/salesRoutes';
const client = axios.create({ baseURL: process.env.REACT_APP_NETWORK });
export function salesDraftsApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Active-Org': String(orgId) };
  return {
    list: (page, limit, signal) => client.get(SALES_DRAFTS_ROUTE, { headers, params: { page, limit }, signal }),
    read: (key, signal) => client.get(`${SALES_DRAFTS_ROUTE}/${encodeURIComponent(key)}`, { headers, signal }),
    save: (key, body, signal) => client.put(`${SALES_DRAFTS_ROUTE}/${encodeURIComponent(key)}`, body, { headers, signal }),
    branches: (page, limit, signal) => client.get('/sales/draft-sources/branches', { headers, params: { page, limit }, signal }),
    products: (page, limit, signal, search = '') => client.get('/sales/draft-sources/products', { headers, params: { page, limit, search }, signal }),
    counters: (branchId, page, limit, signal) => client.get(`/inventory/branches/${encodeURIComponent(branchId)}/counters`, { headers, params: { page, limit }, signal }).then(response => ({ ...response,
      data: { ...response.data, items: response.data.items.map(row => ({ ...row, name: row.config.name, code: `${row.code} · ${row.config.is_enabled ? 'Enabled' : 'Disabled'}` })) } })),
    workAreaPreview: (key, counterKey, signal) => client.get(`${SALES_DRAFTS_ROUTE}/${encodeURIComponent(key)}/work-area-preview`, { headers, params: { counter_key: counterKey }, signal }),
    reserveLocal: (key, body, signal) => client.post(`${SALES_DRAFTS_ROUTE}/${encodeURIComponent(key)}/reserve-local`, body, { headers, signal }),
    releaseCases: (page, limit, signal, view) => client.get('/inventory/reservation-release-cases', { headers, params: { page, limit, view }, signal }),
    reviewRelease: (key, body, signal) => client.post(`/inventory/reservation-release-cases/${encodeURIComponent(key)}/review`, body, { headers, signal }),
    reservations: (key, page, limit, signal) => client.get(`/inventory/reservation-release-cases/sources/${encodeURIComponent(key)}`, { headers, params: { page, limit }, signal }),
    requestRelease: (body, signal) => client.post('/inventory/reservation-release-cases', body, { headers, signal }),
    reallocationCases: (page, limit, signal, view) => client.get('/inventory/reservation-reallocation-cases', { headers, params: { page, limit, view }, signal }),
    reviewReallocation: (key, body, signal) => client.post(`/inventory/reservation-reallocation-cases/${encodeURIComponent(key)}/review`, body, { headers, signal }),
    requestReallocation: (body, signal) => client.post('/inventory/reservation-reallocation-cases', body, { headers, signal }),
    requestDeadline: (body, signal) => client.post('/inventory/reservation-deadline-cases', body, { headers, signal }),
    deadlineCases: (page, limit, signal, view) => client.get('/inventory/reservation-deadline-cases', { headers, params: { page, limit, view }, signal }),
    reviewDeadline: (key, body, signal) => client.post(`/inventory/reservation-deadline-cases/${encodeURIComponent(key)}/review`, body, { headers, signal }),
    scheduleDeadline: (key, body, signal) => client.post(`/inventory/reservation-deadline-cases/${encodeURIComponent(key)}/schedule`, body, { headers, signal }),
    dueReservations: (page, limit, signal) => client.get('/inventory/reservation-deadline-cases/due', { headers, params: { page, limit }, signal }),
  };
}
