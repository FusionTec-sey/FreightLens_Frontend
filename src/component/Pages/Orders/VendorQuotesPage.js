import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitCompare,
  Search,
  RefreshCw,
  Award,
  Building2,
  List,
  LayoutGrid,
  Send
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

const QUOTE_STAGES = [
  { code: "ALL", label: "All Bidding & Quotes" },
  { code: "CONFIRMED", label: "Confirmed (Ready to Send)" },
  { code: "RFQ_SENT", label: "RFQ Sent (Waiting for Quotes)" },
  { code: "QUOTE_RECEIVED", label: "Quotes In (Ready to Compare)" },
  { code: "QUOTE_APPROVED", label: "Awarded (Ready for PO)" },
];

export default function VendorQuotesPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { isRoot, permissions = [] } = useAuth();
  const canSendRFQ = isRoot || permissions.includes("Send_RFQ") || permissions.includes("Administrator");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [sendingRfqId, setSendingRfqId] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "skip_zrok_interstitial": "true",
        },
      });
      let data = res.data;
      if (typeof data === "string") data = JSON.parse(data);
      const allList = Array.isArray(data)
        ? data
        : (Array.isArray(data?.items) ? data.items : (data?.data || []));
      setOrders(allList);
    } catch (err) {
      console.error("Could not fetch quotation orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRFQ = async (order, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSendingRfqId(order.id);
    try {
      let success = false;
      try {
        await axios.post(
          `${process.env.REACT_APP_NETWORK}/orders/${order.id}/transition`,
          {
            target_stage: "RFQ_SENT",
            expected_version: order.lifecycle_version || 1,
            comment: "Dispatched RFQ to vendors for quotation bidding.",
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
        success = true;
      } catch (transErr) {
        console.warn("Transition endpoint fallback to status patch:", transErr);
      }

      if (!success) {
        await axios.patch(
          `${process.env.REACT_APP_NETWORK}/orders/${order.id}/status`,
          { status: "RFQ_SENT", lifecycle_stage: "RFQ_SENT" },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: "RFQ_SENT", lifecycle_stage: "RFQ_SENT" }
            : o
        )
      );
      await fetchOrders();
    } catch (err) {
      console.error("Failed to dispatch RFQ:", err);
      alert(err.response?.data?.detail || "Failed to dispatch RFQ to suppliers.");
    } finally {
      setSendingRfqId(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter for orders involved in quotation bidding (confirmed RFQs onwards)
  const quotingOrders = useMemo(() => {
    return orders.filter((o) => {
      const stage = (o.lifecycle_stage || "").toUpperCase();
      return (
        ["CONFIRMED", "RFQ_SENT", "QUOTE_RECEIVED", "QUOTE_APPROVED"].includes(stage) ||
        (o.doc_type === "RFQ" && stage !== "DRAFT") ||
        Boolean(o.selected_quote_id)
      );
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return quotingOrders.filter((o) => {
      const stage = (o.lifecycle_stage || "DRAFT").toUpperCase();
      if (selectedStage !== "ALL" && stage !== selectedStage) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPo = o.po_number?.toLowerCase().includes(q);
        const matchComp = o.company?.toLowerCase().includes(q);
        const matchDesc = o.goods_description?.toLowerCase().includes(q);
        return matchPo || matchComp || matchDesc;
      }
      return true;
    });
  }, [quotingOrders, selectedStage, searchQuery]);

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Header */}
      <div
        className={`flex-none p-3.5 md:p-4 border-b shadow-xs space-y-3 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Vendor Quotes & Bidding
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                  {filteredOrders.length} In Bidding
                </span>
              </div>
              <p className={`text-xs mt-0.5 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Record supplier price bids, compare side-by-side matrices, and award purchase orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOrders}
              className={`p-2 rounded-xl border transition ${
                isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-400"
                  : "border-slate-200 hover:bg-slate-100 text-slate-600"
              }`}
              title="Refresh Quotes"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Search & View Mode */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <div className="relative flex-1 sm:max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RFQ #, vendor, items..."
              className={`w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl border outline-hidden transition ${
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500"
              }`}
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition flex-1 sm:flex-none justify-center ${
                viewMode === "table"
                  ? "bg-amber-600 text-white shadow-xs"
                  : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition flex-1 sm:flex-none justify-center ${
                viewMode === "grid"
                  ? "bg-amber-600 text-white shadow-xs"
                  : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Cards Grid</span>
            </button>
          </div>
        </div>

        {/* Stage Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin pt-0.5">
          {QUOTE_STAGES.map((st) => {
            const isSelected = selectedStage === st.code;
            const count = st.code === "ALL"
              ? quotingOrders.length
              : quotingOrders.filter((o) => (o.lifecycle_stage || "").toUpperCase() === st.code).length;

            return (
              <button
                key={st.code}
                type="button"
                onClick={() => setSelectedStage(st.code)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold whitespace-nowrap transition ${
                  isSelected
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : isDark
                      ? "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`px-1 rounded text-[9px] font-mono font-bold ${
                    isSelected
                      ? "bg-amber-800 text-white"
                      : isDark
                        ? "bg-slate-700 text-slate-300"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-auto p-3.5 md:p-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-amber-500 mb-2" />
            <p className="text-xs text-slate-400">Loading quotation records...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Award size={36} className="text-slate-400 mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-500">No quotation requests found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              When RFQs are sent to suppliers for quotation, they will appear here to record vendor price bids and compare matrices.
            </p>
          </div>
        ) : viewMode === "table" ? (
          <div className={`border rounded-2xl overflow-hidden shadow-xs ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${isDark ? "bg-slate-800/60 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                  <th className="py-3 px-4 font-bold">RFQ / PO Number</th>
                  <th className="py-3 px-4 font-bold">Stage</th>
                  <th className="py-3 px-4 font-bold">Materials / Items</th>
                  <th className="py-3 px-4 font-bold">Supplier / Bidders</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                {filteredOrders.map((order) => {
                  const stage = (order.lifecycle_stage || "DRAFT").toUpperCase();
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}/quotes`)}
                      className="cursor-pointer hover:bg-amber-500/10 transition select-none group"
                      title="Click row to view quotation matrix and details"
                    >
                      <td className="py-3 px-4 font-bold font-mono text-amber-600 dark:text-amber-400 group-hover:underline">
                        {order.po_number}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          stage === "QUOTE_APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            : stage === "QUOTE_RECEIVED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                            : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                        }`}>
                          {stage}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {order.goods_description || `${(order.items || []).length} items`}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {order.company || "Pending Vendor Bids"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {stage === "CONFIRMED" ? (
                          canSendRFQ ? (
                            <button
                              type="button"
                              disabled={sendingRfqId === order.id}
                              onClick={(e) => handleSendRFQ(order, e)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-lg text-xs transition shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                              title="Dispatch / Send this RFQ to suppliers"
                            >
                              <Send size={13} className={sendingRfqId === order.id ? "animate-spin" : ""} />
                              <span>{sendingRfqId === order.id ? "Sending..." : "Send RFQ to Vendors"}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-amber-600 font-semibold italic">Ready to Send</span>
                          )
                        ) : stage === "QUOTE_APPROVED" ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${order.id}/quotes`)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-xs transition shadow-xs inline-flex items-center gap-1.5"
                          >
                            <Award size={13} />
                            <span>View Awarded Quotes</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate(`/orders/${order.id}/quotes`)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-lg text-xs transition shadow-xs inline-flex items-center gap-1.5"
                          >
                            <GitCompare size={13} />
                            <span>{stage === "QUOTE_RECEIVED" ? "Review & Compare Quotes" : "Record / Compare Quotes"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const stage = (order.lifecycle_stage || "DRAFT").toUpperCase();
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}/quotes`)}
                  className={`p-4 rounded-2xl border shadow-xs transition hover:shadow-md cursor-pointer flex flex-col justify-between group ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}
                  title="Click card to view quotation matrix and details"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 group-hover:underline">
                        {order.po_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                        {stage}
                      </span>
                    </div>
                    <p className="text-xs line-clamp-2 text-slate-600 dark:text-slate-300">
                      {order.goods_description || "Material specification pending"}
                    </p>
                    {order.company && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Building2 size={13} />
                        <span>{order.company}</span>
                      </div>
                    )}
                  </div>
                  <div
                    className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {stage === "CONFIRMED" ? (
                      canSendRFQ ? (
                        <button
                          type="button"
                          disabled={sendingRfqId === order.id}
                          onClick={(e) => handleSendRFQ(order, e)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Send size={14} className={sendingRfqId === order.id ? "animate-spin" : ""} />
                          <span>{sendingRfqId === order.id ? "Sending RFQ..." : "Send RFQ to Vendors"}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold italic">Ready to Dispatch</span>
                      )
                    ) : stage === "QUOTE_APPROVED" ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${order.id}/quotes`)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Award size={14} />
                        <span>View Awarded Quotes</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${order.id}/quotes`)}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <GitCompare size={14} />
                        <span>{stage === "QUOTE_RECEIVED" ? "Review & Compare Quotes" : "Record / Compare Quotes"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
