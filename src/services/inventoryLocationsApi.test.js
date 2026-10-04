import axios from "axios";
import { inventoryLocationsApi, locationError } from "./inventoryLocationsApi";
jest.mock("axios", () => ({ create: jest.fn(() => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() })) }));
const client = axios.create.mock.results[0].value;

test('staff assignment API pins company and exact branch/user with no automatic retries', () => {
  const api = inventoryLocationsApi('synthetic', 7), signal = new AbortController().signal;
  const headers = { Authorization: 'Bearer synthetic', 'X-Active-Org': '7' };
  api.staffAssignments(11, 2, 25, signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/branches/11/staff-assignments', { headers, params: { page: 2, limit: 25 }, signal });
  const body = { operation_key: 'synthetic', expected_version: 1, config: { branch_id: 11, counter_id: null, is_enabled: true } };
  api.saveStaffAssignment(11, 9, body, signal);
  expect(client.put).toHaveBeenLastCalledWith('/inventory/branches/11/staff-assignments/9', body, { headers, signal });
});

test('stock-area inspection pins company, counter version and bounded pagination', () => {
  const api = inventoryLocationsApi('synthetic', 7), signal = new AbortController().signal;
  api.counterStockArea(11, 'counter-key', 3, 2, 25, signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/branches/11/counters/counter-key/stock-area', {
    headers: { Authorization: 'Bearer synthetic', 'X-Active-Org': '7' },
    params: { expected_version: 3, page: 2, limit: 25 }, signal,
  });
});

