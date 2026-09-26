import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import {
  Search,
  Package,
  Layers,
  Boxes,
  Check,
  ChevronDown,
  X,
  Plus,
  AlertTriangle,
  MapPin,
  Loader2,
  Sparkles
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import CurrencyInput from "./CurrencyInput";

export default function ProductCatalogSelector({
  products = [],
  onSelectProduct,
  onNewProductCreated,
  placeholder = "Search and select product from catalog...",
  className = "",
  isAccountsOrAdmin = false,
  showFinancials = false,
  isRFQ = false,
  suppliers = [],
  currency = "USD",
  currencySymbol = "$",
  inputRef,
  inputId,
}) {
  const { isDark } = useTheme();
  const canShowPrices = !isRFQ && (showFinancials || isAccountsOrAdmin);
  const canShowVendor = !isRFQ;
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const containerRef = useRef(null);

  // Quick Create Form State
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newProductData, setNewProductData] = useState({
    name: "",
    sku: "",
    category_id: null,
    category_name: "",
    unit: "PCS",
    unit_cost: "",
    default_supplier_id: null,
    current_stock: 0,
    min_stock_quantity: 0,
  });

  // Remote Meilisearch lookup state
  const [remoteResults, setRemoteResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search against backend Meilisearch lookup endpoint
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setRemoteResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${process.env.REACT_APP_NETWORK}/inventory/lookup`,
          {
            params: {
              q: trimmed,
              is_rfq: isRFQ || false,
              limit: 50,
            },
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              skip_zrok_interstitial: "true",
            },
          }
        );
        setRemoteResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.warn("Meilisearch remote lookup failed, falling back to local list:", err);
        setRemoteResults(null);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm, isRFQ]);

  // Extract unique categories from products (or remote results)
  const sourceProducts = remoteResults !== null ? remoteResults : products;

  const categories = useMemo(() => {
    const cats = new Map();
    sourceProducts.forEach((p) => {
      if (p.category_name) {
        cats.set(p.category_name, p.category_id || null);
      }
    });
    return Array.from(cats.entries()).map(([name, id]) => ({ name, id }));
  }, [sourceProducts]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return sourceProducts.filter((p) => {
      const matchSearch =
        remoteResults !== null ||
        !searchTerm.trim() ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        categoryFilter === "ALL" || p.category_name === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [sourceProducts, remoteResults, searchTerm, categoryFilter]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (prod) => {
    onSelectProduct?.(prod);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleOpenStockInfo = (e, prod) => {
    e.stopPropagation();
    setSelectedStockProduct(prod);
  };

  const handleOpenQuickCreate = (initialName = "") => {
    setNewProductData({
      name: initialName || searchTerm || "",
      sku: "",
      category_id: null,
      category_name: "",
      unit: "PCS",
      unit_cost: "",
      default_supplier_id: null,
      current_stock: 0,
      min_stock_quantity: 0,
    });
    setCreateError("");
    setShowCreateModal(true);
    setIsOpen(false);
  };

  const handleQuickCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newProductData.name.trim()) {
      setCreateError("Product description / name is required.");
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const payload = {
        name: newProductData.name.trim(),
        sku: newProductData.sku.trim() || undefined,
        category_id: newProductData.category_id || undefined,
        unit: (newProductData.unit || "PCS").toUpperCase(),
        unit_cost: newProductData.unit_cost ? parseFloat(newProductData.unit_cost) : undefined,
        default_supplier_id: newProductData.default_supplier_id || undefined,
        current_stock: parseFloat(newProductData.current_stock) || 0,
        min_stock_quantity: parseFloat(newProductData.min_stock_quantity) || 0,
        status: "active",
      };

      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/inventory/products`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        }
      );

      const created = res.data;
      const formattedProd = {
        id: created.id,
        code: created.code || created.sku,
        sku: created.sku,
        name: created.name,
        description: created.description || created.name,
        unit: created.unit || "PCS",
        unit_cost: created.unit_cost,
        category_id: created.category_id,
        category_name: created.category_name,
        default_supplier_id: created.default_supplier_id,
        supplier_name: created.supplier_name,
        current_stock: created.current_stock || 0,
        min_stock_quantity: created.min_stock_quantity || 0,
      };

      // Notify parent & immediately select into order items
      onNewProductCreated?.(formattedProd);
      onSelectProduct?.(formattedProd);

      setShowCreateModal(false);
      setSearchTerm("");
    } catch (err) {
      console.error("Failed to quick-create product:", err);
      setCreateError(
        err.response?.data?.detail || "Failed to create product. Please verify fields."
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ── SEARCH INPUT / BAR + ADD NEW BUTTON ─────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0 flex items-center">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full pl-8 pr-20 py-1.5 border rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              isDark
                ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
            }`}
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {isSearching && (
              <Loader2 size={12} className="animate-spin text-blue-500 mr-0.5" />
            )}
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* "+ Add New Item" Trigger Button */}
        <button
          type="button"
          onClick={() => handleOpenQuickCreate()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-xs transition flex-none"
          title="Add a new standardized product to catalog"
        >
          <Plus size={13} />
          <span>Add New Item</span>
        </button>
      </div>

      {/* ── RICH CUSTOMIZED DROPDOWN ────────────────────────────────── */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-40 mt-1.5 rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isDark
              ? "bg-slate-900 border-slate-800 text-slate-100 shadow-black/60"
              : "bg-white border-slate-200 text-slate-900 shadow-slate-300/50"
          }`}
          style={{ maxHeight: "380px" }}
        >
          {/* Category Filter Chips Bar */}
          {categories.length > 0 && (
            <div
              className={`p-2 border-b flex items-center gap-1.5 overflow-x-auto scrollbar-thin ${
                isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-100"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1 flex-none">
                <Layers size={11} /> Category:
              </span>
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition whitespace-nowrap ${
                  categoryFilter === "ALL"
                    ? "bg-blue-600 text-white"
                    : isDark
                    ? "text-slate-400 hover:bg-slate-800"
                    : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({sourceProducts.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategoryFilter(cat.name)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition whitespace-nowrap ${
                    categoryFilter === cat.name
                      ? "bg-blue-600 text-white font-bold"
                      : isDark
                      ? "text-slate-400 hover:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Active Search Status / Meilisearch Badge Bar */}
          {searchTerm.trim() && (
            <div
              className={`px-3 py-1 text-[10px] font-medium border-b flex items-center justify-between ${
                isDark ? "bg-slate-950/40 border-slate-800/80 text-slate-400" : "bg-slate-50/80 border-slate-100 text-slate-500"
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {isSearching ? (
                  <>
                    <Loader2 size={10} className="animate-spin text-blue-500 flex-none" />
                    <span>Searching catalog...</span>
                  </>
                ) : (
                  <span>
                    {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"} for "{searchTerm}"
                  </span>
                )}
              </span>
              {remoteResults !== null && !isSearching && (
                <span className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 font-semibold flex-none pl-2">
                  <Sparkles size={10} /> Fast Search
                </span>
              )}
            </div>
          )}

          {/* Results List */}
          <div className="max-h-[290px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
            {filteredProducts.length === 0 ? (
              <div className="p-6 text-center">
                <Package size={26} className="mx-auto text-slate-400 opacity-40 mb-2" />
                <p className="text-xs font-bold text-slate-400">No matching product found</p>
                <p className="text-[10px] text-slate-400 mt-0.5 mb-3">
                  Register this item to preserve catalog standards and track stock
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenQuickCreate(searchTerm)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Create "{searchTerm || "New Product"}"</span>
                </button>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const stock = parseFloat(prod.current_stock) || 0;
                const minStock = parseFloat(prod.min_stock_quantity) || 0;
                const isLow = minStock > 0 && stock <= minStock;

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectItem(prod)}
                    className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isDark ? "hover:bg-slate-800/70" : "hover:bg-blue-50/50"
                    }`}
                  >
                    {/* Far Left: Product Image Thumbnail */}
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-none border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-xs">
                      {prod.image_url ? (
                        <img
                          src={
                            prod.image_url.startsWith("http") || prod.image_url.startsWith("blob:")
                              ? prod.image_url
                              : `${process.env.REACT_APP_NETWORK}/blobs/${prod.image_url}`
                          }
                          alt={prod.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <Package size={18} className="text-slate-400 opacity-60" />
                      )}
                    </div>

                    {/* Middle: Product Identity & Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {/* Code / SKU Badge */}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {prod.sku || prod.code || "SKU"}
                        </span>

                        {/* Factory Code / Vendor Code Badge */}
                        {prod.factory_code && (
                          <span
                            title={`Factory / Vendor Article Code: ${prod.factory_code}`}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1"
                          >
                            <span>🏭 {prod.factory_code}</span>
                          </span>
                        )}

                        {/* Category (Optional) */}
                        {prod.category_name && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              isDark
                                ? "bg-purple-950/40 text-purple-300 border-purple-800/40"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {prod.category_name}
                          </span>
                        )}

                        {/* Preferred Supplier & Multi-vendor indicator */}
                        {prod.supplier_name && canShowVendor && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            • {prod.supplier_name}
                            {Array.isArray(prod.suppliers) && prod.suppliers.length > 1 && (
                              <span
                                title={`${prod.suppliers.length} vendors available for this item`}
                                className="ml-1 text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                              >
                                +{prod.suppliers.length - 1} vendors
                              </span>
                            )}
                          </span>
                        )}

                        {/* Brand (Optional) */}
                        {prod.brand && canShowVendor && !prod.supplier_name && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {prod.brand}
                          </span>
                        )}
                      </div>

                      {/* Description / Name */}
                      <div className="text-[11px] font-bold tracking-tight truncate">
                        {prod.name}
                      </div>

                      {prod.description && prod.description !== prod.name && (
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {prod.description}
                        </div>
                      )}
                    </div>

                    {/* Right: Stock Pill & Stock Info Button */}
                    <div className="flex items-center gap-2 flex-none">
                      {/* Live Stock Level Pill */}
                      <div
                        className={`text-right px-2 py-1 rounded-lg border text-[10px] font-mono font-bold ${
                          stock > 0
                            ? isLow
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                        }`}
                      >
                        <div>
                          {stock} {prod.unit || "PCS"}
                        </div>
                        {canShowPrices && prod.unit_cost && (
                          <div className="text-[9px] text-slate-400">
                            {currencySymbol} {parseFloat(prod.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>

                      {/* Stock Info Quick Action Button */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenStockInfo(e, prod)}
                        className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
                          isDark
                            ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                        title="View stock details & warehouse information"
                      >
                        <Boxes size={12} className="text-blue-500" />
                        <span className="text-[10px] font-bold hidden sm:inline">Stock Info</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── QUICK CREATE PRODUCT MODAL (MINIMAL INFO) ───────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-lg p-5 sm:p-6 rounded-2xl border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Add New Item to Catalog</h3>
                  <p className="text-[10px] text-slate-400">
                    Register product with minimal info to preserve standards and inventory tracking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message */}
            {createError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] flex items-center gap-2">
                <AlertTriangle size={14} className="flex-none" />
                <span>{createError}</span>
              </div>
            )}

            {/* Quick Form */}
            <form onSubmit={handleQuickCreateSubmit} className="space-y-3.5">
              {/* Product Name / Description (Required) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Product Description / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Porcelain Floor Tile 60x60 Grey Matt"
                  value={newProductData.name}
                  onChange={(e) =>
                    setNewProductData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* SKU & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SKU / Code (Optional) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    SKU / Code <span className="text-slate-400 font-normal">(Auto if blank)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TILE-6060-GRY"
                    value={newProductData.sku}
                    onChange={(e) =>
                      setNewProductData((prev) => ({ ...prev, sku: e.target.value }))
                    }
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Category (Optional) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Category <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={newProductData.category_id || ""}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        category_id: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-bold transition ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="">General / Uncategorized</option>
                    {categories.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.id || ""}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit & Unit Cost Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Unit of Measurement */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Unit
                  </label>
                  <select
                    value={newProductData.unit}
                    onChange={(e) =>
                      setNewProductData((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-bold transition ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="SQM">SQM (Square Meters)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="BOX">BOX (Boxes)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="ROLL">ROLL (Rolls)</option>
                    <option value="BAG">BAG (Bags)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="PKT">PKT (Packets)</option>
                  </select>
                </div>

                {/* Default Unit Cost (Accounts Optional) */}
                {canShowPrices && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Default Unit Cost ({currencySymbol}) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <CurrencyInput
                      currency={currency}
                      symbol={currencySymbol}
                      placeholder="0.00"
                      value={newProductData.unit_cost}
                      onChange={(e) =>
                        setNewProductData((prev) => ({ ...prev, unit_cost: e.target.value }))
                      }
                      className={`w-full px-2.5 py-1.5 border rounded-lg text-[11px] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        isDark
                          ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border transition ${
                    isDark
                      ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                      : "border-slate-300 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving to Catalog...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Save & Add to Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STOCK INFO MODAL (FUTURE READY INVENTORY PREVIEW) ───────── */}
      {selectedStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md p-5 sm:p-6 rounded-2xl border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Boxes size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Product Stock & Logistics Info</h3>
                  <p className="text-[10px] text-slate-400">Warehouse inventory & catalog status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStockProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Product Summary */}
            <div
              className={`p-3 rounded-xl border text-[11px] space-y-2 ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">SKU / Code:</span>
                <span className="font-mono font-bold text-blue-500">
                  {selectedStockProduct.sku || selectedStockProduct.code || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Product Name:</span>
                <span className="font-semibold text-right truncate max-w-[220px]">
                  {selectedStockProduct.name}
                </span>
              </div>
              {selectedStockProduct.category_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Category:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    {selectedStockProduct.category_name}
                  </span>
                </div>
              )}
              {canShowVendor && selectedStockProduct.supplier_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Default Supplier:</span>
                  <span className="font-medium">{selectedStockProduct.supplier_name}</span>
                </div>
              )}
            </div>

            {/* Stock Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className={`p-3 rounded-xl border text-center ${
                  isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Current On-Hand
                </div>
                <div className="text-base font-mono font-black text-emerald-500">
                  {selectedStockProduct.current_stock || 0}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    {selectedStockProduct.unit || "PCS"}
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center ${
                  isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Reorder Threshold
                </div>
                <div className="text-base font-mono font-black text-blue-500">
                  {selectedStockProduct.min_stock_quantity || 0}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    {selectedStockProduct.unit || "PCS"}
                  </span>
                </div>
              </div>
            </div>

            {/* Future Warehouse Locations Note */}
            <div
              className={`p-2.5 rounded-xl border text-[10px] flex items-start gap-2 ${
                isDark ? "bg-indigo-950/20 border-indigo-900/40 text-indigo-300" : "bg-indigo-50/60 border-indigo-100 text-indigo-700"
              }`}
            >
              <MapPin size={14} className="flex-none mt-0.5 text-indigo-500" />
              <div>
                <span className="font-bold">Warehouse & Inventory Management:</span>
                <p className="mt-0.5 opacity-90">
                  Allocated to Central Warehouse. Additional multi-location batching and container tracking will sync seamlessly as inventory operations scale.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStockProduct(null)}
                className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border transition ${
                  isDark
                    ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                }`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectItem(selectedStockProduct);
                  setSelectedStockProduct(null);
                }}
                className="px-3.5 py-1.5 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
              >
                Add Product to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
