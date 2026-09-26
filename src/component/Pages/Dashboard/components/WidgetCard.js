import React from "react";
import {
  Boxes,
  Package,
  Truck,
  Anchor,
  BadgeCheck,
  AlertTriangle,
  DollarSign,
  Layers,
  BarChart2,
  CheckCircle,
  ShoppingCart,
  FileText,
  TrendingUp,
  GripVertical,
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

// Icon mapping helper
const ICON_MAP = {
  Boxes,
  Package,
  Truck,
  Anchor,
  BadgeCheck,
  AlertTriangle,
  DollarSign,
  Layers,
  BarChart2,
  CheckCircle,
  ShoppingCart,
  FileText,
  TrendingUp,
};

// Accent color maps
const COLOR_THEMES = {
  indigo: {
    bgLight: "bg-indigo-50 border-indigo-100 text-indigo-700",
    bgDark: "dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300",
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    textVal: "text-indigo-600 dark:text-indigo-400",
  },
  blue: {
    bgLight: "bg-blue-50 border-blue-100 text-blue-700",
    bgDark: "dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    textVal: "text-blue-600 dark:text-blue-400",
  },
  emerald: {
    bgLight: "bg-emerald-50 border-emerald-100 text-emerald-700",
    bgDark: "dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    textVal: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bgLight: "bg-amber-50 border-amber-100 text-amber-700",
    bgDark: "dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    textVal: "text-amber-600 dark:text-amber-400",
  },
  yellow: {
    bgLight: "bg-amber-50 border-amber-100 text-amber-700",
    bgDark: "dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300",
    iconBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    textVal: "text-amber-600 dark:text-amber-400",
  },
  purple: {
    bgLight: "bg-purple-50 border-purple-100 text-purple-700",
    bgDark: "dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-300",
    iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    textVal: "text-purple-600 dark:text-purple-400",
  },
  rose: {
    bgLight: "bg-rose-50 border-rose-100 text-rose-700",
    bgDark: "dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300",
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    textVal: "text-rose-600 dark:text-rose-400",
  },
  teal: {
    bgLight: "bg-teal-50 border-teal-100 text-teal-700",
    bgDark: "dark:bg-teal-950/40 dark:border-teal-800/60 dark:text-teal-300",
    iconBg: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    textVal: "text-teal-600 dark:text-teal-400",
  },
  sky: {
    bgLight: "bg-sky-50 border-sky-100 text-sky-700",
    bgDark: "dark:bg-sky-950/40 dark:border-sky-800/60 dark:text-sky-300",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    textVal: "text-sky-600 dark:text-sky-400",
  },
};

export default function WidgetCard({
  widget,
  data,
  isDark,
  isCustomizing,
  onHideWidget,
  onChangeColSpan,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
  selectedYear,
  onYearChange,
}) {
  const IconComponent = ICON_MAP[widget.icon] || Boxes;
  const theme = COLOR_THEMES[widget.color] || COLOR_THEMES.indigo;
  const widgetData = data?.[widget.id];

  // Column span classes
  const colSpanClasses = {
    1: "col-span-1",
    2: "col-span-1 md:col-span-2",
    3: "col-span-1 md:col-span-3",
    4: "col-span-1 md:col-span-2 xl:col-span-4",
  }[widget.col_span || 1] || "col-span-1";

  // Cycle col span: 1 -> 2 -> 4 -> 1
  const handleCycleColSpan = () => {
    const cur = widget.col_span || 1;
    let next = 1;
    if (cur === 1) next = 2;
    else if (cur === 2) next = 4;
    else next = 1;
    onChangeColSpan(widget.id, next);
  };

  return (
    <div
      draggable={isCustomizing}
      onDragStart={(e) => onDragStart(e, widget.id)}
      onDragOver={(e) => onDragOver(e, widget.id)}
      onDrop={(e) => onDrop(e, widget.id)}
      onDragEnd={onDragEnd}
      className={`rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${colSpanClasses} ${
        isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
      } ${
        isCustomizing
          ? "ring-2 ring-dashed ring-indigo-400/50 hover:ring-indigo-500 shadow-md cursor-grab active:cursor-grabbing"
          : "shadow-xs hover:shadow-md"
      } ${isDragging ? "opacity-40 scale-95" : "opacity-100"} ${
        isDragOver ? "ring-2 ring-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 scale-[1.01]" : ""
      }`}
    >
      {/* Customize Mode Overlay Controls */}
      {isCustomizing && (
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-slate-900/80 dark:bg-slate-800/90 backdrop-blur-md px-2 py-1 rounded-xl text-xs text-white border border-slate-700/60 shadow-md">
          <div className="flex items-center gap-1 pr-1.5 border-r border-slate-700 text-slate-300 font-mono text-[10px]">
            <GripVertical size={13} className="text-slate-400" />
            <span>Drag</span>
          </div>

          <button
            type="button"
            onClick={handleCycleColSpan}
            title={`Resize width (Current: ${widget.col_span || 1} cols)`}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer flex items-center gap-0.5 text-[10px] font-bold"
          >
            {widget.col_span === 4 ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{widget.col_span || 1}w</span>
          </button>

          <button
            type="button"
            onClick={() => onHideWidget(widget.id)}
            title="Hide this widget"
            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition cursor-pointer"
          >
            <EyeOff size={12} />
          </button>
        </div>
      )}

      {/* Widget Content based on Type */}
      {widget.type === "kpi_stat" && (
        <div className="p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl ${theme.iconBg}`}>
                <IconComponent size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {widget.module}
                </span>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {widget.title}
                </h3>
              </div>
            </div>

            {widgetData?.alert && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                Action Req.
              </span>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {widgetData?.formatted !== undefined
                  ? widgetData.formatted
                  : (widgetData?.value ?? 0).toLocaleString()}
              </span>
              {widgetData?.unit && (
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  {widgetData.unit}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {widget.description}
            </p>
          </div>
        </div>
      )}

      {/* Monthly Bar Chart Widget */}
      {widget.type === "bar_chart" && (
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl ${theme.iconBg}`}>
                <IconComponent size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {widget.module}
                </span>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {widget.title}
                </h3>
              </div>
            </div>

            {onYearChange && (
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(e.target.value)}
                className={`text-xs font-bold px-2.5 py-1 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                  isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                {[0, 1, 2, 3, 4, 5].map((diff) => {
                  const y = (new Date().getFullYear() - diff).toString();
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Total containers in {selectedYear}:{" "}
              <strong className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {widgetData?.series?.reduce((sum, val) => sum + val, 0) ?? widgetData?.total ?? 0}
              </strong>
            </span>
          </div>

          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {widgetData?.series ? (
              <Bar
                data={{
                  labels: widgetData.months || [],
                  datasets: [
                    {
                      label: "Containers",
                      data: widgetData.series || [],
                      backgroundColor: isDark ? "rgba(99, 102, 241, 0.8)" : "rgba(79, 70, 229, 0.75)",
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: isDark ? "#1e293b" : "#0f172a",
                      titleColor: "#fff",
                      bodyColor: "#cbd5e1",
                      padding: 10,
                      cornerRadius: 8,
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: isDark ? "#94a3b8" : "#64748b", font: { size: 10 } },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: isDark ? "#334155" : "#f1f5f9" },
                      ticks: { color: isDark ? "#94a3b8" : "#64748b", font: { size: 10 } },
                    },
                  },
                }}
              />
            ) : (
              <div className="text-xs text-slate-400">Loading chart data...</div>
            )}
          </div>
        </div>
      )}

      {/* Donut Chart Widget */}
      {widget.type === "donut_chart" && (
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className={`p-2.5 rounded-xl ${theme.iconBg}`}>
              <IconComponent size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                {widget.module}
              </span>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {widget.title}
              </h3>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {widgetData?.series && widgetData.series.length > 0 ? (
              <div className="w-full h-full max-h-[200px] flex items-center justify-center">
                <Doughnut
                  data={{
                    labels: widgetData.labels || [],
                    datasets: [
                      {
                        data: widgetData.series || [],
                        backgroundColor: [
                          "#6366f1",
                          "#3b82f6",
                          "#10b981",
                          "#f59e0b",
                          "#8b5cf6",
                          "#ec4899",
                          "#64748b",
                        ],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? "#0f172a" : "#ffffff",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "right",
                        labels: {
                          boxWidth: 12,
                          color: isDark ? "#cbd5e1" : "#475569",
                          font: { size: 10 },
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-center py-8">
                No inventory category distribution data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table Widget */}
      {widget.type === "table" && (
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-xl ${theme.iconBg}`}>
                <IconComponent size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  {widget.module}
                </span>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {widget.title}
                </h3>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Latest {Array.isArray(widgetData) ? widgetData.length : 0} records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                  <th className="pb-2">Container #</th>
                  <th className="pb-2">Seal #</th>
                  <th className="pb-2">Arrival ETA</th>
                  <th className="pb-2">Delivery Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.isArray(widgetData) && widgetData.length > 0 ? (
                  widgetData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.container_no}
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">
                        {item.seal_no}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-300">
                        {item.eta !== "—" ? new Date(item.eta).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                          {item.location}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      No recent arrivals recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
