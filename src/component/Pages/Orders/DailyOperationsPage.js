import React, { useState, useEffect } from "react";
import { 
  Briefcase, CheckCircle2, Clock, AlertTriangle, 
  FileSpreadsheet, ArrowUpRight, Check, X, Users, TrendingUp 
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { toast } from "react-toastify";

export default function DailyOperationsPage() {
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState("queue"); // "queue" | "eod"
  const [queueData, setQueueData] = useState({ total_pending_items: 0, categories: {} });
  const [eodData, setEodData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const [qRes, eodRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_NETWORK}/daily-work`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${process.env.REACT_APP_NETWORK}/daily-work/eod-report`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      ]);
      setQueueData(qRes.data || { total_pending_items: 0, categories: {} });
      setEodData(eodRes.data || null);
    } catch (err) {
      toast.error("Failed to load daily operations data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, []);

  const categoryTitles = {
    sourcing: "1. Sourcing & Requirements Pending",
    po_preparation: "2. PO Preparation / Quoting",
    awaiting_payment: "3. Advance / Balance Payments Pending",
    in_production: "4. Manufacturing in Progress",
    ready_and_packing: "5. Ready & Packing List Verification",
    in_transit: "6. Shipped / Sea Way In Transit",
    awaiting_receipt: "7. Port Arrival & Warehouse Verification",
    defects: "8. Open Defects / Damaged Goods"
  };

  return (
    <div className={`p-4 md:p-6 space-y-6 ${theme.background} min-h-screen`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="text-purple-500" /> Daily Operations & EOD Workspace
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Interactive daily review queue and consolidated End-of-Day management report.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "queue"
                ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Clock size={14} /> Active Work Queue ({queueData.total_pending_items})
          </button>
          <button
            onClick={() => setActiveTab("eod")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "eod"
                ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <FileSpreadsheet size={14} /> EOD Management Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading operational workspace...</div>
      ) : activeTab === "queue" ? (
        /* Work Queue View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(queueData.categories || {}).map(([key, items]) => (
              <div
                key={key}
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {key.replace("_", " ")}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    items.length > 0 ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}>
                    {items.length}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black">{items.length}</div>
                  <span className="text-[11px] text-gray-400">pending actions</span>
                </div>
              </div>
            ))}
          </div>

          {/* Categorized Detailed Queue */}
          <div className="space-y-6">
            {Object.entries(queueData.categories || {}).map(([key, items]) => {
              if (!items || items.length === 0) return null;
              return (
                <div key={key} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      {categoryTitles[key] || key}
                    </h3>
                    <span className="text-xs text-gray-400">{items.length} active</span>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((it, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                              {it.reference}
                            </span>
                            {it.urgent && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-sm mt-1">{it.title}</p>
                          <span className="text-xs text-gray-400">
                            {it.company ? `Supplier: ${it.company}` : it.department ? `Dept: ${it.department}` : it.category || "General"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {it.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* End-of-Day Report View */
        <div className="space-y-6">
          {eodData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Active Orders</span>
                  <div className="text-2xl font-black mt-1 text-purple-600">{eodData.group_summary?.active_orders}</div>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Completed Orders</span>
                  <div className="text-2xl font-black mt-1 text-emerald-600">{eodData.group_summary?.completed_orders}</div>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Urgent Action Items</span>
                  <div className="text-2xl font-black mt-1 text-rose-600">{eodData.group_summary?.urgent_orders}</div>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Open Defects</span>
                  <div className="text-2xl font-black mt-1 text-amber-600">{eodData.group_summary?.open_defects}</div>
                </div>
              </div>

              {/* Status Breakdown & Employee Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
                  <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <TrendingUp size={16} className="text-blue-500" /> Pipeline Status Distribution
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(eodData.status_breakdown || {}).map(([st, count]) => (
                      <div key={st} className="flex justify-between items-center text-xs py-1 border-b border-gray-100 dark:border-gray-800">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{st}</span>
                        <span className="font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
                  <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Users size={16} className="text-emerald-500" /> Employee Milestone Activity
                  </h3>
                  <div className="space-y-2">
                    {(eodData.employee_work_summary || []).length === 0 ? (
                      <p className="text-xs text-gray-400">No manual updates recorded today yet.</p>
                    ) : (
                      (eodData.employee_work_summary || []).map((emp, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 dark:border-gray-800">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">👤 {emp.username}</span>
                          <span className="text-emerald-600 font-bold">{emp.updates_count} actions today</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