test('charge evidence and downloads retain company auth and never use raw storage paths', () => {
  const api = inventoryLocationsApi('evidence-token', 8), signal = new AbortController().signal;
  const headers = { Authorization: 'Bearer evidence-token', 'X-Active-Org': '8' };
  api.evidenceDocument('doc', signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/cost-evidence/documents/doc/download', { headers, signal, responseType: 'blob' });
  api.chargeEvidenceCases(2, 'proposal', 1, 25, signal, 'NEEDS_MY_REVIEW');
  expect(client.get).toHaveBeenLastCalledWith('/inventory/cost-evidence/pools/2/proposals/proposal/cases', { headers, signal, params: { page: 1, limit: 25, view: 'NEEDS_MY_REVIEW' } });
  api.requestChargeEvidence(2, 'proposal', { reason: 'Review' }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/cost-evidence/pools/2/proposals/proposal/cases', { reason: 'Review' }, { headers, signal });
});

test("proposal reads pin company and exact stock record", () => {
  const api = inventoryLocationsApi("proposal-token", 7), signal = new AbortController().signal;
  const headers = { Authorization: "Bearer proposal-token", "X-Active-Org": "7" };
  api.reclassificationProposals(3, 2, 25, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/reclassification-proposals", {
    headers, signal, params: { balance_id: 3, page: 2, limit: 25 },
  });
  api.reclassificationProposal("demo-key", signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/reclassification-proposals/demo-key", { headers, signal });
});

test("stock adjustment operations stay company-pinned and bind the exact balance", () => {
  const api = inventoryLocationsApi("adjustment-token", 7), signal = new AbortController().signal;
  const headers = { Authorization: "Bearer adjustment-token", "X-Active-Org": "7" };
  const request = { operation_key: "request-key", balance_id: 3, expected_source_version: 8,
    target_on_hand: "11.000000", target_damaged: "1.000000", target_quarantined: "0.000000",
    reason: "Verified physical count" };
  const decision = { operation_key: "review-key", expected_version: 2, outcome: "APPROVED", reason: "Count witnessed" };
  const execution = { operation_key: "execute-key" };
  api.stockAdjustmentCases(3, 2, 25, signal, "NEEDS_MY_REVIEW");
  expect(client.get).toHaveBeenLastCalledWith("/inventory/stock-adjustment-cases", {
    headers, params: { balance_id: 3, page: 2, limit: 25, view: "NEEDS_MY_REVIEW" }, signal,
  });
  api.requestStockAdjustment(request, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/stock-adjustment-cases", request, { headers, signal });
  api.reviewStockAdjustment("case-key", decision, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/stock-adjustment-cases/case-key/review", decision, { headers, signal });
  api.executeStockAdjustment("case-key", execution, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/stock-adjustment-cases/case-key/execute", execution, { headers, signal });
});

test("personal review queue is company-pinned and sends no caller-selected user ID", () => {
  const api = inventoryLocationsApi("test-token", 7), signal = new AbortController().signal;
  api.managerCases(2, 25, signal, "NEEDS_MY_REVIEW");
  expect(client.get).toHaveBeenLastCalledWith("/inventory/manager-cases", {
    headers: { Authorization: "Bearer test-token", "X-Active-Org": "7" }, signal,
    params: { page: 2, limit: 25, view: "NEEDS_MY_REVIEW" },
  });
});
test("transition readiness remains a tenant-pinned read", () => {
  const api = inventoryLocationsApi("review-token", 7), signal = new AbortController().signal;
  api.policyTransitionReadiness(91, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/products/91/inventory-policy/transition-readiness", {
    headers: { Authorization: "Bearer review-token", "X-Active-Org": "7" }, signal,
  });
});
test("captures tenant/auth headers, bounded page request and signal on both methods", () => {
  const api = inventoryLocationsApi("token-a", 7);
  const controller = new AbortController();
  api.list(11, 2, 25, controller.signal);
  const headers = { Authorization: "Bearer token-a", "X-Active-Org": "7" };
  expect(client.get).toHaveBeenCalledWith("/inventory/branches/11/locations", {
    headers, params: { page: 2, limit: 25 }, signal: controller.signal,
  });
  api.create(undefined, { code: "MAIN" }, controller.signal);
  expect(client.post).toHaveBeenCalledTimes(1);
  expect(client.post).toHaveBeenCalledWith("/inventory/branches", { code: "MAIN" }, { headers, signal: controller.signal });
});
test("maps validation errors without rendering raw objects", () => {
  expect(locationError({ response: { data: { detail: [{ loc: ["body", "code"], msg: "Invalid code" }] } } }))
    .toEqual({ message: "Please check the highlighted fields.", fields: { code: "Invalid code" } });
  expect(locationError({}).message).toMatch(/check whether the record exists/);
  expect(locationError({ response: { status: 401 } }).message).toMatch(/Sign in again/);
});

test("branch settings and counters pin tenant and preserve operation keys", () => {
  const api = inventoryLocationsApi("settings-token", 7);
  const signal = new AbortController().signal;
  const headers = { Authorization: "Bearer settings-token", "X-Active-Org": "7" };
  const payload = { operation_key: "stable", expected_version: 2, config: {} };
  api.branchSettings(11, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/branches/11/settings", { headers, signal });
  api.saveBranchSettings(11, payload, signal);
  expect(client.put).toHaveBeenLastCalledWith("/inventory/branches/11/settings", payload, { headers, signal });
  api.counters(11, 2, 10, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/branches/11/counters", { headers, params: { page: 2, limit: 10 }, signal });
  api.saveCounter(11, "counter-key", payload, signal);
  expect(client.put).toHaveBeenLastCalledWith("/inventory/branches/11/counters/counter-key", payload, { headers, signal });
});

test("stock read pins exact branch/location and tenant without fallback", () => {
  const api = inventoryLocationsApi("stock-token", 7);
  const signal = new AbortController().signal;
  api.stock(11, 91, 2, 10, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/branches/11/locations/91/stock", {
    headers: { Authorization: "Bearer stock-token", "X-Active-Org": "7" }, params: { page: 2, limit: 10 }, signal,
  });
  api.serials(11, 91, 8, 2, 10, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/branches/11/locations/91/stock/8/serials", {
    headers: { Authorization: "Bearer stock-token", "X-Active-Org": "7" }, params: { page: 2, limit: 10 }, signal,
  });
});

test("policy drafts keep auth, organisation, expected version and decimal strings", () => {
  const api = inventoryLocationsApi("policy-token", 7);
  const signal = new AbortController().signal;
  const headers = { Authorization: "Bearer policy-token", "X-Active-Org": "7" };
  const payload = { expected_version: 2, config: { conversions: [{ unit: "BOX", factor: "12.12345678" }] } };
  api.policyDraft(91, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/products/91/inventory-policy-draft", { headers, signal });
  api.savePolicyDraft(91, payload, signal);
  expect(client.put).toHaveBeenLastCalledWith("/inventory/products/91/inventory-policy-draft", payload, { headers, signal });
  const preview = { config: payload.config, quantity: "0.5", unit: "BOX" };
  api.previewPolicyUnit(91, preview, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/products/91/inventory-policy-draft/preview-unit", preview, { headers, signal });
});

test("barcode retirement operations stay pinned to the selected company", () => {
  const api = inventoryLocationsApi("review-token", 9);
  const signal = new AbortController().signal;
  const headers = { Authorization: "Bearer review-token", "X-Active-Org": "9" };
  const body = { operation_key: "test", expected_source_version: 1 };
  api.barcodeRetirementCases(2, 25, signal, "MY_REQUESTS");
  expect(client.get).toHaveBeenLastCalledWith("/inventory/barcode-retirement-cases", { headers, params: { page: 2, limit: 25, view: "MY_REQUESTS" }, signal });
  api.requestBarcodeRetirement(body, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/barcode-retirement-cases", body, { headers, signal });
  api.reviewBarcodeRetirement("case", body, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/barcode-retirement-cases/case/review", body, { headers, signal });
  api.retireBarcode("case", body, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/barcode-retirement-cases/case/retire", body, { headers, signal });
});

test("cost pool configuration keeps explicit organisation and auth headers", () => {
  const api = inventoryLocationsApi("pool-token", 9);
  const signal = new AbortController().signal;
  const headers = { Authorization: "Bearer pool-token", "X-Active-Org": "9" };
  api.listPools(2, 25, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/cost-pools", { headers, params: { page: 2, limit: 25 }, signal });
  api.reconciliationReadiness(8, 3, 10, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/cost-pools/8/reconciliation-readiness", { headers, params: { page: 3, limit: 10 }, signal });
  api.requestCostReconciliation({ cost_pool_id: 8, product_id: 4 }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/cost-reconciliation/cases', { cost_pool_id: 8, product_id: 4 }, { headers, signal });
  api.costReconciliationCases(8, 4, 2, 10, 'NEEDS_MY_REVIEW', signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/cost-reconciliation/cases', { headers, params: { cost_pool_id: 8, product_id: 4, page: 2, limit: 10, view: 'NEEDS_MY_REVIEW' }, signal });
  api.reviewCostReconciliation('case', { outcome: 'APPROVED' }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/cost-reconciliation/cases/case/review', { outcome: 'APPROVED' }, { headers, signal });
  api.closeCostReconciliation('case', { operation_key: 'close' }, signal);
  expect(client.post).toHaveBeenLastCalledWith('/inventory/cost-reconciliation/cases/case/close', { operation_key: 'close' }, { headers, signal });
  api.costReconciliationCheckpoints(8, null, 1, 25, signal);
  expect(client.get).toHaveBeenLastCalledWith('/inventory/cost-reconciliation/checkpoints', { headers, params: { cost_pool_id: 8, product_id: undefined, page: 1, limit: 25 }, signal });
  api.branchPool(11, signal);
  expect(client.get).toHaveBeenLastCalledWith("/inventory/branches/11/cost-pool", { headers, signal });
  api.createPool({ code: "MAIN", name: "Main" }, signal);
  expect(client.post).toHaveBeenLastCalledWith("/inventory/cost-pools", { code: "MAIN", name: "Main" }, { headers, signal });
  api.assignPool(11, 8, signal);
  expect(client.put).toHaveBeenCalledTimes(1);
  expect(client.put).toHaveBeenCalledWith("/inventory/branches/11/cost-pool", { cost_pool_id: 8 }, { headers, signal });
});
