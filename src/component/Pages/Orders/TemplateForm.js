import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  X,
  Save,
  Plus,
  Trash2,
  Package,
  Building2,
  Tag,
  Layers,
  Lock,
  Globe,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useOptions } from "../../../hooks/useOptions";
import GenericSelector from "../../UI/UXComponent/GenericSelector";

export default function TemplateForm({ templateData, onClose, onSave }) {
  const { isDark } = useTheme();
  const { user, isRoot, hasModule } = useAuth();
  const { suppliers = [] } = useOptions();
  const hasInventory = Boolean(hasModule?.("INVENTORY"));

  const isAccountsOrAdmin =
    isRoot ||
    user?.is_root ||
    user?.roles?.some((r) =>
      ["Administrator", "Admin", "Account", "Accounts", "Finance"].includes(r)
    );

  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [selectedProductCode, setSelectedProductCode] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    const matched = suppliers.find((s) => s.id === supplierId || s.supplier_id === supplierId);
    setFormData((prev) => ({
      ...prev,
      supplier_id: supplierId,
      company: matched ? matched.name : prev.company,
    }));
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !formData.tags.includes(val)) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, val],
        }));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleAddCatalogProduct = (prodId) => {
    if (!prodId) return;
    const prod = inventoryProducts.find((p) => String(p.id) === String(prodId));
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
      const newItem = {
        product_id: prod.id,
        item_code: prod.sku || prod.code || "",
        description: prod.name,
        default_quantity: 1,
        unit: prod.unit || "PCS",
        unit_price: prod.unit_cost || "",
        currency: prod.currency || "USD",
        notes: "",
      };
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
        supplier_id: prev.supplier_id || prod.default_supplier_id || null,
      }));
    }
    setSelectedProductCode("");
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

  const handleItemFieldChange = (index, field, val) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: val };
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleRemoveItem = (index) => {
    const updated = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    try {
      let res;
      if (templateData && templateData.id) {
        res = await axios.patch(
          `${process.env.REACT_APP_NETWORK}/orders/templates/${templateData.id}`,
          formData,
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
          formData,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl h-full flex flex-col border-l shadow-2xl animate-in slide-in-from-right duration-200 ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`flex-none p-4 border-b flex items-center justify-between ${
            isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {templateData?.id ? "Edit Order Template" : "New Order Template"}
              </h2>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Configure default products, vendor info, and tags
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Monthly Ceramic Tile Restock, Hardware Fasteners..."
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border outline-hidden transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 focus:border-blue-500 text-slate-100"
                    : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">
                Description / Purpose
              </label>
              <textarea
                rows={2}
                placeholder="Brief description of what this template is for..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border outline-hidden transition resize-none ${
                  isDark
                    ? "bg-slate-800 border-slate-700 focus:border-blue-500 text-slate-100"
                    : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                }`}
              />
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">
                Tags (Press Enter or Comma to add)
              </label>
              <div
                className={`p-2 rounded-xl border flex flex-wrap items-center gap-1.5 ${
                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                }`}
              >
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-600/10 text-blue-500 border border-blue-500/20"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder={formData.tags.length === 0 ? "Add tags like 'Tiles', 'Urgent', 'Monthly'..." : "Add more tags..."}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className={`flex-1 min-w-[150px] bg-transparent text-xs outline-hidden px-1 py-0.5 ${
                    isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section: Vendor & Logistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200/50 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">
                Default Supplier / Vendor
              </label>
              <GenericSelector
                options={suppliers.map((s) => ({ id: s.id, name: s.name }))}
                value={formData.supplier_id}
                onChange={handleSupplierChange}
                placeholder="Select Default Supplier..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">
                Freight Type
              </label>
              <select
                value={formData.freight_type}
                onChange={(e) => handleChange("freight_type", e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border outline-hidden transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 focus:border-blue-500 text-slate-100"
                    : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                }`}
              >
                <option value="Sea Freight">Sea Freight</option>
                <option value="Air Freight">Air Freight</option>
                <option value="Land Transport">Land Transport</option>
                <option value="Courier / Express">Courier / Express</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">
                Visibility
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChange("visibility", "org")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                    formData.visibility === "org"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : isDark
                      ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Org-Wide
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("visibility", "private")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                    formData.visibility === "private"
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : isDark
                      ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Only Me
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500">
                General Notes
              </label>
              <input
                type="text"
                placeholder="Instructions or remarks for the order..."
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border outline-hidden transition ${
                  isDark
                    ? "bg-slate-800 border-slate-700 focus:border-blue-500 text-slate-100"
                    : "bg-white border-slate-200 focus:border-blue-500 text-slate-900"
                }`}
              />
            </div>
          </div>

          {/* Section: Products List */}
          <div className="space-y-3 pt-3 border-t border-slate-200/50 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  Template Products & Line Items ({formData.items.length})
                </h3>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Define products and default quantities for this template
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {/* Quick Catalog Selector */}
            {hasInventory && inventoryProducts.length > 0 && (
              <div
                className={`p-2.5 rounded-xl border space-y-1.5 ${
                  isDark ? "bg-slate-800/50 border-slate-700/60" : "bg-slate-50 border-slate-200"
                }`}
              >
                <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Package className="w-3 h-3" /> Quick Add from Product Catalog:
                </label>
                <GenericSelector
                  options={inventoryProducts.map((p) => ({
                    id: p.id,
                    name: `${p.name} ${p.sku ? `(${p.sku})` : ""}`,
                  }))}
                  value={selectedProductCode}
                  onChange={(val) => handleAddCatalogProduct(val)}
                  placeholder="Search catalog product to add..."
                />
              </div>
            )}

            {/* Line items table / list */}
            {formData.items.length === 0 ? (
              <div
                className={`p-8 rounded-xl border border-dashed text-center flex flex-col items-center justify-center ${
                  isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                }`}
              >
                <Package className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs font-medium mb-1">No products added to template yet</p>
                <p className="text-[11px] text-slate-400 mb-3">
                  Add items from the catalog above or click "+ Add Item"
                </p>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Add Custom Item
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border space-y-2 transition ${
                      isDark
                        ? "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              required
                              placeholder="Description / Product Name *"
                              value={item.description}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "description", e.target.value)
                              }
                              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-hidden transition ${
                                isDark
                                  ? "bg-slate-900 border-slate-700 text-slate-100"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="SKU / Item Code"
                              value={item.item_code}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "item_code", e.target.value)
                              }
                              className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-hidden transition font-mono ${
                                isDark
                                  ? "bg-slate-900 border-slate-700 text-slate-100"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-semibold">
                              Default Qty
                            </label>
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              value={item.default_quantity}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "default_quantity", e.target.value)
                              }
                              className={`w-full px-2 py-1 text-xs rounded-lg border outline-hidden transition font-mono ${
                                isDark
                                  ? "bg-slate-900 border-slate-700 text-slate-100"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-semibold">
                              Unit
                            </label>
                            <input
                              type="text"
                              placeholder="PCS / BOX..."
                              value={item.unit}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "unit", e.target.value)
                              }
                              className={`w-full px-2 py-1 text-xs rounded-lg border outline-hidden transition ${
                                isDark
                                  ? "bg-slate-900 border-slate-700 text-slate-100"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase font-semibold">
                              Unit Price (Est)
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="0.00"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleItemFieldChange(idx, "unit_price", e.target.value)
                              }
                              className={`w-full px-2 py-1 text-xs rounded-lg border outline-hidden transition font-mono ${
                                isDark
                                  ? "bg-slate-900 border-slate-700 text-slate-100"
                                  : "bg-slate-50 border-slate-200 text-slate-900"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition self-center"
                        title="Remove product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div
          className={`flex-none p-4 border-t flex items-center justify-end gap-3 ${
            isDark ? "border-slate-800 bg-slate-900" : "border-slate-100 bg-slate-50"
          }`}
        >
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
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
