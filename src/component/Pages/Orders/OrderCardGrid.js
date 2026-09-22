import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical,
  Building2,
  Package,
  Calendar,
  AlertTriangle,
  Clock,
  Edit3,
  Trash2,
  Lock,
  GitCompare
} from "lucide-react";
import { STATUS_PIPELINE } from "./mockOrders";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

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

export default function OrderCardGrid({ orders, orderStatuses = [], activeTab = "orders", onStatusChange, onEditOrder, onDeleteOrder, onOpenVersionHistory }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { isRoot, permissions = [] } = useAuth();
  const [activeMenuId, setActiveMenuId] = useState(null);
  const userInfo = getUserInfo();
  const isAccountsOrAdmin = userInfo?.roles?.some((r) => {
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
  });

  const canDelete = isRoot ||
    permissions.includes("Administrator") ||
    (activeTab === "sourcing"
      ? (permissions.includes("Delete_RFQ") || permissions.includes("Delete_Order") || permissions.includes("Order"))
      : (permissions.includes("Delete_Order") || permissions.includes("Order")));

  const canCompareQuotes = Boolean(
    isRoot ||
    permissions.includes("Compare_Quote") ||
    permissions.includes("View_VendorQuote") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return (
        lower.includes("admin") ||
        lower.includes("procurement") ||
        lower.includes("buyer") ||
        lower.includes("finance") ||
        lower.includes("account")
      );
    })
  );

  const activeStages = orderStatuses && orderStatuses.length > 0 ? orderStatuses : STATUS_PIPELINE;

  const toggleMenu = (orderId, e) => {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === orderId ? null : orderId));
  };

  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  if (orders.length === 0) {
    return (
      <div
        className={`w-full py-16 flex flex-col items-center justify-center rounded-2xl border border-dashed text-center p-6 ${isDark
            ? "border-slate-800 bg-slate-900/40 text-slate-400"
            : "border-slate-300 bg-white text-slate-500"
          }`}
      >
        <Package size={36} className="mb-2 opacity-40 text-blue-500" />
        <span className="text-sm font-bold">
          {activeTab === "sourcing"
            ? "No sourcing RFQs match your filter criteria"
            : "No purchase orders match your filter criteria"}
        </span>
        <p className="text-xs mt-1 text-slate-400">Try adjusting search query or clearing stage filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-8 scrollbar-thin">
      {orders.map((order) => {
        const stageObj = activeStages.find(
          (s) => s.key === order.status || s.code === order.status || s.name === order.status || s.label === order.status
        ) || {
          label: order.status_label || order.status,
          progress: order.status_progress || 50,
          color: order.status_color || "bg-blue-500",
        };

        const progress = stageObj.progress !== undefined ? stageObj.progress : (order.status_progress || 10);
        const stageLabel = stageObj.name || stageObj.label || order.status_label || order.status;

        return (
          <div
            key={order.id}
            onClick={() => onEditOrder(order)}
            className={`relative rounded-2xl border p-4 flex flex-col justify-between space-y-3.5 transition-all shadow-xs hover:shadow-md cursor-pointer select-none ${order.urgent_action
                ? isDark
                  ? "bg-rose-950/20 border-rose-600/60 ring-1 ring-rose-500/20 hover:border-rose-500"
                  : "bg-rose-50/50 border-rose-300 ring-1 ring-rose-300/30 hover:border-rose-400"
                : isDark
                  ? "bg-[#1E293B] border-slate-700/80 hover:border-indigo-500/70"
                  : "bg-white border-slate-200 hover:border-indigo-400"
              }`}
            title={activeTab === "sourcing" || order.doc_type === "RFQ" ? "Click card to view/edit sourcing RFQ" : "Click card to edit purchase order"}
          >
            {/* TOP HEADER ROW: PO Number + Consignee + Action Menu */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm tracking-tight text-indigo-600 dark:text-indigo-400">
                    {order.po_number}
                  </span>
                  {order.urgent_action && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 animate-pulse">
                      <AlertTriangle size={11} />
                      URGENT
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Consignee Tenant Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${order.sheet_type === "NOBLE"
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
                    {order.consignee || order.org_name || order.sheet_type}
                  </span>

                  {/* Version & Stage Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenVersionHistory) onOpenVersionHistory(order);
                    }}
                    title="View Version History & Lineage"
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 flex items-center gap-1 cursor-pointer transition"
                  >
                    {order.doc_type === "RFQ" && (
                      <span>{(order.lifecycle_stage || "DRAFT").replace('_', ' ')}</span>
                    )}
                    <span className="font-mono">v{order.stage_version || 1}</span>
                  </button>

                  {/* Accounts Locked PO Reference */}
                  {isAccountsOrAdmin && order.po_nce && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${isDark
                          ? "bg-slate-800 text-slate-300 border-slate-700"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      title="Internal Accounts Reference"
                    >
                      <Lock size={10} className="text-amber-500" />
                      {order.po_nce}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Menu (⋮) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => toggleMenu(order.id, e)}
                  className={`p-1.5 rounded-lg transition ${isDark
                      ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                      : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                    }`}
                  title="Actions"
                >
                  <MoreVertical size={16} />
                </button>

                {/* Dropdown Menu */}
                {activeMenuId === order.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute right-0 top-8 z-30 w-48 rounded-xl border shadow-xl py-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 ${isDark
                        ? "bg-slate-850 border-slate-700 text-slate-200"
                        : "bg-white border-slate-200 text-slate-800"
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenuId(null);
                        onEditOrder(order);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 transition ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
                        }`}
                    >
                      <Edit3 size={13} className="text-blue-500" />
                      <span>{activeTab === "sourcing" || order.doc_type === "RFQ" ? "Edit Sourcing RFQ" : "Edit Order Details"}</span>
                    </button>

                    {canCompareQuotes && ["RFQ_SENT", "QUOTE_RECEIVED", "QUOTE_APPROVED"].includes(order.lifecycle_stage) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          navigate(`/orders/${order.id}/quotes`);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 transition ${isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
                          }`}
                      >
                        <GitCompare size={13} />
                        <span>Compare Quotes</span>
                      </button>
                    )}

                    {canDelete && onDeleteOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onDeleteOrder(order);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 text-rose-500 transition ${isDark ? "hover:bg-rose-950/40" : "hover:bg-rose-50"
                          }`}
                      >
                        <Trash2 size={13} />
                        <span>{activeTab === "sourcing" || order.doc_type === "RFQ" ? "Delete RFQ" : "Delete Order"}</span>
                      </button>
                    )}

                    <div
                      className={`my-1 border-t ${isDark ? "border-slate-800" : "border-slate-100"
                        }`}
                    />

                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Quick Move Stage:
                    </div>
                    <div className="max-h-44 overflow-y-auto px-1">
                      {activeStages.map((st) => {
                        const stKey = st.key || st.code || st.name;
                        const stLabel = st.name || st.label;
                        return (
                          <button
                            key={st.id || stKey}
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onStatusChange(order.id, stKey);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition ${order.status === stKey || order.status_label === stLabel
                                ? "bg-blue-600 text-white font-bold"
                                : isDark
                                  ? "hover:bg-slate-800 text-slate-300"
                                  : "hover:bg-slate-100 text-slate-700"
                              }`}
                          >
                            <span>{stLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SUPPLIER & GOODS (MATERIALS) */}
            <div className="space-y-1.5">
              {/* Supplier row (Optional) */}
              <div
                className={`text-xs font-bold truncate flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-slate-800"
                  }`}
              >
                <Building2 size={13} className="flex-shrink-0 text-slate-400" />
                {order.doc_type === "RFQ" ? (
                  ["QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(order.lifecycle_stage) ? (
                    <span className="truncate font-bold text-emerald-600 dark:text-emerald-400">
                      Awarded ({order.child_pos?.length || 1} PO{(order.child_pos?.length || 1) > 1 ? "s" : ""})
                    </span>
                  ) : (
                    <span className="italic text-slate-400 font-normal">Multi-Vendor Sourcing</span>
                  )
                ) : order.company ? (
                  <span className="truncate">{order.company}</span>
                ) : (
                  <span className="italic text-slate-400 font-normal">Supplier: Not Assigned</span>
                )}
              </div>

              {/* Goods / Materials */}
              <div
                className={`text-xs p-2 rounded-xl border font-bold line-clamp-2 ${isDark
                    ? "bg-slate-950/80 border-slate-800 text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
              >
                <Package size={12} className="inline mr-1 text-blue-500" />
                {order.goods_description || "Materials Pending"}
              </div>
            </div>

            {/* PIPELINE STAGE & VISUAL PROGRESS BAR (No percentage text displayed) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {stageLabel}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${stageObj.color}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* KEY DATES FOOTER */}
            <div
              className={`pt-2 border-t flex items-center justify-between text-[11px] font-mono ${isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
                }`}
            >
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>Req: {order.order_mail_date || "—"}</span>
              </div>

              <div className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                <Clock size={12} />
                <span>ETA: {order.eta_date || order.pi_confirmed_date || "TBD"}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
