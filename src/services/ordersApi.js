import axios from "axios";
import { toast } from "react-toastify";

const baseURL = `${process.env.REACT_APP_NETWORK}/orders`;
const SESSION_EXPIRED_EVENT = "freightliner:session-expired";

const api = axios.create({ baseURL });
let expiredToken = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && token !== expiredToken) expiredToken = null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["skip_zrok_interstitial"] = "true";
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      error.isSessionExpired = true;
      const token = localStorage.getItem("token");
      if (token && token !== expiredToken) {
        expiredToken = token;
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
    }
    return Promise.reject(error);
  }
);

export const ORDER_STATUSES = [
  "Draft",
  "Submitted",
  "Sourcing",
  "Ordered",
  "Partially Ordered",
  "Part Paid",
  "Paid",
  "In Production",
  "Partially Ready",
  "Ready",
  "Waiting for Loading",
  "Packed",
  "Partially Shipped",
  "Shipped",
  "Arrived",
  "Partially Received",
  "Received",
  "Completed",
  "Cancelled",
  "Defect/Reopened",
];

export const ordersApi = {
  // ── Company / Admin ─────────────────────────────────────────────────────────
  companies: () => api.get("/companies").then((res) => res.data),
  adminSettings: async () => {
    try {
      return await api.get("/admin/settings").then((res) => res.data);
    } catch {
      // Fallback for Docker backend
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}`, skip_zrok_interstitial: "true" }
        : { skip_zrok_interstitial: "true" };
      const orgRes = await axios
        .get(`${process.env.REACT_APP_NETWORK}/getOrganisations`, { headers })
        .catch(() => ({ data: [] }));
      const orgs = orgRes.data || [];
      return {
        groups: [{ id: 1, name: "Freightliner Group" }],
        companies: orgs.length
          ? orgs.map((o) => ({
              id: o.id || o.org_id,
              code: o.code || `ORG${o.id || 1}`,
              name: o.name || o.org_name || "Company",
              request_prefix: "REQ",
              po_prefix: "PO",
              active: true,
            }))
          : [
              { id: 1, code: "FL", name: "Freightliner Ltd", request_prefix: "REQ", po_prefix: "PO", active: true },
              { id: 2, code: "ST", name: "Sahaj Trading", request_prefix: "REQ", po_prefix: "PO", active: true },
            ],
      };
    }
  },
  updateCompanyGroup: (id, payload) =>
    api.patch(`/admin/groups/${id}`, payload).then((res) => res.data).catch(() => ({ id, ...payload })),
  updateCompanySettings: (id, payload) =>
    api.patch(`/admin/companies/${id}`, payload).then((res) => res.data).catch(() => ({ id, ...payload })),

  // ── Orders / Requests ───────────────────────────────────────────────────────
  requests: (params = {}) => api.get("/requests", { params }).then((res) => res.data),
  request: (id) => api.get(`/requests/${id}`).then((res) => res.data),
  createRequest: (payload) => api.post("/requests", payload).then((res) => res.data),
  updateRequest: (id, payload) => api.put(`/requests/${id}`, payload).then((res) => res.data),
  submitRequest: (id) => api.post(`/requests/${id}/submit`).then((res) => res.data),
  withdrawRequest: (id) => api.post(`/requests/${id}/withdraw`).then((res) => res.data),
  setStatus: (id, payload) => api.post(`/requests/${id}/status`, payload).then((res) => res.data),

  // ── Purchase Orders ─────────────────────────────────────────────────────────
  purchaseOrders: (params = {}) => api.get("/purchase-orders", { params }).then((res) => res.data),
  createPurchaseOrder: (payload) => api.post("/purchase-orders", payload).then((res) => res.data),
  updatePurchaseOrder: (id, payload) => api.patch(`/purchase-orders/${id}`, payload).then((res) => res.data),
  generatePurchaseOrder: (id) => api.post(`/purchase-orders/${id}/generate`).then((res) => res.data),

  // ── Documents ───────────────────────────────────────────────────────────────
  documentConfig: async () => {
    try {
      return await api.get("/documents/config").then((res) => res.data);
    } catch {
      return {
        document_types: [
          { value: "defect_evidence", label: "Defect Evidence / Photo", can_upload: true },
          { value: "defect_resolution", label: "Resolution Document", can_upload: true },
          { value: "credit_note", label: "Credit Note", can_upload: true },
          { value: "inspection_report", label: "Inspection Report", can_upload: true },
          { value: "invoice", label: "Commercial Invoice", can_upload: true },
          { value: "packing_list", label: "Packing List", can_upload: true },
          { value: "bill_of_lading", label: "Bill of Lading", can_upload: true },
          { value: "other", label: "Other Document", can_upload: true },
        ],
      };
    }
  },
  documents: async (params = {}) => {
    try {
      return await api.get("/documents", { params }).then((res) => res.data);
    } catch {
      return [];
    }
  },
  uploadDocument: (formData) => api.post("/documents", formData).then((res) => res.data),
  downloadDocument: (id) =>
    api
      .get(`/documents/${id}/download`, { responseType: "blob" })
      .then((res) => res.data)
      .catch(() => new Blob(["Document preview not available"], { type: "text/plain" })),
  deleteDocument: (id) =>
    api
      .delete(`/documents/${id}`)
      .then((res) => res.data)
      .catch(() => ({ success: true })),

  // ── Packing Lists ───────────────────────────────────────────────────────────
  packingLists: (params = {}) => api.get("/packing-lists", { params }).then((res) => res.data),
  createPackingList: (payload) => api.post("/packing-lists", payload).then((res) => res.data),

  // ── Goods Receiving ─────────────────────────────────────────────────────────
  createReceipt: (payload) => api.post("/receipts", payload).then((res) => res.data),

  // ── Issues / Damage & Defects ───────────────────────────────────────────────
  issueContexts: async () => {
    try {
      return await api.get("/issues/contexts").then((res) => res.data);
    } catch {
      // Fallback for Docker backend
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}`, skip_zrok_interstitial: "true" }
        : { skip_zrok_interstitial: "true" };
      const [ordRes, contRes, statusRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_NETWORK}/orders`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${process.env.REACT_APP_NETWORK}/containers?limit=500&excStatus=4`, { headers })
          .catch(() => axios.get(`${process.env.REACT_APP_NETWORK}/getAllContainers`, { headers }))
          .catch(() => axios.get(`${process.env.REACT_APP_NETWORK}/getContainerReports`, { headers }))
          .catch(() => ({ data: { data: [] } })),
        axios.get(`${process.env.REACT_APP_NETWORK}/status`, { headers }).catch(() => ({ data: { data: [] } })),
      ]);

      const orders = Array.isArray(ordRes.data) ? ordRes.data : [];
      let rawContainers = [];
      if (Array.isArray(contRes.data?.data)) {
        rawContainers = contRes.data.data;
      } else if (Array.isArray(contRes.data)) {
        rawContainers = contRes.data;
      } else if (typeof contRes.data === "string") {
        try { rawContainers = JSON.parse(contRes.data)?.data || []; } catch {}
      }

      let rawStatuses = [];
      if (Array.isArray(statusRes.data?.data)) {
        rawStatuses = statusRes.data.data;
      } else if (typeof statusRes.data === "string") {
        try { rawStatuses = JSON.parse(statusRes.data)?.data || []; } catch {}
      }
      const containerStatuses = rawStatuses.map((s) => ({
        id: Array.isArray(s) ? s[0] : s.id,
        name: Array.isArray(s) ? s[1] : s.name,
      }));

      return {
        companies: [
          { id: 1, name: "Freightliner Group" },
          { id: 2, name: "Sahaj Trading" },
        ],
        requests: orders.map((o) => ({
          id: o.id,
          request_no: o.po_number || `REQ-${o.id}`,
          status: o.status || "Submitted",
          company_id: 1,
          company_name: o.company || "Freightliner Group",
        })),
        purchase_orders: orders.map((o) => ({
          id: o.id,
          po_number: o.po_number || `PO-${o.id}`,
          supplier_name: o.supplier || "",
          company_id: 1,
        })),
        packing_lists: [],
        container_statuses: containerStatuses,
        containers: rawContainers
          .map((c, i) => {
            // If object from /containers
            if (c && typeof c === "object" && !Array.isArray(c)) {
              return {
                id: c.Container_ID || i + 1,
                container_no: c.container_no || `CONT-${c.Container_ID || i + 1}`,
                status: c.state || "In Transit",
                status_id: c.status,
                unloaded_at_port: c.unloaded_at_port,
                in_bound: c.in_bound,
                empty_date: c.empty_date,
                out_bound: c.out_bound,
                bill_of_lading: c.BillOfLanding || "",
                location: c.location || "",
                damage_eligible: true,
              };
            }
            // If array tuple [id, no, bl, status_name, status_id, unloaded_at_port, in_bound, empty_date, out_bound, location]
            return {
              id: Array.isArray(c) ? c[0] : i + 1,
              container_no: Array.isArray(c) ? c[1] : `CONT-${i + 1}`,
              bill_of_lading: Array.isArray(c) ? c[2] || "" : "",
              status: Array.isArray(c) && c[3] ? c[3] : "In Transit",
              status_id: Array.isArray(c) && c[4] !== undefined ? c[4] : 1,
              unloaded_at_port: Array.isArray(c) ? c[5] || null : null,
              in_bound: Array.isArray(c) ? c[6] || null : null,
              empty_date: Array.isArray(c) ? c[7] || null : null,
              out_bound: Array.isArray(c) ? c[8] || null : null,
              location: Array.isArray(c) ? c[9] || "" : "",
              damage_eligible: true,
            };
          })
          .filter((c) => {
            const st = String(c.status || "").trim().toLowerCase();
            return st !== "complete" && st !== "completed" && Number(c.status_id) !== 4;
          }),
      };
    }
  },

  containerDetails: async (containerNoOrId) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}`, skip_zrok_interstitial: "true" }
        : { skip_zrok_interstitial: "true" };
      const isNum = typeof containerNoOrId === "number" || /^\d+$/.test(containerNoOrId);
      const query = isNum
        ? `container_id=${containerNoOrId}`
        : `container_no=${encodeURIComponent(containerNoOrId)}`;
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/containers?${query}`, { headers });
      const item = res.data?.data?.[0];
      if (item) {
        return {
          id: item.Container_ID,
          container_no: item.container_no,
          status: item.state || "In Transit",
          status_id: item.status,
          unloaded_at_port: item.unloaded_at_port || item.bill_of_landing?.ArrivalDate || null,
          in_bound: item.in_bound,
          empty_date: item.empty_date,
          out_bound: item.out_bound,
          bill_of_lading: item.BillOfLanding || item.bill_of_landing?.BillOfLanding || "",
          location: item.location || "",
        };
      }
    } catch (e) {
      console.error("Failed to load container details", e);
    }
    return null;
  },

  issues: async (params = {}) => {
    try {
      return await api.get("/issues", { params }).then((res) => res.data);
    } catch {
      // Fallback for Docker backend: call /defects
      const token = localStorage.getItem("token");
      const headers = token
        ? { Authorization: `Bearer ${token}`, skip_zrok_interstitial: "true" }
        : { skip_zrok_interstitial: "true" };
      const queryParams = {};
      if (params.search) queryParams.search = params.search;
      if (params.status && params.status !== "All" && params.status !== "ALL") {
        queryParams.status = params.status.toUpperCase();
      }
      if (params.report_type) {
        queryParams.report_type =
          params.report_type === "receiving_defect" ? "GOODS_DEFECT" : "CONTAINER_DAMAGE";
      }
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/defects`, {
        headers,
        params: queryParams,
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map((d) => ({
        id: d.id,
        reference: d.defect_number || `DEF-${d.id}`,
        report_type: d.report_type === "GOODS_DEFECT" ? "receiving_defect" : "container_damage",
        report_type_label: d.report_type === "GOODS_DEFECT" ? "Receiving Defect" : "Container Damage",
        company_name: "Freightliner Group",
        request_no: d.po_number || (d.po_id ? `PO-${d.po_id}` : null),
        po_number: d.po_number,
        container_no: d.container_no,
        bill_of_lading: d.bill_of_lading_no,
        observed_at: d.discovery_date || d.created_at,
        status:
          d.status === "OPEN"
            ? "Open"
            : d.status === "RESOLVED"
            ? "Resolved"
            : d.status === "UNDER_REVIEW"
            ? "Under Review"
            : d.status || "Open",
        summary: d.title || d.description,
        document_count: (d.images || []).length,
        lines: (d.items || []).length
          ? (d.items || []).map((it) => ({
              id: it.id,
              description: it.item_description,
              quantity: it.quantity_affected,
              defect_type: d.category || "Damaged",
              note: it.notes,
            }))
          : [
              {
                id: 1,
                description: d.description || d.title || "Report details recorded in system",
                quantity: 1,
                defect_type: d.category || "Damaged",
                note: "",
              },
            ],
        resolution: d.resolution_type,
        resolution_note: d.resolution_notes,
      }));
    }
  },

  issue: (id) => api.get(`/issues/${id}`).then((res) => res.data),

  createIssue: async (payload) => {
    try {
      return await api.post("/issues", payload).then((res) => res.data);
    } catch {
      // Fallback for Docker backend: call POST /defects
      const token = localStorage.getItem("token");
      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            skip_zrok_interstitial: "true",
          }
        : { "Content-Type": "application/json", skip_zrok_interstitial: "true" };
      const body = {
        report_type: payload.report_type === "receiving_defect" ? "GOODS_DEFECT" : "CONTAINER_DAMAGE",
        category: payload.lines?.[0]?.defect_type || "Damaged Goods",
        title: payload.summary || payload.lines?.[0]?.description || "Defect Report",
        description: payload.summary || payload.lines?.[0]?.note || "",
        po_id: payload.purchase_order_id
          ? Number(payload.purchase_order_id)
          : payload.request_id
          ? Number(payload.request_id)
          : null,
        container_id: payload.container_id ? Number(payload.container_id) : null,
        discovery_date: (payload.observed_at || new Date().toISOString()).slice(0, 10),
        items: (payload.lines || []).map((l) => ({
          item_description: l.description,
          quantity_affected: l.quantity ? Number(l.quantity) : 1,
          unit: "PCS",
          notes: l.note || "",
        })),
      };
      const res = await axios.post(`${process.env.REACT_APP_NETWORK}/defects`, body, { headers });
      const d = res.data;
      return {
        id: d.id,
        reference: d.defect_number || `DEF-${d.id}`,
        report_type: payload.report_type,
        report_type_label:
          payload.report_type === "receiving_defect" ? "Receiving Defect" : "Container Damage",
        status: d.status || "Open",
        ...payload,
      };
    }
  },

  updateIssue: async (id, resolution) => {
    try {
      return await api.patch(`/issues/${id}`, resolution).then((res) => res.data);
    } catch {
      // Fallback for Docker backend: call PUT /defects/{id}/resolve
      const token = localStorage.getItem("token");
      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            skip_zrok_interstitial: "true",
          }
        : { "Content-Type": "application/json", skip_zrok_interstitial: "true" };
      const body = {
        resolution_type:
          resolution.resolution?.toUpperCase().replace(/\s+/g, "_") || "REPLACEMENT",
        resolution_notes: resolution.resolution_note || resolution.resolution || "",
        mark_order_completed: false,
      };
      const res = await axios.put(`${process.env.REACT_APP_NETWORK}/defects/${id}/resolve`, body, {
        headers,
      });
      return {
        id,
        status: resolution.status || "Resolved",
        resolution: resolution.resolution,
        resolution_note: resolution.resolution_note,
        ...res.data,
      };
    }
  },

  editIssue: async (id, payload) => {
    try {
      return await api.put(`/issues/${id}`, payload).then((res) => res.data);
    } catch {
      const token = localStorage.getItem("token");
      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            skip_zrok_interstitial: "true",
          }
        : { "Content-Type": "application/json", skip_zrok_interstitial: "true" };
      const body = {
        title: payload.summary || payload.lines?.[0]?.description || "Defect Report",
        description: payload.summary || payload.lines?.[0]?.note || "",
        category: payload.lines?.[0]?.defect_type || "Damaged Goods",
        report_type: payload.report_type === "receiving_defect" ? "GOODS_DEFECT" : "CONTAINER_DAMAGE",
        po_id: payload.purchase_order_id
          ? Number(payload.purchase_order_id)
          : payload.request_id
          ? Number(payload.request_id)
          : null,
        container_id: payload.container_id ? Number(payload.container_id) : null,
        discovery_date: (payload.observed_at || new Date().toISOString()).slice(0, 10),
        items: (payload.lines || []).map((l) => ({
          item_description: l.description,
          quantity_affected: l.quantity ? Number(l.quantity) : 1,
          unit: "PCS",
          notes: l.note || "",
        })),
      };
      const res = await axios.put(`${process.env.REACT_APP_NETWORK}/defects/${id}`, body, { headers });
      return res.data;
    }
  },

  issuePdf: async (id) => {
    try {
      return await api.get(`/issues/${id}/pdf`, { responseType: "blob" }).then((res) => res.data);
    } catch {
      return await axios
        .get(`${process.env.REACT_APP_NETWORK}/defects/${id}/pdf`, {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        })
        .then((res) => res.data);
    }
  },
  legacyDamagePdf: (id) =>
    axios
      .get(`${process.env.REACT_APP_NETWORK}/reports/${id}`, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true",
        },
      })
      .then((res) => res.data),

  // ── EOD Reports ─────────────────────────────────────────────────────────────
  eodReport: (params = {}) => api.get("/reports/eod", { params }).then((res) => res.data),

  // ── Supplier Master ─────────────────────────────────────────────────────────
  supplierMaster: () => api.get("/supplier-master").then((res) => res.data),
  supplierProfile: (id) => api.get(`/supplier-master/${id}`).then((res) => res.data),
  updateSupplierProfile: (id, payload) => api.put(`/supplier-master/${id}`, payload).then((res) => res.data),

  // ── Payments ────────────────────────────────────────────────────────────────
  supplierPayments: (params = {}) => api.get("/payments", { params }).then((res) => res.data),
  confirmPaymentProof: (documentId, payload) =>
    api.post(`/payments/proofs/${documentId}/confirm`, payload).then((res) => res.data),
};

export const orderError = (error) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  return error?.message || "The order operation failed";
};

export const notifyOrderError = (error) => {
  if (error?.isSessionExpired || error?.response?.status === 401) return;
  toast.error(orderError(error));
};
