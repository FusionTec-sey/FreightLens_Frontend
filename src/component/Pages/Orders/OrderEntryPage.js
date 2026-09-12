import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Save,
  ShoppingBag,
  AlertTriangle,
  Lock,
  Building2,
  Package,
  Boxes,
  Trash2,
  Sparkles,
  Plus,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle2,
  Layers,
  HelpCircle,
  FileText,
  Clock,
  X,
  Loader2
} from "lucide-react";
import { STATUS_PIPELINE } from "./mockOrders";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useOptions } from "../../../hooks/useOptions";
import MaterialTagSelector from "../../UI/UXComponent/TagInput";
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import ProductCatalogSelector from "../../UI/UXComponent/ProductCatalogSelector";
import TemplatePickerModal from "./TemplatePickerModal";

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

export default function OrderEntryPage({
  orderIdProp,
  initialData,
  fromTemplateProp,
  onBack,
  onSaved
}) {
  const navigate = useNavigate();
  const { id: paramOrderId } = useParams();
  const location = useLocation();
  const orderId = orderIdProp || paramOrderId;

  const { isDark } = useTheme();
  const { user, orgName, orgId, isRoot, hasModule } = useAuth();
  const {
    material: materialOptions = [],
    suppliers = [],
    consignees: optionsConsignees = [],
    orderStatuses: contextOrderStatuses = [],
    refresh
  } = useOptions();

  const userInfo = getUserInfo();
  const hasInventory = Boolean(hasModule?.("INVENTORY"));

  const isAccountsOrAdmin =
    (isRoot || userInfo?.is_root) &&
    userInfo?.roles?.some((r) =>
      ["Administrator", "Admin", "Account", "Accounts", "Finance"].includes(r)
    );

  const activeStages = useMemo(() => {
    if (contextOrderStatuses && contextOrderStatuses.length > 0) {
      return contextOrderStatuses;
    }
    return STATUS_PIPELINE;
  }, [contextOrderStatuses]);

  // Accessible consignees based on tenant
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
        id: c.id
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

  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [selectedProductCode, setSelectedProductCode] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(
    fromTemplateProp || location.state?.fromTemplate || null
  );

  const [loadingOrder, setLoadingOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    po_number: "",
    po_nce: "",
    supplier: null,
    company: "",
    goods_description: "",
    material_ids: [],
    items: [],
    status: "DRAFT",
    status_label: "Draft",
    status_id: null,
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
    eta_date: "",
    freight_type: "Sea Freight",
    remark: "",
    total_amount: "",
    advance_amount: "",
    balance_amount: "",
    currency: "USD"
  });

  // Load Inventory lookup products for catalog selector
  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_NETWORK}/inventory/lookup`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true"
        },
      })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setInventoryProducts(data);
      })
      .catch((err) => console.error("Could not load inventory lookup:", err));
  }, []);

  // Load existing order if editing
  useEffect(() => {
    const orderToLoad = initialData || location.state?.order;
    if (orderToLoad) {
      populateFormData(orderToLoad);
    } else if (orderId) {
      fetchOrderDetails(orderId);
    } else if (activeTemplate) {
      applyTemplateData(activeTemplate);
    } else if (optionsConsignees && optionsConsignees.length === 1) {
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
  }, [orderId, initialData, location.state, activeTemplate, optionsConsignees]);

  const fetchOrderDetails = async (id) => {
    setLoadingOrder(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true",
        },
      });
      if (res.data) {
        populateFormData(res.data);
      }
    } catch (err) {
      console.error("Failed to load order details:", err);
      setErrorMsg("Failed to load order data from server.");
    } finally {
      setLoadingOrder(false);
    }
  };

  const populateFormData = (order) => {
    let prefilledMaterialIds = order.material_ids || [];
    if (
      prefilledMaterialIds.length === 0 &&
      order.goods_description &&
      materialOptions.length > 0
    ) {
      const descUpper = order.goods_description.toUpperCase();
      prefilledMaterialIds = materialOptions
        .filter((m) => descUpper.includes(m.name?.toUpperCase()))
        .map((m) => m.id);
    }

    let matchedSupplierId = order.supplier || null;
    if (!matchedSupplierId && order.company && suppliers.length > 0) {
      const matched = suppliers.find(
        (s) => s.name?.toLowerCase() === order.company?.toLowerCase()
      );
      if (matched) matchedSupplierId = matched.id;
    }

    let matchedConsigneeId = order.consignee_id || null;
    if (!matchedConsigneeId && order.consignee && optionsConsignees.length > 0) {
      const matchedC = optionsConsignees.find(
        (c) => c.name?.toLowerCase() === order.consignee?.toLowerCase()
      );
      if (matchedC) matchedConsigneeId = matchedC.id;
    }

    setFormData({
      ...order,
      supplier: matchedSupplierId,
      consignee_id: matchedConsigneeId,
      material_ids: prefilledMaterialIds,
      items: (order.items || []).map((it) => ({
        id: it.id,
        product_id: it.product_id || null,
        item_code: it.item_code || "",
        description: it.description || "",
        quantity_ordered: it.quantity_ordered || 1,
        unit: it.unit || "PCS",
        unit_price: it.unit_price || "",
        total_price: it.total_price || "",
        notes: it.notes || "",
      })),
      total_amount: order.total_amount || "",
      advance_amount: order.advance_amount || "",
      balance_amount: order.balance_amount || "",
      currency: order.currency || "USD",
    });
  };

  const applyTemplateData = (template) => {
    let matchedSupplierId = template.supplier_id || null;
    if (!matchedSupplierId && template.company && suppliers.length > 0) {
      const matched = suppliers.find(
        (s) => s.name?.toLowerCase() === template.company?.toLowerCase()
      );
      if (matched) matchedSupplierId = matched.id;
    }

    const templateItems = (template.items || []).map((it) => {
      const qty = parseFloat(it.default_quantity) || 1;
      const price = parseFloat(it.unit_price) || 0;
      return {
        product_id: it.product_id || null,
        item_code: it.item_code || "",
        description: it.description || "",
        quantity_ordered: qty,
        unit: it.unit || "PCS",
        unit_price: it.unit_price || "",
        total_price: price > 0 ? (qty * price).toFixed(2) : "",
        notes: it.notes || "",
      };
    });

    const goodsDesc = (template.items || [])
      .map((it) => it.description)
      .filter(Boolean)
      .join(", ");

    setFormData((prev) => ({
      ...prev,
      supplier: matchedSupplierId,
      company: template.company || prev.company,
      freight_type: template.freight_type || prev.freight_type,
      remark: template.notes || prev.remark,
      items: templateItems,
      goods_description: goodsDesc || prev.goods_description,
    }));
  };

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
    const matched = optionsConsignees.find(
      (c) => c.id === consigneeId || c.id === Number(consigneeId)
    );
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

  const handleAddCatalogProduct = (prodOrId) => {
    if (!prodOrId) return;
    const prod =
      typeof prodOrId === "object"
        ? prodOrId
        : inventoryProducts.find((p) => String(p.id) === String(prodOrId));
    if (!prod) return;

    const existingIndex = (formData.items || []).findIndex(
      (it) => it.product_id === prod.id
    );

    if (existingIndex >= 0) {
      const updated = [...formData.items];
      const newQty = (parseFloat(updated[existingIndex].quantity_ordered) || 1) + 1;
      const unitPrice = parseFloat(updated[existingIndex].unit_price) || 0;
      updated[existingIndex].quantity_ordered = newQty;
      updated[existingIndex].total_price =
        unitPrice > 0 ? (newQty * unitPrice).toFixed(2) : "";
      setFormData((prev) => ({ ...prev, items: updated }));
    } else {
      const unitPrice = prod.unit_cost || "";
      const newItem = {
        product_id: prod.id,
        item_code: prod.sku || prod.code || "",
        description: prod.name,
        quantity_ordered: 1,
        unit: prod.unit || "PCS",
        unit_price: unitPrice,
        total_price: unitPrice ? parseFloat(unitPrice).toFixed(2) : "",
        notes: "",
      };
      setFormData((prev) => ({
        ...prev,
        items: [...(prev.items || []), newItem],
        goods_description: prev.goods_description || prod.name,
        supplier: prev.supplier || prod.default_supplier_id || null,
        company: prev.company || prod.supplier_name || prev.company,
      }));
    }
    setSelectedProductCode("");
  };

  const handleAddCustomItem = () => {
    const newItem = {
      product_id: null,
      item_code: "",
      description: "",
      quantity_ordered: 1,
      unit: "PCS",
      unit_price: "",
      total_price: "",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem],
    }));
  };

  const handleItemFieldChange = (index, field, val) => {
    const updated = [...(formData.items || [])];
    updated[index] = { ...updated[index], [field]: val };

    // Auto-calculate line total
    if (field === "quantity_ordered" || field === "unit_price") {
      const q = parseFloat(field === "quantity_ordered" ? val : updated[index].quantity_ordered) || 0;
      const p = parseFloat(field === "unit_price" ? val : updated[index].unit_price) || 0;
      updated[index].total_price = q > 0 && p > 0 ? (q * p).toFixed(2) : "";
    }

    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index) => {
    const updated = (formData.items || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  // Auto-calculated total from items
  const itemsSubtotal = useMemo(() => {
    return (formData.items || []).reduce((acc, it) => {
      const lineTotal = parseFloat(it.total_price);
      if (!isNaN(lineTotal) && lineTotal > 0) return acc + lineTotal;
      const q = parseFloat(it.quantity_ordered) || 0;
      const p = parseFloat(it.unit_price) || 0;
      return acc + (q * p);
    }, 0);
  }, [formData.items]);

  const handleAutoFillTotal = () => {
    if (itemsSubtotal > 0) {
      setFormData((prev) => ({
        ...prev,
        total_amount: itemsSubtotal.toFixed(2),
      }));
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/orders");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consignee && !formData.consignee_id && !formData.sheet_type) {
      setErrorMsg("Please select a Consignee Organisation.");
      return;
    }
    if (
      !formData.goods_description &&
      (!formData.material_ids || formData.material_ids.length === 0) &&
      (!formData.items || formData.items.length === 0)
    ) {
      setErrorMsg("Please add at least one material or product line item for this order.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      let savedResult;
      if (formData.id || orderId) {
        const targetId = formData.id || orderId;
        const res = await axios.put(
          `${process.env.REACT_APP_NETWORK}/orders/${targetId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
        savedResult = res.data;
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/orders`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
        savedResult = res.data;
      }

      if (onSaved) {
        onSaved(savedResult);
      } else {
        navigate("/orders");
      }
    } catch (err) {
      console.error("Failed to save order:", err);
      setErrorMsg(
        err.response?.data?.detail || "Failed to save purchase order. Please check required fields."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Loading purchase order details...
        </p>
      </div>
    );
  }

  const isEdit = Boolean(formData.id || orderId);

  return (
    <div
      className={`w-full min-h-full flex flex-col flex-1 ${
        isDark ? "text-slate-100" : "text-slate-900"
      }`}
    >
      {/* ── TOP STICKY COMMAND BAR ─────────────────────────────────────── */}
      <div
        className={`sticky top-0 z-20 w-full px-4 sm:px-6 py-3.5 border-b backdrop-blur-md transition-colors ${
          isDark
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white/90 border-slate-200 shadow-xs"
        }`}
      >
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Breadcrumbs & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
              title="Return to orders list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Orders / {isEdit ? "Edit Order" : "New Order"}
                </span>
                {formData.urgent_action && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> URGENT
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                {isEdit ? `Edit Order (${formData.po_number || "Draft"})` : "Create Purchase Order"}
              </h1>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isEdit && (
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  isDark
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                    : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Apply Template</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleBack}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition ${
                isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEdit ? "Update Order" : "Place Order"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── APPLIED TEMPLATE NOTIFICATION BANNER ────────────────────── */}
      {activeTemplate && (
        <div className="w-full px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border-b border-blue-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white flex-none shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                <span className="text-blue-500">Active Template:</span>
                <span className="font-extrabold underline decoration-blue-400 truncate">
                  {activeTemplate.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono">
                  {(activeTemplate.items || []).length} items
                </span>
              </div>
              {Array.isArray(activeTemplate.tags) && activeTemplate.tags.length > 0 && (
                <div className="flex gap-1 overflow-x-auto no-scrollbar pt-0.5">
                  {activeTemplate.tags.map((tg, i) => (
                    <span key={i} className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      #{tg}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-none">
            <button
              type="button"
              onClick={() => setShowTemplatePicker(true)}
              className="text-[11px] font-bold text-blue-600 hover:underline px-2 py-1"
            >
              Switch Template
            </button>
            <button
              type="button"
              onClick={() => setActiveTemplate(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition"
              title="Dismiss template indicator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── ERROR ALERT ────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-none" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MAIN FLUID WORKSPACE FORM ──────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="w-full flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* ════════════════════════════════════════════════════════════
            LEFT COLUMN (PRIMARY WORKSPACE - 8 COLS / 66%)
        ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-8 space-y-5 w-full min-w-0">
          {/* CARD 1: ORDER IDENTIFICATION, CONSIGNEE & SUPPLIER / VENDOR */}
          <div
            className={`w-full p-4 sm:p-5 rounded-2xl border transition-all ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-200/50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs sm:text-sm font-bold tracking-tight">Order Identification, Consignee & Supplier</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Header & Procurement Parties</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-3.5">
              {/* Consignee Organisation (6 cols) */}
              <div className="md:col-span-6 space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Consignee Organisation <span className="text-red-500">*</span>
                </label>
                <GenericSelector
                  value={formData.consignee_id || null}
                  onChange={handleConsigneeChange}
                  placeholder="Select Consignee Organisation..."
                  options={accessibleConsignees.map((c) => ({
                    id: c.id,
                    name: c.label,
                  }))}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh?.("consignees")}
                  addApi="setConsignee"
                />
              </div>

              {/* Supplier / Vendor (6 cols) */}
              <div className="md:col-span-6 space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Supplier / Vendor
                </label>
                <GenericSelector
                  value={formData.supplier || null}
                  onChange={handleSupplierChange}
                  placeholder="Select or Add Supplier..."
                  options={suppliers}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh?.("suppliers")}
                  addApi="setSupplier"
                />
              </div>

              {/* PO Number (4 cols) */}
              <div className="sm:col-span-1 md:col-span-4 space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  PO Number
                </label>
                <input
                  type="text"
                  placeholder="Auto (e.g. PO#26001)"
                  value={formData.po_number}
                  onChange={(e) => handleChange("po_number", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Order Year (3 cols) */}
              <div className="sm:col-span-1 md:col-span-3 space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Order Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleChange("year", parseInt(e.target.value) || new Date().getFullYear())}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* Accounts PO Reference (5 cols) */}
              {isAccountsOrAdmin && (
                <div className="sm:col-span-2 md:col-span-5 space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-500" />
                    Accounts PO Ref (PO NCE / SPO#)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NPO#26-0594 or SPO#26-0112"
                    value={formData.po_nce}
                    onChange={(e) => handleChange("po_nce", e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: PRODUCTS & LINE ITEMS MASTER TABLE */}
          <div
            className={`w-full p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200/50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs sm:text-sm font-bold tracking-tight">
                  Products & Line Items
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  {formData.items.length} {formData.items.length === 1 ? "Item" : "Items"}
                </span>
              </div>
            </div>

            {/* Customized Product Catalog Selector with Code, Description, Category & Stock Info */}
            <div
              className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${
                isDark ? "bg-indigo-950/20 border-indigo-900/40" : "bg-indigo-50/50 border-indigo-100"
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex-none">
                <Boxes className="w-3.5 h-3.5" />
                <span>Product Catalog:</span>
              </div>
              <div className="flex-1 min-w-0">
                <ProductCatalogSelector
                  products={inventoryProducts}
                  onSelectProduct={handleAddCatalogProduct}
                  onNewProductCreated={(p) => setInventoryProducts((prev) => [p, ...prev])}
                  suppliers={suppliers}
                  placeholder="Quick-search catalog by Code, Description, Category or Brand to add..."
                  isAccountsOrAdmin={isAccountsOrAdmin}
                />
              </div>
            </div>

            {/* Fluid Table of Line Items */}
            {formData.items.length === 0 ? (
              <div
                className={`py-8 px-4 rounded-xl border border-dashed text-center flex flex-col items-center justify-center ${
                  isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                }`}
              >
                <Package className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-[11px] font-bold mb-1">No products added to this order</p>
                <p className="text-[10px] text-slate-400 max-w-sm">
                  Search catalog above or click "+ Add New Item" to create standardized products
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 scrollbar-thin">
                <table className="w-full text-left text-[11px] border-collapse min-w-[620px]">
                  <thead>
                    <tr
                      className={`border-b text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? "bg-slate-950/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <th className="py-2 px-2.5 w-9 text-center">#</th>
                      <th className="py-2 px-2.5 w-28">SKU / Code</th>
                      <th className="py-2 px-2.5">Product Description *</th>
                      <th className="py-2 px-2.5 w-20 text-right">Qty</th>
                      <th className="py-2 px-2.5 w-16">Unit</th>
                      {isAccountsOrAdmin && (
                        <>
                          <th className="py-2 px-2.5 w-24 text-right">Unit Price</th>
                          <th className="py-2 px-2.5 w-24 text-right">Line Total</th>
                        </>
                      )}
                      <th className="py-2 px-2 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800">
                    {formData.items.map((it, idx) => (
                      <tr
                        key={idx}
                        className={`group transition-colors ${
                          isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2 px-2.5 text-center text-slate-400 font-mono font-bold text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            placeholder="SKU-001"
                            value={it.item_code}
                            onChange={(e) => handleItemFieldChange(idx, "item_code", e.target.value)}
                            className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono transition ${
                              isDark
                                ? "bg-slate-900 border-slate-700 text-slate-100"
                                : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            required
                            placeholder="Item name / specification *"
                            value={it.description}
                            onChange={(e) => handleItemFieldChange(idx, "description", e.target.value)}
                            className={`w-full px-2 py-1 border rounded-lg text-[11px] font-semibold transition ${
                              isDark
                                ? "bg-slate-900 border-slate-700 text-slate-100"
                                : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.quantity_ordered}
                            onChange={(e) => handleItemFieldChange(idx, "quantity_ordered", e.target.value)}
                            className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono font-bold text-right transition ${
                              isDark
                                ? "bg-slate-900 border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <input
                            type="text"
                            placeholder="PCS"
                            value={it.unit}
                            onChange={(e) => handleItemFieldChange(idx, "unit", e.target.value)}
                            className={`w-full px-2 py-1 border rounded-lg text-[11px] font-bold transition uppercase ${
                              isDark
                                ? "bg-slate-900 border-slate-700 text-slate-100"
                                : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />
                        </td>
                        {isAccountsOrAdmin && (
                          <>
                            <td className="py-2 px-2.5">
                              <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={it.unit_price}
                                onChange={(e) => handleItemFieldChange(idx, "unit_price", e.target.value)}
                                className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono font-bold text-right transition ${
                                  isDark
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-200 text-slate-900"
                                }`}
                              />
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-blue-500 text-[11px]">
                              {it.total_price ? `$${it.total_price}` : "-"}
                            </td>
                          </>
                        )}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded-md transition"
                            title="Remove line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {isAccountsOrAdmin && itemsSubtotal > 0 && (
                    <tfoot>
                      <tr
                        className={`border-t font-bold ${
                          isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <td colSpan={5} className="py-2 px-3 text-right text-slate-400 text-[11px]">
                          Items Calculated Subtotal:
                        </td>
                        <td colSpan={2} className="py-2 px-3 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                          ${itemsSubtotal.toFixed(2)} {formData.currency}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* Material Tag Selector & Summary */}
            <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Material Categories / Tags
                </label>
                <MaterialTagSelector
                  value={formData.material_ids || []}
                  onChange={handleMaterialChange}
                  options={materialOptions}
                  onNewMaterialCreated={() => refresh?.("material")}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  General Goods Summary
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tiles, Sanitaryware, Cement, Steel..."
                  value={formData.goods_description}
                  onChange={(e) => handleChange("goods_description", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* CARD 3: PURCHASING TIMELINE & MILESTONE DATES */}
          <div
            className={`w-full p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/50 dark:border-slate-800">
              <Calendar className="w-4 h-4 text-purple-500" />
              <h2 className="text-xs sm:text-sm font-bold tracking-tight">
                Purchasing Timeline & Milestones
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Order Request Date */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Request / Mail Date
                </label>
                <input
                  type="date"
                  value={formData.order_mail_date || ""}
                  onChange={(e) => handleChange("order_mail_date", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* Quote Sent Date */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Quote Sent Date
                </label>
                <input
                  type="date"
                  value={formData.quote_sent_date || ""}
                  onChange={(e) => handleChange("quote_sent_date", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* Quote Received Date */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Quote Received Date
                </label>
                <input
                  type="date"
                  value={formData.quote_received_date || ""}
                  onChange={(e) => handleChange("quote_received_date", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* PI Confirmed Date */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  PI Confirmed Date
                </label>
                <input
                  type="date"
                  value={formData.pi_confirmed_date || ""}
                  onChange={(e) => handleChange("pi_confirmed_date", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* Estimated Arrival (ETA) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Estimated Arrival (ETA)
                </label>
                <input
                  type="date"
                  value={formData.eta_date || ""}
                  onChange={(e) => handleChange("eta_date", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              {/* Freight Type */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Freight Method
                </label>
                <select
                  value={formData.freight_type}
                  onChange={(e) => handleChange("freight_type", e.target.value)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-bold transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="Sea Freight">Sea Freight (FCL / LCL)</option>
                  <option value="Air Freight">Air Freight</option>
                  <option value="Land Transport">Land Transport</option>
                  <option value="Courier / Express">Courier / Express</option>
                </select>
              </div>
            </div>

            {/* Remarks / Handling Instructions */}
            <div className="space-y-1 pt-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Logistics & Special Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Add internal procurement notes, shipping instructions, or carrier details..."
                value={formData.remark}
                onChange={(e) => handleChange("remark", e.target.value)}
                className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT COLUMN (FINANCIALS & LIFECYCLE - 4 COLS / 34%)
        ════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-4 space-y-5 w-full min-w-0">
          {/* CARD 4: FINANCIAL SUMMARY & PAYMENT TERMS (ACCOUNTS GATED) */}
          {isAccountsOrAdmin && (
            <div
              className={`w-full p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Financials & Payments
                  </h3>
                </div>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Confidential
                </span>
              </div>

              <div className="space-y-3">
                {/* Currency & Total Amount */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      className={`w-full px-2 py-1.5 border rounded-lg text-[11px] font-mono font-bold transition ${
                        isDark
                          ? "bg-slate-800 border-slate-700 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="SCR">SCR (SR)</option>
                      <option value="AED">AED</option>
                      <option value="INR">INR (₹)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Order Amount
                      </label>
                      {itemsSubtotal > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoFillTotal}
                          className="text-[10px] font-bold text-blue-500 hover:underline"
                        >
                          Sync Subtotal
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={formData.total_amount}
                      onChange={(e) => handleChange("total_amount", e.target.value)}
                      className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-black text-right transition ${
                        isDark
                          ? "bg-slate-800 border-slate-700 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* Advance Payment */}
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Advance Payment</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400">Amount</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={formData.advance_amount}
                        onChange={(e) => handleChange("advance_amount", e.target.value)}
                        className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono font-bold text-right ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Paid Date</label>
                      <input
                        type="date"
                        value={formData.payment_date || ""}
                        onChange={(e) => handleChange("payment_date", e.target.value)}
                        className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Balance Payment */}
                <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Balance Payment</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400">Amount</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={formData.balance_amount}
                        onChange={(e) => handleChange("balance_amount", e.target.value)}
                        className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono font-bold text-right ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">Paid Date</label>
                      <input
                        type="date"
                        value={formData.balance_payment_date || ""}
                        onChange={(e) => handleChange("balance_payment_date", e.target.value)}
                        className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono ${
                          isDark
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARD 5: WORKFLOW STAGE & PRIORITY */}
          <div
            className={`w-full p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
              isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/50 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Lifecycle Status & Priority
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Workflow Stage
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => {
                    const matchedStage = activeStages.find(
                      (s) => s.key === e.target.value || s.code === e.target.value
                    );
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value,
                      status_label: matchedStage ? matchedStage.label || matchedStage.name : e.target.value,
                      status_id: matchedStage ? matchedStage.id : null,
                    }));
                  }}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-bold transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                >
                  {activeStages.map((st) => (
                    <option key={st.id || st.key || st.code} value={st.key || st.code}>
                      {st.label || st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Urgent Priority Toggle */}
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                  formData.urgent_action
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                    : isDark
                    ? "bg-slate-950/60 border-slate-800 text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
                onClick={() => handleChange("urgent_action", !formData.urgent_action)}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <div>
                    <div className="text-[11px] font-bold">Urgent Action Required</div>
                    <div className="text-[10px] opacity-75">Flag this order for expedited handling</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.urgent_action}
                  onChange={(e) => handleChange("urgent_action", e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ── TEMPLATE PICKER MODAL ──────────────────────────────────── */}
      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelectTemplate={(tpl) => {
          setActiveTemplate(tpl);
          applyTemplateData(tpl);
        }}
        onManageTemplates={() => navigate("/orders")}
      />
    </div>
  );
}
