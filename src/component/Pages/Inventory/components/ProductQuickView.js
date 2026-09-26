import React from "react";
import {
  X,
  Package,
  Layers,
  Building,
  Ruler,
  Weight,
  ExternalLink,
  Copy,
  PlusCircle,
  Truck,
  DollarSign,
  Tag,
  ShieldCheck,
} from "lucide-react";
import StockGaugeBar from "./StockGaugeBar";

export default function ProductQuickView({
  product,
  isDark = false,
  canViewVendor = false,
  canViewFinancials = false,
  canEdit = false,
  canAdjustStock = false,
  onClose,
  onOpenDetail,
  onAdjustStock,
  onDuplicate,
}) {
  if (!product) return null;

  const images = product.images || [];
  const primaryImg =
    images.find((img) => img.is_primary)?.file_url ||
    product.image_url ||
    (images.length > 0 ? images[0].file_url || images[0].url : null);

  const formatDimensions = () => {
    const l = product.length;
    const w = product.width;
    const h = product.height;
    const u = product.dimension_unit || "mm";
    if (l && w && h) return `${l} × ${w} × ${h} ${u}`;
    if (w && h) return `${w}W × ${h}H ${u}`;
    return null;
  };

  const dimStr = formatDimensions();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md h-full flex flex-col shadow-2xl border-l transition-colors ${
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header - Fixed */}
        <div
          className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${
            isDark ? "border-slate-800" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                product.status === "active"
                  ? isDark
                    ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isDark
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {product.status || "active"}
            </span>
            <span className="text-xs font-mono font-bold text-indigo-500">{product.sku}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hero Section: Image + Title */}
          <div className="flex gap-4 items-start">
            <div
              className={`w-24 h-24 shrink-0 rounded-2xl flex items-center justify-center overflow-hidden border ${
                isDark ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"
              }`}
            >
              {primaryImg ? (
                <img
                  src={primaryImg}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <Package size={36} className="text-slate-400 opacity-50" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                {product.name}
              </h2>
              {product.brand && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Brand: <span className="font-medium text-slate-700 dark:text-slate-300">{product.brand}</span>
                </p>
              )}
              {product.category_name && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Category:{" "}
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {product.category_name}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Stock Level Card */}
          <div
            className={`p-4 rounded-xl border ${
              isDark ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50 border-slate-200/80"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stock Status
              </span>
              {canAdjustStock && (
                <button
                  type="button"
                  onClick={() => onAdjustStock && onAdjustStock(product)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={12} />
                  Adjust
                </button>
              )}
            </div>
            <StockGaugeBar
              currentStock={product.current_stock}
              minStock={product.min_stock_quantity}
              maxStock={product.max_stock_quantity}
              unit={product.unit || "PCS"}
              isDark={isDark}
            />
          </div>

          {/* Specifications Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Ruler size={13} />
              Specifications & Packaging
            </h4>
            <div
              className={`divide-y rounded-xl border text-xs ${
                isDark
                  ? "divide-slate-800 border-slate-800 bg-slate-800/20"
                  : "divide-slate-100 border-slate-200 bg-white"
              }`}
            >
              <div className="flex justify-between py-2 px-3">
                <span className="text-slate-400">Unit of Measure</span>
                <span className="font-medium font-mono">{product.unit || "PCS"}</span>
              </div>
              {dimStr && (
                <div className="flex justify-between py-2 px-3">
                  <span className="text-slate-400">Dimensions</span>
                  <span className="font-medium">{dimStr}</span>
                </div>
              )}
              {product.weight_per_unit && (
                <div className="flex justify-between py-2 px-3">
                  <span className="text-slate-400">Unit Weight</span>
                  <span className="font-medium">
                    {product.weight_per_unit} {product.weight_unit || "kg"}
                  </span>
                </div>
              )}
              {product.units_per_box && (
                <div className="flex justify-between py-2 px-3">
                  <span className="text-slate-400">Units per Box</span>
                  <span className="font-medium">{product.units_per_box}</span>
                </div>
              )}
              {product.hs_code && (
                <div className="flex justify-between py-2 px-3">
                  <span className="text-slate-400">HS Code</span>
                  <span className="font-mono font-medium">{product.hs_code}</span>
                </div>
              )}
            </div>
          </div>

          {/* Supplier Info (Conditional per Zero-Trust Security) */}
          {canViewVendor && product.supplier_name && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Building size={13} />
                Sourcing Supplier
              </h4>
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  isDark ? "bg-slate-800/20 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-slate-400">Default Vendor:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {product.supplier_name}
                  </span>
                </div>
                {product.factory_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Factory SKU:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {product.factory_code}
                    </span>
                  </div>
                )}
                {canViewFinancials && product.unit_cost && (
                  <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400">Unit Cost:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {product.currency || "USD"} {Number(product.unit_cost).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</h4>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions - Fixed */}
        <div
          className={`shrink-0 flex items-center justify-between gap-2 px-6 py-4 border-t ${
            isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/60"
          }`}
        >
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => onDuplicate && onDuplicate(product)}
                title="Duplicate Product"
                className="p-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Copy size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenDetail && onOpenDetail(product)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <span>Open Full Specs</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
