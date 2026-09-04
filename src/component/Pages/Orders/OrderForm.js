import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { X, Save, ShoppingBag, AlertTriangle, Lock, Building, Package, Boxes, Trash2, Sparkles } from "lucide-react";
import { STATUS_PIPELINE } from "./mockOrders";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import MaterialTagSelector from "../../UI/UXComponent/TagInput.js";
import GenericSelector from "../../UI/UXComponent/GenericSelector.js";
import { useOptions } from "../../../hooks/useOptions";

function getUserInfo() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const ALL_CONSIGNEES = [
  { key: "NOBLE", label: "NOBLECON ENTERPRISE" },
  { key: "SAHAJANAND", label: "SAHAJANAND" },
  { key: "SAHAJ", label: "SAHAJ CONSTRUCTION" },
];

export default function OrderForm({ editData, fromTemplate, orderStatuses = [], onClose, onSave }) {
  const { isDark } = useTheme();
  const { user, orgName, orgId, isRoot, hasModule } = useAuth();
  const { material: materialOptions = [], suppliers = [], consignees: optionsConsignees = [], orderStatuses: contextOrderStatuses = [], refresh } = useOptions();
  const userInfo = getUserInfo();
  const hasInventory = Boolean(hasModule?.("INVENTORY"));

  const [activeTemplate, setActiveTemplate] = useState(fromTemplate || null);
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [selectedProductCode, setSelectedProductCode] = useState("");

  useEffect(() => {
    if (hasInventory) {
      axios
        .get(`${process.env.REACT_APP_NETWORK}/inventory/lookup`, {
          headers: { skip_zrok_interstitial: "true" },
        })
        .then((res) => setInventoryProducts(res.data || []))
        .catch((err) => console.error("Could not load inventory lookup:", err));
    }
  }, [hasInventory]);

  const isAccountsOrAdmin =
    (isRoot || userInfo?.is_root) &&
    userInfo?.roles?.some((r) =>
      ["Administrator", "Admin", "Account", "Accounts", "Finance"].includes(r)
    );

  const activeStages = useMemo(() => {
    if (orderStatuses && orderStatuses.length > 0) return orderStatuses;
    if (contextOrderStatuses && contextOrderStatuses.length > 0) return contextOrderStatuses;
    return STATUS_PIPELINE;
  }, [orderStatuses, contextOrderStatuses]);

  // Determine accessible consignees dynamically based on user tenant access
  const accessibleConsignees = useMemo(() => {
    if (optionsConsignees && optionsConsignees.length > 0) {
      return optionsConsignees.map((c) => ({
        key: c.name.toUpperCase().includes("NOBLE")
          ? "NOBLE"
          : c.name.toUpperCase().includes("SAHAJANAND")
          ? "SAHAJANAND"
          : c.name.toUpperCase().includes("SAHAJ")
          ? "SAHAJ"
          : c.name,
        label: c.name,
      }));
    }

    if (orgName?.toLowerCase().includes("noble") || orgId === 2) {
      return [ALL_CONSIGNEES[0]];
    }
    if (orgName?.toLowerCase().includes("sahajanand") || orgId === 3) {
      return [ALL_CONSIGNEES[1]];
    }
    if (isRoot) {
      return ALL_CONSIGNEES;
    }
    return [ALL_CONSIGNEES[0]];
  }, [optionsConsignees, orgName, orgId, isRoot]);

  const defaultConsignee = accessibleConsignees[0] || ALL_CONSIGNEES[0];

  const [formData, setFormData] = useState({
    po_number: "",
    po_nce: "",
    supplier: null,
    company: "",
    goods_description: "",
    material_ids: [],
    items: [],
    status: "PENDING",
    sheet_type: null,
    consignee_id: null,
    consignee: "",
    year: new Date().getFullYear(),
    urgent_action: false,
    order_mail_date: "",
    quote_sent_date: "",
    quote_received_date: "",
    pi_confirmed_date: "",
    payment_date: "",
    balance_payment_date: "",
    freight_type: "Sea Freight",
    remark: "",
  });

  useEffect(() => {
    if (editData) {
      let prefilledMaterialIds = editData.material_ids || [];
      if (
        prefilledMaterialIds.length === 0 &&
        editData.goods_description &&
        materialOptions.length > 0
      ) {
        const descUpper = editData.goods_description.toUpperCase();
        prefilledMaterialIds = materialOptions
          .filter((m) => descUpper.includes(m.name?.toUpperCase()))
          .map((m) => m.id);
      }

      let matchedSupplierId = editData.supplier || null;
      if (!matchedSupplierId && editData.company && suppliers.length > 0) {
        const matched = suppliers.find(
          (s) => s.name?.toLowerCase() === editData.company?.toLowerCase()
        );
        if (matched) matchedSupplierId = matched.id;
      }

      let matchedConsigneeId = editData.consignee_id || null;
      if (!matchedConsigneeId && editData.consignee && optionsConsignees.length > 0) {
        const matchedC = optionsConsignees.find(
          (c) => c.name?.toLowerCase() === editData.consignee?.toLowerCase()
        );
        if (matchedC) matchedConsigneeId = matchedC.id;
      }

      setFormData({
        ...editData,
        supplier: matchedSupplierId,
        consignee_id: matchedConsigneeId,
        material_ids: prefilledMaterialIds,
      });
    } else if (fromTemplate) {
      let matchedSupplierId = fromTemplate.supplier_id || null;
      if (!matchedSupplierId && fromTemplate.company && suppliers.length > 0) {
        const matched = suppliers.find(
          (s) => s.name?.toLowerCase() === fromTemplate.company?.toLowerCase()
        );
        if (matched) matchedSupplierId = matched.id;
      }

      const templateItems = (fromTemplate.items || []).map((it) => ({
        product_id: it.product_id || null,
        item_code: it.item_code || "",
        description: it.description || "",
        quantity_ordered: it.default_quantity || 1,
        unit: it.unit || "PCS",
        unit_price: it.unit_price || "",
        notes: it.notes || "",
      }));

      const goodsDesc = (fromTemplate.items || [])
        .map((it) => it.description)
        .filter(Boolean)
        .join(", ");

      setFormData((prev) => ({
        ...prev,
        supplier: matchedSupplierId,
        company: fromTemplate.company || prev.company,
        freight_type: fromTemplate.freight_type || prev.freight_type,
        remark: fromTemplate.notes || prev.remark,
        items: templateItems,
        goods_description: goodsDesc || prev.goods_description,
      }));
    } else if (optionsConsignees && optionsConsignees.length === 1) {
      // Auto-select single organization only for single-tenant users
      const single = optionsConsignees[0];
      const key = single.name.toUpperCase().includes("NOBLE")
        ? "NOBLE"
        : single.name.toUpperCase().includes("SAHAJANAND")
        ? "SAHAJANAND"
        : single.name.toUpperCase().includes("SAHAJ")
        ? "SAHAJ"
        : single.name;

      setFormData((prev) => ({
        ...prev,
        sheet_type: key,
        consignee: single.name,
        consignee_id: single.id,
      }));
    }
  }, [editData, fromTemplate, materialOptions, suppliers, optionsConsignees]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (supplierId) => {
    const matched = suppliers.find((s) => s.id === supplierId);
    setFormData((prev) => ({
      ...prev,
      supplier: supplierId,
      company: matched ? matched.name : "",
    }));
  };

  const handleMaterialChange = (selectedIds) => {
    const selectedNames = materialOptions
      .filter((m) => selectedIds.includes(m.id))
      .map((m) => m.name)
      .join(", ");

    setFormData((prev) => ({
      ...prev,
      material_ids: selectedIds,
      goods_description: selectedNames,
    }));
  };

  const handleConsigneeChange = (consigneeId) => {
    const matched = optionsConsignees.find((c) => c.id === consigneeId || c.id === Number(consigneeId));
    if (matched) {
      const sheetKey = matched.name.toUpperCase().includes("NOBLE")
        ? "NOBLE"
        : matched.name.toUpperCase().includes("SAHAJANAND")
        ? "SAHAJANAND"
        : matched.name.toUpperCase().includes("SAHAJ")
        ? "SAHAJ"
        : matched.name;

      setFormData((prev) => ({
        ...prev,
        consignee_id: matched.id,
        consignee: matched.name,
        sheet_type: sheetKey,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        consignee_id: null,
        consignee: "",
        sheet_type: null,
      }));
    }
  };

  const selectedConsigneeId = useMemo(() => {
    if (formData.consignee_id) return formData.consignee_id;
    if (formData.consignee) {
      const match = optionsConsignees.find(
        (c) => c.name?.toLowerCase() === formData.consignee?.toLowerCase()
      );
      if (match) return match.id;
    }
    if (formData.sheet_type) {
      const match = optionsConsignees.find((c) =>
        c.name?.toUpperCase().includes(formData.sheet_type.toUpperCase())
      );
      if (match) return match.id;
    }
    return null;
  }, [optionsConsignees, formData.consignee, formData.sheet_type, formData.consignee_id]);

  const handleAddCatalogProduct = (prodId) => {
    if (!prodId) return;
    const prod = inventoryProducts.find((p) => String(p.id) === String(prodId));
    if (!prod) return;

    const existingIndex = (formData.items || []).findIndex(
      (it) => it.product_id === prod.id
    );
    if (existingIndex >= 0) {
      const updated = [...formData.items];
      updated[existingIndex].quantity_ordered =
        (parseFloat(updated[existingIndex].quantity_ordered) || 1) + 1;
      setFormData((prev) => ({ ...prev, items: updated }));
    } else {
      const newItem = {
        product_id: prod.id,
        item_code: prod.sku,
        description: prod.name,
        quantity_ordered: 1,
        unit: prod.unit || "PCS",
        unit_price: prod.unit_cost || "",
      };
      setFormData((prev) => ({
        ...prev,
        items: [...(prev.items || []), newItem],
        goods_description: prev.goods_description || prod.name,
        supplier: prev.supplier || prod.default_supplier_id || null,
      }));
    }
    setSelectedProductCode("");
  };

  const handleItemQtyChange = (index, val) => {
    const updated = [...(formData.items || [])];
    updated[index].quantity_ordered = val;
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index) => {
    const updated = (formData.items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.consignee && !formData.consignee_id && !formData.sheet_type) {
      alert("Please select a Consignee Organisation.");
      return;
    }
    if (
      !formData.goods_description &&
      (!formData.material_ids || formData.material_ids.length === 0) &&
      (!formData.items || formData.items.length === 0)
    ) {
      alert("Please select or type at least one material or catalog item for this purchase order.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-lg h-full flex flex-col border-l shadow-2xl animate-in slide-in-from-right duration-200 ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header (Static Top) */}
        <div
          className={`flex-none p-4 border-b flex items-center justify-between ${
            isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2
                className={`text-sm font-extrabold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {editData
                  ? `Edit Order (${editData.po_number})`
                  : "Create New Purchase Order"}
              </h2>
              <p
                className={`text-[11px] font-medium ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Shop order creation & material procurement
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark
                ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Notification Banner */}
        {activeTemplate && (
          <div className="flex-none px-4 py-2.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border-b border-blue-500/20 flex items-center justify-between gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-md bg-blue-500/20 text-blue-500 flex-none">
                <Sparkles size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-blue-500 flex items-center gap-1.5 truncate">
                  <span>Using Template:</span>
                  <span className="text-slate-900 dark:text-slate-100 underline decoration-blue-500/40 truncate">
                    {activeTemplate.name}
                  </span>
                </div>
                {Array.isArray(activeTemplate.tags) && activeTemplate.tags.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto no-scrollbar pt-0.5">
                    {activeTemplate.tags.map((tg, i) => (
                      <span key={i} className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                        #{tg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTemplate(null)}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition font-medium flex-none px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form Container with Sticky Static Bottom Buttons */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col min-h-0 overflow-hidden text-xs"
        >
          {/* Scrollable Fields Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
            {/* Consignee Organisation (Same GenericSelector input as Container & BL) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className={`block font-bold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Consignee Organisation *
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Search or select consignee
                </span>
              </div>

              <div>
                <GenericSelector
                  value={selectedConsigneeId}
                  onChange={handleConsigneeChange}
                  placeholder="Select Consignee..."
                  options={optionsConsignees}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh?.("consignees")}
                  addApi="setConsignee"
                />
              </div>
            </div>

            {/* PO Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className={`block font-bold mb-1.5 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  PO Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NCE-PO#26102"
                  value={formData.po_number}
                  onChange={(e) => handleChange("po_number", e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* PO Reference (Visible only to Accounts / Admin) */}
              {isAccountsOrAdmin && (
                <div>
                  <label
                    className={`flex items-center gap-1 font-bold mb-1.5 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <Lock size={12} className="text-amber-500" />
                    <span>PO Reference</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NPO#26-0594"
                    value={formData.po_nce}
                    onChange={(e) => handleChange("po_nce", e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              )}
            </div>

            {/* MATERIAL TAG SELECTOR */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className={`block font-bold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Material *
                </label>
                <span className="text-[10px] text-blue-500 font-bold">
                  Select or type new materials
                </span>
              </div>

              <div className="text-slate-900">
                <MaterialTagSelector
                  value={formData.material_ids || []}
                  onChange={handleMaterialChange}
                  options={materialOptions}
                  onNewMaterialCreated={() => refresh?.("material")}
                />
              </div>
            </div>

            {/* INVENTORY / PRODUCT MASTER CATALOG ITEM SELECTOR */}
            {hasInventory && (
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDark
                    ? "bg-indigo-950/20 border-indigo-900/50"
                    : "bg-indigo-50/40 border-indigo-200/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Boxes size={15} className="text-indigo-600 dark:text-indigo-400" />
                    <label
                      className={`text-xs font-bold ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
                      Product Master Catalog Items
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    Live Stock Tracking
                  </span>
                </div>

                <select
                  value={selectedProductCode}
                  onChange={(e) => handleAddCatalogProduct(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="">-- Add item from Product Master catalog --</option>
                  {inventoryProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} {p.brand ? `(${p.brand})` : ""} — Stock: {p.current_stock} {p.unit}
                    </option>
                  ))}
                </select>

                {/* Selected line items list */}
                {formData.items && formData.items.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {formData.items.map((it, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                          isDark
                            ? "bg-slate-800/80 border-slate-700"
                            : "bg-white border-slate-200 shadow-xs"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate text-slate-900 dark:text-white">
                            {it.description}
                          </div>
                          {it.item_code && (
                            <span className="text-[10px] font-mono text-indigo-500 font-bold">
                              SKU: {it.item_code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.quantity_ordered}
                            onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                            className={`w-16 px-2 py-1 border rounded text-xs font-mono font-bold text-right ${
                              isDark
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          />
                          <span className="text-[11px] font-mono text-slate-500 font-bold min-w-[28px]">
                            {it.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUPPLIER */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className={`block font-bold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Supplier (Optional)
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Search or add new supplier
                </span>
              </div>

              <div>
                <GenericSelector
                  value={formData.supplier || null}
                  onChange={handleSupplierChange}
                  placeholder="Select or add Supplier"
                  options={suppliers}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh?.("suppliers")}
                  addApi="setSupplier"
                />
              </div>
            </div>

            {/* Workflow Stage (8 Exact Stages - No Percentage in Display) */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label
                  className={`block font-bold mb-1.5 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Workflow Stage *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                >
                  {activeStages.map((st) => (
                    <option key={st.id || st.key || st.code} value={st.key || st.code || st.name}>
                      {st.label || st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-5">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                    formData.urgent_action
                      ? "bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700"
                      : isDark
                      ? "bg-slate-800/60 border-slate-700"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.urgent_action}
                    onChange={(e) =>
                      handleChange("urgent_action", e.target.checked)
                    }
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={13} />
                    Urgent Action
                  </span>
                </label>
              </div>
            </div>

            {/* Purchasing Milestone Dates Section */}
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                isDark
                  ? "bg-slate-800/50 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Purchasing Milestone Dates
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Request Date */}
                <div>
                  <label
                    className={`block text-[11px] font-bold mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Request Date
                  </label>
                  <input
                    type="date"
                    value={formData.order_mail_date || ""}
                    onChange={(e) =>
                      handleChange("order_mail_date", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-medium focus:outline-none ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                {/* 2. Asked for Quote */}
                <div>
                  <label
                    className={`block text-[11px] font-bold mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Asked for Quote
                  </label>
                  <input
                    type="date"
                    value={formData.quote_sent_date || ""}
                    onChange={(e) =>
                      handleChange("quote_sent_date", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-medium focus:outline-none ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                {/* 3. Received Quote */}
                <div>
                  <label
                    className={`block text-[11px] font-bold mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Received Quote
                  </label>
                  <input
                    type="date"
                    value={formData.quote_received_date || ""}
                    onChange={(e) =>
                      handleChange("quote_received_date", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-medium focus:outline-none ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                {/* 4. Confirm-Quote / PI */}
                <div>
                  <label
                    className={`block text-[11px] font-bold mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Confirm-Quote / PI
                  </label>
                  <input
                    type="date"
                    value={formData.pi_confirmed_date || ""}
                    onChange={(e) =>
                      handleChange("pi_confirmed_date", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-medium focus:outline-none ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                {/* 5. Payment (Advance) - Accounts / Admin Only */}
                {isAccountsOrAdmin && (
                  <div>
                    <label
                      className={`flex items-center gap-1 text-[11px] font-bold mb-1 ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      <Lock size={10} className="text-amber-500" />
                      <span>Payment</span>
                    </label>
                    <input
                      type="date"
                      value={formData.payment_date || ""}
                      onChange={(e) =>
                        handleChange("payment_date", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg font-medium focus:outline-none ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                )}

                {/* 6. Balance Payment - Accounts / Admin Only */}
                {isAccountsOrAdmin && (
                  <div>
                    <label
                      className={`flex items-center gap-1 text-[11px] font-bold mb-1 ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      <Lock size={10} className="text-amber-500" />
                      <span>Balance Payment</span>
                    </label>
                    <input
                      type="date"
                      value={formData.balance_payment_date || ""}
                      onChange={(e) =>
                        handleChange("balance_payment_date", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg font-medium focus:outline-none ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                )}

                {/* Freight Mode */}
                <div className={isAccountsOrAdmin ? "sm:col-span-2" : ""}>
                  <label
                    className={`block text-[11px] font-bold mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Freight Mode
                  </label>
                  <select
                    value={formData.freight_type}
                    onChange={(e) =>
                      handleChange("freight_type", e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-lg font-medium focus:outline-none ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="Sea Freight">Sea Freight</option>
                    <option value="Sea Way">Sea Way</option>
                    <option value="Air Freight">Air Freight</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Remark */}
            <div>
              <label
                className={`block font-bold mb-1.5 ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Notes / Remarks
              </label>
              <input
                type="text"
                placeholder="e.g. Urgent shipment required for Perseverance site"
                value={formData.remark || ""}
                onChange={(e) => handleChange("remark", e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Linked Logistics Containers (when present) */}
            {editData?.shipments?.length > 0 && (
              <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-blue-50/40 border-blue-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={15} className="text-blue-500" />
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                    Linked Logistics Containers ({editData.shipments.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {editData.shipments.map((sh) => (
                    <div
                      key={sh.id}
                      className={`p-2.5 rounded-lg border ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-blue-200"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                          {sh.container_no || "Container"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                          {sh.shipment_status || "IN_TRANSIT"}
                        </span>
                      </div>
                      {sh.bill_of_lading_no && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          BoL: {sh.bill_of_lading_no}
                        </div>
                      )}
                      {sh.arrival_date && (
                        <div className="text-[11px] text-slate-500">
                          Arrival: {sh.arrival_date}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Static Sticky Bottom Footer */}
          <div
            className={`flex-none p-4 border-t flex items-center justify-end gap-2.5 shadow-sm ${
              isDark
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl border font-bold text-xs transition ${
                isDark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-2 shadow-xs"
            >
              <Save size={15} />
              <span>Save Purchase Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
