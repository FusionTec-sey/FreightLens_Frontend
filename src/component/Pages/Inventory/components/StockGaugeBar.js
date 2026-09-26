import React from "react";
import { AlertCircle, CheckCircle2, TrendingDown } from "lucide-react";

/**
 * StockGaugeBar - Visual stock health progress bar with badges.
 * Follows Rule 9 (contained layout), Rule 8 (reusable component), and dark mode.
 */
export default function StockGaugeBar({
  currentStock = 0,
  minStock = 0,
  maxStock = null,
  unit = "PCS",
  isDark = false,
  showLabel = true,
  onClick = null,
}) {
  const current = Number(currentStock) || 0;
  const min = Number(minStock) || 0;
  const max = maxStock && Number(maxStock) > 0 ? Number(maxStock) : (min > 0 ? min * 3 : 100);

  // Status computation
  let status = "healthy"; // 'critical' | 'low' | 'healthy' | 'overstock'
  if (current <= 0) {
    status = "critical";
  } else if (min > 0 && current <= min) {
    status = "low";
  } else if (maxStock && current > Number(maxStock)) {
    status = "overstock";
  }

  // Percentage for gauge (0 to 100)
  const percent = Math.min(100, Math.max(0, (current / max) * 100));

  // Visual styling
  const config = {
    critical: {
      bar: "bg-rose-500",
      bgTrack: isDark ? "bg-rose-950/40" : "bg-rose-100",
      text: isDark ? "text-rose-400" : "text-rose-700",
      badge: isDark ? "bg-rose-900/30 text-rose-300 border-rose-800/50" : "bg-rose-50 text-rose-700 border-rose-200",
      label: "Out of Stock",
      icon: AlertCircle,
    },
    low: {
      bar: "bg-amber-500",
      bgTrack: isDark ? "bg-amber-950/40" : "bg-amber-100",
      text: isDark ? "text-amber-400" : "text-amber-700",
      badge: isDark ? "bg-amber-900/30 text-amber-300 border-amber-800/50" : "bg-amber-50 text-amber-700 border-amber-200",
      label: "Low Stock",
      icon: TrendingDown,
    },
    healthy: {
      bar: "bg-emerald-500",
      bgTrack: isDark ? "bg-emerald-950/40" : "bg-emerald-100",
      text: isDark ? "text-emerald-400" : "text-emerald-700",
      badge: isDark ? "bg-emerald-900/30 text-emerald-300 border-emerald-800/50" : "bg-emerald-50 text-emerald-700 border-emerald-200",
      label: "In Stock",
      icon: CheckCircle2,
    },
    overstock: {
      bar: "bg-blue-500",
      bgTrack: isDark ? "bg-blue-950/40" : "bg-blue-100",
      text: isDark ? "text-blue-400" : "text-blue-700",
      badge: isDark ? "bg-blue-900/30 text-blue-300 border-blue-800/50" : "bg-blue-50 text-blue-700 border-blue-200",
      label: "Overstock",
      icon: CheckCircle2,
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col gap-1 w-full min-w-[120px] max-w-[180px] ${onClick ? "cursor-pointer" : ""}`}
      title={`Current: ${current} ${unit} | Min: ${min} ${unit}${maxStock ? ` | Max: ${maxStock} ${unit}` : ""}`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
          {current.toLocaleString()} <span className="font-normal text-[10px] text-slate-500 dark:text-slate-400">{unit}</span>
        </span>
        {showLabel && (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium border ${config.badge}`}
          >
            <Icon size={10} />
            {config.label}
          </span>
        )}
      </div>

      {/* Progress Track */}
      <div className={`h-1.5 w-full rounded-full overflow-hidden ${config.bgTrack}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${config.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Threshold indicator helper */}
      {min > 0 && (
        <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500">
          <span>Min: {min}</span>
          {maxStock && <span>Max: {maxStock}</span>}
        </div>
      )}
    </div>
  );
}
