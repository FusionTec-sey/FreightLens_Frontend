import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  X,
  Save,
  Plus,
  Trash2,
  Package,
  Layers,
  Lock,
  Globe,
  Loader2,
  AlertCircle,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Boxes,
  Tag,
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useOptions } from "../../../hooks/useOptions";
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import ProductCatalogSelector from "../../UI/UXComponent/ProductCatalogSelector";

export default function TemplateForm({ templateData, existingTags = [], onClose, onSave }) {
  const { isDark } = useTheme();
  const { isRoot, hasModule, permissions = [] } = useAuth();
  const { suppliers = [] } = useOptions();
  const hasInventory = Boolean(hasModule?.("INVENTORY"));

  const canViewSupplier =
    isRoot || permissions.includes("View_Supplier") || permissions.includes("Administrator");
  const canViewFinancials =
    isRoot ||
    permissions.includes("View_Financials") ||
    permissions.includes("Manage_Financials") ||
    permissions.includes("Administrator");

  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [availableTags, setAvailableTags] = useState([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef(null);
  const catalogInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // UI state for high-volume editing
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [],
    supplier_id: null,
    company: "",
    freight_type: "Sea Freight",
    notes: "",
    visibility: "org",
    items: [],
  });

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

  useEffect(() => {
    // Populate available tags from parent and templateData
    const initial = new Set(existingTags || []);
    if (Array.isArray(templateData?.tags)) {
      templateData.tags.forEach((t) => t && initial.add(String(t).trim()));
    }
    setAvailableTags(Array.from(initial));

    // Also fetch latest global/org tags from backend
    const token = localStorage.getItem("token");
    axios
      .get(`${process.env.REACT_APP_NETWORK}/orders/templates/tags`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          skip_zrok_interstitial: "true",
        },
      })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAvailableTags((prev) => {
            const combined = new Set([...prev, ...res.data]);
            return Array.from(combined);
          });
        }
      })
      .catch((err) => console.warn("Could not fetch template tags:", err));
  }, [existingTags, templateData]);

  // Click outside listener to close tag dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (templateData) {
      setFormData({
        name: templateData.name || "",
        description: templateData.description || "",
        tags: Array.isArray(templateData.tags) ? templateData.tags : [],
        supplier_id: templateData.supplier_id || null,
        company: templateData.company || "",
        freight_type: templateData.freight_type || "Sea Freight",
        notes: templateData.notes || "",
        visibility: templateData.visibility || "org",
        items: (templateData.items || []).map((it) => ({
          product_id: it.product_id || null,
          item_code: it.item_code || "",
          description: it.description || "",
          default_quantity: it.default_quantity || 1,
          unit: it.unit || "PCS",
          unit_price: it.unit_price || "",
          currency: it.currency || "USD",
          notes: it.notes || "",
        })),
      });
    }
  }, [templateData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (supplierId) => {
    const matched = suppliers.find(
      (s) => s.id === supplierId || s.supplier_id === supplierId
    );
    setFormData((prev) => ({
      ...prev,
      supplier_id: supplierId,
      company: matched ? matched.name : prev.company,
    }));
  };

  const filteredTagOptions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    return availableTags.filter((t) => {
      const notSelected = !formData.tags.some(
        (sel) => sel.toLowerCase() === t.toLowerCase()
      );
      if (!notSelected) return false;
      if (!q) return true;
      return t.toLowerCase().includes(q);
    });
  }, [availableTags, formData.tags, tagInput]);

  const isNewTag = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return false;
    return !availableTags.some((t) => t.toLowerCase() === q);
  }, [availableTags, tagInput]);

  const handleSelectOrAddTag = (tagToAdd) => {
    const clean = String(tagToAdd).trim().replace(/^#/, "");
    if (!clean) return;
    if (!formData.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, clean],
      }));
    }
    setAvailableTags((prev) => {
      if (!prev.some((t) => t.toLowerCase() === clean.toLowerCase())) {
        return [...prev, clean];
      }
      return prev;
    });
    setTagInput("");
    setIsTagDropdownOpen(false);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInput.trim()) {
        handleSelectOrAddTag(tagInput.trim());
      }
    } else if (e.key === "Escape") {
      setIsTagDropdownOpen(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleFocusCatalog = () => {
    if (detailsCollapsed) setDetailsCollapsed(false);
    setTimeout(() => {
      if (catalogInputRef.current) {
        catalogInputRef.current.focus();
        catalogInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  const handleAddCatalogProduct = (prodOrId) => {
    if (!prodOrId) return;
    const prod =
      typeof prodOrId === "object"
        ? prodOrId
        : inventoryProducts.find((p) => String(p.id) === String(prodOrId));
    if (!prod) return;

    const existingIndex = formData.items.findIndex(
      (it) => it.product_id === prod.id
    );

    if (existingIndex >= 0) {
      const updated = [...formData.items];
      updated[existingIndex].default_quantity =
        (parseFloat(updated[existingIndex].default_quantity) || 1) + 1;
      setFormData((prev) => ({ ...prev, items: updated }));
    } else {
      let suppName = "";
      if (prod.default_supplier_id && suppliers.length > 0) {
        const found = suppliers.find(
          (s) => s.id === prod.default_supplier_id || s.supplier_id === prod.default_supplier_id
        );
        if (found) suppName = found.name;
      }

      const newItem = {
        product_id: prod.id,
        item_code: prod.sku || prod.code || "",
        description: prod.name,
        default_quantity: 1,
        unit: prod.unit || "PCS",
        unit_price: prod.unit_cost !== null && prod.unit_cost !== undefined ? prod.unit_cost : "",
        currency: prod.currency || "USD",
        notes: prod.factory_code ? `Factory Code: ${prod.factory_code}` : "",
      };
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
        supplier_id: prev.supplier_id || prod.default_supplier_id || null,
        company: prev.company || suppName || prev.company,
      }));
    }
  };

  const handleAddCustomItem = () => {
    const newItem = {
      product_id: null,
      item_code: "",
      description: "",
      default_quantity: 1,
      unit: "PCS",
      unit_price: "",
      currency: "USD",
      notes: "",
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleDuplicateItem = (originalIndex) => {
    const itemToClone = formData.items[originalIndex];
    if (!itemToClone) return;
    const cloned = { ...itemToClone, product_id: null };
    const updated = [...formData.items];
    updated.splice(originalIndex + 1, 0, cloned);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleClearAllItems = () => {
    if (formData.items.length === 0) return;
    if (window.confirm("Are you sure you want to remove all items from this template?")) {
      setFormData((prev) => ({ ...prev, items: [] }));
    }
  };

  const handleItemFieldChange = (index, field, val) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: val };
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index) => {
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  // Filtered items for search
  const filteredIndexedItems = useMemo(() => {
    const query = itemSearchQuery.trim().toLowerCase();
    return formData.items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (!query) return true;
        const descMatch = String(item.description || "").toLowerCase().includes(query);
        const codeMatch = String(item.item_code || "").toLowerCase().includes(query);
        const notesMatch = String(item.notes || "").toLowerCase().includes(query);
        const unitMatch = String(item.unit || "").toLowerCase().includes(query);
        return descMatch || codeMatch || notesMatch || unitMatch;
      });
  }, [formData.items, itemSearchQuery]);

  // Aggregate KPI stats
  const stats = useMemo(() => {
    let totalQuantity = 0;
    let totalEstimatedValue = 0;
    formData.items.forEach((it) => {
      const q = parseFloat(it.default_quantity) || 0;
      const p = parseFloat(it.unit_price) || 0;
      totalQuantity += q;
      totalEstimatedValue += q * p;
    });
    return {
      totalItems: formData.items.length,
      totalQuantity,
      totalEstimatedValue,
    };
  }, [formData.items]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Template name is required.");
      return;
    }
    if (formData.items.length === 0) {
      setErrorMsg("Please add at least one product/item to this template.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    const sanitizedPayload = {
      ...formData,
      items: formData.items
        .filter((it) => (it.description || "").trim() || (it.item_code || "").trim())
        .map((it) => ({
          ...it,
          default_quantity: parseFloat(it.default_quantity) || 1,
          unit_price:
            it.unit_price === "" || it.unit_price === null || isNaN(parseFloat(it.unit_price))
              ? null
              : parseFloat(it.unit_price),
        })),
    };

    try {
      let res;
      if (templateData && templateData.id) {
        res = await axios.patch(
          `${process.env.REACT_APP_NETWORK}/orders/templates/${templateData.id}`,
          sanitizedPayload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
      } else {
        res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/orders/templates`,
          sanitizedPayload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
      }
      onSave(res.data);
      onClose();
    } catch (err) {
      console.error("Failed to save template:", err);
      setErrorMsg(
        err.response?.data?.detail || "Failed to save template. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full flex flex-col rounded-2xl shadow-2xl overflow-hidden border transition-all duration-200 ${
          isFullScreen
            ? "w-screen h-screen max-w-none rounded-none"
            : "max-w-[98vw] 2xl:max-w-[1700px] h-[95vh]"
        } ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header Bar */}
        <div
          className={`flex-none px-5 py-3 border-b flex items-center justify-between gap-4 ${
            isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50/90"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  {templateData?.id ? "Edit Order Template" : "New Order Template"}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  ERP Spreadsheet Mode
                </span>
                {formData.visibility === "private" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Lock className="w-3 h-3" /> Private
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Globe className="w-3 h-3" /> Org-Wide
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Configure high-volume line items, default vendor specifications, and procurement defaults
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDetailsCollapsed((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                isDark
                  ? "border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
              }`}
              title={detailsCollapsed ? "Expand template details" : "Collapse template details to maximize table area"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
              <span>{detailsCollapsed ? "Show Info" : "Compact Info"}</span>
              {detailsCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              className={`p-1.5 rounded-lg border transition ${
                isDark
                  ? "border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
              }`}
              title={isFullScreen ? "Exit Fullscreen" : "Maximize Screen"}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition ${
                isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200/80 text-slate-500 hover:text-slate-800"
              }`}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="flex-none px-5 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-500 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              className="p-1 hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Metadata Panel (Collapsible to leave 90% vertical room for spreadsheet) */}
        {!detailsCollapsed && (
          <div
            className={`flex-none p-4 border-b transition-all duration-200 ${
              isDark ? "border-slate-800/80 bg-slate-900/60" : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              {/* Left Column: Name, Description, Tags (7 cols) */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-slate-400">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Standard 40ft Tile Procurement, Hardware Fasteners..."
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs font-medium rounded-lg border outline-hidden transition ${
                        isDark
                          ? "bg-slate-800/80 border-slate-700 focus:border-blue-500 text-slate-100"
                          : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-slate-400">
                      Freight Type
                    </label>
                    <select
                      value={formData.freight_type}
                      onChange={(e) => handleChange("freight_type", e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-hidden transition ${
                        isDark
                          ? "bg-slate-800/80 border-slate-700 focus:border-blue-500 text-slate-100"
                          : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                      }`}
                    >
                      <option value="Sea Freight">Sea Freight</option>
                      <option value="Air Freight">Air Freight</option>
                      <option value="Land Transport">Land Transport</option>
                      <option value="Courier / Express">Courier / Express</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-slate-400">
                      Description / Purpose
                    </label>
                    <input
                      type="text"
                      placeholder="Short note or purpose for this template..."
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-hidden transition ${
                        isDark
                          ? "bg-slate-800/80 border-slate-700 focus:border-blue-500 text-slate-100"
                          : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                      }`}
                    />
                  </div>

                  {/* Tags Combobox */}
                  <div className="relative" ref={tagDropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Tags (Search or Add)
                      </label>
                      {availableTags.length > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {availableTags.length} in library
                        </span>
                      )}
                    </div>
                    <div
                      onClick={() => setIsTagDropdownOpen(true)}
                      className={`px-2 py-1 rounded-lg border flex flex-wrap items-center gap-1.5 min-h-[34px] cursor-text transition ${
                        isDark
                          ? "bg-slate-800/80 border-slate-700 focus-within:border-blue-500"
                          : "bg-white border-slate-200 focus-within:border-blue-500"
                      }`}
                    >
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600/10 text-blue-500 border border-blue-500/20"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTag(tag);
                            }}
                            className="hover:text-red-500 transition"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        placeholder={
                          formData.tags.length === 0
                            ? "Search or type tag (e.g. Tiles, Urgent)..."
                            : "Search or add..."
                        }
                        value={tagInput}
                        onChange={(e) => {
                          setTagInput(e.target.value);
                          setIsTagDropdownOpen(true);
                        }}
                        onFocus={() => setIsTagDropdownOpen(true)}
                        onKeyDown={handleTagKeyDown}
                        className={`flex-1 min-w-[130px] bg-transparent text-xs outline-hidden px-1 ${
                          isDark
                            ? "text-slate-100 placeholder-slate-500"
                            : "text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {/* Tag Suggestions Dropdown */}
                    {isTagDropdownOpen && (
                      <div
                        className={`absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-xl border shadow-xl backdrop-blur-md text-xs py-1 transition-all ${
                          isDark
                            ? "bg-slate-900/95 border-slate-700 text-slate-200 shadow-black/50"
                            : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-200"
                        }`}
                      >
                        {/* New Tag Creatable Option */}
                        {isNewTag && tagInput.trim() && (
                          <button
                            type="button"
                            onClick={() => handleSelectOrAddTag(tagInput.trim())}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2 font-medium border-b transition ${
                              isDark
                                ? "bg-blue-600/15 border-slate-800 text-blue-400 hover:bg-blue-600/25"
                                : "bg-blue-50/80 border-slate-100 text-blue-600 hover:bg-blue-100"
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5 flex-none" />
                            <span>
                              Create & add tag:{" "}
                              <strong className="font-semibold underline">
                                #{tagInput.trim().replace(/^#/, "")}
                              </strong>
                            </span>
                          </button>
                        )}

                        {/* Existing Filtered Tags */}
                        {filteredTagOptions.length > 0 ? (
                          <div>
                            <div
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                                isDark ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              Available Tags ({filteredTagOptions.length})
                            </div>
                            {filteredTagOptions.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleSelectOrAddTag(tag)}
                                className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition ${
                                  isDark
                                    ? "hover:bg-slate-800 text-slate-200"
                                    : "hover:bg-slate-100 text-slate-700"
                                }`}
                              >
                                <span className="font-medium">#{tag}</span>
                                <span className="text-[10px] text-blue-500 font-semibold opacity-60">
                                  + Add
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : !tagInput.trim() ? (
                          <div
                            className={`px-3 py-2.5 text-center text-xs ${
                              isDark ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            No more existing tags. Type to create a new tag.
                          </div>
                        ) : !isNewTag ? (
                          <div
                            className={`px-3 py-2 text-center text-xs ${
                              isDark ? "text-slate-500" : "text-slate-400"
                            }`}
                          >
                            Tag already added
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Supplier, Visibility, Notes (5 cols) */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {canViewSupplier ? (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-slate-400">
                        Default Supplier / Vendor
                      </label>
                      <GenericSelector
                        options={suppliers.map((s) => ({ id: s.id, name: s.name }))}
                        value={formData.supplier_id}
                        onChange={handleSupplierChange}
                        placeholder="Select Default Supplier..."
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-slate-400">
                        Default Supplier
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Restricted (No Supplier Access)"
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border opacity-60 ${
                          isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
                        }`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-slate-400">
                      Visibility Scope
                    </label>
                    <div className="flex items-center gap-1.5 h-[34px]">
                      <button
                        type="button"
                        onClick={() => handleChange("visibility", "org")}
                        className={`flex-1 h-full px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                          formData.visibility === "org"
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : isDark
                            ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                            : "border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Globe className="w-3 h-3" />
                        Org-Wide
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange("visibility", "private")}
                        className={`flex-1 h-full px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                          formData.visibility === "private"
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : isDark
                            ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                            : "border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        Only Me
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1 text-slate-400">
                    Template Instructions / Internal Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Specific packaging, handling, or ordering guidelines..."
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-hidden transition ${
                      isDark
                        ? "bg-slate-800/80 border-slate-700 focus:border-blue-500 text-slate-100"
                        : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Product Catalog Search & Selector (Matches Sourcing / Order Entry standard) */}
        {hasInventory && (
          <div
            className={`flex-none px-5 py-2.5 border-b flex items-center gap-3 ${
              isDark
                ? "bg-slate-900/95 border-slate-800"
                : "bg-indigo-50/40 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex-none px-1">
              <Boxes className="w-4 h-4" />
              <span>Search Catalog:</span>
            </div>
            <div className="flex-1 min-w-0">
              <ProductCatalogSelector
                inputRef={catalogInputRef}
                inputId="template-catalog-search-input"
                products={inventoryProducts}
                onSelectProduct={handleAddCatalogProduct}
                onNewProductCreated={(p) => setInventoryProducts((prev) => [p, ...prev])}
                suppliers={suppliers}
                placeholder="Quick-search catalog by Code, Description, Category, or Brand to insert..."
                isAccountsOrAdmin={canViewFinancials}
                showFinancials={canViewFinancials}
                currency={formData.items?.[0]?.currency || "USD"}
              />
            </div>
          </div>
        )}

        {/* ERP Line Items Toolbar */}
        <div
          className={`flex-none px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark ? "border-slate-800 bg-slate-900/90" : "border-slate-200 bg-slate-100/80"
          }`}
        >
          {/* Left: In-Table Search */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
            {/* Realtime Search within template items */}
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rows by code, name, or unit..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border outline-hidden transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500"
                    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                }`}
              />
              {itemSearchQuery && (
                <button
                  type="button"
                  onClick={() => setItemSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {itemSearchQuery && (
              <span className="text-[11px] text-blue-500 font-medium flex items-center gap-1">
                Showing {filteredIndexedItems.length} of {formData.items.length} items
              </span>
            )}
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFocusCatalog}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 shadow-xs ${
                isDark
                  ? "border-indigo-800/60 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              }`}
              title="Search and insert existing products from catalog"
            >
              <Boxes className="w-3.5 h-3.5 text-indigo-500" />
              Catalog Items
            </button>

            <button
              type="button"
              onClick={handleAddCustomItem}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1 shadow-xs ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title="Add manual row"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>

            {formData.items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllItems}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition flex items-center gap-1"
                title="Remove all rows"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Spreadsheet Table Body */}
        <div className="flex-1 overflow-auto">
          {formData.items.length === 0 ? (
            <div
              className={`h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-3">
                <Package className="w-8 h-8 opacity-75" />
              </div>
              <p className="text-sm font-semibold mb-1 text-slate-300">
                No items in this template yet
              </p>
              <p className="text-xs max-w-md mb-4">
                Templates are blueprints composed of existing catalog products. Use the catalog search above to add items. If an item doesn't exist, create it in the catalog first.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFocusCatalog}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition flex items-center gap-1.5"
                >
                  <Boxes className="w-4 h-4" />
                  Search & Add from Catalog
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className={`px-4 py-2 border rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                    isDark
                      ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Row
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead
                className={`sticky top-0 z-10 border-b backdrop-blur-md shadow-xs ${
                  isDark
                    ? "bg-slate-900/95 border-slate-800 text-slate-400"
                    : "bg-slate-100/95 border-slate-200 text-slate-600"
                }`}
              >
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center font-bold uppercase tracking-wider text-[10px]">
                    #
                  </th>
                  <th className="py-2.5 px-3 w-40 font-bold uppercase tracking-wider text-[10px]">
                    SKU / Item Code
                  </th>
                  <th className="py-2.5 px-3 min-w-[280px] font-bold uppercase tracking-wider text-[10px]">
                    Product Name & Description <span className="text-red-500">*</span>
                  </th>
                  <th className="py-2.5 px-3 w-28 text-right font-bold uppercase tracking-wider text-[10px]">
                    Default Qty
                  </th>
                  <th className="py-2.5 px-3 w-28 font-bold uppercase tracking-wider text-[10px]">
                    Unit
                  </th>
                  {canViewFinancials && (
                    <th className="py-2.5 px-3 w-32 text-right font-bold uppercase tracking-wider text-[10px]">
                      Est. Unit Price
                    </th>
                  )}
                  {canViewFinancials && (
                    <th className="py-2.5 px-3 w-32 text-right font-bold uppercase tracking-wider text-[10px]">
                      Est. Line Total
                    </th>
                  )}
                  <th className="py-2.5 px-3 min-w-[180px] font-bold uppercase tracking-wider text-[10px]">
                    Specifications / Remarks
                  </th>
                  <th className="py-2.5 px-3 w-20 text-center font-bold uppercase tracking-wider text-[10px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/60">
                {filteredIndexedItems.map(({ item, originalIndex }, displayIdx) => {
                  const qty = parseFloat(item.default_quantity) || 0;
                  const unitPrice = parseFloat(item.unit_price) || 0;
                  const lineTotal = (qty * unitPrice).toFixed(2);

                  return (
                    <tr
                      key={originalIndex}
                      className={`group transition-colors ${
                        displayIdx % 2 === 0
                          ? isDark
                            ? "bg-slate-900/30"
                            : "bg-white"
                          : isDark
                          ? "bg-slate-800/20"
                          : "bg-slate-50/60"
                      } ${
                        isDark ? "hover:bg-slate-800/50" : "hover:bg-blue-50/40"
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {originalIndex + 1}
                      </td>

                      {/* SKU / Item Code */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          placeholder="e.g. TILE-6060-GR"
                          value={item.item_code}
                          onChange={(e) =>
                            handleItemFieldChange(originalIndex, "item_code", e.target.value)
                          }
                          className={`w-full px-2.5 py-1 text-xs rounded-md border outline-hidden transition font-mono ${
                            isDark
                              ? "bg-slate-950/60 border-slate-700/80 focus:border-blue-500 text-slate-100"
                              : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                          }`}
                        />
                      </td>

                      {/* Product Name & Description */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          required
                          placeholder="Item Description / Product Specification *"
                          value={item.description}
                          onChange={(e) =>
                            handleItemFieldChange(originalIndex, "description", e.target.value)
                          }
                          className={`w-full px-2.5 py-1 text-xs rounded-md border outline-hidden transition ${
                            isDark
                              ? "bg-slate-950/60 border-slate-700/80 focus:border-blue-500 text-slate-100"
                              : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                          }`}
                        />
                      </td>

                      {/* Default Quantity */}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={item.default_quantity}
                          onChange={(e) =>
                            handleItemFieldChange(originalIndex, "default_quantity", e.target.value)
                          }
                          className={`w-full px-2.5 py-1 text-xs rounded-md border outline-hidden text-right font-mono transition ${
                            isDark
                              ? "bg-slate-950/60 border-slate-700/80 focus:border-blue-500 text-slate-100"
                              : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                          }`}
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          placeholder="PCS, BOX..."
                          value={item.unit}
                          onChange={(e) =>
                            handleItemFieldChange(originalIndex, "unit", e.target.value)
                          }
                          className={`w-full px-2.5 py-1 text-xs rounded-md border outline-hidden uppercase transition ${
                            isDark
                              ? "bg-slate-950/60 border-slate-700/80 focus:border-blue-500 text-slate-100"
                              : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                          }`}
                        />
                      </td>

                      {/* Est. Unit Price (Conditional) */}
                      {canViewFinancials && (
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={item.unit_price}
                            onChange={(e) =>
                              handleItemFieldChange(originalIndex, "unit_price", e.target.value)
                            }
                            className={`w-full px-2.5 py-1 text-xs rounded-md border outline-hidden text-right font-mono transition ${
                              isDark
                                ? "bg-slate-950/60 border-slate-700/80 focus:border-blue-500 text-slate-100"
                                : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                            }`}
                          />
                        </td>
                      )}

                      {/* Est. Line Total (Auto-calculated) */}
                      {canViewFinancials && (
                        <td className="py-2 px-3 text-right font-mono text-slate-400 font-medium">
                          {unitPrice > 0 ? (
                            <span className="text-emerald-500 font-semibold">
                              ${lineTotal}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      )}

                      {/* Specifications / Notes */}
                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          placeholder="Grade, color, dimensions..."
                          value={item.notes}
                          onChange={(e) =>
                            handleItemFieldChange(originalIndex, "notes", e.target.value)
                          }
                          className={`w-full px-2.5 py-1 text-xs rounded-md border outline-hidden transition ${
                            isDark
                              ? "bg-slate-950/60 border-slate-700/80 focus:border-blue-500 text-slate-100"
                              : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                          }`}
                        />
                      </td>

                      {/* Action buttons (Duplicate + Delete) */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateItem(originalIndex)}
                            className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition"
                            title="Duplicate this row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(originalIndex)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Sticky Footer Bar with KPI Summaries & Actions */}
        <div
          className={`flex-none px-6 py-3 border-t flex flex-wrap items-center justify-between gap-4 ${
            isDark ? "border-slate-800 bg-slate-950/90" : "border-slate-200 bg-slate-50/95"
          }`}
        >
          {/* Summary KPIs */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Total Line Items:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                {stats.totalItems} {stats.totalItems === 1 ? "Item" : "Items"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Total Default Units:</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-mono">
                {stats.totalQuantity.toLocaleString()} Units
              </span>
            </div>

            {canViewFinancials && stats.totalEstimatedValue > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Est. Total Template Value:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  ${stats.totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                isDark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Template...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Order Template
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
