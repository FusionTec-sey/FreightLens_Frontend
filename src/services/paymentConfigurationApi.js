import axios from 'axios';

export function paymentConfigurationApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Active-Org': String(orgId) };
  const base = `${process.env.REACT_APP_NETWORK}/sales/payment-configuration`;
  const get = (path, params, signal) => axios.get(`${base}/${path}`, { headers, params, signal }).then(r => r.data);
  const put = (path, key, body) => axios.put(`${base}/${path}/${encodeURIComponent(key)}`, body, { headers }).then(r => r.data);
  return {
    methods: (page, signal) => get('methods', { page, limit: 25 }, signal),
    branches: (page, signal) => get('branches', { page, limit: 25 }, signal),
    mappings: (page, branchId, signal) => get('receiving-accounts',
      { page, limit: 25, ...(branchId ? { branch_id: branchId } : {}) }, signal),
    lookup: (branchId, methodKey, signal) => get('receiving-account-lookup',
      { branch_id: branchId, method_key: methodKey }, signal),
    saveMethod: (key, body) => put('methods', key, body),
    saveMapping: (key, body) => put('receiving-accounts', key, body),
  };
}

export function paymentConfigurationError(error) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map(item => item.msg).filter(Boolean).join(' ');
  if (typeof detail === 'string') return detail;
  if (error?.response?.status === 403) return 'Financial configuration access is required.';
  return 'The result could not be confirmed. Keep this form open and retry with the same operation key.';
}
