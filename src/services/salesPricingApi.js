import axios from 'axios';

const client = axios.create({ baseURL: process.env.REACT_APP_NETWORK });

// Pricing configuration is organisation-scoped and versioned. Callers retain
// the same operation_key while retrying an uncertain PUT.
export function salesPricingApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, 'X-Active-Org': String(orgId) };
  const list = (path, page, limit, signal, filters = {}) => client.get(`/sales/pricing/${path}`, {
    headers, signal, params: { page, limit, ...filters },
  });
  const save = (path, key, body, signal) => client.put(
    `/sales/pricing/${path}/${encodeURIComponent(key)}`, body, { headers, signal },
  );
  return {
    taxRules: (page, limit, signal) => list('tax-rules', page, limit, signal),
    saveTaxRule: (key, body, signal) => save('tax-rules', key, body, signal),
    branchPrices: (page, limit, signal, filters) => list('branch-prices', page, limit, signal, filters),
    saveBranchPrice: (key, body, signal) => save('branch-prices', key, body, signal),
    productTaxAssignments: (page, limit, signal, filters) => list('product-tax-assignments', page, limit, signal, filters),
    saveProductTaxAssignment: (key, body, signal) => save('product-tax-assignments', key, body, signal),
    customerAgreements: (page, limit, signal, filters) => list('customer-agreements', page, limit, signal, filters),
    saveCustomerAgreement: (key, body, signal) => save('customer-agreements', key, body, signal),
  };
}

export function pricingError(error) {
  const detail = error?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map(item => item?.msg).filter(Boolean).join(' ') || 'Check the highlighted pricing fields.';
  }
  if (typeof detail === 'string') return detail;
  if (error?.response?.status === 401) return 'Your session expired. Sign in again before continuing.';
  if (error?.response?.status === 403) return 'Your current access does not allow this pricing action.';
  if (error?.response?.status === 409) return 'This record changed or the retry does not match the original save. Refresh before editing again.';
  return 'The pricing request could not be confirmed. Keep this form open and retry.';
}
