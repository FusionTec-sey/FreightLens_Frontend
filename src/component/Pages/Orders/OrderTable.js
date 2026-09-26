import React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle, Building2, Package, GitCompare, Lock, History } from "lucide-react";
import { STATUS_PIPELINE } from "./mockOrders";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

const LIFECYCLE_CONFIG = {
  DRAFT: { label: "Draft PO", bg: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700" },
  CONFIRMED: { label: "Confirmed", bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  RFQ_SENT: { label: "RFQ Sent", bg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
  QUOTE_RECEIVED: { label: "Quote Recv", bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  QUOTE_APPROVED: { label: "Quote Appr", bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  PO_ISSUED: { label: "PO Issued", bg: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
  PROFORMA: { label: "Proforma", bg: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800" }
};

export default function OrderTable({ orders, orderStatuses = [], activeTab = "orders", onEditOrder, onDeleteOrder, onOpenVersionHistory }) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { isRoot, permissions = [] } = useAuth();
  const canViewSupplier = isRoot || permissions.includes("View_Supplier") || permissions.includes("Supplier") || permissions.includes("Administrator");
  const canDelete = isRoot ||
    permissions.includes("Administrator") ||
    (activeTab === "sourcing"
      ? (permissions.includes("Delete_RFQ") || permissions.includes("Delete_Order") || permissions.includes("Order"))
      : (permissions.includes("Delete_Order") || permissions.includes("Order")));
  const activeStages = orderStatuses && orderStatuses.length > 0 ? orderStatuses : STATUS_PIPELINE;

  return (
    <div
      className={`w-full h-full flex flex-col rounded-2xl border shadow-sm overflow-hidden ${isDark ? "bg-[#1E293B] border-slate-700/80" : "bg-white border-slate-200"
        }`}
    >
      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className={`border-b text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-10 ${isDark ? "bg-slate-800/90 border-slate-700 text-slate-300" : "bg-slate-100/90 border-slate-200 text-slate-700"
                }`}
            >
              <th className="py-3.5 px-4 font-semibold">
                {activeTab === "sourcing" ? "RFQ Number" : "PO Number"}
              </th>
              <th className="py-3.5 px-4 font-semibold">Consignee</th>
              <th className="py-3.5 px-4 font-semibold">
                {activeTab === "sourcing" ? "Sourcing Scope" : "Supplier Company"}
              </th>
              <th className="py-3.5 px-4 font-semibold">Material / Goods</th>
              <th className="py-3.5 px-4 font-semibold w-44">Workflow Stage</th>
              <th className="py-3.5 px-4 font-semibold">
                {activeTab === "sourcing" ? "Requisition Date" : "PO Date"}
              </th>
              <th className="py-3.5 px-4 font-semibold">
                {activeTab === "sourcing" ? "Award Status / ETA" : "Target ETA"}
              </th>
              <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-xs font-normal text-slate-500 italic"
                >
                  No purchase orders match current filter criteria.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const stageObj = activeStages.find(
                  (s) => s.key === o.status || s.code === o.status || s.name === o.status || s.label === o.status
                ) || {
                  label: o.status_label || o.status,
                  progress: o.status_progress || 50,
                  color: "bg-blue-500",
                };

                const progress = stageObj.progress !== undefined ? stageObj.progress : (o.status_progress || 10);
                const stageLabel = stageObj.name || stageObj.label || o.status_label || o.status;

                return (
                  <tr
                    key={o.id}
                    onClick={() => onEditOrder(o)}
                    className={`cursor-pointer transition select-none ${isDark ? "hover:bg-slate-800/70 active:bg-slate-800" : "hover:bg-slate-100/70 active:bg-slate-200/60"
                      }`}
                    title={activeTab === "sourcing" ? "Click row to view/edit sourcing RFQ" : "Click row to edit purchase order"}
                  >
                    {/* PO/RFQ Number (Bold) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div>
                        <span className={`font-mono font-bold ${activeTab === "sourcing" ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                          {o.po_number}
                        </span>
                        {o.urgent_action && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20"
                            title="Urgent Action Required"
                          >
                            <AlertTriangle size={10} />
                            URGENT
                          </span>
                        )}
                        {/* Independent Payment Status Pill for Purchase Orders */}
                        {o.doc_type !== "RFQ" && (
                          <span
                            className={`ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${o.payment_badge_color || (
                              o.payment_status === "FULLY_PAID"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700"
                                : o.payment_status === "PART_PAID"
                                  ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
                                  : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                            )}`}
                            title="Financial / Payment Status"
                          >
                            {o.payment_label || (
                              o.payment_status === "FULLY_PAID"
                                ? "Paid"
                                : o.payment_status === "PART_PAID"
                                  ? "Part Paid"
                                  : "Unpaid"
                            )}
                          </span>
                        )}
                      </div>

                      {/* Origin RFQ link badge */}
                      {o.origin_rfq_number && (
                        <div className="mt-1">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (o.parent_rfq_id) navigate(`/orders/${o.parent_rfq_id}/quotes`);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition cursor-pointer"
                            title="Click to view original RFQ and vendor quotes"
                          >
                            <GitCompare size={10} />
                            <span>From {o.origin_rfq_number}</span>
                          </span>
                        </div>
                      )}

                      {/* Split Child PO Badges */}
                      {o.child_pos && o.child_pos.length > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-medium">Split POs:</span>
                          {o.child_pos.map((cp) => (
                            <span
                              key={cp.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/orders/${cp.id}/edit`);
                              }}
                              className="inline-flex items-center text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                              title={`Open Purchase Order ${cp.po_number}`}
                            >
                              {cp.po_number}
                            </span>
                          ))}
                        </div>
                      )}

                      {o.shipments?.length > 0 && o.shipments[0]?.container_no && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                          <Package size={11} className="text-blue-500" />
                          <span>{o.shipments[0].container_no}</span>
                          {o.shipments.length > 1 && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded">
                              +{o.shipments.length - 1}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Consignee Tenant */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${o.sheet_type === "NOBLE"
                            ? "bg-blue-50 text-blue-900 border-blue-200"
                            : o.sheet_type === "SAHAJANAND"
                              ? "bg-purple-50 text-purple-900 border-purple-200"
                              : "bg-amber-50 text-amber-900 border-amber-200"
                          }`}
                      >
                        {o.consignee || o.org_name || o.sheet_type}
                      </span>
                    </td>

                    {/* Supplier Company (Normal weight, Slate text) */}
                    <td
                      className="py-3.5 px-4 font-normal text-slate-800 dark:text-slate-200 max-w-[200px] truncate"
                    >
                      {activeTab === "sourcing" || o.doc_type === "RFQ" ? (
                        ["QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(o.lifecycle_stage) ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            Awarded ({o.child_pos?.length || 1} PO{(o.child_pos?.length || 1) > 1 ? "s" : ""})
                          </span>
                        ) : (
                          <span className="italic text-slate-500 font-normal">
                            {o.lifecycle_stage === "QUOTE_RECEIVED" ? "Quotes Under Review" : "Multi-Vendor Bidding"}
                          </span>
                        )
                      ) : !canViewSupplier ? (
                        <span className="italic text-slate-400 text-[11px] font-medium inline-flex items-center gap-1">
                          <Lock size={10} className="text-slate-400" /> Confidential
                        </span>
                      ) : o.company ? (
                        <span>{o.company}</span>
                      ) : (
                        <span className="italic text-slate-500 font-normal">Not Assigned</span>
                      )}
                    </td>

                    {/* Material / Goods Description (Normal weight, Slate text) */}
                    <td
                      className="py-3.5 px-4 font-normal text-slate-800 dark:text-slate-200 max-w-[250px] truncate"
                    >
                      {o.goods_description || "Materials Pending"}
                    </td>

                    {/* Workflow Stage */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {activeTab === "sourcing" || o.doc_type === "RFQ" ? (
                        <div className="space-y-1.5 w-52">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const lcCode = (o.lifecycle_stage || "DRAFT").toUpperCase();
                              const lcCfg = LIFECYCLE_CONFIG[lcCode] || LIFECYCLE_CONFIG.DRAFT;
                              return (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${lcCfg.bg} flex items-center gap-1`}>
                                  {o.lifecycle_locked && <Lock size={9} className="text-amber-500" />}
                                  <span>{lcCfg.label}</span>
                                </span>
                              );
                            })()}

                            {/* Live Operational Fulfillment Badge */}
                            {o.fulfillment_summary && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${o.fulfillment_summary.primary_badge_color}`}
                                title={`Fulfillment Status: ${o.fulfillment_summary.summary_desc || o.fulfillment_summary.primary_status_label}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${o.fulfillment_summary.primary_status_color}`} />
                                <span>{o.fulfillment_summary.primary_status_label}</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenVersionHistory) onOpenVersionHistory(o);
                              }}
                              title="View Version History & Lineage"
                              className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5 cursor-pointer transition"
                            >
                              <History size={9} />
                              <span>v{o.stage_version || 1}</span>
                            </button>
                          </div>

                          {/* Live Child PO Fulfillment Links with Status */}
                          {o.child_pos && o.child_pos.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {o.child_pos.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/orders/${c.id}/edit`);
                                  }}
                                  title={`Open ${c.po_number}: ${c.status_label || c.status}${c.eta_date ? ` (ETA: ${c.eta_date})` : ''}`}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border bg-slate-50 dark:bg-slate-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{c.po_number}</span>
                                  <span className="font-sans font-semibold text-[8px] text-indigo-600 dark:text-indigo-400">
                                    • {c.status_label || c.status}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {o.origin_rfq_number && (
                            <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 block">
                              From {o.origin_rfq_number}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5 w-44">
                          <div className="flex items-center justify-between text-[11px] gap-1">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                              {stageLabel}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenVersionHistory) onOpenVersionHistory(o);
                              }}
                              title="View Version History & Lineage"
                              className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 flex items-center gap-0.5 cursor-pointer transition flex-none"
                            >
                              <History size={9} />
                              <span>v{o.stage_version || 1}</span>
                            </button>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stageObj.color}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Request Date (Normal weight, Slate text) */}
                    <td
                      className="py-3.5 px-4 whitespace-nowrap font-mono font-normal text-slate-800 dark:text-slate-200"
                    >
                      {o.order_mail_date || "—"}
                    </td>

                    {/* Target ETA (Semibold, Indigo) */}
                    <td
                      className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-indigo-700 dark:text-indigo-400"
                    >
                      {o.eta_date || o.fulfillment_summary?.eta_date || o.pi_confirmed_date || "TBD"}
                    </td>

                    {/* Actions: Soft Delete */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canDelete && onDeleteOrder && (
                        <div className="inline-flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onDeleteOrder(o)}
                            className="px-2.5 py-1 rounded-lg border text-xs font-semibold transition inline-flex items-center gap-1 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border-rose-200 shadow-xs"
                            title={activeTab === "sourcing" ? "Delete RFQ (Soft Delete)" : "Delete Order (Soft Delete)"}
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE RESPONSIVE CARDS */}
      <div className="block md:hidden flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {orders.length === 0 ? (
          <div className="py-12 text-center text-xs font-normal text-slate-500 italic">
            {activeTab === "sourcing"
              ? "No sourcing RFQs match current filter criteria."
              : "No purchase orders match current filter criteria."}
          </div>
        ) : (
          orders.map((o) => {
            const stageObj = activeStages.find(
              (s) => s.key === o.status || s.code === o.status || s.name === o.status || s.label === o.status
            ) || {
              label: o.status_label || o.status,
              progress: o.status_progress || 50,
              color: "bg-blue-500",
            };

            const progress = stageObj.progress !== undefined ? stageObj.progress : (o.status_progress || 10);
            const stageLabel = stageObj.name || stageObj.label || o.status_label || o.status;
            const lcCode = (o.lifecycle_stage || "DRAFT").toUpperCase();
            const lcCfg = LIFECYCLE_CONFIG[lcCode] || LIFECYCLE_CONFIG.DRAFT;

            return (
              <div
                key={o.id}
                onClick={() => onEditOrder(o)}
                className={`p-3.5 rounded-xl border space-y-2.5 cursor-pointer transition ${o.urgent_action
                    ? "border-rose-300 bg-rose-50/60"
                    : isDark
                      ? "bg-slate-800/80 border-slate-700 hover:border-slate-600"
                      : "bg-white border-slate-200 shadow-xs hover:border-blue-300"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-blue-600">
                      {o.po_number}
                    </span>
                    {/* Payment badge for POs */}
                    {o.doc_type !== "RFQ" && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${o.payment_badge_color || (
                          o.payment_status === "FULLY_PAID"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700"
                            : o.payment_status === "PART_PAID"
                              ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
                              : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                        )}`}
                      >
                        {o.payment_label || (
                          o.payment_status === "FULLY_PAID"
                            ? "Paid"
                            : o.payment_status === "PART_PAID"
                              ? "Part Paid"
                              : "Unpaid"
                        )}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenVersionHistory) onOpenVersionHistory(o);
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>v{o.stage_version || 1}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {activeTab === "sourcing" || o.doc_type === "RFQ"
                        ? (o.fulfillment_summary ? `${lcCfg.label} • ${o.fulfillment_summary.primary_status_label}` : lcCfg.label)
                        : stageLabel}
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${o.fulfillment_summary ? o.fulfillment_summary.primary_status_color : stageObj.color}`}
                    style={{ width: `${o.fulfillment_summary ? o.fulfillment_summary.primary_progress : progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5 truncate font-normal">
                    <Building2 size={13} className="text-slate-500 flex-shrink-0" />
                    <span className="truncate">{o.company || "Supplier TBD"}</span>
                  </div>
                  {canDelete && onDeleteOrder && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDeleteOrder(o)}
                        className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-semibold rounded-lg hover:bg-rose-600 hover:text-white transition flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`text-xs p-2 rounded-lg border font-normal ${isDark ? "bg-slate-800/60 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                >
                  <Package size={12} className="inline mr-1 text-indigo-500" />
                  {o.goods_description || "Materials Pending"}
                </div>

                <div
                  className={`flex items-center justify-between text-[11px] pt-1 border-t font-normal ${isDark ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-600"
                    }`}
                >
                  <span className="text-slate-800 dark:text-slate-200 font-medium">Stage: {stageLabel}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    ETA: {o.eta_date || o.pi_confirmed_date || "TBD"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
