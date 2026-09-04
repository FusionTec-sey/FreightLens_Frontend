import React from "react";
import { Trash2, AlertTriangle, Building2, Package } from "lucide-react";
import { STATUS_PIPELINE } from "./mockOrders";
import { useTheme } from "../../../context/ThemeContext";

export default function OrderTable({ orders, orderStatuses = [], onEditOrder, onDeleteOrder }) {
  const { isDark } = useTheme();
  const activeStages = orderStatuses && orderStatuses.length > 0 ? orderStatuses : STATUS_PIPELINE;

  return (
    <div
      className={`w-full h-full flex flex-col rounded-2xl border shadow-sm overflow-hidden ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}
    >
      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 bg-slate-100 border-slate-300 text-black">
              <th className="py-3.5 px-4 font-bold text-black" style={{ color: '#000000' }}>PO Number</th>
              <th className="py-3.5 px-4 font-bold text-black" style={{ color: '#000000' }}>Consignee</th>
              <th className="py-3.5 px-4 font-bold text-black" style={{ color: '#000000' }}>Supplier Company</th>
              <th className="py-3.5 px-4 font-bold text-black" style={{ color: '#000000' }}>Material / Goods</th>
              <th className="py-3.5 px-4 font-bold text-black w-44" style={{ color: '#000000' }}>Workflow Stage</th>
              <th className="py-3.5 px-4 font-bold text-black" style={{ color: '#000000' }}>Request Date</th>
              <th className="py-3.5 px-4 font-bold text-black" style={{ color: '#000000' }}>Target ETA</th>
              <th className="py-3.5 px-4 font-bold text-right text-black" style={{ color: '#000000' }}>Actions</th>
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
                    className={`cursor-pointer transition select-none ${
                      isDark ? "hover:bg-slate-800/70 active:bg-slate-800" : "hover:bg-blue-50/60 active:bg-blue-100/50"
                    }`}
                    title="Click row to edit purchase order"
                  >
                    {/* PO Number (Bold) */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      <div>
                        {o.po_number}
                        {o.urgent_action && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20"
                            title="Urgent Action Required"
                          >
                            <AlertTriangle size={10} />
                            URGENT
                          </span>
                        )}
                      </div>
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
                        className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border ${
                          o.sheet_type === "NOBLE"
                            ? "bg-blue-50 text-blue-900 border-blue-200"
                            : o.sheet_type === "SAHAJANAND"
                            ? "bg-purple-50 text-purple-900 border-purple-200"
                            : "bg-amber-50 text-amber-900 border-amber-200"
                        }`}
                      >
                        {o.consignee || o.org_name || o.sheet_type}
                      </span>
                    </td>

                    {/* Supplier Company (Normal weight, Black text) */}
                    <td
                      className="py-3.5 px-4 font-normal text-black max-w-[200px] truncate"
                    >
                      {o.company ? (
                        <span>{o.company}</span>
                      ) : (
                        <span className="italic text-slate-500 font-normal">Not Assigned</span>
                      )}
                    </td>

                    {/* Material / Goods Description (Normal weight, Black text) */}
                    <td
                      className="py-3.5 px-4 font-normal text-black max-w-[250px] truncate"
                    >
                      {o.goods_description || "Materials Pending"}
                    </td>

                    {/* Pipeline Progress Bar - Bold Black Stage Label */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1 w-36">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-black">
                            {stageLabel}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stageObj.color}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Request Date (Normal weight, Black text) */}
                    <td
                      className="py-3.5 px-4 whitespace-nowrap font-mono font-normal text-black"
                    >
                      {o.order_mail_date || "—"}
                    </td>

                    {/* Target ETA (Bold, Blue) */}
                    <td
                      className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-blue-700"
                    >
                      {o.eta_date || o.pi_confirmed_date || "TBD"}
                    </td>

                    {/* Actions: Soft Delete Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onDeleteOrder && onDeleteOrder(o)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition inline-flex items-center gap-1.5 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border-rose-200 shadow-xs"
                          title="Delete Order (Soft Delete)"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
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
            No purchase orders match current filter criteria.
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

            return (
              <div
                key={o.id}
                onClick={() => onEditOrder(o)}
                className={`p-3.5 rounded-xl border space-y-2.5 cursor-pointer transition ${
                  o.urgent_action
                    ? "border-rose-300 bg-rose-50/60"
                    : isDark
                    ? "bg-slate-800/80 border-slate-700 hover:border-slate-600"
                    : "bg-white border-slate-200 shadow-xs hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-600">
                    {o.po_number}
                  </span>
                  <span className="text-xs font-bold text-black">
                    {stageLabel}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stageObj.color}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-black">
                  <div className="flex items-center gap-1.5 truncate font-normal">
                    <Building2 size={13} className="text-slate-500 flex-shrink-0" />
                    <span className="truncate">{o.company || "Supplier TBD"}</span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDeleteOrder && onDeleteOrder(o)}
                      className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-semibold rounded-lg hover:bg-rose-600 hover:text-white transition flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div
                  className="text-xs p-2 rounded-lg border font-normal text-black bg-slate-50 border-slate-200"
                >
                  <Package size={12} className="inline mr-1 text-blue-500" />
                  {o.goods_description || "Materials Pending"}
                </div>

                <div
                  className="flex items-center justify-between text-[11px] pt-1 border-t font-normal text-slate-600 border-slate-100"
                >
                  <span className="text-black font-semibold">Stage: {stageLabel}</span>
                  <span className="text-blue-700 font-bold">
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
