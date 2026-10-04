import axios from "axios";

// Isolated client: organisation context is captured by the screen, never replaced
// by a later organisation selection in the global interceptor. No POST retries.
const client = axios.create({ baseURL: process.env.REACT_APP_NETWORK });
export function inventoryLocationsApi(token, orgId) {
  const headers = { Authorization: `Bearer ${token}`, "X-Active-Org": String(orgId) };
  const path = (branchId) => `/inventory/branches${branchId ? `/${branchId}/locations` : ""}`;
  return {
    staffAssignments: (branchId, page, limit, signal) => client.get(`/inventory/branches/${branchId}/staff-assignments`, { headers, params: { page, limit }, signal }),
    saveStaffAssignment: (branchId, userId, body, signal) => client.put(`/inventory/branches/${branchId}/staff-assignments/${userId}`, body, { headers, signal }),
    evidenceSuppliers: (page, limit, signal) => client.get('/inventory/cost-evidence/suppliers', { headers, params: { page, limit }, signal }),
    evidenceDocuments: (page, limit, signal) => client.get('/inventory/cost-evidence/documents', { headers, params: { page, limit }, signal }),
    evidenceDocument: (id, signal) => client.get(`/inventory/cost-evidence/documents/${id}/download`, { headers, signal, responseType: 'blob' }),
    reviewedEvidenceDocument: (pool, key, caseKey, id, signal) => client.get(`/inventory/cost-evidence/pools/${pool}/proposals/${key}/cases/${caseKey}/documents/${id}/download`, { headers, signal, responseType: 'blob' }),
    requestChargeEvidence: (pool, key, body, signal) => client.post(`/inventory/cost-evidence/pools/${pool}/proposals/${key}/cases`, body, { headers, signal }),
    chargeEvidenceCases: (pool, key, page, limit, signal, view = 'ALL') => client.get(`/inventory/cost-evidence/pools/${pool}/proposals/${key}/cases`, { headers, params: { page, limit, view }, signal }),
    reviewChargeEvidence: (pool, key, caseKey, body, signal) => client.post(`/inventory/cost-evidence/pools/${pool}/proposals/${key}/cases/${caseKey}/review`, body, { headers, signal }),
    saveReclassificationProposal: (body, signal) => client.post("/inventory/reclassification-proposals", body, { headers, signal }),
    requestReclassificationReview: (key, body, signal) => client.post(`/inventory/reclassification-proposals/${key}/request-review`, body, { headers, signal }),
    reclassificationCases: (key, page, limit, signal, view = "ALL") => client.get(`/inventory/reclassification-proposals/${key}/cases`, { headers, params: { page, limit, view }, signal }),
    reviewReclassificationCase: (key, caseKey, body, signal) => client.post(`/inventory/reclassification-proposals/${key}/cases/${caseKey}/review`, body, { headers, signal }),
    reclassificationProposals: (balanceId, page, limit, signal) => client.get("/inventory/reclassification-proposals", { headers, params: { balance_id: balanceId, page, limit }, signal }),
    reclassificationProposal: (key, signal) => client.get(`/inventory/reclassification-proposals/${key}`, { headers, signal }),
    requestPolicyReview: (data, signal) => client.post("/inventory/manager-cases/policy-activation", data, { headers, signal }),
    managerCases: (page, limit, signal, view = "ALL") => client.get("/inventory/manager-cases", { headers, params: { page, limit, view }, signal }),
    barcodeRetirementCases: (page, limit, signal, view = "ALL") => client.get("/inventory/barcode-retirement-cases", { headers, params: { page, limit, view }, signal }),
    requestBarcodeRetirement: (body, signal) => client.post("/inventory/barcode-retirement-cases", body, { headers, signal }),
    reviewBarcodeRetirement: (key, body, signal) => client.post(`/inventory/barcode-retirement-cases/${key}/review`, body, { headers, signal }),
    retireBarcode: (key, body, signal) => client.post(`/inventory/barcode-retirement-cases/${key}/retire`, body, { headers, signal }),
    reviewPolicyCase: (caseKey, data, signal) => client.post(`/inventory/manager-cases/${caseKey}/review`, data, { headers, signal }),
    counters: (branchId, page, limit, signal) => client.get(`/inventory/branches/${branchId}/counters`, { headers, params: { page, limit }, signal }),
    counterStockArea: (branchId, counterKey, version, page, limit, signal) => client.get(`/inventory/branches/${branchId}/counters/${counterKey}/stock-area`, { headers, params: { expected_version: version, page, limit }, signal }),
    saveCounter: (branchId, counterKey, data, signal) => client.put(`/inventory/branches/${branchId}/counters/${counterKey}`, data, { headers, signal }),
    branchSettings: (branchId, signal) => client.get(`/inventory/branches/${branchId}/settings`, { headers, signal }),
    saveBranchSettings: (branchId, data, signal) => client.put(`/inventory/branches/${branchId}/settings`, data, { headers, signal }),
    serials: (branchId, locationId, balanceId, page, limit, signal) => client.get(`${path(branchId)}/${locationId}/stock/${balanceId}/serials`, { headers, params: { page, limit }, signal }),
    previewPolicyUnit: (productId, data, signal) => client.post(`/inventory/products/${productId}/inventory-policy-draft/preview-unit`, data, { headers, signal }),
    activatePolicy: (caseKey, data, signal) => client.post(`/inventory/manager-cases/${caseKey}/activate-policy`, data, { headers, signal }),
    activePolicy: (productId, signal) => client.get(`/inventory/products/${productId}/inventory-policy`, { headers, signal }),
    policyTransitionReadiness: (productId, signal) => client.get(`/inventory/products/${productId}/inventory-policy/transition-readiness`, { headers, signal }),
    unitBarcodes: (productId, page, limit, signal) => client.get(`/inventory/unit-barcodes/products/${productId}`, { headers, params: { page, limit }, signal }),
    createUnitBarcode: (productId, data, signal) => client.post(`/inventory/unit-barcodes/products/${productId}`, data, { headers, signal }),
    resolveUnitBarcode: (code, signal) => client.get("/inventory/unit-barcodes/resolve", { headers, params: { code }, signal }),
    policyDraft: (productId, signal) => client.get(`/inventory/products/${productId}/inventory-policy-draft`, { headers, signal }),
    savePolicyDraft: (productId, data, signal) => client.put(`/inventory/products/${productId}/inventory-policy-draft`, data, { headers, signal }),
    list: (branchId, page, limit, signal) => client.get(path(branchId), { headers, params: { page, limit }, signal }),
    stock: (branchId, locationId, page, limit, signal, productId) => client.get(`${path(branchId)}/${locationId}/stock`, { headers, params: { page, limit, ...(productId ? { product_id: productId } : {}) }, signal }),
    create: (branchId, data, signal) => client.post(path(branchId), data, { headers, signal }),
    listPools: (page, limit, signal) => client.get("/inventory/cost-pools", { headers, params: { page, limit }, signal }),
    poolValuations: (poolId, page, limit, signal) => client.get(`/inventory/cost-pools/${poolId}/valuations`, { headers, params: { page, limit }, signal }),
    previewCostAllocation: (poolId, body, signal) => client.post(`/inventory/cost-pools/${poolId}/allocate-cost-preview`, body, { headers, signal }),
    saveCostAllocation: (poolId, body, signal) => client.post(`/inventory/cost-pools/${poolId}/allocation-proposals`, body, { headers, signal }),
    costAllocations: (poolId, page, limit, signal) => client.get(`/inventory/cost-pools/${poolId}/allocation-proposals`, { headers, params: { page, limit }, signal }),
    costAllocation: (poolId, key, signal) => client.get(`/inventory/cost-pools/${poolId}/allocation-proposals/${key}`, { headers, signal }),
    requestCostAllocationReview: (poolId, key, body, signal) => client.post(`/inventory/cost-pools/${poolId}/allocation-proposals/${key}/request-review`, body, { headers, signal }),
    costAllocationCases: (poolId, key, page, limit, signal, view = 'ALL') => client.get(`/inventory/cost-pools/${poolId}/allocation-proposals/${key}/cases`, { headers, params: { page, limit, view }, signal }),
    reviewCostAllocation: (poolId, key, caseKey, body, signal) => client.post(`/inventory/cost-pools/${poolId}/allocation-proposals/${key}/cases/${caseKey}/review`, body, { headers, signal }),
    createPool: (data, signal) => client.post("/inventory/cost-pools", data, { headers, signal }),
    branchPool: (branchId, signal) => client.get(`/inventory/branches/${branchId}/cost-pool`, { headers, signal }),
    assignPool: (branchId, costPoolId, signal) => client.put(`/inventory/branches/${branchId}/cost-pool`, { cost_pool_id: costPoolId }, { headers, signal }),
  };
}

export function locationError(error) {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    const fields = {};
    detail.forEach((entry) => {
      const field = entry.loc?.[entry.loc.length - 1];
      if (typeof field === "string" && typeof entry.msg === "string") fields[field] = entry.msg;
    });
    return { message: "Please check the highlighted fields.", fields };
  }
  return {
    message: typeof detail === "string" ? detail : error.response?.status === 401
      ? "Your session has expired. Sign in again before continuing."
      : "The request could not be confirmed. Reload the list and check whether the record exists before trying again.",
    fields: {},
  };
}
