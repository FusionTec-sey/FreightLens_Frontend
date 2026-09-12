import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Package,
  Layers,
  Boxes,
  Info,
  Building2,
  Check,
  ChevronDown,
  X,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Clock
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function ProductCatalogSelector({
  products = [],
  onSelectProduct,
  placeholder = "Search and select product from catalog...",
  className = "",
  isAccountsOrAdmin = false,
}) {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const containerRef = useRef(null);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((p) => {
      if (p.category_name) cats.add(p.category_name);
    });
    return Array.from(cats);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
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
  }, [products, searchTerm, categoryFilter]);

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

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* ── SEARCH INPUT / TRIGGER ─────────────────────────────────── */}
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
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
                All ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-blue-600 text-white font-bold"
                      : isDark
                      ? "text-slate-400 hover:bg-slate-800"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Results List */}
          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 scrollbar-thin">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Package size={28} className="mx-auto text-slate-400 opacity-40 mb-2" />
                <p className="text-xs font-bold text-slate-400">No matching products in catalog</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Try adjusting your search keywords or category filter
                </p>
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
                    {/* Left: Product Identity & Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {/* Code / SKU Badge */}
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {prod.sku || prod.code || "SKU"}
                        </span>

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

                        {/* Brand (Optional) */}
                        {prod.brand && (
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
                        {isAccountsOrAdmin && prod.unit_cost && (
                          <div className="text-[9px] text-slate-400">
                            ${prod.unit_cost}
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
              {selectedStockProduct.supplier_name && (
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
