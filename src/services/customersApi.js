import axios from 'axios';

import { CUSTOMERS_ROUTE } from '../utils/customerRoutes';
export { CUSTOMERS_ROUTE } from '../utils/customerRoutes';
const client = axios.create({ baseURL: process.env.REACT_APP_NETWORK });
export function customersApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Active-Org': String(orgId) };
  return {
    create: (body, signal) => client.post(CUSTOMERS_ROUTE, body, { headers, signal }),
    update: (key, body, signal) => client.put(`${CUSTOMERS_ROUTE}/${encodeURIComponent(key)}/profile`, body, { headers, signal }),
    history: (key, page, limit, signal) => client.get(`${CUSTOMERS_ROUTE}/${encodeURIComponent(key)}/history`, { headers, params: { page, limit }, signal }),
    requestDuplicate: (body, signal) => client.post(`${CUSTOMERS_ROUTE}/duplicates/cases`, body, { headers, signal }),
    managerCases: (page, limit, signal, view) => client.get(`${CUSTOMERS_ROUTE}/duplicates/cases`, { headers, params: { page, limit, view }, signal }),
    reviewPolicyCase: (key, body, signal) => client.post(`${CUSTOMERS_ROUTE}/duplicates/cases/${encodeURIComponent(key)}/review`, body, { headers, signal }),
    read: (key, signal) => client.get(`${CUSTOMERS_ROUTE}/${encodeURIComponent(key)}`, { headers, signal }),
    readVersion: (key, version, signal) => client.get(`${CUSTOMERS_ROUTE}/${encodeURIComponent(key)}`, { headers, params: { version }, signal }),
    list: (page, limit, signal, search = '') => search.trim()
      ? client.post(`${CUSTOMERS_ROUTE}/search`, { page, limit, search: search.trim() }, { headers, signal })
      : client.get(CUSTOMERS_ROUTE, { headers, params: { page, limit }, signal }),
  };
}
