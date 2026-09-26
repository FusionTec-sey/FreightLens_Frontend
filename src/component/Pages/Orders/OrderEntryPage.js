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
  Loader2,
  History,
  ShieldAlert,
  CreditCard,
  Send,
  Ship,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowRight,
  Award,
  Paperclip
} from "lucide-react";
import { STATUS_PIPELINE } from "./mockOrders";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useOptions } from "../../../hooks/useOptions";
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import ProductCatalogSelector from "../../UI/UXComponent/ProductCatalogSelector";
import CurrencyInput, { CurrencyDisplay, formatCurrency } from "../../UI/UXComponent/CurrencyInput";
import TemplatePickerModal from "./TemplatePickerModal";
import POItemHistoryDrawer from "./POItemHistoryDrawer";
import POVersionHistoryDrawer from "./POVersionHistoryDrawer";
import StageWarningModal from "./StageWarningModal";
import PriceVarianceModal from "./PriceVarianceModal";
import POMilestoneModal from "./POMilestoneModal";
import POPaymentModal from "./POPaymentModal";
import DocumentPanel from "./DocumentPanel";
import { toast } from "react-toastify";

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
  { key: "SAHAJ", label: "SAHAJ CONSTRUCTION", id: 1, org_id: 1, code: "SAHAJ" },
  { key: "NOBLE", label: "NOBLECON ENTERPRISE", id: 2, org_id: 2, code: "NOBLE" },
  { key: "SAHAJANAND", label: "SAHAJANAND", id: 3, org_id: 3, code: "SAHAJANAND" },
];

const DEFAULT_ITEM_COL_WIDTHS = {
  index: 38,
  item_code: 120,
  description: 320,
  quantity_ordered: 85,
  unit: 70,
  unit_price: 110,
  line_total: 110,
  notes: 210,
  actions: 65,
};

