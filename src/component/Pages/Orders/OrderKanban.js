import React from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Edit3,
  Package,
  ChevronRight,
  Clock,
  ArrowRight
} from "lucide-react";
import { STATUS_PIPELINE } from "./mockOrders";
import { useTheme } from "../../../context/ThemeContext";

export default function OrderKanban({ orders, onStatusChange, onEditOrder }) {
  const { isDark } = useTheme();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Horizontal Scrollable Columns Container */}
      <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-3 pt-1 snap-x snap-mandatory touch-pan-x scrollbar-thin">
        {STATUS_PIPELINE.map((column) => {
          const columnOrders = orders.filter((o) => o.status === column.key);

          return (
            <div
              key={column.key}
              className={`w-80 min-w-[320px] max-w-[320px] flex-shrink-0 snap-start flex flex-col rounded-2xl border shadow-xs transition-all ${
                isDark
                  ? "bg-slate-900 border-slate-800"
                  : "bg-white border-slate-200"
              }`}
            >
              {/* Column Header */}
              <div
                className={`flex-none p-3.5 border-b flex items-center justify-between ${
                  isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      column.key === "PENDING"
                        ? "bg-slate-400"
                        : column.key === "QUOTE_SENT"
                        ? "bg-blue-500"
                        : column.key === "QUOTE_RECEIVED"
                        ? "bg-indigo-500"
                        : column.key === "PI_CONFIRMED"
                        ? "bg-purple-500"
                        : column.key === "ADVANCE_PAYMENT"
                        ? "bg-amber-500"
                        : column.key === "UNDER_PRODUCTION"
                        ? "bg-orange-500"
                        : column.key === "READY_TO_LOAD"
                        ? "bg-lime-500"
                        : column.key === "SEA_WAY"
                        ? "bg-cyan-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}
                  >
                    {column.label}
                  </span>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isDark
                      ? "bg-slate-800 text-slate-300 border-slate-700"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {columnOrders.length}
                </span>
              </div>

              {/* Cards List (Vertically scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                {columnOrders.length === 0 ? (
                  <div
                    className={`h-36 flex flex-col items-center justify-center text-xs font-medium border border-dashed rounded-xl ${
                      isDark
                        ? "border-slate-800 text-slate-500"
                        : "border-slate-200 text-slate-400"
                    }`}
                  >
                    <span>No orders in stage</span>
                  </div>
                ) : (
                  columnOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`rounded-xl border p-3.5 space-y-2.5 transition-all shadow-xs hover:shadow-md ${
                        order.urgent_action
                          ? isDark
                            ? "bg-rose-950/30 border-rose-600/70 ring-1 ring-rose-500/30"
                            : "bg-rose-50/70 border-rose-300 ring-1 ring-rose-300/40"
                          : isDark
                          ? "bg-slate-800/80 border-slate-700 hover:border-blue-500/50"
                          : "bg-white border-slate-200 hover:border-blue-400"
                      }`}
                    >
                      {/* Urgency Badge */}
                      {order.urgent_action && (
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md w-max border border-rose-500/20">
                          <AlertTriangle size={12} />
                          <span>URGENT ACTION REQUIRED</span>
                        </div>
                      )}

                      {/* Header: PO Number + Edit Button */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400 tracking-tight">
                          {order.po_number}
                        </span>
                        <button
                          type="button"
                          onClick={() => onEditOrder(order)}
                          className={`p-1.5 rounded-lg transition ${
                            isDark
                              ? "hover:bg-slate-700 text-slate-400 hover:text-white"
                              : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                          }`}
                          title="Edit Order"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>

                      {/* Consignee Org & Ref Number */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            order.sheet_type === "NOBLE"
                              ? isDark
                                ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                : "bg-blue-50 text-blue-800 border-blue-200"
                              : order.sheet_type === "SAHAJANAND"
                              ? isDark
                                ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                : "bg-purple-50 text-purple-800 border-purple-200"
                              : isDark
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {order.consignee || order.org_name}
                        </span>
                        {order.po_nce && (
                          <span
                            className={`text-[10px] font-mono font-medium ${
                              isDark ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            Ref: {order.po_nce}
                          </span>
                        )}
                      </div>

                      {/* Supplier Company */}
                      <div
                        className={`text-xs font-bold truncate flex items-center gap-1.5 ${
                          isDark ? "text-slate-200" : "text-slate-800"
                        }`}
                      >
                        <Building2
                          size={13}
                          className={`flex-shrink-0 ${
                            isDark ? "text-slate-400" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{order.company}</span>
                      </div>

                      {/* Goods Description */}
                      <div
                        className={`text-xs p-2.5 rounded-lg border font-medium line-clamp-2 ${
                          isDark
                            ? "bg-slate-900/90 border-slate-700/80 text-slate-300"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <Package size={12} className="inline mr-1 text-blue-500" />
                        {order.goods_description}
                      </div>

                      {/* Dates Footer */}
                      <div
                        className={`flex items-center justify-between pt-1 border-t text-[11px] font-medium ${
                          isDark
                            ? "border-slate-700/60 text-slate-400"
                            : "border-slate-100 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Calendar size={11} />
                          <span>Mail: {order.order_mail_date || "—"}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold">
                          {order.year}
                        </span>
                      </div>

                      {/* Stage Mover Selector */}
                      <div className="pt-0.5">
                        <select
                          value={order.status}
                          onChange={(e) => onStatusChange(order.id, e.target.value)}
                          className={`w-full text-[11px] border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold ${
                            isDark
                              ? "bg-slate-800 border-slate-700 text-slate-200"
                              : "bg-slate-50 border-slate-300 text-slate-800"
                          }`}
                        >
                          {STATUS_PIPELINE.map((st) => (
                            <option key={st.key} value={st.key}>
                              Move to: {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
