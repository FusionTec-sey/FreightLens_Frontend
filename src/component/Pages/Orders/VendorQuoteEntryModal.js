import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  DollarSign,
  Check,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Paperclip,
  FileUp,
  Download
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import CurrencyInput, { CurrencyDisplay } from "../../UI/UXComponent/CurrencyInput";
import { toast } from "react-toastify";
import { ordersApi } from "../../../services/ordersApi";

export default function VendorQuoteEntryModal({
  isOpen,
  onClose,
  po,
  suppliers = [],
  onQuoteSaved,
  quoteToEdit = null,
  existingSupplierIds = []
}) {
  const { isDark } = useTheme();

  // Screen sizing & layout controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Line item search and filter tab
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("ALL"); // ALL | PRICED | UNPRICED | AVAILABLE | OUT_OF_STOCK

  // Master Data state
  const [masterSuppliers, setMasterSuppliers] = useState([]);
  const [masterPaymentTerms, setMasterPaymentTerms] = useState([]);
  const [masterCurrencies, setMasterCurrencies] = useState([]);
  const [quoteFile, setQuoteFile] = useState(null);
  const [existingQuoteDocs, setExistingQuoteDocs] = useState([]);

  useEffect(() => {
    if (quoteToEdit && isOpen) {
      const qId = quoteToEdit.quote_id || quoteToEdit.id;
      if (qId) {
        ordersApi.documents({ vendor_quote_id: qId }).then((docs) => {
          setExistingQuoteDocs(docs || []);
        }).catch(() => setExistingQuoteDocs([]));
      }
    } else {
      setExistingQuoteDocs([]);
      setQuoteFile(null);
    }
  }, [quoteToEdit, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}`, skip_zrok_interstitial: "true" };

    // Fetch rich suppliers with payment_term and default_currency
    axios
      .get(`${process.env.REACT_APP_NETWORK}/master-data/suppliers?active_only=true`, { headers })
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setMasterSuppliers(res.data);
        }
      })
      .catch((err) => console.warn("Could not load master suppliers:", err));

    // Fetch active payment terms
    axios
      .get(`${process.env.REACT_APP_NETWORK}/master-data/payment-terms?active_only=true`, { headers })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setMasterPaymentTerms(res.data);
        }
      })
      .catch((err) => console.warn("Could not load payment terms:", err));

    // Fetch active currencies
    axios
      .get(`${process.env.REACT_APP_NETWORK}/master-data/currencies?active_only=true`, { headers })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setMasterCurrencies(res.data);
        }
      })
      .catch((err) => console.warn("Could not load currencies:", err));
  }, [isOpen]);

  const allSuppliers = useMemo(() => {
    if (masterSuppliers.length > 0) return masterSuppliers;
    return suppliers;
  }, [masterSuppliers, suppliers]);

  const availableSuppliers = useMemo(() => {
    if (quoteToEdit) return allSuppliers;
    const quotedSet = new Set((existingSupplierIds || []).map((id) => Number(id)));
    return allSuppliers.filter((s) => {
      const sId = Number(s.id ?? s.supplier_id);
      return !quotedSet.has(sId);
    });
  }, [allSuppliers, existingSupplierIds, quoteToEdit]);

  const [formData, setFormData] = useState({
    supplier_id: null,
    quote_reference: "",
    quote_date: new Date().toISOString().slice(0, 10),
    valid_until: "",
    delivery_lead_time_days: 21,
    payment_terms: "",
    shipping_terms: "FOB",
    score_notes: "",
    currency: po?.currency || "USD",
    items: []
  });

  const selectedSupplier = useMemo(() => {
    if (!formData.supplier_id) return null;
    return allSuppliers.find(
      (s) => Number(s.id ?? s.supplier_id) === Number(formData.supplier_id)
    );
  }, [allSuppliers, formData.supplier_id]);

  const attachedVendorTerm = useMemo(() => {
    if (!selectedSupplier) return "";
    return selectedSupplier.payment_term?.name || selectedSupplier.payment_terms || "";
  }, [selectedSupplier]);

  const handleSupplierChange = (selectedSupplierId) => {
    const sId = selectedSupplierId ? Number(selectedSupplierId) : null;
    const matched = allSuppliers.find(
      (s) => Number(s.id ?? s.supplier_id) === sId
    );

    setFormData((prev) => {
      const next = {
        ...prev,
        supplier_id: sId,
      };
      if (matched) {
        const attachedTerm = matched.payment_term?.name || matched.payment_terms || "";
        if (attachedTerm) {
          next.payment_terms = attachedTerm;
        }
        if (matched.default_currency) {
          next.currency = matched.default_currency;
        }
      }
      return next;
    });
  };

  const [submitting, setSubmitting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Populate items from PO or fetch existing quote details when editing
  useEffect(() => {
    if (!isOpen || !po) return;

    const activePoItems = (po.items || []).filter((i) => !i.is_deleted);

    if (quoteToEdit) {
      const quoteId = quoteToEdit.quote_id || quoteToEdit.id;
      setLoadingDetails(true);
      const fetchDetails = async () => {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_NETWORK}/orders/${po.id}/quotes/${quoteId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                skip_zrok_interstitial: "true"
              }
            }
          );
          const q = res.data;
          const quotedMap = new Map((q.items || []).map((it) => [it.po_item_id, it]));

          setFormData({
            supplier_id: q.supplier_id || null,
            quote_reference: q.quote_reference || "",
            quote_date: q.quote_date || new Date().toISOString().slice(0, 10),
            valid_until: q.valid_until || "",
            delivery_lead_time_days: q.delivery_lead_time_days || 21,
            payment_terms: q.payment_terms || "",
            shipping_terms: q.shipping_terms || "FOB",
            score_notes: q.score_notes || "",
            currency: q.currency || po.currency || "USD",
            items: activePoItems.map((it) => {
              const matched = quotedMap.get(it.id);
              return {
                po_item_id: it.id,
                inventory_product_id: it.product_id,
                item_code: it.item_code,
                description: it.description,
                po_quantity: it.quantity_ordered || 1.0,
                unit: it.unit || "PCS",
                quantity_quoted: matched ? matched.quantity_quoted : (it.quantity_ordered || 1.0),
                unit_price: matched ? matched.unit_price : 0.0,
                availability: matched ? matched.availability : "AVAILABLE",
                lead_time_days: matched?.lead_time_days || q.delivery_lead_time_days || 21,
                is_substitute: matched ? matched.is_substitute : false,
                notes: matched?.notes || ""
              };
            })
          });
        } catch (err) {
          console.error("Failed to load quote details for editing:", err);
          setErrorMsg("Could not load quotation details for editing.");
        } finally {
          setLoadingDetails(false);
        }
      };
      fetchDetails();
    } else {
      // For new quotation: default supplier is explicitly BLANK, and payment terms start blank until supplier is selected
      setFormData({
        supplier_id: null,
        quote_reference: "",
        quote_date: new Date().toISOString().slice(0, 10),
        valid_until: "",
        delivery_lead_time_days: 21,
        payment_terms: "",
        shipping_terms: "FOB",
        score_notes: "",
        currency: po.currency || "USD",
        items: activePoItems.map((it) => ({
          po_item_id: it.id,
          inventory_product_id: it.product_id,
          item_code: it.item_code,
          description: it.description,
          po_quantity: it.quantity_ordered || 1.0,
          unit: it.unit || "PCS",
          quantity_quoted: it.quantity_ordered || 1.0,
          unit_price: 0.0,
          availability: "AVAILABLE",
          lead_time_days: 21,
          is_substitute: false,
          notes: ""
        }))
      });
    }
    setErrorMsg("");
    setSearchQuery("");
    setActiveFilterTab("ALL");
  }, [isOpen, po, quoteToEdit]);

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  // Bulk actions for 100+ items
  const handleBulkSetAvailability = (status) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it) => ({ ...it, availability: status }))
    }));
    toast.info(`Updated all items to ${status}`);
  };

  const handleBulkSyncLeadTimes = () => {
    const days = formData.delivery_lead_time_days || 21;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it) => ({ ...it, lead_time_days: days }))
    }));
    toast.info(`Synced lead times of all items to ${days} days`);
  };

  const handleBulkSyncQuantities = () => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((it) => ({
        ...it,
        quantity_quoted: it.po_quantity || it.quantity_ordered || 1
      }))
    }));
    toast.info("Copied requested quantities to quoted quantities");
  };

  // Metrics
  const totalQuoted = useMemo(() => {
    return formData.items.reduce((acc, it) => {
      const q = parseFloat(it.quantity_quoted) || 0;
      const p = parseFloat(it.unit_price) || 0;
      return acc + q * p;
    }, 0);
  }, [formData.items]);

  const metrics = useMemo(() => {
    const total = formData.items.length;
    const priced = formData.items.filter((it) => parseFloat(it.unit_price) > 0).length;
    const available = formData.items.filter((it) => it.availability === "AVAILABLE").length;
    const outOfStock = formData.items.filter((it) => it.availability === "OUT_OF_STOCK").length;
    const pctPriced = total > 0 ? Math.round((priced / total) * 100) : 0;
    return { total, priced, available, outOfStock, pctPriced };
  }, [formData.items]);

  // Filtered items mapped with original index for safe bidirectional editing
  const filteredItemsWithIndex = useMemo(() => {
    let list = (formData.items || []).map((it, originalIdx) => ({
      it,
      originalIdx
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(({ it }) =>
        (it.item_code && it.item_code.toLowerCase().includes(q)) ||
        (it.description && it.description.toLowerCase().includes(q)) ||
        (it.notes && it.notes.toLowerCase().includes(q))
      );
    }

    if (activeFilterTab === "PRICED") {
      list = list.filter(({ it }) => parseFloat(it.unit_price) > 0);
    } else if (activeFilterTab === "UNPRICED") {
      list = list.filter(({ it }) => !it.unit_price || parseFloat(it.unit_price) <= 0);
    } else if (activeFilterTab === "AVAILABLE") {
      list = list.filter(({ it }) => it.availability === "AVAILABLE");
    } else if (activeFilterTab === "OUT_OF_STOCK") {
      list = list.filter(({ it }) => it.availability === "OUT_OF_STOCK");
    }

    return list;
  }, [formData.items, searchQuery, activeFilterTab]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.supplier_id) {
      setErrorMsg("Please select a Vendor / Supplier.");
      return;
    }
    if (!quoteToEdit) {
      const quotedSet = new Set((existingSupplierIds || []).map((id) => Number(id)));
      if (quotedSet.has(Number(formData.supplier_id))) {
        setErrorMsg("A quotation from this supplier already exists for this order. You cannot add duplicate quotes.");
        return;
      }
    }
    if (formData.items.length === 0) {
      setErrorMsg("No items to quote.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        ...formData,
        supplier_id: Number(formData.supplier_id),
        delivery_lead_time_days: formData.delivery_lead_time_days ? Number(formData.delivery_lead_time_days) : null,
        quote_date: formData.quote_date || null,
        valid_until: formData.valid_until || null,
        items: formData.items.map((it) => ({
          ...it,
          quantity_quoted: parseFloat(it.quantity_quoted) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          lead_time_days: it.lead_time_days ? parseInt(it.lead_time_days, 10) : null,
        })),
      };

      let targetQuoteId = quoteToEdit ? (quoteToEdit.quote_id || quoteToEdit.id) : null;
      if (quoteToEdit) {
        await axios.put(
          `${process.env.REACT_APP_NETWORK}/orders/${po.id}/quotes/${targetQuoteId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true"
            }
          }
        );
        toast.success("Vendor quote updated successfully!");
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/orders/${po.id}/quotes`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true"
            }
          }
        );
        targetQuoteId = res.data?.quote_id;
        toast.success("Vendor quotation recorded successfully!");
      }

      if (quoteFile && targetQuoteId) {
        const formData = new FormData();
        formData.append("file", quoteFile);
        formData.append("document_type", "quotation");
        formData.append("vendor_quote_id", targetQuoteId);
        try {
          await ordersApi.uploadDocument(formData);
          toast.success("Quotation sheet attached successfully!");
        } catch (uploadErr) {
          console.warn("Could not upload quote attachment:", uploadErr);
        }
      }

      if (onQuoteSaved) onQuoteSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save vendor quote:", err);
      const detail = err.response?.data?.detail;
      let displayMsg = "Failed to record vendor quotation.";
      if (typeof detail === "string") {
        displayMsg = detail;
      } else if (Array.isArray(detail)) {
        displayMsg = detail
          .map((d) => (d.loc ? `${d.loc[d.loc.length - 1]}: ${d.msg}` : d.msg || JSON.stringify(d)))
          .join("; ");
      } else if (detail && typeof detail === "object") {
        displayMsg = JSON.stringify(detail);
      }
      setErrorMsg(displayMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 md:p-3 animate-in fade-in duration-150">
      <div
        className={`w-full transition-all flex flex-col ${
          isFullscreen
            ? "fixed inset-0 h-screen rounded-none border-none shadow-none"
            : "h-full max-h-[98vh] max-w-[98vw] rounded-2xl border shadow-2xl"
        } overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3 border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-none border border-blue-500/20">
              <DollarSign size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold tracking-tight truncate">
                  {quoteToEdit ? "Edit Vendor Quotation" : "Record Vendor Quotation (RFQ Response)"}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  PO #{po?.po_number}
                </span>
                {selectedSupplier && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 truncate max-w-[200px]">
                    Vendor: {selectedSupplier.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {formData.items.length} line items to price · {metrics.priced} priced ({metrics.pctPriced}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-none">
            {/* Collapse / Expand Parameters toggle */}
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isHeaderCollapsed ? "Expand quotation parameters" : "Collapse quotation parameters to maximize table height"}
            >
              {isHeaderCollapsed ? (
                <>
                  <ChevronDown size={13} />
                  <span className="hidden sm:inline">Show Details</span>
                </>
              ) : (
                <>
                  <ChevronUp size={13} />
                  <span className="hidden sm:inline">Compact Details</span>
                </>
              )}
            </button>

            {/* Maximize / Restore full-screen toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isFullscreen ? "Restore window size" : "Expand to Full Screen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── FORM CONTENT ──────────────────────────────────────────────────── */}
        {loadingDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-2 text-slate-400">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <span className="text-xs">Loading quotation details...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {errorMsg && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-2 flex-none">
                <AlertCircle size={14} className="flex-none" />
                <span className="text-xs font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* ── 1. HEADER PARAMETERS (EXPANDED OR COMPACT) ────────────────── */}
            {!isHeaderCollapsed ? (
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex-none">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
                  {/* Supplier selection */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Quoting Vendor / Supplier <span className="text-rose-500">*</span>
                    </label>
                    {availableSuppliers.length === 0 && !quoteToEdit ? (
                      <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1.5">
                        <AlertCircle size={13} className="flex-none" />
                        <span className="text-[11px]">All suppliers already quoted.</span>
                      </div>
                    ) : (
                      <GenericSelector
                        value={formData.supplier_id}
                        onChange={handleSupplierChange}
                        placeholder="Select Supplier..."
                        options={availableSuppliers}
                        labelKey="name"
                        valueKey="id"
                      />
                    )}
                  </div>

                  {/* Quote Reference */}
                  <div className="sm:col-span-1 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Vendor Quote Ref #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. QUO-2026-88"
                      value={formData.quote_reference}
                      onChange={(e) => setFormData((prev) => ({ ...prev, quote_reference: e.target.value }))}
                      className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono font-bold transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  {/* Quote Date */}
                  <div className="sm:col-span-1 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Quote Date
                    </label>
                    <input
                      type="date"
                      value={formData.quote_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, quote_date: e.target.value }))}
                      className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  {/* Validity Expiry Date */}
                  <div className="sm:col-span-1 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Validity Expiry
                    </label>
                    <input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData((prev) => ({ ...prev, valid_until: e.target.value }))}
                      className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  {/* Delivery Lead Time Days */}
                  <div className="sm:col-span-1 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Lead Time (Days)
                    </label>
                    <input
                      type="number"
                      value={formData.delivery_lead_time_days}
                      onChange={(e) => setFormData((prev) => ({ ...prev, delivery_lead_time_days: parseInt(e.target.value) || 0 }))}
                      className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono font-bold transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  {/* Incoterms / Shipping Terms */}
                  <div className="sm:col-span-1 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Incoterms
                    </label>
                    <select
                      value={formData.shipping_terms}
                      onChange={(e) => setFormData((prev) => ({ ...prev, shipping_terms: e.target.value }))}
                      className={`w-full px-2 py-1 border rounded-lg text-[11px] font-bold transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="FOB">FOB</option>
                      <option value="CIF">CIF</option>
                      <option value="CFR">CFR</option>
                      <option value="EXW">EXW</option>
                      <option value="DDP">DDP</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div className="sm:col-span-1 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                      className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono font-bold transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      {(masterCurrencies.length > 0 ? masterCurrencies : [
                        { code: "USD", name: "US Dollar", symbol: "$" },
                        { code: "EUR", name: "Euro", symbol: "€" },
                        { code: "SCR", name: "Seychelles Rupee", symbol: "SCR" },
                        { code: "GBP", name: "British Pound", symbol: "£" },
                        { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
                        { code: "AED", name: "UAE Dirham", symbol: "AED" },
                        { code: "INR", name: "Indian Rupee", symbol: "₹" },
                      ]).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol || c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Terms */}
                  <div className="sm:col-span-2 md:col-span-4 lg:col-span-8 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Payment Terms
                      </label>
                      {attachedVendorTerm && formData.payment_terms === attachedVendorTerm && (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check size={10} /> Auto-filled from vendor profile
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      list="vendor-payment-terms-list"
                      placeholder={attachedVendorTerm ? `Vendor attached: ${attachedVendorTerm}` : "Select or enter payment terms..."}
                      value={formData.payment_terms}
                      onChange={(e) => setFormData((prev) => ({ ...prev, payment_terms: e.target.value }))}
                      className={`w-full px-2.5 py-1 border rounded-lg text-[11px] font-medium transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                    <datalist id="vendor-payment-terms-list">
                      {masterPaymentTerms.map((pt) => (
                        <option key={pt.id || pt.code} value={pt.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Vendor Quotation Document Attachment */}
                  <div className="sm:col-span-2 md:col-span-4 lg:col-span-8 space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Vendor Quotation Sheet / Proforma Document (Optional)
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {existingQuoteDocs.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={async () => {
                            try {
                              const blob = await ordersApi.downloadDocument(doc.id);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = doc.original_name || `quote_${doc.id}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            } catch (err) {
                              toast.error("Download failed");
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition shadow-2xs group"
                          title="Download existing attached document"
                        >
                          <Paperclip size={12} className="text-blue-500" />
                          <span className="max-w-[150px] truncate">{doc.original_name || "Quote Document"}</span>
                          <Download size={11} className="opacity-60" />
                        </button>
                      ))}

                      {quoteFile ? (
                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                        }`}>
                          <Paperclip size={12} className="text-emerald-500 flex-none" />
                          <span className="text-[11px] font-medium truncate max-w-[160px]">{quoteFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setQuoteFile(null)}
                            className="p-0.5 text-slate-400 hover:text-rose-500 rounded"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed cursor-pointer text-xs transition ${
                          isDark ? "border-slate-700 hover:border-blue-500 bg-slate-800/40 text-slate-300" : "border-slate-300 hover:border-blue-500 bg-slate-50 text-slate-600"
                        }`}>
                          <FileUp size={13} className="text-blue-500" />
                          <span className="text-[11px] font-semibold">+ Attach Quotation PDF / Sheet</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              if (e.target.files?.[0]) setQuoteFile(e.target.files[0]);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Compact Summary Strip when parameters are collapsed */
              <div className="px-4 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-3 text-xs flex-none flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[11px]">
                    <strong className="text-slate-400 font-normal">Vendor:</strong>{" "}
                    <strong>{selectedSupplier?.name || "Not Selected"}</strong>
                  </span>
                  <span className="text-[11px] border-l pl-3 border-slate-300 dark:border-slate-700">
                    <strong className="text-slate-400 font-normal">Ref:</strong>{" "}
                    <span className="font-mono">{formData.quote_reference || "—"}</span>
                  </span>
                  <span className="text-[11px] border-l pl-3 border-slate-300 dark:border-slate-700">
                    <strong className="text-slate-400 font-normal">Currency:</strong>{" "}
                    <span className="font-mono font-bold">{formData.currency}</span>
                  </span>
                  <span className="text-[11px] border-l pl-3 border-slate-300 dark:border-slate-700">
                    <strong className="text-slate-400 font-normal">Terms:</strong>{" "}
                    <span>{formData.payment_terms || "—"}</span>
                  </span>
                  <span className="text-[11px] border-l pl-3 border-slate-300 dark:border-slate-700">
                    <strong className="text-slate-400 font-normal">Lead Time:</strong>{" "}
                    <span>{formData.delivery_lead_time_days} days</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHeaderCollapsed(false)}
                  className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                >
                  Edit Parameters
                </button>
              </div>
            )}

            {/* ── 2. LINE ITEMS TOOLBAR FOR 100+ ITEMS ──────────────────────── */}
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 flex-none">
              {/* Left: Search input & Filter Tabs */}
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-sm">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search 100+ items by SKU, description, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-7 py-1 text-xs rounded-lg border transition ${
                      isDark ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("ALL")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition whitespace-nowrap ${
                      activeFilterTab === "ALL"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    All ({metrics.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("PRICED")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition whitespace-nowrap ${
                      activeFilterTab === "PRICED"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Priced ({metrics.priced})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("UNPRICED")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition whitespace-nowrap ${
                      activeFilterTab === "UNPRICED"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Unpriced ({metrics.total - metrics.priced})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("AVAILABLE")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition whitespace-nowrap hidden sm:inline-block ${
                      activeFilterTab === "AVAILABLE"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Available ({metrics.available})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilterTab("OUT_OF_STOCK")}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition whitespace-nowrap hidden sm:inline-block ${
                      activeFilterTab === "OUT_OF_STOCK"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Out of Stock ({metrics.outOfStock})
                  </button>
                </div>
              </div>

              {/* Right: Bulk Action Tools & Count indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 hidden lg:inline-block">
                  Showing {filteredItemsWithIndex.length} of {formData.items.length} items
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleBulkSetAvailability("AVAILABLE")}
                    className="px-2 py-1 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Mark all items as fully available"
                  >
                    All Available
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkSyncLeadTimes}
                    className="px-2 py-1 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title={`Set lead time to ${formData.delivery_lead_time_days || 21} days for all items`}
                  >
                    Sync Lead Time
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkSyncQuantities}
                    className="px-2 py-1 rounded text-[10px] font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Reset all quoted quantities to requested PO quantities"
                  >
                    Reset Qty
                  </button>
                </div>
              </div>
            </div>

            {/* ── 3. HIGH-DENSITY ERP QUOTATION LINE ITEMS TABLE ─────────────── */}
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-[220px] scrollbar-thin">
              <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
                <colgroup>
                  <col style={{ width: "40px" }} />
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "280px" }} />
                  <col style={{ width: "85px" }} />
                  <col style={{ width: "95px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "135px" }} />
                  <col style={{ width: "85px" }} />
                  <col style={{ width: "180px" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 shadow-2xs">
                  <tr className="border-b text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300">
                    <th className="py-2 px-2 text-center">#</th>
                    <th className="py-2 px-2">SKU / Code</th>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-right">PO Req</th>
                    <th className="py-2 px-2 text-right">Quoted Qty</th>
                    <th className="py-2 px-2 text-right">Unit Price ({formData.currency})</th>
                    <th className="py-2 px-2 text-right">Line Total</th>
                    <th className="py-2 px-2 text-center">Availability</th>
                    <th className="py-2 px-2 text-center">Lead Days</th>
                    <th className="py-2 px-2">Notes / Alternative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredItemsWithIndex.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Filter size={20} className="opacity-30" />
                          <p className="text-xs">No line items match your search or filter.</p>
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => { setSearchQuery(""); setActiveFilterTab("ALL"); }}
                              className="text-xs text-blue-500 underline"
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItemsWithIndex.map(({ it, originalIdx }, displayIndex) => {
                      const lineTot = (parseFloat(it.quantity_quoted) || 0) * (parseFloat(it.unit_price) || 0);
                      const isPriced = parseFloat(it.unit_price) > 0;

                      return (
                        <tr
                          key={originalIdx}
                          className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition ${
                            isPriced ? "" : "bg-amber-50/20 dark:bg-amber-950/10"
                          }`}
                        >
                          {/* Row Index */}
                          <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-400">
                            {originalIdx + 1}
                          </td>

                          {/* SKU / Code */}
                          <td className="py-1.5 px-2 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                            {it.item_code || "—"}
                          </td>

                          {/* Description */}
                          <td className="py-1.5 px-2">
                            <div className="font-semibold text-[11px] text-slate-900 dark:text-slate-100 truncate" title={it.description}>
                              {it.description}
                            </div>
                          </td>

                          {/* PO Requested Quantity */}
                          <td className="py-1.5 px-2 text-right font-mono text-[11px] text-slate-500">
                            {it.po_quantity || it.quantity_ordered || "—"} <span className="text-[9px] uppercase">{it.unit || "PCS"}</span>
                          </td>

                          {/* Quoted Quantity */}
                          <td className="py-1.5 px-1.5 text-right">
                            <input
                              type="number"
                              step="any"
                              value={it.quantity_quoted}
                              onChange={(e) => handleItemChange(originalIdx, "quantity_quoted", parseFloat(e.target.value) || 0)}
                              className={`w-full h-[24px] px-1.5 py-0 border rounded text-right font-mono font-bold text-[11px] ${
                                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                          </td>

                          {/* Unit Price (CurrencyInput: number on focus, currency on blur) */}
                          <td className="py-1.5 px-1.5 text-right">
                            <CurrencyInput
                              currency={formData.currency}
                              value={it.unit_price}
                              onChange={(e) => handleItemChange(originalIdx, "unit_price", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className={`w-full h-[24px] px-1.5 py-0 border rounded text-right font-mono font-bold text-[11px] ${
                                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                          </td>

                          {/* Line Total */}
                          <td className="py-1.5 px-2 text-right font-mono font-black text-xs text-blue-600 dark:text-blue-400 truncate">
                            <CurrencyDisplay amount={lineTot} currency={formData.currency} fallback="-" />
                          </td>

                          {/* Availability */}
                          <td className="py-1.5 px-1.5 text-center">
                            <select
                              value={it.availability}
                              onChange={(e) => handleItemChange(originalIdx, "availability", e.target.value)}
                              className={`w-full h-[24px] px-1 py-0 border rounded text-[10px] font-bold ${
                                it.availability === "AVAILABLE"
                                  ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20"
                                  : it.availability === "PARTIAL"
                                  ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20"
                                  : it.availability === "SUBSTITUTE_OFFERED"
                                  ? "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20"
                                  : "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/20"
                              }`}
                            >
                              <option value="AVAILABLE">AVAILABLE (Full)</option>
                              <option value="PARTIAL">PARTIAL Qty</option>
                              <option value="SUBSTITUTE_OFFERED">SUBSTITUTE</option>
                              <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                            </select>
                          </td>

                          {/* Lead Days */}
                          <td className="py-1.5 px-1.5 text-center">
                            <input
                              type="number"
                              value={it.lead_time_days || ""}
                              onChange={(e) => handleItemChange(originalIdx, "lead_time_days", parseInt(e.target.value) || 0)}
                              placeholder="21"
                              className={`w-full h-[24px] px-1 py-0 border rounded text-center font-mono text-[11px] ${
                                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                          </td>

                          {/* Notes */}
                          <td className="py-1.5 px-1.5">
                            <input
                              type="text"
                              value={it.notes || ""}
                              onChange={(e) => handleItemChange(originalIdx, "notes", e.target.value)}
                              placeholder="Notes / model substitution..."
                              className={`w-full h-[24px] px-2 py-0 border rounded text-[11px] ${
                                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 4. PINNED BOTTOM FOOTER ───────────────────────────────────────── */}
        <div className="px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-3 border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex-none">
          {/* Progress metric */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Priced Line Items:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold">
                  {metrics.priced} / {metrics.total} items ({metrics.pctPriced}%)
                </span>
                <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${metrics.pctPriced}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="border-l pl-3 border-slate-300 dark:border-slate-700 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Total Quoted Amount:
              </span>
              <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                <CurrencyDisplay amount={totalQuoted} currency={formData.currency} />
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || loadingDetails || (!quoteToEdit && availableSuppliers.length === 0)}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{quoteToEdit ? "Updating..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{quoteToEdit ? "Update Vendor Quote" : "Save Vendor Quote"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