const getSavedColumnWidths = () => {
  try {
    const saved = localStorage.getItem("freightlens_po_items_col_widths");
    if (saved) {
      return { ...DEFAULT_ITEM_COL_WIDTHS, ...JSON.parse(saved) };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_ITEM_COL_WIDTHS;
};

const DEFAULT_CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  SCR: "SCR",
  GBP: "£",
  CNY: "¥",
  AED: "AED",
  INR: "₹",
  ZAR: "R",
  SGD: "S$",
};

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
  const searchParams = new URLSearchParams(location.search);
  const queryDocType = searchParams.get("doc_type") || (location.pathname.startsWith("/sourcing") ? "RFQ" : null);

  const { isDark } = useTheme();
  const { user, orgName, orgId, isRoot, hasModule, permissions = [] } = useAuth();
  const {
    material: materialOptions = [],
    suppliers = [],
    consignees: optionsConsignees = [],
    orderStatuses: contextOrderStatuses = [],
    refresh
  } = useOptions();

  const userInfo = getUserInfo();
  const hasInventory = Boolean(hasModule?.("INVENTORY"));

  const isAccountsOrAdmin = Boolean(
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return (
        lower.includes("admin") ||
        lower.includes("account") ||
        lower.includes("finance") ||
        lower.includes("procurement") ||
        lower.includes("buyer") ||
        lower.includes("noblecon") ||
        lower.includes("manager")
      );
    })
  );

  const canManagePayments = Boolean(
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return (
        lower.includes("admin") ||
        lower.includes("account") ||
        lower.includes("finance")
      );
    })
  );

  // Commercial sourcing confidentiality flags
  const canSendRFQ = Boolean(
    isRoot ||
    permissions.includes("Send_RFQ") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer");
    })
  );

  const canRecordQuote = Boolean(
    isRoot ||
    permissions.includes("Add_VendorQuote") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer");
    })
  );

  const canCompareQuotes = Boolean(
    isRoot ||
    permissions.includes("Compare_Quote") ||
    permissions.includes("View_VendorQuote") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer") || lower.includes("finance") || lower.includes("account");
    })
  );

  const canViewSupplier = Boolean(
    isRoot ||
    permissions.includes("View_Supplier") ||
    permissions.includes("Supplier") ||
    permissions.includes("Administrator") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer") || lower.includes("finance");
    })
  );

  const canViewOrders = Boolean(
    isRoot ||
    permissions.includes("View_Order") ||
    permissions.includes("Order") ||
    permissions.includes("Administrator") ||
    isAccountsOrAdmin
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
        key: c.code || (c.name.toUpperCase().includes("NOBLE")
          ? "NOBLE"
          : c.name.toUpperCase().includes("SAHAJANAND")
            ? "SAHAJANAND"
            : c.name.toUpperCase().includes("SAHAJ")
              ? "SAHAJ"
              : c.name),
        label: c.name,
        id: c.id,
        org_id: c.org_id || (c.name.toUpperCase().includes("NOBLE") ? 2 : c.name.toUpperCase().includes("SAHAJANAND") ? 3 : 1),
        code: c.code,
      }));
    }

    if (orgName?.toLowerCase().includes("noble") || orgId === 2) {
      return [ALL_CONSIGNEES[1]];
    }
    if (orgName?.toLowerCase().includes("sahajanand") || orgId === 3) {
      return [ALL_CONSIGNEES[2]];
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

  const [initialItemsSnapshot, setInitialItemsSnapshot] = useState("[]");
  const [historyDrawerItem, setHistoryDrawerItem] = useState(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningLevel, setWarningLevel] = useState("NONE");
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [varianceData, setVarianceData] = useState(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(!orderId);

  // Master Data Currencies state
  const [masterCurrencies, setMasterCurrencies] = useState([]);

  useEffect(() => {
    const fetchMasterCurrencies = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${process.env.REACT_APP_NETWORK}/master-data/currencies?active_only=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
            skip_zrok_interstitial: "true",
          },
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setMasterCurrencies(res.data);
        }
      } catch (err) {
        console.warn("Could not load master currencies:", err);
      }
    };
    fetchMasterCurrencies();
  }, []);

  // Column resizing state for line items ERP table
  const [columnWidths, setColumnWidths] = useState(getSavedColumnWidths);
  const [resizingColumn, setResizingColumn] = useState(null);

  const startResize = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn({
      colKey,
      startX: e.clientX,
      startWidth: columnWidths[colKey] || DEFAULT_ITEM_COL_WIDTHS[colKey] || 80,
    });
  };

  const onMouseMove = (e) => {
    if (!resizingColumn) return;
    const { colKey, startX, startWidth } = resizingColumn;
    const minWidths = {
      index: 32,
      item_code: 75,
      description: 150,
      quantity_ordered: 60,
      unit: 50,
      unit_price: 75,
      line_total: 75,
      notes: 110,
      actions: 55,
    };
    const minW = minWidths[colKey] || 40;
    const newWidth = Math.max(minW, startWidth + (e.clientX - startX));
    setColumnWidths((prev) => ({ ...prev, [colKey]: newWidth }));
  };

  const onMouseUp = () => {
    if (resizingColumn) {
      setResizingColumn(null);
      try {
        localStorage.setItem("freightlens_po_items_col_widths", JSON.stringify(columnWidths));
      } catch (e) { }
    }
  };

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingColumn, columnWidths]);

  const [formData, setFormData] = useState({
    doc_type: queryDocType || "PO",
    parent_rfq_id: null,
    origin_rfq_number: "",
    split_index: "",
    child_pos: [],
    po_number: "",
    po_nce: "",
    supplier: null,
    company: "",
    goods_description: "",
    material_ids: [],
    items: [
      {
        product_id: null,
        item_code: "",
        description: "",
        quantity_ordered: 1,
        unit: "PCS",
        unit_price: "",
        total_price: "",
        notes: "",
      },
    ],
    status: "DRAFT",
    status_label: "Draft",
    status_id: null,
    lifecycle_stage: "DRAFT",
    lifecycle_version: 1,
    stage_version: 1,
    lifecycle_locked: false,
    selected_quote_id: null,
    sheet_type: null,
    consignee_id: null,
    consignee: "",
    year: new Date().getFullYear(),
    urgent_action: false,
    order_mail_date: new Date().toISOString().split("T")[0],
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
    payments: [],
    currency: "USD"
  });

  const isEdit = Boolean(formData.id || orderId);
  const isRFQ = formData.doc_type === "RFQ";
  const showFinancials = isAccountsOrAdmin && !isRFQ;

  const availableCurrencies = useMemo(() => {
    let list = masterCurrencies.length > 0 ? [...masterCurrencies] : [
      { code: "USD", symbol: "$", name: "US Dollar" },
      { code: "EUR", symbol: "€", name: "Euro" },
      { code: "SCR", symbol: "SCR", name: "Seychelles Rupee" },
      { code: "GBP", symbol: "£", name: "British Pound" },
      { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
      { code: "AED", symbol: "AED", name: "UAE Dirham" },
      { code: "INR", symbol: "₹", name: "Indian Rupee" },
      { code: "ZAR", symbol: "R", name: "South African Rand" },
      { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    ];
    if (formData?.currency && !list.some((c) => c.code === formData.currency)) {
      list.unshift({
        code: formData.currency,
        symbol: formData.currency,
        name: formData.currency,
      });
    }
    return list;
  }, [masterCurrencies, formData?.currency]);

  const currencySymbolMap = useMemo(() => {
    const map = { ...DEFAULT_CURRENCY_SYMBOLS };
    if (Array.isArray(masterCurrencies)) {
      masterCurrencies.forEach((c) => {
        if (c?.code) {
          map[c.code] = c.symbol || c.code;
        }
      });
    }
    return map;
  }, [masterCurrencies]);

  const activeCurrencySymbol =
    (currencySymbolMap && formData?.currency && currencySymbolMap[formData.currency]) ||
    DEFAULT_CURRENCY_SYMBOLS[formData?.currency] ||
    formData?.currency ||
    "$";

  const [initialFormSnapshot, setInitialFormSnapshot] = useState(null);

  const serializeFormSnapshot = (data) => {
    if (!data) return "";
    return JSON.stringify({
      po_number: (data.po_number || "").trim(),
      po_nce: (data.po_nce || "").trim(),
      supplier: data.supplier || null,
      company: (data.company || "").trim(),
      goods_description: (data.goods_description || "").trim(),
      material_ids: [...(data.material_ids || [])].sort(),
      sheet_type: data.sheet_type || "",
      consignee_id: data.consignee_id || null,
      consignee: (data.consignee || "").trim(),
      year: data.year || null,
      urgent_action: Boolean(data.urgent_action),
      status: data.status || "",
      lifecycle_stage: data.lifecycle_stage || "",
      order_mail_date: data.order_mail_date || "",
      quote_sent_date: data.quote_sent_date || "",
      quote_received_date: data.quote_received_date || "",
      pi_confirmed_date: data.pi_confirmed_date || "",
      payment_date: data.payment_date || "",
      balance_payment_date: data.balance_payment_date || "",
      eta_date: data.eta_date || "",
      freight_type: data.freight_type || "",
      remark: (data.remark || "").trim(),
      currency: data.currency || "USD",
      items: (data.items || []).map((it) => ({
        id: it.id || null,
        product_id: it.product_id || null,
        item_code: (it.item_code || "").trim(),
        description: (it.description || "").trim(),
        quantity_ordered: Number(it.quantity_ordered) || 0,
        unit: (it.unit || "PCS").trim(),
        unit_price: it.unit_price !== "" && it.unit_price !== null && it.unit_price !== undefined ? Number(it.unit_price) : "",
        notes: (it.notes || "").trim(),
        item_status: it.item_status || "ACTIVE"
      }))
    });
  };

  const isFormDirty = useMemo(() => {
    if (!isEdit) {
      const hasItem = (formData.items || []).some((it) => Boolean(it.description?.trim()));
      const hasGoodsDesc = Boolean(formData.goods_description?.trim());
      const hasConsignee = Boolean(formData.consignee || formData.consignee_id);
      return Boolean((hasItem || hasGoodsDesc) && hasConsignee);
    }
    if (!initialFormSnapshot) return false;
    return serializeFormSnapshot(formData) !== initialFormSnapshot;
  }, [formData, initialFormSnapshot, isEdit]);

  // Load Inventory lookup products for catalog selector
  useEffect(() => {
    const lookupParams = isRFQ ? { doc_type: "RFQ", is_rfq: true } : {};
    axios
      .get(`${process.env.REACT_APP_NETWORK}/inventory/lookup`, {
        params: lookupParams,
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
  }, [isRFQ]);

  // Load existing order if editing
  useEffect(() => {
    const orderToLoad = initialData || location.state?.order;
    if (orderToLoad) {
      populateFormData(orderToLoad);
    }
    if (orderId) {
      // If we already loaded a preview snapshot, fetch authoritative details silently;
      // otherwise, show full loader until loaded.
      fetchOrderDetails(orderId, Boolean(orderToLoad));
    }
  }, [orderId]);

  useEffect(() => {
    // If not editing an existing order, apply defaults or templates
    if (!orderId && !initialData && !location.state?.order) {
      if (activeTemplate) {
        applyTemplateData(activeTemplate);
      } else if (optionsConsignees && optionsConsignees.length > 0) {
        let single = null;
        if (optionsConsignees.length === 1) {
          single = optionsConsignees[0];
        } else if (orgId === 2) {
          single = optionsConsignees.find((c) => c.code === "NOBLE" || c.org_id === 2 || c.name.toUpperCase().includes("NOBLE"));
        } else if (orgId === 3) {
          single = optionsConsignees.find((c) => c.code === "SAHAJANAND" || c.org_id === 3 || c.name.toUpperCase().includes("SAHAJANAND"));
        }

        if (single) {
          const key = single.code || (single.name.toUpperCase().includes("NOBLE")
            ? "NOBLE"
            : single.name.toUpperCase().includes("SAHAJANAND")
              ? "SAHAJANAND"
              : single.name.toUpperCase().includes("SAHAJ")
                ? "SAHAJ"
                : single.name);

          const resolvedOrgId = single.org_id || (key === "NOBLE" ? 2 : key === "SAHAJANAND" ? 3 : 1);

          setFormData((prev) => {
            if (prev.consignee_id || prev.consignee) return prev;
            return {
              ...prev,
              sheet_type: key,
              consignee: single.name,
              consignee_id: single.id,
              org_id: resolvedOrgId,
            };
          });
        }
      }
    }
  }, [orderId, initialData, location.state, activeTemplate, optionsConsignees, orgId]);

  const fetchOrderDetails = async (id, isSilent = false) => {
    if (!isSilent) setLoadingOrder(true);
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
    const isRFQDoc = (order.doc_type || queryDocType || "PO") === "RFQ";
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

    let matchedSupplierId = null;
    if (!isRFQDoc && canViewSupplier) {
      matchedSupplierId = order.supplier || null;
      if (!matchedSupplierId && order.company && suppliers.length > 0) {
        const matched = suppliers.find(
          (s) => s.name?.toLowerCase() === order.company?.toLowerCase()
        );
        if (matched) matchedSupplierId = matched.id;
      }
    }

    let matchedConsigneeId = order.consignee_id || null;
    if (!matchedConsigneeId && order.consignee && optionsConsignees.length > 0) {
      const matchedC = optionsConsignees.find(
        (c) => c.name?.toLowerCase() === order.consignee?.toLowerCase()
      );
      if (matchedC) matchedConsigneeId = matchedC.id;
    }

    const parsedItems = (order.items || []).map((it) => ({
      id: it.id,
      product_id: it.product_id || null,
      item_code: it.item_code || "",
      description: it.description || "",
      quantity_ordered: it.quantity_ordered || 1,
      unit: it.unit || "PCS",
      unit_price: it.unit_price || "",
      total_price: it.total_price || "",
      notes: it.notes || "",
      item_status: it.item_status || "ACTIVE",
    }));

    let finalParsedItems = parsedItems;
    if (finalParsedItems.length === 0) {
      finalParsedItems = [
        {
          product_id: null,
          item_code: "",
          description: "",
          quantity_ordered: 1,
          unit: "PCS",
          unit_price: "",
          total_price: "",
          notes: "",
          item_status: "ACTIVE",
        },
      ];
    }

    setInitialItemsSnapshot(
      JSON.stringify(
        parsedItems.map((it) => ({
          id: it.id,
          item_code: it.item_code,
          description: it.description,
          quantity_ordered: it.quantity_ordered,
          unit_price: it.unit_price,
        }))
      )
    );

    const parsedPayments = Array.isArray(order.payments) ? order.payments : [];
    const activePayments = parsedPayments.filter(
      (p) => p.status !== "DELETED" && p.status !== "CANCELLED"
    );
    const activePaymentsSum = activePayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );

    let effAdvance = "";
    if (activePayments.length > 0) {
      effAdvance = activePaymentsSum.toFixed(2);
    } else if (order.advance_amount !== null && order.advance_amount !== undefined && order.advance_amount !== "") {
      const parsedAdv = parseFloat(order.advance_amount);
      effAdvance = isNaN(parsedAdv) ? "" : parsedAdv.toFixed(2);
    }

    const effTotal = parseFloat(order.total_amount) || 0;
    let effBalance = "";
    if (order.balance_amount !== null && order.balance_amount !== undefined && order.balance_amount !== "") {
      const parsedBal = parseFloat(order.balance_amount);
      effBalance = isNaN(parsedBal) ? "" : parsedBal.toFixed(2);
    } else if (effTotal > 0) {
      const advNum = parseFloat(effAdvance) || 0;
      effBalance = Math.max(0, effTotal - advNum).toFixed(2);
    }

    const authoritativeStage = (isRFQDoc
      ? (order.lifecycle_stage || order.status || "DRAFT")
      : (order.status || order.lifecycle_stage || "DRAFT")).toUpperCase();

    const nextFormData = {
      ...order,
      year: order.year || (order.order_mail_date ? new Date(order.order_mail_date).getFullYear() : new Date().getFullYear()),
      order_mail_date: order.order_mail_date ? String(order.order_mail_date).split("T")[0] : new Date().toISOString().split("T")[0],
      doc_type: order.doc_type || "PO",
      status: authoritativeStage,
      lifecycle_stage: authoritativeStage,
      parent_rfq_id: order.parent_rfq_id || null,
      origin_rfq_number: order.origin_rfq_number || "",
      split_index: order.split_index || "",
      child_pos: order.child_pos || [],
      lifecycle_version: order.lifecycle_version || 1,
      stage_version: order.stage_version || 1,
      lifecycle_locked: Boolean(order.lifecycle_locked),
      selected_quote_id: order.selected_quote_id || null,
      supplier: isRFQDoc || !canViewSupplier ? null : matchedSupplierId,
      company: isRFQDoc || !canViewSupplier ? "" : (order.company || ""),
      consignee_id: matchedConsigneeId,
      org_id: order.org_id || null,
      material_ids: prefilledMaterialIds,
      items: finalParsedItems,
      payments: parsedPayments,
      total_amount: order.total_amount !== null && order.total_amount !== undefined ? order.total_amount : "",
      advance_amount: effAdvance,
      balance_amount: effBalance,
      currency: order.currency || "USD",
    };
    setFormData(nextFormData);
    setInitialFormSnapshot(serializeFormSnapshot(nextFormData));
  };

  // Fetch variance details if order is locked at proforma stage
  useEffect(() => {
    if (orderId && formData.lifecycle_locked) {
      axios
        .get(`${process.env.REACT_APP_NETWORK}/orders/${orderId}/lifecycle`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        })
        .then((res) => {
          if (res.data?.variance_data) {
            setVarianceData(res.data.variance_data);
          }
        })
        .catch((err) => console.error("Could not load variance data:", err));
    }
  }, [orderId, formData.lifecycle_locked]);

  const applyTemplateData = (template) => {
    const isSourcingMode = Boolean(
      formData.doc_type === "RFQ" ||
      location.pathname.startsWith("/sourcing") ||
      queryDocType === "RFQ"
    );

    // In Sourcing mode, vendor details and commercial pricing are confidential/unassigned
    const shouldIncludeVendor = (!isSourcingMode) && canViewSupplier;

    let matchedSupplierId = null;
    let templateCompany = "";

    if (shouldIncludeVendor) {
      matchedSupplierId = template.supplier_id || null;
      if (!matchedSupplierId && template.company && suppliers.length > 0) {
        const matched = suppliers.find(
          (s) => s.name?.toLowerCase() === template.company?.toLowerCase()
        );
        if (matched) matchedSupplierId = matched.id;
      }
      templateCompany = template.company || "";
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
        unit_price: isSourcingMode ? "" : (it.unit_price || ""),
        total_price: (!isSourcingMode && price > 0) ? (qty * price).toFixed(2) : "",
        notes: it.notes || "",
      };
    });

    const goodsDesc = (template.items || [])
      .map((it) => it.description)
      .filter(Boolean)
      .join(", ");

    setFormData((prev) => ({
      ...prev,
      supplier: shouldIncludeVendor ? (matchedSupplierId || prev.supplier) : null,
      company: shouldIncludeVendor ? (templateCompany || prev.company) : "",
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
      ...(matched?.default_currency ? { currency: matched.default_currency } : {}),
      ...(matched?.payment_term?.name ? { payment_terms: matched.payment_term.name } : {}),
    }));
  };

  const activeWorkflowStage = useMemo(() => {
    if (formData.doc_type === "RFQ") {
      return (formData.lifecycle_stage || formData.status || "DRAFT").toUpperCase();
    }
    return (formData.status || formData.lifecycle_stage || "DRAFT").toUpperCase();
  }, [formData.doc_type, formData.lifecycle_stage, formData.status]);

  const filteredStages = useMemo(() => {
    let list = [];
    if (formData.doc_type === "RFQ") {
      list = [
        { key: "DRAFT", label: "Draft Spec" },
        { key: "CONFIRMED", label: "RFQ Confirmed" },
        { key: "RFQ_SENT", label: "RFQ Dispatched" },
        { key: "SOURCING", label: "Active Sourcing" },
        { key: "QUOTE_RECEIVED", label: "Quotes Received" },
        { key: "QUOTE_APPROVED", label: "Quote Approved / Awarded" },
        { key: "PO_ISSUED", label: "PO Generated" },
        { key: "CANCELLED", label: "Cancelled" },
      ];
    } else {
      list = (activeStages || []).map((st) => ({
        key: (st.key || st.code || st.name || "").toUpperCase(),
        label: st.label || st.name,
        id: st.id,
      }));
    }
    const currentKey = activeWorkflowStage;
    if (currentKey && !list.some((s) => s.key === currentKey)) {
      list.unshift({
        key: currentKey,
        label: formData.status_label || currentKey.replace(/_/g, " "),
      });
    }
    return list;
  }, [formData.doc_type, activeWorkflowStage, formData.status_label, activeStages]);

  const handleStageChange = (nextStatus) => {
    const matchedStage = filteredStages.find(
      (s) => s.key === nextStatus || s.code === nextStatus
    );
    const today = new Date().toISOString().split("T")[0];
    const stageUpper = (nextStatus || "").toUpperCase();

    setFormData((prev) => {
      const updatedDates = {};
      if (["CONFIRMED", "RFQ_SENT", "SOURCING", "QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stageUpper) && !prev.order_mail_date) {
        updatedDates.order_mail_date = today;
      }
      if (["RFQ_SENT", "SOURCING", "QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stageUpper) && !prev.quote_sent_date) {
        updatedDates.quote_sent_date = today;
      }
      if (["QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stageUpper) && !prev.quote_received_date) {
        updatedDates.quote_received_date = today;
      }
      if (["QUOTE_APPROVED", "PO_ISSUED", "ORDERED", "PI_CONFIRMED"].includes(stageUpper) && !prev.pi_confirmed_date) {
        updatedDates.pi_confirmed_date = today;
      }
      if (["PART_PAID", "PAID"].includes(stageUpper) && !prev.payment_date) {
        updatedDates.payment_date = today;
      }
      if (stageUpper === "PAID" && !prev.balance_payment_date) {
        updatedDates.balance_payment_date = today;
      }
      // Note: eta_date is not auto-updated here; shipping schedule is determined manually or via BL/vessel tracking
      return {
        ...prev,
        status: nextStatus,
        lifecycle_stage: nextStatus,
        status_label: matchedStage ? matchedStage.label || matchedStage.name : nextStatus,
        status_id: matchedStage?.id || null,
        ...updatedDates,
      };
    });
  };

  const dateLabelConfig = useMemo(() => {
    const stage = (formData.status || formData.lifecycle_stage || "DRAFT").toUpperCase();
    const isRFQ = formData.doc_type === "RFQ";

    switch (stage) {
      case "RFQ_SENT":
      case "SOURCING":
        return {
          compact: "Sent Date:",
          full: "RFQ Sent Date",
          icon: Send,
        };
      case "QUOTE_RECEIVED":
        return {
          compact: "Quote Date:",
          full: "Quote Received Date",
          icon: FileText,
        };
      case "QUOTE_APPROVED":
        return {
          compact: "Award Date:",
          full: "Quote Award Date",
          icon: CheckCircle2,
        };
      case "PO_ISSUED":
        return {
          compact: "PO Date:",
          full: "PO Issued Date",
          icon: ShoppingBag,
        };
      case "CONFIRMED":
        return {
          compact: "Confirmed:",
          full: isRFQ ? "RFQ Confirmed Date" : "Order Confirmed Date",
          icon: CheckCircle2,
        };
      case "PI_CONFIRMED":
      case "ORDERED":
        return {
          compact: "PI Date:",
          full: "PI Confirmed Date",
          icon: CheckCircle2,
        };
      case "PART_PAID":
      case "PAID":
        return {
          compact: "Payment Date:",
          full: "Payment Date",
          icon: CreditCard,
        };
      case "UNDER_PRODUCTION":
      case "IN_PRODUCTION":
        return {
          compact: "Prod Date:",
          full: "Production Start Date",
          icon: Clock,
        };
      case "READY_TO_LOAD":
      case "READY":
        return {
          compact: "Ready Date:",
          full: "Cargo Ready Date",
          icon: Package,
        };
      case "SEA_WAY":
      case "SHIPPED":
        return {
          compact: "Ship Date:",
          full: "Shipping / Dispatch Date",
          icon: Ship,
        };
      case "ARRIVED":
        return {
          compact: "Arrival Date:",
          full: "Port Arrival Date",
          icon: Ship,
        };
      case "RECEIVED":
        return {
          compact: "Receipt Date:",
          full: "Warehouse Receipt Date",
          icon: CheckCircle2,
        };
      case "CANCELLED":
        return {
          compact: "Cancelled:",
          full: "Cancelled Date",
          icon: Calendar,
        };
      case "DRAFT":
      case "PENDING":
      default:
        return {
          compact: isRFQ ? "Req Date:" : "Order Date:",
          full: isRFQ ? "Requisition Date" : "Order Date",
          icon: Calendar,
        };
    }
  }, [formData.status, formData.lifecycle_stage, formData.doc_type]);

  const handleRequestDateChange = (newDateRaw) => {
    const dateOnly = newDateRaw ? String(newDateRaw).split("T")[0] : "";
    const parsedYear = dateOnly ? new Date(dateOnly).getFullYear() : new Date().getFullYear();
    const stage = (formData.status || formData.lifecycle_stage || "").toUpperCase();

    const stageMilestoneField =
      ["RFQ_SENT", "SOURCING"].includes(stage) ? "quote_sent_date" :
      stage === "QUOTE_RECEIVED" ? "quote_received_date" :
      ["QUOTE_APPROVED", "PO_ISSUED", "ORDERED", "PI_CONFIRMED"].includes(stage) ? "pi_confirmed_date" :
      ["PART_PAID", "PAID"].includes(stage) ? "payment_date" :
      null;

    setFormData((prev) => ({
      ...prev,
      order_mail_date: dateOnly,
      ...(stageMilestoneField ? { [stageMilestoneField]: dateOnly } : {}),
      year: parsedYear || prev.year || new Date().getFullYear(),
    }));
  };

  const handleConsigneeChange = (consigneeId) => {
    const matched = optionsConsignees.find(
      (c) => c.id === consigneeId || c.id === Number(consigneeId)
    );
    if (matched) {
      const sheetKey = matched.code || (matched.name.toUpperCase().includes("NOBLE")
        ? "NOBLE"
        : matched.name.toUpperCase().includes("SAHAJANAND")
          ? "SAHAJANAND"
          : matched.name.toUpperCase().includes("SAHAJ")
            ? "SAHAJ"
            : matched.name);

      const resolvedOrgId = matched.org_id || (sheetKey === "NOBLE" ? 2 : sheetKey === "SAHAJANAND" ? 3 : 1);

      setFormData((prev) => ({
        ...prev,
        consignee_id: matched.id,
        consignee: matched.name,
        sheet_type: sheetKey,
        org_id: resolvedOrgId,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        consignee_id: null,
        consignee: "",
        sheet_type: null,
        org_id: null,
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

    const currentItems = formData.items || [];
    const isOnlyOneBlank =
      currentItems.length === 1 &&
      !currentItems[0].product_id &&
      !currentItems[0].item_code &&
      !currentItems[0].description &&
      !currentItems[0].unit_price;

    const existingIndex = currentItems.findIndex(
      (it) => it.product_id === prod.id
    );

    if (existingIndex >= 0) {
      const updated = [...currentItems];
      const newQty = (parseFloat(updated[existingIndex].quantity_ordered) || 1) + 1;
      const unitPrice = isRFQ ? 0 : (parseFloat(updated[existingIndex].unit_price) || 0);
      updated[existingIndex].quantity_ordered = newQty;
      updated[existingIndex].unit_price = isRFQ ? "" : updated[existingIndex].unit_price;
      updated[existingIndex].total_price =
        (!isRFQ && unitPrice > 0) ? (newQty * unitPrice).toFixed(2) : "";
      setFormData((prev) => ({ ...prev, items: updated }));
    } else {
      const unitPrice = isRFQ ? "" : (prod.unit_cost || "");
      const newItem = {
        product_id: prod.id,
        item_code: prod.sku || prod.code || "",
        factory_code: prod.factory_code || "",
        image_url: prod.image_url || null,
        description: prod.name,
        quantity_ordered: 1,
        unit: prod.unit || "PCS",
        unit_price: isRFQ ? "" : unitPrice,
        total_price: isRFQ ? "" : (unitPrice ? parseFloat(unitPrice).toFixed(2) : ""),
        notes: prod.factory_code ? `Factory Code: ${prod.factory_code}` : "",
      };
      setFormData((prev) => ({
        ...prev,
        items: isOnlyOneBlank ? [newItem] : [...currentItems, newItem],
        goods_description: prev.goods_description || prod.name,
        supplier: isRFQ ? null : (prev.supplier || prod.default_supplier_id || null),
        company: isRFQ ? "" : (prev.company || prod.supplier_name || prev.company),
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
    let updated = [...(formData.items || [])];
    updated[index] = { ...updated[index], [field]: val };

    // Auto-calculate line total
    if (field === "quantity_ordered" || field === "unit_price") {
      const q = parseFloat(field === "quantity_ordered" ? val : updated[index].quantity_ordered) || 0;
      const p = parseFloat(field === "unit_price" ? val : updated[index].unit_price) || 0;
      updated[index].total_price = q > 0 && p > 0 ? (q * p).toFixed(2) : "";
    }

    // Auto-append next empty row if typing in the last row and it now has content
    if (index === updated.length - 1) {
      const last = updated[index];
      const hasContent = Boolean(
        (last.description && last.description.trim()) ||
        (last.item_code && last.item_code.trim()) ||
        (last.unit_price && String(last.unit_price).trim()) ||
        last.product_id
      );
      if (hasContent) {
        updated.push({
          product_id: null,
          item_code: "",
          description: "",
          quantity_ordered: 1,
          unit: "PCS",
          unit_price: "",
          total_price: "",
          notes: "",
        });
      }
    }

    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index) => {
    let updated = (formData.items || []).filter((_, i) => i !== index);
    if (updated.length === 0) {
      updated = [
        {
          product_id: null,
          item_code: "",
          description: "",
          quantity_ordered: 1,
          unit: "PCS",
          unit_price: "",
          total_price: "",
          notes: "",
        },
      ];
    }
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  // Auto-calculated total from items (skips trailing empty rows)
  const itemsSubtotal = useMemo(() => {
    return (formData.items || []).reduce((acc, it) => {
      if (!it.description && !it.item_code && !it.product_id && !it.id) return acc;
      const lineTotal = parseFloat(it.total_price);
      if (!isNaN(lineTotal) && lineTotal > 0) return acc + lineTotal;
      const q = parseFloat(it.quantity_ordered) || 0;
      const p = parseFloat(it.unit_price) || 0;
      return acc + (q * p);
    }, 0);
  }, [formData.items]);

  // Derived effective order total (auto-falls back to itemsSubtotal if total_amount is not explicitly set)
  const effectiveOrderTotal = useMemo(() => {
    const manualTotal = parseFloat(formData.total_amount) || 0;
    if (manualTotal > 0) return manualTotal;
    return itemsSubtotal > 0 ? itemsSubtotal : 0;
  }, [formData.total_amount, itemsSubtotal]);

  const totalPaidAmount = useMemo(() => {
    if (Array.isArray(formData.payments) && formData.payments.length > 0) {
      const active = formData.payments.filter(
        (p) => p.status !== "DELETED" && p.status !== "CANCELLED"
      );
      if (active.length > 0) {
        return active.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
      }
    }
    return parseFloat(formData.advance_amount) || 0;
  }, [formData.payments, formData.advance_amount]);

  const calculatedDueAmount = useMemo(() => {
    return Math.max(0, effectiveOrderTotal - totalPaidAmount);
  }, [effectiveOrderTotal, totalPaidAmount]);

  const totalQuantitySum = useMemo(() => {
    return (formData.items || []).reduce((acc, it) => {
      if (!it.description && !it.item_code && !it.product_id && !it.id) return acc;
      const q = parseFloat(it.quantity_ordered) || 0;
      return acc + q;
    }, 0);
  }, [formData.items]);

  const validItemsCount = useMemo(() => {
    return (formData.items || []).filter(
      (it) => it.product_id || (it.item_code && it.item_code.trim()) || (it.description && it.description.trim()) || it.id
    ).length;
  }, [formData.items]);

  const activePaymentsCount = useMemo(() => {
    if (!Array.isArray(formData.payments)) return 0;
    return formData.payments.filter((p) => p.status !== "DELETED" && p.status !== "CANCELLED").length;
  }, [formData.payments]);

  const clearedPercentage = useMemo(() => {
    if (effectiveOrderTotal <= 0) return 0;
    const pct = (totalPaidAmount / effectiveOrderTotal) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }, [effectiveOrderTotal, totalPaidAmount]);

  // Payment stage guard: only show payment section when PO reaches financial stages or has active payments
  const isPaymentStage = useMemo(() => {
    if (formData.doc_type === "RFQ") return false;
    if (!orderId) return false;
    if (activePaymentsCount > 0) return true;
    const stage = (formData.status || formData.lifecycle_stage || "").toUpperCase();
    return [
      "ORDERED",
      "PO_ISSUED",
      "PART_PAID",
      "PAID",
      "IN_PRODUCTION",
      "READY",
      "PACKED",
      "SHIPPED",
      "ARRIVED",
      "RECEIVED",
      "COMPLETED",
    ].includes(stage);
  }, [formData.doc_type, orderId, activePaymentsCount, formData.status, formData.lifecycle_stage]);

  // Derive contextual active milestone configuration based on current lifecycle stage or status
  const activeMilestoneConfig = useMemo(() => {
    const isRFQ = formData.doc_type === "RFQ";
    const stage = (formData.lifecycle_stage || formData.status || "DRAFT").toUpperCase();
    if (["DRAFT", "CONFIRMED", "PENDING"].includes(stage)) {
      return null;
    }
    if (["RFQ_SENT", "SOURCING"].includes(stage)) {
      return { field: "quote_sent_date", label: "Quote Sent Date", icon: Clock, stageLabel: "RFQ Dispatched" };
    }
    if (["QUOTE_RECEIVED"].includes(stage)) {
      return { field: "quote_received_date", label: "Quote Received Date", icon: FileText, stageLabel: "Vendor Quotation In" };
    }
    if (["QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stage)) {
      return { field: "pi_confirmed_date", label: "Confirm-Quote / PI Date", icon: CheckCircle2, stageLabel: "Approved / Issued" };
    }
    if (!isRFQ && ["PART_PAID", "PAID"].includes(stage)) {
      return { field: "payment_date", label: "Payment Date", icon: CreditCard, stageLabel: "Payment Processed" };
    }
    if (!isRFQ && ["IN_PRODUCTION", "READY", "SHIPPED", "ARRIVED"].includes(stage)) {
      return { field: "eta_date", label: "Estimated Arrival (ETA)", icon: Truck, stageLabel: "In Production / Transit" };
    }
    return null;
  }, [formData.doc_type, formData.lifecycle_stage, formData.status]);

  const currentStage = (formData.lifecycle_stage || formData.status || "DRAFT").toUpperCase();

  // In Sourcing: Once confirmed (non-DRAFT), no further update process is done at sourcing.
  // Sourcing requisitioners can only see updating status as sourcing proceeding.
  const isSourcingLocked = (isRFQ || location.pathname.startsWith("/sourcing")) && isEdit && currentStage !== "DRAFT";

  const canEdit = Boolean(
    !isSourcingLocked &&
    (isRoot ||
    isAccountsOrAdmin ||
    (!orderId) ||
    (isRFQ
      ? (permissions.includes("Edit_RFQ") || permissions.includes("Edit_Order") || permissions.includes("Order") || permissions.includes("Administrator"))
      : (permissions.includes("Edit_Order") || permissions.includes("Order") || permissions.includes("Administrator"))))
  );

  // Financial synchronization helper (auto-calculates balance and synchronizes payment status)
  const handleFinancialChange = (field, val) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: val };
      const total = parseFloat(field === "total_amount" ? val : next.total_amount) || 0;
      const advance = parseFloat(field === "advance_amount" ? val : next.advance_amount) || 0;
      const balance = Math.max(0, total - advance);
      next.balance_amount = balance > 0 ? balance.toFixed(2) : (total > 0 ? "0.00" : "");
      if (total > 0 && advance >= total) {
        next.payment_status = "FULLY_PAID";
      } else if (advance > 0) {
        next.payment_status = "PART_PAID";
      } else {
        next.payment_status = "NONE";
      }
      return next;
    });
  };

  const handleAutoFillTotal = () => {
    if (itemsSubtotal > 0) {
      handleFinancialChange("total_amount", itemsSubtotal.toFixed(2));
    }
  };

  const handlePaymentModalSaved = (res) => {
    const updatedAdvance = res.advance_amount !== undefined ? res.advance_amount : formData.advance_amount;
    const updatedBalance = res.balance_amount !== undefined ? res.balance_amount : formData.balance_amount;
    const updatedStatus = res.payment_status || formData.payment_status;
    const updatedPayments = res.payments || formData.payments;

    setFormData((prev) => ({
      ...prev,
      advance_amount: updatedAdvance,
      balance_amount: updatedBalance,
      payment_status: updatedStatus,
      payment_date: res.payment_date || prev.payment_date,
      balance_payment_date: res.balance_payment_date || prev.balance_payment_date,
      payments: updatedPayments,
    }));

    // Synchronize browser history state so page reload (F5) retains the updated payment ledger & balance
    try {
      if (window.history && window.history.state) {
        const currentUsr = window.history.state.usr || {};
        const currentOrder = currentUsr.order || location.state?.order;
        if (currentOrder) {
          window.history.replaceState(
            {
              ...window.history.state,
              usr: {
                ...currentUsr,
                order: {
                  ...currentOrder,
                  advance_amount: updatedAdvance,
                  balance_amount: updatedBalance,
                  payment_status: updatedStatus,
                  payments: updatedPayments,
                },
              },
            },
            ""
          );
        }
      }
    } catch (e) {
      console.warn("Could not synchronize history state:", e);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (formData.doc_type === "RFQ" || location.pathname.startsWith("/sourcing")) {
      navigate("/sourcing");
    } else {
      navigate("/orders");
    }
  };

  const handleSubmit = async (e, bypassReason = null, stageOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.consignee && !formData.consignee_id && !formData.sheet_type) {
      setErrorMsg("Please select a Consignee Organisation.");
      return;
    }
    const validItems = (formData.items || []).filter(
      (it) => it.product_id || (it.item_code && it.item_code.trim()) || (it.description && it.description.trim()) || it.id
    );
    if (validItems.length === 0) {
      setErrorMsg("Please enter at least one product line item for this order.");
      return;
    }

    // Check for item modifications in post-DRAFT stages
    const isEditOrder = Boolean(formData.id || orderId);
    const hasBypass = bypassReason !== null && bypassReason !== undefined;
    if (isEditOrder && !hasBypass && formData.lifecycle_stage && formData.lifecycle_stage !== "DRAFT") {
      const currentSnapshot = JSON.stringify(
        (formData.items || []).map((it) => ({
          id: it.id,
          item_code: it.item_code,
          description: it.description,
          quantity_ordered: it.quantity_ordered,
          unit_price: it.unit_price,
        }))
      );

      if (currentSnapshot !== initialItemsSnapshot) {
        let level = "NONE";
        if (["QUOTE_APPROVED", "PO_ISSUED", "PROFORMA"].includes(formData.lifecycle_stage)) {
          level = "CRITICAL";
        } else if (["CONFIRMED", "RFQ_SENT", "QUOTE_RECEIVED"].includes(formData.lifecycle_stage)) {
          level = "WARNING";
        }
        if (level !== "NONE") {
          setWarningLevel(level);
          setShowWarningModal(true);
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      let savedResult;
      const parseNumeric = (val) => {
        if (val === "" || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
      };

      const activePaymentsTotal = (Array.isArray(formData.payments) && formData.payments.length > 0)
        ? formData.payments
          .filter((p) => p.status !== "DELETED" && p.status !== "CANCELLED")
          .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        : null;

      const finalTotal = parseNumeric(formData.total_amount) || (effectiveOrderTotal > 0 ? effectiveOrderTotal : null);
      const finalAdvance = activePaymentsTotal !== null ? activePaymentsTotal : (parseNumeric(formData.advance_amount) || 0);
      const finalBalance = finalTotal !== null ? Math.max(0, finalTotal - finalAdvance) : null;

      const derivedGoodsDesc =
        formData.goods_description ||
        validItems
          .map((it) => it.description)
          .filter(Boolean)
          .join(", ");

      const targetStage = (stageOverride || formData.lifecycle_stage || formData.status || "DRAFT").toUpperCase();
      const todayStr = new Date().toISOString().split("T")[0];
      const stageDates = {};
      if (["CONFIRMED", "RFQ_SENT", "SOURCING", "QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(targetStage) && !formData.order_mail_date) {
        stageDates.order_mail_date = todayStr;
      }
      if (["RFQ_SENT", "SOURCING", "QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(targetStage) && !formData.quote_sent_date) {
        stageDates.quote_sent_date = todayStr;
      }
      if (["QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(targetStage) && !formData.quote_received_date) {
        stageDates.quote_received_date = todayStr;
      }
      if (["QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(targetStage) && !formData.pi_confirmed_date) {
        stageDates.pi_confirmed_date = todayStr;
      }
      if (["PART_PAID", "PAID"].includes(targetStage) && !formData.payment_date) {
        stageDates.payment_date = todayStr;
      }
      if (targetStage === "PAID" && !formData.balance_payment_date) {
        stageDates.balance_payment_date = todayStr;
      }
      // Note: eta_date is not auto-updated here; shipping schedule is determined manually or via BL/vessel tracking

      const matchedStageObj = filteredStages.find(
        (s) => s.key === targetStage || s.code === targetStage
      );

      const payload = {
        ...formData,
        ...stageDates,
        year: formData.year || (formData.order_mail_date ? new Date(formData.order_mail_date).getFullYear() : new Date().getFullYear()),
        lifecycle_stage: targetStage,
        status: targetStage,
        status_label: matchedStageObj ? (matchedStageObj.label || matchedStageObj.name) : targetStage,
        goods_description: derivedGoodsDesc,
        total_amount: finalTotal,
        advance_amount: finalAdvance,
        balance_amount: finalBalance,
        items: validItems.map((it) => ({
          ...it,
          quantity_ordered: parseNumeric(it.quantity_ordered) || 1,
          unit_price: parseNumeric(it.unit_price),
          total_price: parseNumeric(it.total_price),
        })),
        revision_reason: bypassReason || undefined,
      };

      if (isEditOrder) {
        const targetId = formData.id || orderId;
        const res = await axios.put(
          `${process.env.REACT_APP_NETWORK}/orders/${targetId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
        savedResult = res.data;
        const docLabel = (savedResult?.doc_type || formData.doc_type) === "RFQ" ? "Sourcing RFQ" : "Purchase Order";
        if (stageOverride) {
          const stageName = matchedStageObj ? (matchedStageObj.label || matchedStageObj.name) : stageOverride;
          toast.success(`${docLabel} ${savedResult?.po_number || ""} confirmed to ${stageName}!`);
        } else {
          toast.success(`${docLabel} ${savedResult?.po_number || ""} updated successfully!`);
        }
        await fetchOrderDetails(targetId);
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/orders`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
        savedResult = res.data;
        const docLabel = (savedResult?.doc_type || formData.doc_type) === "RFQ" ? "Sourcing RFQ" : "Purchase Order";
        toast.success(`${docLabel} ${savedResult?.po_number || ""} created successfully!`);
      }

      if (onSaved) {
        onSaved(savedResult);
      } else if (!isEditOrder && savedResult?.id) {
        const isSavedRFQ = (savedResult?.doc_type || formData.doc_type) === "RFQ" || location.pathname.startsWith("/sourcing");
        navigate(isSavedRFQ ? `/sourcing/${savedResult.id}/edit` : `/orders/${savedResult.id}/edit`);
      } else if (!isEditOrder) {
        const isSavedRFQ = (savedResult?.doc_type || formData.doc_type) === "RFQ" || location.pathname.startsWith("/sourcing");
        navigate(isSavedRFQ ? "/sourcing" : "/orders");
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

  return (
    <div
      className={`w-full h-full flex flex-col flex-1 min-h-0 ${isDark ? "text-slate-100" : "text-slate-900"
        }`}
    >
      {/* ── TOP STICKY COMMAND BAR ─────────────────────────────────────── */}
      <div
        className={`sticky top-0 z-20 w-full flex-none px-4 sm:px-6 py-3 border-b backdrop-blur-md transition-colors ${isDark
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
              className={`p-2 rounded-xl border transition flex items-center justify-center ${isDark
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
                  {formData.doc_type === "RFQ" ? "Sourcing & RFQs" : "Orders"} / {isEdit ? (formData.doc_type === "RFQ" ? "Edit RFQ" : "Edit Order") : (formData.doc_type === "RFQ" ? "New RFQ" : "New Order")}
                </span>
                {formData.origin_rfq_number && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    From {formData.origin_rfq_number}
                  </span>
                )}
                {formData.urgent_action && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> URGENT
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                  {formData.doc_type === "RFQ" ? (
                    <FileText className="w-5 h-5 text-amber-500" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-blue-500" />
                  )}
                  {isEdit
                    ? `${formData.doc_type === "RFQ" ? "Edit Sourcing RFQ" : "Edit Order"} (${formData.po_number || "Draft"})`
                    : `${formData.doc_type === "RFQ" ? "Create Sourcing RFQ (Draft)" : "Create Purchase Order (Draft)"}`}
                </h1>

                {isEdit && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${formData.doc_type === "RFQ"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}
                    >
                      {formData.doc_type === "RFQ"
                        ? (formData.lifecycle_stage || "DRAFT").replace('_', ' ')
                        : (formData.status_label || formData.status || "Ordered")}
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsVersionHistoryOpen(true)}
                      className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1 transition"
                      title="View Version History & Lineage"
                    >
                      <History size={11} />
                      <span>v{formData.stage_version || 1}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isEdit && (
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${isDark
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                    : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>Apply Template</span>
              </button>
            )}

            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDocumentsModal(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${isDark
                    ? "border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                    : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                  }`}
                title="View and upload order documents, contracts, proformas, and proofs"
              >
                <Paperclip className="w-4 h-4 text-teal-500" />
                <span>Documents</span>
              </button>
            )}

            {isEdit && (
              <button
                type="button"
                onClick={() => setIsVersionHistoryOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${isDark
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                title="View full PO version history and stage progression lineage"
              >
                <History className="w-4 h-4 text-indigo-500" />
                <span>Version History</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleBack}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition ${isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
            >
              Cancel
            </button>

            {/* Read-Only Badge if user has only view permissions */}
            {isEdit && !canEdit && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>View-Only</span>
              </span>
            )}

            {/* Contextual Stage Progression Action Button */}
            {isEdit && canEdit && currentStage === "DRAFT" && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, null, "CONFIRMED")}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                title={`Validate and confirm this ${isRFQ ? "RFQ" : "order"} from Draft to Confirmed stage`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRFQ ? "Confirm RFQ" : "Confirm Order"}</span>
              </button>
            )}

            {/* Live Updating Sourcing Progress Indicator (when RFQ is confirmed / in progress) */}
            {isRFQ && isEdit && currentStage !== "DRAFT" && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border ${
                currentStage === "CONFIRMED"
                  ? "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  : currentStage === "RFQ_SENT"
                  ? "text-blue-700 bg-blue-50 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                  : currentStage === "QUOTE_RECEIVED"
                  ? "text-indigo-700 bg-indigo-50 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                  : "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
              }`}>
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {currentStage === "CONFIRMED" && "Sourcing Proceeding: Requisition Confirmed"}
                  {currentStage === "RFQ_SENT" && "Sourcing Proceeding: RFQ Sent to Vendors"}
                  {currentStage === "QUOTE_RECEIVED" && "Sourcing Proceeding: Quotes Under Review"}
                  {currentStage === "QUOTE_APPROVED" && "Sourcing Complete: Awarded to Supplier"}
                </span>
              </span>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (isEdit && !isFormDirty)}
                className={`flex items-center gap-1.5 px-5 py-2 font-bold rounded-xl text-xs transition shadow-md ${
                  isSubmitting || (isEdit && !isFormDirty)
                    ? isDark
                      ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none"
                      : "bg-slate-200 text-slate-400 border border-slate-300/60 cursor-not-allowed shadow-none"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-blue-500/20"
                }`}
                title={isEdit && !isFormDirty ? "No changes to save" : "Save changes"}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {isRFQ
                        ? isEdit
                          ? currentStage === "DRAFT"
                            ? "Save Draft RFQ"
                            : "Update RFQ"
                          : "Create Draft RFQ"
                        : isEdit
                          ? currentStage === "DRAFT"
                            ? "Save Draft Order"
                            : "Update Order"
                          : "Create Draft Order"}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SOURCING PROCEEDING STATUS BANNER ── */}
      {isSourcingLocked && (
        <div className="w-full px-4 sm:px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500 text-white flex-none shadow-xs">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                <span>Sourcing Requisition Handed Over to Procurement</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Specifications are confirmed and locked. Vendor quoting, bidding, and purchase order awards are managed in Procurement under Vendor Quotes & Bidding. Live status updates will reflect here automatically as sourcing proceeds.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-mono uppercase tracking-wider">
              Status: {currentStage.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}

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

      {/* ── ORIGIN RFQ LINEAGE BANNER ────────────────────────────────── */}
      {formData.origin_rfq_number && (
        <div className="w-full px-4 sm:px-6 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-600 text-white flex-none">
              <Layers size={13} />
            </div>
            <span className="font-bold text-indigo-900 dark:text-indigo-200">
              Awarded from Sourcing Requisition:
            </span>
            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
              {formData.origin_rfq_number}
            </span>
          </div>
          {formData.parent_rfq_id && canCompareQuotes && (
            <button
              type="button"
              onClick={() => navigate(`/orders/${formData.parent_rfq_id}/quotes`)}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>View Original Quotes & Sourcing Matrix</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      )}

      {/* ── CHILD POS MULTI-VENDOR SPLIT BANNER ────────────────────────── */}
      {formData.child_pos && formData.child_pos.length > 0 && (
        <div className="w-full px-4 sm:px-6 py-3 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-none" />
            <span className="font-bold text-emerald-950 dark:text-emerald-200">
              {isRFQ ? `Awarded & Split into ${formData.child_pos.length} official Purchase Order(s):` : `Associated Purchase Order(s):`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {formData.child_pos.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (canViewOrders) {
                    navigate(`/orders/${c.id}/edit`);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-800 dark:text-slate-200 transition shadow-2xs group ${
                  canViewOrders ? "hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer" : "cursor-default"
                }`}
                title={canViewOrders ? `Open Purchase Order ${c.po_number}` : `Purchase Order ${c.po_number}`}
              >
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{c.po_number}</span>
                {/* STRICT VENDOR SECURITY: Never display vendor in Sourcing/RFQ mode, only in PO mode for users with supplier clearance */}
                {!isRFQ && canViewSupplier && c.company && (
                  <span className="text-slate-500 text-[11px] truncate max-w-[140px]">
                    ({c.company})
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${c.badge_color || 'bg-blue-50 text-blue-800 border-blue-200'}`}>
                  {c.status_label || c.status}
                </span>
                {c.eta_date && (
                  <span className="font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                    ETA: {c.eta_date}
                  </span>
                )}
                {canViewOrders && (
                  <ArrowRight size={11} className="text-slate-400 group-hover:text-emerald-600 transition" />
                )}
              </button>
            ))}
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
        noValidate
        onSubmit={handleSubmit}
        className="w-full flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-2 max-w-[1700px] mx-auto min-w-0"
      >
        {/* ── UNIFIED MASTER WORKSPACE CARD (ORDER DETAILS + LINE ITEMS) ── */}
        <div
          className={`w-full flex-1 min-h-0 flex flex-col rounded-2xl border transition-all shadow-xs overflow-hidden ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
            }`}
        >
          {/* SECTION 1: ORDER IDENTIFICATION & HEADER (Collapsible / Compact) */}
          <div className="flex-none p-3 sm:p-3.5 border-b border-slate-200/60 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 className="w-4 h-4 text-blue-500" />
                <h2 className="text-xs sm:text-sm font-bold tracking-tight">
                  {isRFQ ? "Sourcing Requisition & Spec" : "Order Identification & Procurement Parties"}
                </h2>
                {formData.consignee && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">
                    {formData.consignee}
                  </span>
                )}
                {formData.company && !isRFQ && canViewSupplier && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                    Vendor: {formData.company}
                  </span>
                )}
                {formData.po_number && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/20">
                    {formData.po_number}
                  </span>
                )}

                {/* Work Stage Pill (Dropdown - Compact Header) */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                  <Clock size={11} className="text-blue-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Stage:</span>
                  <select
                    value={activeWorkflowStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className={`bg-transparent text-[10px] font-bold focus:outline-none cursor-pointer border-none py-0 pl-0 pr-1 ${
                      isDark ? "text-blue-300" : "text-blue-700"
                    }`}
                  >
                    {filteredStages.map((st) => (
                      <option
                        key={st.key}
                        value={st.key}
                        className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}
                      >
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contextual Dynamic Stage Date Pill (Compact Header - Exactly One Date) */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                  <dateLabelConfig.icon size={11} className="text-purple-500 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">{dateLabelConfig.compact}</span>
                  <input
                    type="date"
                    value={formData.order_mail_date ? String(formData.order_mail_date).split("T")[0] : ""}
                    onChange={(e) => handleRequestDateChange(e.target.value)}
                    className={`px-1.5 py-0.5 border rounded text-[10px] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                    }`}
                    title={dateLabelConfig.full}
                  />
                </div>

                {formData.eta_date && !isRFQ && (
                  <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <Ship size={11} /> ETA: {formData.eta_date}
                  </span>
                )}
              </div>

              {/* Right: Milestones, Priority & Collapse View Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleChange("urgent_action", !formData.urgent_action)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-2xs ${formData.urgent_action
                      ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                      : isDark
                        ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300"
                    }`}
                  title="Toggle priority: Normal vs Urgent"
                >
                  <AlertTriangle size={12} className={formData.urgent_action ? "text-white" : "text-amber-500"} />
                  <span>{formData.urgent_action ? "URGENT" : "Normal"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition shadow-2xs ${isDark
                      ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  title={isRFQ ? "View and edit sourcing timeline & milestone dates" : "View and edit purchasing milestone dates, freight mode and remarks"}
                >
                  <Calendar size={12} className="text-purple-500" />
                  <span>Milestones</span>
                  <ChevronDown size={11} className="opacity-60" />
                </button>

                {/* Collapse / Expand Toggle for Header Details */}
                <button
                  type="button"
                  onClick={() => setShowOrderDetails(!showOrderDetails)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition shadow-2xs ${isDark
                      ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                      : "border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  title={showOrderDetails ? "Collapse header fields to give table maximum screen space" : "Expand order header details"}
                >
                  <span>{showOrderDetails ? "Compact Header" : "Edit Order Header"}</span>
                  {showOrderDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>

            {/* Header Fields Grid (Collapsible to save maximum space!) */}
            {showOrderDetails && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 sm:gap-3.5 pt-1 animate-in fade-in duration-150">
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
                {!isRFQ && canViewSupplier ? (
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
                ) : isRFQ ? (
                  <div className="md:col-span-6 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Sourcing & Vendor Scope
                    </label>
                    <div className={`px-2.5 py-1.5 border rounded-lg text-[11px] font-medium flex items-center justify-between gap-2 ${isDark ? "bg-slate-800/80 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        <span>Multi-Vendor Sourcing</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {currentStage === "QUOTE_APPROVED" ? "Awarded & POs Issued" : "Suppliers bid via RFQ"}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* PO Number / RFQ Number */}
                <div className={`sm:col-span-1 ${showFinancials ? "md:col-span-3" : "md:col-span-4"} space-y-1`}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {formData.doc_type === "RFQ" ? "RFQ Number" : "PO Number"}
                  </label>
                  <input
                    type="text"
                    placeholder={formData.doc_type === "RFQ" ? "Auto (e.g. RFQ-2026-0001)" : "Auto (e.g. PO#26001)"}
                    value={formData.po_number}
                    onChange={(e) => handleChange("po_number", e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDark
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                  />
                </div>

                {/* Dynamic Stage Date */}
                <div className={`sm:col-span-1 ${showFinancials ? "md:col-span-3" : "md:col-span-4"} space-y-1`}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <dateLabelConfig.icon className="w-3 h-3 text-purple-500" />
                    <span>{dateLabelConfig.full}</span>
                  </label>
                  <input
                    type="date"
                    value={formData.order_mail_date ? String(formData.order_mail_date).split("T")[0] : ""}
                    onChange={(e) => handleRequestDateChange(e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                  />
                </div>

                {/* Accounts PO Reference */}
                {showFinancials && (
                  <div className="sm:col-span-2 md:col-span-3 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      Accounts PO Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NPO#26-0594"
                      value={formData.po_nce}
                      onChange={(e) => handleChange("po_nce", e.target.value)}
                      className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition ${isDark
                          ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                        }`}
                    />
                  </div>
                )}

                {/* Workflow Stage */}
                <div className={`sm:col-span-1 ${showFinancials ? "md:col-span-3" : "md:col-span-4"} space-y-1`}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    Workflow Stage
                  </label>
                  <select
                    value={activeWorkflowStage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-bold transition ${isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                  >
                    {filteredStages.map((st) => (
                      <option key={st.key} value={st.key}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PRODUCTS & LINE ITEMS MASTER TABLE */}
          <div className="flex-1 min-h-0 flex flex-col p-2.5 sm:p-3 space-y-2">
            {/* Header & Quick Actions */}
            <div className="flex-none flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs sm:text-sm font-bold tracking-tight">
                  Products & Line Items
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  {validItemsCount} {validItemsCount === 1 ? "Item" : "Items"}
                </span>
                {totalQuantitySum > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                    • {totalQuantitySum} Total Qty
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 italic hidden sm:inline-block">
                  Auto-adds new rows as you type
                </span>
              </div>
            </div>

            {/* Product Catalog Quick-Add Selector */}
            <div
              className={`flex-none p-1.5 sm:p-2 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${isDark ? "bg-indigo-950/20 border-indigo-900/40" : "bg-indigo-50/50 border-indigo-100"
                }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex-none px-1">
                <Boxes className="w-3.5 h-3.5" />
                <span>Search Catalog:</span>
              </div>
              <div className="flex-1 min-w-0">
                <ProductCatalogSelector
                  products={inventoryProducts}
                  onSelectProduct={handleAddCatalogProduct}
                  onNewProductCreated={(p) => setInventoryProducts((prev) => [p, ...prev])}
                  suppliers={suppliers}
                  placeholder={isRFQ ? "Quick-search catalog by Code, Description, or Category to insert..." : "Quick-search catalog by Code, Description, Category or Brand to insert..."}
                  isAccountsOrAdmin={showFinancials}
                  showFinancials={showFinancials}
                  isRFQ={isRFQ}
                  currency={formData.currency}
                  currencySymbol={activeCurrencySymbol}
                />
              </div>
            </div>

            {/* Dedicated Product Line Items Table */}
            <div className="w-full flex-1 min-h-[140px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse table-fixed min-w-[700px]">
                <colgroup>
                  <col style={{ width: `${columnWidths.index || 38}px` }} />
                  <col style={{ width: `${columnWidths.item_code || 120}px` }} />
                  <col style={{ width: `${columnWidths.description || 320}px` }} />
                  <col style={{ width: `${columnWidths.quantity_ordered || 85}px` }} />
                  <col style={{ width: `${columnWidths.unit || 70}px` }} />
                  {showFinancials ? (
                    <>
                      <col style={{ width: `${columnWidths.unit_price || 110}px` }} />
                      <col style={{ width: `${columnWidths.line_total || 110}px` }} />
                    </>
                  ) : isRFQ ? (
                    <col style={{ width: `${columnWidths.notes || 210}px` }} />
                  ) : null}
                  <col style={{ width: `${columnWidths.actions || 65}px` }} />
                </colgroup>
                <thead className="sticky top-0 z-10 shadow-2xs">
                  <tr
                    className={`border-b text-xs font-medium uppercase tracking-wider select-none ${isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                      }`}
                  >
                    <th className="relative py-1 px-2 text-center bg-inherit">
                      <span>#</span>
                      <div
                        onMouseDown={(e) => startResize(e, "index")}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                        title="Drag to resize column"
                      />
                    </th>
                    <th className="relative py-1 px-2 bg-inherit">
                      <span>SKU / Code</span>
                      <div
                        onMouseDown={(e) => startResize(e, "item_code")}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                        title="Drag to resize column"
                      />
                    </th>
                    <th className="relative py-1 px-2 bg-inherit">
                      <span>Product Description *</span>
                      <div
                        onMouseDown={(e) => startResize(e, "description")}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                        title="Drag to resize column"
                      />
                    </th>
                    <th className="relative py-1 px-2 text-right bg-inherit">
                      <span>Qty</span>
                      <div
                        onMouseDown={(e) => startResize(e, "quantity_ordered")}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                        title="Drag to resize column"
                      />
                    </th>
                    <th className="relative py-1 px-2 text-center bg-inherit">
                      <span>Unit</span>
                      <div
                        onMouseDown={(e) => startResize(e, "unit")}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                        title="Drag to resize column"
                      />
                    </th>
                    {showFinancials ? (
                      <>
                        <th className="relative py-1 px-2 text-right bg-inherit">
                          <span>Unit Price ({activeCurrencySymbol})</span>
                          <div
                            onMouseDown={(e) => startResize(e, "unit_price")}
                            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                            title="Drag to resize column"
                          />
                        </th>
                        <th className="relative py-1 px-2 text-right bg-inherit">
                          <span>Line Total ({activeCurrencySymbol})</span>
                          <div
                            onMouseDown={(e) => startResize(e, "line_total")}
                            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                            title="Drag to resize column"
                          />
                        </th>
                      </>
                    ) : isRFQ ? (
                      <th className="relative py-1 px-2 text-left bg-inherit">
                        <span>Item Notes / Specification</span>
                        <div
                          onMouseDown={(e) => startResize(e, "notes")}
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                          title="Drag to resize column"
                        />
                      </th>
                    ) : null}
                    <th className="relative py-1 px-1 text-center bg-inherit">
                      <span>Actions</span>
                      <div
                        onMouseDown={(e) => startResize(e, "actions")}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors z-20"
                        title="Drag to resize column"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                  {formData.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={showFinancials ? 8 : (isRFQ ? 7 : 6)}
                        className="py-8 px-4 text-center"
                      >
                        <div className="flex flex-col items-center justify-center space-y-1.5">
                          <Package className="w-8 h-8 opacity-25" />
                          <p className="text-xs font-normal">No product line items added yet</p>
                          <p className="text-[11px] text-slate-400 max-w-sm">
                            Search the product catalog above or click &quot;Add Line Item&quot; to begin building this order.
                          </p>
                          <button
                            type="button"
                            onClick={handleAddCustomItem}
                            className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-normal transition border border-blue-500/20"
                          >
                            <Plus size={12} />
                            <span>Add First Line Item</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    formData.items.map((it, idx) => (
                      <tr
                        key={idx}
                        className={`group transition-colors ${isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"
                          }`}
                      >
                        <td className="py-[2.5px] px-1 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px] font-normal leading-none truncate">
                          {idx + 1}
                        </td>
                        <td className="py-[2.5px] px-1.5">
                          <div className="flex items-center gap-1">
                            {it.image_url && (
                              <img
                                src={
                                  it.image_url.startsWith("http") || it.image_url.startsWith("blob:")
                                    ? it.image_url
                                    : `${process.env.REACT_APP_NETWORK}/blobs/${it.image_url}`
                                }
                                alt=""
                                className="w-5 h-5 rounded object-cover flex-none border border-slate-200 dark:border-slate-700 shadow-2xs"
                                title="Catalog Product Image"
                              />
                            )}
                            <input
                              type="text"
                              placeholder="SKU-001"
                              value={it.item_code}
                              disabled={!canEdit}
                              onChange={(e) => handleItemFieldChange(idx, "item_code", e.target.value)}
                              className={`w-full h-[24px] px-1.5 py-0 border rounded text-[11px] font-normal font-mono transition disabled:opacity-60 disabled:cursor-not-allowed ${isDark
                                  ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                }`}
                            />
                          </div>
                        </td>
                        <td className="py-[2.5px] px-1.5">
                          <input
                            type="text"
                            placeholder="Item name / specification *"
                            value={it.description}
                            disabled={!canEdit}
                            onChange={(e) => handleItemFieldChange(idx, "description", e.target.value)}
                            className={`w-full h-[24px] px-1.5 py-0 border rounded text-[11px] font-normal transition disabled:opacity-60 disabled:cursor-not-allowed ${isDark
                                ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              }`}
                          />
                        </td>
                        <td className="py-[2.5px] px-1.5">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={it.quantity_ordered}
                            disabled={!canEdit}
                            onChange={(e) => handleItemFieldChange(idx, "quantity_ordered", e.target.value)}
                            className={`w-full h-[24px] px-1.5 py-0 border rounded text-[11px] font-normal font-mono text-right transition disabled:opacity-60 disabled:cursor-not-allowed ${isDark
                                ? "bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              }`}
                          />
                        </td>
                        <td className="py-[2.5px] px-1.5">
                          <input
                            type="text"
                            placeholder="PCS"
                            value={it.unit}
                            disabled={!canEdit}
                            onChange={(e) => handleItemFieldChange(idx, "unit", e.target.value)}
                            className={`w-full h-[24px] px-1 py-0 border rounded text-[11px] font-normal text-center uppercase transition disabled:opacity-60 disabled:cursor-not-allowed ${isDark
                                ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              }`}
                          />
                        </td>
                        {showFinancials ? (
                          <>
                            <td className="py-[2.5px] px-1.5">
                              <CurrencyInput
                                currency={formData.currency}
                                symbol={activeCurrencySymbol}
                                value={it.unit_price}
                                disabled={!canEdit}
                                onChange={(e) => handleItemFieldChange(idx, "unit_price", e.target.value)}
                                placeholder="0.00"
                                className={`w-full h-[24px] px-1.5 py-0 border rounded text-[11px] font-normal font-mono text-right transition disabled:opacity-60 disabled:cursor-not-allowed ${isDark
                                    ? "bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  }`}
                              />
                            </td>
                            <td className="py-[2.5px] px-1.5 text-right font-mono font-normal text-blue-600 dark:text-blue-400 text-xs truncate">
                              <CurrencyDisplay
                                amount={it.total_price}
                                currency={formData.currency}
                                symbol={activeCurrencySymbol}
                                fallback="-"
                              />
                            </td>
                          </>
                        ) : isRFQ ? (
                          <td className="py-[2.5px] px-1.5">
                            <input
                              type="text"
                              placeholder="Specifications / requirements"
                              value={it.notes || ""}
                              disabled={!canEdit}
                              onChange={(e) => handleItemFieldChange(idx, "notes", e.target.value)}
                              className={`w-full h-[24px] px-1.5 py-0 border rounded text-[11px] font-normal transition disabled:opacity-60 disabled:cursor-not-allowed ${isDark
                                  ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  : "bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                }`}
                            />
                          </td>
                        ) : null}
                        <td className="py-[2.5px] px-1 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5">
                            {isEdit && (
                              <button
                                type="button"
                                onClick={() => setHistoryDrawerItem(it)}
                                disabled={!it.id}
                                className="p-0.5 text-slate-400 hover:text-blue-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-20"
                                title={it.id ? "View Item Revision History" : "Save order first to view history"}
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-0.5 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Remove line item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Table Footer: Item counts and totals */}
                <tfoot>
                  <tr
                    className={`border-t text-xs font-normal ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                  >
                    <td colSpan={2} className="py-[2.5px] px-2 text-xs text-slate-500 dark:text-slate-400 font-normal truncate">
                      Total Items: <span className="font-mono text-slate-800 dark:text-slate-200">{validItemsCount}</span>
                    </td>
                    <td className="py-[2.5px] px-2 text-xs text-slate-400 truncate">
                      <span className="text-[10px] italic">Auto-appends on type</span>
                    </td>
                    <td className="py-[2.5px] px-2 text-right font-mono text-slate-800 dark:text-slate-200 text-xs font-normal truncate">
                      {totalQuantitySum}
                    </td>
                    <td className="py-[2.5px] px-2 text-center text-xs text-slate-400 uppercase font-mono">
                      Units
                    </td>
                    {showFinancials ? (
                      <>
                        <td className="py-[2.5px] px-2 text-right text-xs uppercase tracking-wider text-slate-400 truncate">
                          Items Total:
                        </td>
                        <td className="py-[2.5px] px-2 text-right font-mono text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
                          <CurrencyDisplay
                            amount={itemsSubtotal}
                            currency={formData.currency}
                            symbol={activeCurrencySymbol}
                          />
                        </td>
                      </>
                    ) : null}
                    <td className="py-[2.5px] px-1"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── COMPACT FINANCIAL STRIP (ONLY FOR AUTHORIZED FINANCIAL USERS ON PURCHASE ORDERS) ── */}
            {showFinancials && (
              <div
                className={`flex-none rounded-xl border px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs ${isDark
                    ? "bg-slate-950/60 border-slate-800 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
              >
                {/* Left: Currency & Financial Values */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  {/* Currency */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Currency:</span>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border transition ${isDark
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900 shadow-2xs"
                        }`}
                    >
                      {availableCurrencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol || c.code}) - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Total */}
                  <div className="border-l border-slate-300 dark:border-slate-700 pl-3 sm:pl-4 flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total:</span>
                    <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                      <CurrencyDisplay
                        amount={effectiveOrderTotal}
                        currency={formData.currency}
                        symbol={activeCurrencySymbol}
                      />
                    </span>
                  </div>

                  {/* Paid & Due: ONLY visible if isPaymentStage and showFinancials is true */}
                  {isPaymentStage && (
                    <>
                      {/* Paid */}
                      <div className="border-l border-slate-300 dark:border-slate-700 pl-3 sm:pl-4 flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Paid:</span>
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CurrencyDisplay
                            amount={totalPaidAmount}
                            currency={formData.currency}
                            symbol={activeCurrencySymbol}
                          />
                        </span>
                      </div>

                      {/* Due */}
                      <div className="border-l border-slate-300 dark:border-slate-700 pl-3 sm:pl-4 flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Due:</span>
                        <span
                          className={`font-mono text-xs font-black ${calculatedDueAmount > 0.01 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                        >
                          <CurrencyDisplay
                            amount={calculatedDueAmount}
                            currency={formData.currency}
                            symbol={activeCurrencySymbol}
                          />
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Right: Payment Status Badge & Payment Clearance Button (ONLY if isPaymentStage and canManagePayments is true) */}
                {isPaymentStage && canManagePayments && (
                  <div className="flex items-center gap-2.5 ml-auto">
                    <span
                      className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${formData.payment_status === "FULLY_PAID" || (calculatedDueAmount <= 0.01 && effectiveOrderTotal > 0)
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : totalPaidAmount > 0
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                        }`}
                    >
                      {formData.payment_status === "FULLY_PAID" || (calculatedDueAmount <= 0.01 && effectiveOrderTotal > 0)
                        ? "Fully Paid"
                        : totalPaidAmount > 0
                          ? "Part Paid"
                          : "Unpaid"}
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
                      title="Open Payment Clearance & Financial Ledger"
                    >
                      <CreditCard size={13} />
                      <span>Payment Clearance</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </form>

      {/* ── TEMPLATE PICKER MODAL ──────────────────────────────────── */}
      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        isSourcing={Boolean(formData.doc_type === "RFQ" || location.pathname.startsWith("/sourcing") || queryDocType === "RFQ")}
        onSelectTemplate={(tpl) => {
          setActiveTemplate(tpl);
          applyTemplateData(tpl);
        }}
        onManageTemplates={() => navigate("/templates")}
      />

      {/* ── LINE ITEM REVISION HISTORY DRAWER ──────────────────────── */}
      <POItemHistoryDrawer
        isOpen={Boolean(historyDrawerItem)}
        onClose={() => setHistoryDrawerItem(null)}
        poId={orderId}
        item={historyDrawerItem}
      />

      {/* ── PO STAGE VERSION HISTORY & LINEAGE DRAWER ──────────────── */}
      <POVersionHistoryDrawer
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        poId={orderId}
        poNumber={formData.po_number}
      />

      {/* ── STAGE ITEM MODIFICATION WARNING MODAL ─────────────────── */}
      <StageWarningModal
        isOpen={showWarningModal}
        warningLevel={warningLevel}
        stage={formData.lifecycle_stage}
        currentVersion={formData.lifecycle_version}
        pendingChangesSummary={["Modified line item details or pricing in an active lifecycle stage"]}
        onConfirm={(reason) => {
          setShowWarningModal(false);
          handleSubmit(null, reason || "Scope modification confirmed by user");
        }}
        onCancel={() => setShowWarningModal(false)}
      />

      {/* ── PROFORMA PRICE VARIANCE MODAL ──────────────────────────── */}
      <PriceVarianceModal
        isOpen={showVarianceModal}
        onClose={() => setShowVarianceModal(false)}
        poId={orderId}
        varianceData={varianceData}
        onApproved={(apprData) => {
          setShowVarianceModal(false);
          fetchOrderDetails(orderId);
        }}
      />

      {/* ── PURCHASING MILESTONE DATES MODAL ────────────────────────── */}
      <POMilestoneModal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        formData={formData}
        onChange={handleChange}
        activeStageKey={formData.lifecycle_stage || formData.status}
        isAccountsOrAdmin={isAccountsOrAdmin}
      />

      {/* ── PAYMENT CLEARANCE & FINANCIAL LEDGER MODAL ──────────────── */}
      <POPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        orderId={orderId}
        poNumber={formData.po_number}
        supplierName={formData.company}
        totalAmount={effectiveOrderTotal}
        itemsSubtotal={itemsSubtotal}
        advanceAmount={formData.advance_amount}
        balanceAmount={formData.balance_amount}
        currency={formData.currency}
        currencySymbol={activeCurrencySymbol}
        paymentStatus={formData.payment_status}
        paymentDate={formData.payment_date}
        balancePaymentDate={formData.balance_payment_date}
        existingPayments={formData.payments || []}
        isAccountsOrAdmin={isAccountsOrAdmin}
        onPaymentSaved={handlePaymentModalSaved}
      />

      {/* ── ORDER SUPPORTING DOCUMENTS MODAL ───────────────────────── */}
      {showDocumentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <button
              type="button"
              onClick={() => setShowDocumentsModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <DocumentPanel
              purchaseOrderId={orderId}
              space={isRFQ ? "SOURCING" : "ORDER"}
              title={`${isRFQ ? "RFQ" : "PO"} ${formData.po_number || "Record"} Documents`}
              description={isRFQ
                ? "Upload and view tender specifications, supplier quotation sheets, and compliance datasheets."
                : "Upload and view supplier proformas, executed purchase contracts, and order documentation."}
            />
          </div>
        </div>
      )}
    </div>
  );
}
