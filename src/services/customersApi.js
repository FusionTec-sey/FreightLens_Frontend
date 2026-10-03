import axios from 'axios';

import { CUSTOMERS_ROUTE } from '../utils/customerRoutes';
export { CUSTOMERS_ROUTE } from '../utils/customerRoutes';
const client = axios.create({ baseURL: process.env.REACT_APP_NETWORK });
export function customersApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Active-Org': String(orgId) };
  return {
    create: (body, signal) => client.post(CUSTOMERS_ROUTE, body, { headers, signal }),
    read: (key, signal) => client.get(`${CUSTOMERS_ROUTE}/${encodeURIComponent(key)}`, { headers, signal }),
    list: (page, limit, signal, search = '') => search.trim()
      ? client.post(`${CUSTOMERS_ROUTE}/search`, { page, limit, search: search.trim() }, { headers, signal })
      : client.get(CUSTOMERS_ROUTE, { headers, params: { page, limit }, signal }),
  };
}
