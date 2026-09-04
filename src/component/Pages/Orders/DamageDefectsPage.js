import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  Truck,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../../../context/AuthContext";
import { notifyOrderError, ordersApi } from "../../../services/ordersApi";
import DocumentPanel from "./DocumentPanel";
import {
  PageHeader,
  SearchableSelect,
  StatusBadge,
  buttonClass,
  fieldClass,
  secondaryButtonClass,
  tableHeaderClass,
} from "./OrderUi";

const ISSUE_DRAFT_KEY = "freightliner.issue-draft.v1";

const nowForInput = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyLine = () => ({ description: "", quantity: "", defect_type: "Damaged", note: "" });

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    if (String(value).includes("T") || String(value).includes(":")) {
      return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return String(value);
  }
};

const readDraft = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(ISSUE_DRAFT_KEY) || "null");
    return saved && Array.isArray(saved.lines) ? saved : null;
  } catch {
    return null;
  }
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function DamageDefectsPage() {
  const { permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const canManage = permissions.includes("Manage_Orders");
  const canReceive = canManage || permissions.includes("Receive_Orders");
  const canContainer = canManage || permissions.includes("Add_Report");
  const canResolve = canManage || permissions.includes("Edit_Report");

  const [contexts, setContexts] = useState({
    companies: [],
    requests: [],
    packing_lists: [],
    purchase_orders: [],
    containers: [],
  });
  const [issues, setIssues] = useState([]);
  const [filters, setFilters] = useState({ search: "", report_type: "", status: "" });
  const [viewMode, setViewMode] = useState(() => (searchParams.get("new") === "1" ? "form" : "list"));
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const scrollable = document.querySelector("main > div");
    if (scrollable) scrollable.scrollTo({ top: 0, behavior: "smooth" });
  }, [viewMode]);
  const [resolution, setResolution] = useState({
    status: "Resolved",
    resolution: "",
    resolution_note: "",
  });

  const initialType =
    searchParams.get("type") || (canReceive ? "receiving_defect" : "container_damage");

  const [form, setForm] = useState(() => {
    const draft = readDraft();
    return {
      report_type: initialType,
      company_id: "",
      request_id: searchParams.get("request_id") || "",
      purchase_order_id: searchParams.get("purchase_order_id") || "",
      packing_list_id: searchParams.get("packing_list_id") || "",
      container_id: searchParams.get("container_id") || "",
      observed_at: nowForInput(),
      summary: "",
      lines: [emptyLine()],
      ...(draft || {}),
      ...(searchParams.get("type") ? { report_type: initialType } : {}),
      ...(searchParams.get("request_id") ? { request_id: searchParams.get("request_id") } : {}),
      ...(searchParams.get("purchase_order_id")
        ? { purchase_order_id: searchParams.get("purchase_order_id") }
        : {}),
      ...(searchParams.get("packing_list_id")
        ? { packing_list_id: searchParams.get("packing_list_id") }
        : {}),
      ...(searchParams.get("container_id")
        ? { container_id: searchParams.get("container_id") }
        : {}),
    };
  });

  // ── Data loading ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [contextRows, issueRows] = await Promise.all([
        ordersApi.issueContexts(),
        ordersApi.issues(
          Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
        ),
      ]);
      setContexts(contextRows);
      setIssues(issueRows);
      setForm((current) => {
        const linked = contextRows.requests.find(
          (row) => String(row.id) === String(current.request_id)
        );
        return {
          ...current,
          company_id:
            current.company_id || linked?.company_id || contextRows.companies[0]?.id || "",
        };
      });
    } catch (error) {
      notifyOrderError(error);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Load verified container details whenever a container is selected
  useEffect(() => {
    if (!form.container_id) return;
    ordersApi.containerDetails(form.container_id).then((details) => {
      if (!details) return;
      setContexts((prev) => ({
        ...prev,
        containers: prev.containers.map((c) =>
          String(c.id) === String(details.id) ? { ...c, ...details } : c
        ),
      }));
    });
  }, [form.container_id]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const selectedContainer = contexts.containers.find(
    (row) => String(row.id) === String(form.container_id)
  );
  const companyRequests = contexts.requests.filter(
    (row) => !form.company_id || String(row.company_id) === String(form.company_id)
  );
  const companyOrders = contexts.purchase_orders.filter(
    (row) => !form.company_id || String(row.company_id) === String(form.company_id)
  );
  const companyPacking = contexts.packing_lists.filter(
    (row) => !form.company_id || String(row.company_id) === String(form.company_id)
  );

  const requestOptions = companyRequests.map((row) => ({
    value: row.id,
    label: `${row.request_no} · ${row.status}`,
    keywords: `${row.company_name || ""} ${row.status || ""}`,
  }));
  const orderOptions = companyOrders.map((row) => ({
    value: row.id,
    label: row.po_number,
    keywords: row.supplier_name || "",
  }));
  const packingOptions = companyPacking.map((row) => ({
    value: row.id,
    label: row.reference || `Packing list ${row.id}`,
  }));
  const containerOptions = useMemo(
    () =>
      contexts.containers
        .filter((row) => {
          const st = String(row.status || "").trim().toLowerCase();
          const sid = Number(row.status_id);
          return st !== "complete" && st !== "completed" && sid !== 4;
        })
        .map((row) => ({
          value: row.id,
          label: `${row.container_no} · ${row.status || "In Transit"}${row.bill_of_lading ? ` (BL: ${row.bill_of_lading})` : ""}`,
          keywords: `${row.container_no} ${row.status || ""} ${row.bill_of_lading || ""} ${row.location || ""}`,
        })),
    [contexts.containers]
  );

  const hasUnsavedContent = Boolean(
    form.summary.trim() ||
      form.request_id ||
      form.container_id ||
      evidence.length ||
      form.lines.some((line) => line.description.trim())
  );

  // ── Draft persistence ─────────────────────────────────────────────────────
  useEffect(() => {
    if (viewMode !== "form" || !hasUnsavedContent) return;
    localStorage.setItem(ISSUE_DRAFT_KEY, JSON.stringify(form));
  }, [form, hasUnsavedContent, viewMode]);

  useEffect(() => {
    if (viewMode !== "form" || !hasUnsavedContent) return undefined;
    const protect = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [hasUnsavedContent, viewMode]);

  // ── Form helpers ─────────────────────────────────────────────────────────
  const setField = (key, value) => setForm((c) => ({ ...c, [key]: value }));

  const setReportType = (reportType) =>
    setForm((c) => ({
      ...c,
      report_type: reportType,
      ...(reportType === "receiving_defect"
        ? { container_id: "" }
        : { request_id: "", purchase_order_id: "", packing_list_id: "" }),
    }));

  const setLine = (index, key, value) =>
    setForm((c) => ({
      ...c,
      lines: c.lines.map((line, i) => (i === index ? { ...line, [key]: value } : line)),
    }));

  const chooseRequest = (requestId) => {
    const req = contexts.requests.find((row) => String(row.id) === String(requestId));
    setForm((c) => ({
      ...c,
      request_id: requestId,
      company_id: req?.company_id || c.company_id,
    }));
  };

  const openNew = (type) => {
    setEditingId(null);
    setSelected(null);
    setForm((c) => ({
      ...c,
      report_type: type,
      request_id: "",
      purchase_order_id: "",
      packing_list_id: "",
      container_id: "",
      lines: [emptyLine()],
      summary: "",
      observed_at: nowForInput(),
    }));
    setEvidence([]);
    setViewMode("form");
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setSelected(row);
    setForm({
      report_type: row.report_type || "container_damage",
      company_id:
        row.company_id || (contexts.companies[0]?.id ? String(contexts.companies[0]?.id) : ""),
      request_id: row.request_id ? String(row.request_id) : "",
      purchase_order_id: row.purchase_order_id ? String(row.purchase_order_id) : "",
      packing_list_id: row.packing_list_id ? String(row.packing_list_id) : "",
      container_id: row.container_id
        ? String(row.container_id)
        : contexts.containers.find((c) => c.container_no === row.container_no)?.id
        ? String(contexts.containers.find((c) => c.container_no === row.container_no)?.id)
        : "",
      observed_at: row.observed_at ? String(row.observed_at).slice(0, 16) : nowForInput(),
      summary: row.summary || "",
      lines: (row.lines || []).length
        ? row.lines.map((l) => ({
            id: l.id,
            description: l.description || "",
            quantity: l.quantity != null ? l.quantity : "",
            defect_type: l.defect_type || "Damaged",
            note: l.note || "",
          }))
        : [emptyLine()],
    });
    setEvidence([]);
    setViewMode("form");
  };

  const goToList = () => {
    if (
      viewMode === "form" &&
      !editingId &&
      hasUnsavedContent &&
      !window.confirm(
        "Leave this report form? Your saved draft will remain available on this device."
      )
    ) {
      return;
    }
    setEditingId(null);
    setViewMode("list");
  };

  const addEvidence = (files) =>
    setEvidence((current) => {
      const next = [...current, ...Array.from(files || [])];
      return next.filter(
        (file, index) =>
          next.findIndex((c) => c.name === file.name && c.size === file.size) === index
      );
    });

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = async () => {
    const validLines = form.lines.filter((line) => line.description.trim());
    if (!form.company_id || validLines.length === 0) {
      toast.error("Choose a company and enter at least one affected item or observation.");
      return;
    }
    if (form.report_type === "receiving_defect" && !form.request_id) {
      toast.error("Choose the affected order request.");
      return;
    }
    if (form.report_type === "container_damage" && !form.container_id) {
      toast.error("Choose a container for this damage report.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        company_id: Number(form.company_id),
        request_id: form.request_id ? Number(form.request_id) : null,
        purchase_order_id: form.purchase_order_id ? Number(form.purchase_order_id) : null,
        packing_list_id: form.packing_list_id ? Number(form.packing_list_id) : null,
        container_id: form.container_id ? Number(form.container_id) : null,
        observed_at: form.observed_at || null,
        lines: validLines.map((line) => ({
          ...line,
          quantity: line.quantity === "" ? null : Number(line.quantity),
        })),
      };

      if (editingId) {
        const updated = await ordersApi.editIssue(editingId, payload);
        for (const file of evidence) {
          const upload = new FormData();
          upload.append("document_type", "defect_evidence");
          upload.append("defect_report_id", editingId);
          if (payload.request_id) upload.append("request_id", payload.request_id);
          if (payload.purchase_order_id)
            upload.append("purchase_order_id", payload.purchase_order_id);
          upload.append("file", file);
          await ordersApi.uploadDocument(upload);
        }
        toast.success(`Report ${selected?.reference || "DEF-" + editingId} updated.`);
        setEditingId(null);
        setSelected((prev) => ({ ...prev, ...updated, ...payload }));
      } else {
        const created = await ordersApi.createIssue(payload);
        for (const file of evidence) {
          const upload = new FormData();
          upload.append("document_type", "defect_evidence");
          upload.append("defect_report_id", created.id);
          if (created.request_id) upload.append("request_id", created.request_id);
          if (created.purchase_order_id)
            upload.append("purchase_order_id", created.purchase_order_id);
          upload.append("file", file);
          await ordersApi.uploadDocument(upload);
        }
        toast.success(`${created.reference} opened in the Damage & Defects register.`);
        setSelected(created);
        localStorage.removeItem(ISSUE_DRAFT_KEY);
      }
      setEvidence([]);
      setSearchParams({});
      setViewMode("detail");
      await load();
    } catch (error) {
      notifyOrderError(error);
    } finally {
      setBusy(false);
    }
  };

  // ── Resolve ───────────────────────────────────────────────────────────────
  const resolveIssue = async () => {
    if (!selected || selected.source === "legacy") return;
    try {
      const updated = await ordersApi.updateIssue(selected.id, resolution);
      setSelected(updated);
      toast.success(`${updated.reference} updated to ${updated.status}.`);
      await load();
    } catch (error) {
      notifyOrderError(error);
    }
  };

  // ── PDF download ──────────────────────────────────────────────────────────
  const downloadPdf = async (row) => {
    try {
      const blob =
        row.source === "legacy"
          ? await ordersApi.legacyDamagePdf(row.legacy_id)
          : await ordersApi.issuePdf(row.id);
      downloadBlob(blob, `${row.reference}.pdf`);
    } catch (error) {
      notifyOrderError(error);
    }
  };

  const selectIssue = (row) => {
    setSelected(row);
    setResolution({
      status: row.status === "Open" ? "Resolved" : row.status,
      resolution: row.resolution || "",
      resolution_note: row.resolution_note || "",
    });
    setViewMode("detail");
  };

  const issueTypes =
    form.report_type === "container_damage"
      ? [
          "Missing item",
          "Unloading damage",
          "Handling damage",
          "Concealed damage",
          "Wrong item",
          "Quality issue",
          "Other",
        ]
      : [
          "Shortage",
          "Excess",
          "Damaged",
          "Wrong item",
          "Specification mismatch",
          "Quality defect",
          "Handling damage",
          "Other",
        ];

  // ── Render Dedicated Form Screen (Create / Edit) ─────────────────────────
  if (viewMode === "form") {
    return (
      <div className="w-full min-h-full p-2 sm:p-4 pb-28 space-y-6">
        {/* Navigation & Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={goToList}
            >
              <ArrowLeft size={16} />
              Back to Register
            </button>
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {editingId ? "Edit Mode" : "New Report"}
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId
                  ? `Edit Report · ${selected?.reference || "DEF-" + editingId}`
                  : "New Damage & Defect Report"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={secondaryButtonClass} onClick={goToList}>
              Cancel
            </button>
            <button type="button" className={buttonClass} disabled={busy} onClick={submit}>
              {busy ? "Saving…" : editingId ? "Save Changes" : "Submit Report"}
            </button>
          </div>
        </div>

        {/* Section 1: Basic details */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-xs">
          <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-blue-500" />
            Basic Report Details
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Report type</span>
              <select
                className={fieldClass}
                value={form.report_type}
                onChange={(e) => setReportType(e.target.value)}
              >
                {canReceive && (
                  <option value="receiving_defect">Goods receipt issue</option>
                )}
                {canContainer && (
                  <option value="container_damage">Container / handling damage</option>
                )}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Company</span>
              <select
                className={fieldClass}
                value={form.company_id}
                onChange={(e) => setField("company_id", e.target.value)}
              >
                <option value="">Select company</option>
                {contexts.companies.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Issue discovered</span>
              <input
                className={fieldClass}
                type="datetime-local"
                value={form.observed_at}
                min={
                  form.report_type === "container_damage" &&
                  selectedContainer?.unloading_received_at
                    ? String(selectedContainer.unloading_received_at).slice(0, 16)
                    : undefined
                }
                onChange={(e) => setField("observed_at", e.target.value)}
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Summary (optional)</span>
              <input
                className={fieldClass}
                value={form.summary}
                onChange={(e) => setField("summary", e.target.value)}
                placeholder="Short description"
              />
            </label>
          </div>
        </section>

        {/* Section 2: Context / Container & Milestones */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-xs">
          <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Truck size={18} className="text-blue-500" />
            {form.report_type === "receiving_defect"
              ? "Associated Order & Packing List"
              : "Container Selection & Backtracking History"}
          </h2>

          {form.report_type === "receiving_defect" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SearchableSelect
                className="lg:col-span-2"
                label="Order request"
                value={form.request_id}
                onChange={chooseRequest}
                options={requestOptions}
                placeholder="Search request number or status"
                emptyText="No matching orders for this company"
              />
              <SearchableSelect
                label="Purchase order (optional)"
                value={form.purchase_order_id}
                onChange={(v) => setField("purchase_order_id", v)}
                options={orderOptions}
                placeholder="Search PO number"
                emptyText="No matching purchase orders"
              />
              <SearchableSelect
                label="Packing list (optional)"
                value={form.packing_list_id}
                onChange={(v) => setField("packing_list_id", v)}
                options={packingOptions}
                placeholder="Search packing list"
                emptyText="No matching packing lists"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <SearchableSelect
                label="Container for damage report"
                value={form.container_id}
                onChange={(v) => setField("container_id", v)}
                options={containerOptions}
                placeholder="Search container number, status or BL"
                emptyText="No matching containers"
              />

              {/* Backtracking & Lifecycle Milestones Audit Card */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 p-4 text-xs text-gray-700 dark:text-gray-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-semibold text-gray-900 dark:text-white">
                      Container Backtracking & Milestones
                    </strong>
                    {selectedContainer ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                        Status: {selectedContainer.status || "In Transit"}
                      </span>
                    ) : (
                      <span className="text-xs opacity-60">(Select a container to view milestone dates)</span>
                    )}
                  </div>
                  {selectedContainer?.bill_of_lading && (
                    <span className="text-xs font-mono font-medium text-gray-600 dark:text-gray-300">
                      BL: {selectedContainer.bill_of_lading}
                    </span>
                  )}
                </div>

                {selectedContainer ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
                    <div className="rounded-lg bg-white dark:bg-gray-900 p-2.5 border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        1. Port Unloading
                      </div>
                      <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(selectedContainer.unloaded_at_port)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white dark:bg-gray-900 p-2.5 border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        2. Gate In / Inbound
                      </div>
                      <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(selectedContainer.in_bound)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white dark:bg-gray-900 p-2.5 border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        3. Emptied / Stripped
                      </div>
                      <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(selectedContainer.empty_date)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white dark:bg-gray-900 p-2.5 border border-gray-200 dark:border-gray-700 shadow-2xs">
                      <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        4. Outbound / Returned
                      </div>
                      <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(selectedContainer.out_bound)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic py-1">
                    Select a container above to inspect its registered lifecycle dates (Port arrival, Inbound gate, Emptying, and Outbound return).
                  </p>
                )}

                <div className="mt-3 pt-2 border-t border-gray-200/70 dark:border-gray-700/70 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Damage may be discovered at port arrival, gate-in, during container destuffing/unloading, or any time afterwards during yard handling or warehouse audit.
                  </span>
                  {selectedContainer?.location && (
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Venue: {selectedContainer.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Affected Goods & Observations */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Box size={18} className="text-blue-500" />
              Affected Goods / Observations
            </h2>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() =>
                setForm((c) => ({ ...c, lines: [...c.lines, emptyLine()] }))
              }
            >
              <Plus size={15} />
              Add Line Item
            </button>
          </div>

          <div className="space-y-3">
            {form.lines.map((line, index) => (
              <div
                className="grid gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 md:grid-cols-[2fr_120px_180px_2fr_auto] bg-gray-50/50 dark:bg-gray-800/30"
                key={index}
              >
                <input
                  aria-label={`Item or observation ${index + 1}`}
                  className={fieldClass}
                  placeholder="Item or observation description"
                  value={line.description}
                  onChange={(e) => setLine(index, "description", e.target.value)}
                />
                <input
                  aria-label={`Quantity ${index + 1}`}
                  className={fieldClass}
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) => setLine(index, "quantity", e.target.value)}
                />
                <select
                  aria-label={`Issue type ${index + 1}`}
                  className={fieldClass}
                  value={line.defect_type}
                  onChange={(e) => setLine(index, "defect_type", e.target.value)}
                >
                  {issueTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <input
                  aria-label={`Notes ${index + 1}`}
                  className={fieldClass}
                  placeholder="Observation notes (optional)"
                  value={line.note}
                  onChange={(e) => setLine(index, "note", e.target.value)}
                />
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={form.lines.length === 1}
                  onClick={() =>
                    setForm((c) => ({
                      ...c,
                      lines: c.lines.filter((_, i) => i !== index),
                    }))
                  }
                  title="Remove this line"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Evidence & Photos */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-xs">
          <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <FileCheck size={18} className="text-blue-500" />
            Supporting Photos & Documents
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Take photos</span>
              <input
                className={fieldClass}
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={(e) => addEvidence(e.target.files)}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Upload supporting documents</span>
              <input
                className={fieldClass}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={(e) => addEvidence(e.target.files)}
              />
            </label>
            {evidence.length > 0 && (
              <div className="md:col-span-2">
                <p className="mb-2 text-xs font-semibold uppercase opacity-60">Ready to upload</p>
                <div className="flex flex-wrap gap-2">
                  {evidence.map((file, index) => (
                    <button
                      type="button"
                      className="min-h-[36px] rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      key={`${file.name}-${file.size}`}
                      onClick={() =>
                        setEvidence((c) => c.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove ${file.name}`}
                    >
                      {file.name} ×
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button type="button" className={secondaryButtonClass} onClick={goToList}>
            Cancel
          </button>
          <button type="button" className={buttonClass} disabled={busy} onClick={submit}>
            {busy ? "Saving…" : editingId ? "Save Changes" : "Submit Report"}
          </button>
        </div>
      </div>
    );
  }

  // ── Render Dedicated Detail Screen (Opened Report) ───────────────────────
  if (viewMode === "detail" && selected) {
    return (
      <div className="w-full min-h-full p-2 sm:p-4 pb-28 space-y-6">
        {/* Navigation & Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={goToList}
            >
              <ArrowLeft size={16} />
              Back to Register
            </button>
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {selected.report_type_label}
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-500" />
                {selected.reference}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selected.source !== "legacy" && selected.status !== "Resolved" && selected.status !== "Closed" && (
              <button
                type="button"
                className={buttonClass}
                onClick={() => openEdit(selected)}
                title="Edit this report"
              >
                <Edit3 size={15} />
                Edit Report
              </button>
            )}
            {selected.source !== "legacy" && (selected.status === "Resolved" || selected.status === "Closed") && (
              <span className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700">
                <Lock className="mr-1 inline" size={13} />
                Locked (Resolved)
              </span>
            )}
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => downloadPdf(selected)}
              title="Download formal PDF"
            >
              <Download size={15} />
              Download PDF
            </button>
          </div>
        </div>

        {/* Overview Header Card */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <div>
              <span className="text-xs uppercase opacity-50 tracking-wider font-semibold">Report Reference</span>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{selected.reference}</div>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs uppercase opacity-50 font-semibold tracking-wider">Report Type</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-white">{selected.report_type_label}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-50 font-semibold tracking-wider">Company</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-white">{selected.company_name || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-50 font-semibold tracking-wider">Order / Container</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-white">
                {selected.request_no || selected.po_number || selected.container_no || "—"}
              </div>
              {selected.bill_of_lading && (
                <div className="text-xs opacity-60 font-mono">BL: {selected.bill_of_lading}</div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase opacity-50 font-semibold tracking-wider">Discovered At</div>
              <div className="mt-1 font-medium text-gray-900 dark:text-white">{formatDate(selected.observed_at)}</div>
            </div>
          </div>

          {selected.summary && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs uppercase opacity-50 font-semibold tracking-wider">Summary / Notes</span>
              <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{selected.summary}</p>
            </div>
          )}
        </section>

        {/* Affected Goods / Observations */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
            <Box size={18} className="text-blue-500" />
            Affected Goods / Observations
          </h2>
          {selected.lines?.length ? (
            <div className="space-y-2">
              {selected.lines.map((line) => (
                <div
                  className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3.5 text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                  key={line.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-base">{line.description}</strong>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                      {line.defect_type}
                    </span>
                  </div>
                  {line.quantity != null && (
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">
                      Affected Quantity: {line.quantity}
                    </div>
                  )}
                  {line.note && <div className="text-xs opacity-70 mt-1">{line.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-60">Historical report details remain available in its PDF.</p>
          )}
        </section>

        {/* Evidence Documents */}
        {selected.source !== "legacy" && (
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-xs">
            <DocumentPanel
              defectReportId={selected.id}
              requestId={selected.request_id}
              purchaseOrderId={selected.purchase_order_id}
              title="Report Evidence & Resolution Documents"
              description="Photos, inspection records and resolution documents attached to this report."
              allowedTypes={["defect_evidence", "defect_resolution", "credit_note", "other"]}
            />
          </section>
        )}

        {/* Resolution Controls */}
        {canResolve && selected.source !== "legacy" && (
          <section className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-xs">
            <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              Resolution Management
            </h2>
            <div className="grid gap-3 md:grid-cols-[180px_1fr_2fr_auto] md:items-end">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Status</span>
                <select
                  className={fieldClass}
                  value={resolution.status}
                  onChange={(e) =>
                    setResolution((c) => ({ ...c, status: e.target.value }))
                  }
                >
                  <option>Open</option>
                  <option>Under Review</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Resolution Action</span>
                <input
                  className={fieldClass}
                  value={resolution.resolution}
                  onChange={(e) =>
                    setResolution((c) => ({ ...c, resolution: e.target.value }))
                  }
                  placeholder="Replacement, credit, accepted…"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Resolution Notes (optional)</span>
                <input
                  className={fieldClass}
                  value={resolution.resolution_note}
                  onChange={(e) =>
                    setResolution((c) => ({ ...c, resolution_note: e.target.value }))
                  }
                  placeholder="Additional notes"
                />
              </label>
              <button className={buttonClass} onClick={resolveIssue}>
                <CheckCircle2 className="mr-1 inline" size={15} />
                Update Status
              </button>
            </div>
          </section>
        )}

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <button type="button" className={secondaryButtonClass} onClick={goToList}>
            <ArrowLeft size={16} />
            Back to Register
          </button>
          <button className={buttonClass} onClick={() => downloadPdf(selected)}>
            <Download size={16} />
            Download Formal PDF
          </button>
        </div>
      </div>
    );
  }

  // ── Render Register List Screen (Default View) ───────────────────────────
  return (
    <div className="w-full min-h-full p-2 sm:p-4 pb-28 space-y-6">
      <PageHeader
        title="Damage & Defects"
        description="One register for receiving exceptions and container/handling damage, with evidence, resolution and formal reports."
        actions={
          (canReceive || canContainer) && (
            <button
              className={`${buttonClass} w-full sm:w-auto`}
              onClick={() => openNew(canReceive ? "receiving_defect" : "container_damage")}
            >
              <Plus size={16} />
              Report damage or issue
            </button>
          )
        }
      />

      {/* ── Filter bar + list ─────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="grid gap-3 border-b border-gray-200 dark:border-gray-700 p-4 md:grid-cols-[1fr_220px_180px_auto]">
          <input
            aria-label="Search damage and defect reports"
            className={fieldClass}
            placeholder="Search report, order, container or summary"
            value={filters.search}
            onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
          />
          <select
            aria-label="Report type"
            className={fieldClass}
            value={filters.report_type}
            onChange={(e) => setFilters((c) => ({ ...c, report_type: e.target.value }))}
          >
            <option value="">All report types</option>
            <option value="receiving_defect">Receiving / goods defects</option>
            <option value="container_damage">Container / shipping damage</option>
          </select>
          <select
            aria-label="Report status"
            className={fieldClass}
            value={filters.status}
            onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option>Open</option>
            <option>Under Review</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
          <button className={secondaryButtonClass} onClick={load}>
            <RefreshCw className="mr-1 inline" size={15} />
            Refresh
          </button>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 lg:hidden">
          {issues.map((row) => (
            <article
              className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              key={`${row.source || "report"}-${row.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="min-h-[44px] text-left font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={() => selectIssue(row)}
                >
                  {row.reference}
                </button>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-1 text-sm opacity-70">
                {row.summary || row.lines?.[0]?.description || "No summary"}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase opacity-50">Type</dt>
                  <dd className="mt-1">{row.report_type_label}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase opacity-50">Company</dt>
                  <dd className="mt-1">{row.company_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase opacity-50">Order / container</dt>
                  <dd className="mt-1">
                    {row.request_no || row.po_number || row.container_no || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase opacity-50">Discovered</dt>
                  <dd className="mt-1">{formatDate(row.observed_at)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={secondaryButtonClass} onClick={() => selectIssue(row)}>
                  Open report
                </button>
                {row.source !== "legacy" && row.status !== "Resolved" && row.status !== "Closed" && (
                  <button className={secondaryButtonClass} onClick={() => openEdit(row)}>
                    <Edit3 className="mr-1 inline" size={15} />
                    Edit
                  </button>
                )}
                {row.source !== "legacy" && (row.status === "Resolved" || row.status === "Closed") && (
                  <span className="inline-flex items-center text-xs text-gray-400 dark:text-gray-500 px-2 py-1">
                    <Lock className="mr-1 inline" size={13} />
                    Locked
                  </span>
                )}
                <button
                  aria-label={`Download ${row.reference} PDF`}
                  className={secondaryButtonClass}
                  onClick={() => downloadPdf(row)}
                >
                  <Download className="mr-1 inline" size={15} />
                  PDF
                </button>
              </div>
            </article>
          ))}
          {issues.length === 0 && (
            <p className="p-8 text-center text-sm opacity-60">No reports match these filters.</p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1050px] text-sm">
            <thead className={tableHeaderClass}>
              <tr>
                <th className="p-3">Report</th>
                <th className="p-3">Type</th>
                <th className="p-3">Company</th>
                <th className="p-3">Order / container</th>
                <th className="p-3">Discovered</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((row) => (
                <tr
                  className="border-t border-gray-200 dark:border-gray-700"
                  key={`${row.source || "report"}-${row.id}`}
                >
                  <td className="p-3">
                    <button
                      className="min-h-[44px] text-left font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={() => selectIssue(row)}
                    >
                      {row.reference}
                    </button>
                    <div className="max-w-[260px] truncate text-xs opacity-60">
                      {row.summary || row.lines?.[0]?.description || "No summary"}
                    </div>
                  </td>
                  <td className="p-3">{row.report_type_label}</td>
                  <td className="p-3">{row.company_name || "—"}</td>
                  <td className="p-3">
                    {row.request_no || row.po_number || row.container_no || "—"}
                    <div className="text-xs opacity-60">{row.bill_of_lading || ""}</div>
                  </td>
                  <td className="p-3">{formatDate(row.observed_at)}</td>
                  <td className="p-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {row.source !== "legacy" && row.status !== "Resolved" && row.status !== "Closed" && (
                        <button
                          aria-label={`Edit ${row.reference}`}
                          title="Edit report"
                          className={secondaryButtonClass}
                          onClick={() => openEdit(row)}
                        >
                          <Edit3 size={15} />
                        </button>
                      )}
                      {row.source !== "legacy" && (row.status === "Resolved" || row.status === "Closed") && (
                        <span title="Report is resolved and locked" className="p-1.5 text-gray-400 dark:text-gray-500">
                          <Lock size={15} />
                        </span>
                      )}
                      <button
                        aria-label={`Download ${row.reference} PDF`}
                        title="Download report PDF"
                        className={secondaryButtonClass}
                        onClick={() => downloadPdf(row)}
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {issues.length === 0 && (
            <p className="p-8 text-center text-sm opacity-60">No reports match these filters.</p>
          )}
        </div>
      </section>
    </div>
  );
}
