import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { LayoutDashboard, RefreshCw, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import WidgetCard from "./components/WidgetCard";

export default function Dashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { isRoot, orgName, selectedOrgId } = useAuth();

  // ── State ───────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [layoutWidgets, setLayoutWidgets] = useState([]);
  const [liveData, setLiveData] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [organisations, setOrganisations] = useState([]);

  // Selected year for monthly trend widgets
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // ── Fetch Organisations for multi-tenant awareness ──────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    axios
      .get(`${process.env.REACT_APP_NETWORK}/organisations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setOrganisations(res.data || []);
      })
      .catch(() => {});
  }, [isRoot]);

  // Determine active company display label
  const activeOrgChip = useMemo(() => {
    if (selectedOrgId) {
      const match = organisations.find((o) => o.id === selectedOrgId);
      return match?.display_name || match?.name || `Org #${selectedOrgId}`;
    }
    if (isRoot) {
      return "All Companies (Group View)";
    }
    if (organisations.length > 1) {
      return "All Assigned Companies";
    }
    return orgName || "Sahaj Construction";
  }, [selectedOrgId, organisations, isRoot, orgName]);

  // ── Auth Header Helper ──────────────────────────────────────────────────────
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (selectedOrgId) {
      headers["X-Active-Org"] = selectedOrgId.toString();
    }
    return headers;
  }, [selectedOrgId]);

  // ── Fetch Dashboard Layout ──────────────────────────────────────────────────
  const fetchLayout = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/dashboard/layout`, { headers });
      const widgets = res.data?.widgets || [];
      setLayoutWidgets(widgets);
    } catch (err) {
      console.error("Failed to load dashboard configuration:", err);
      toast.error("Failed to load dashboard layout");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // ── Fetch Live Metric Data ──────────────────────────────────────────────────
  const fetchLiveData = useCallback(async () => {
    try {
      setDataLoading(true);
      const headers = getAuthHeaders();
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/dashboard/data`, {
        params: { year: parseInt(selectedYear, 10) },
        headers,
      });

      setLiveData(res.data?.data || {});
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch live dashboard metrics:", err);
    } finally {
      setDataLoading(false);
    }
  }, [getAuthHeaders, selectedYear]);

  // Re-fetch layout and data when selected organisation or year changes
  useEffect(() => {
    fetchLayout();
  }, [fetchLayout, selectedOrgId]);

  useEffect(() => {
    if (!loading) {
      fetchLiveData();
    }
  }, [loading, selectedYear, fetchLiveData, selectedOrgId]);

  // ── Render Loading Skeleton ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 space-y-4 max-w-[1720px] mx-auto animate-pulse">
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-[1720px] mx-auto px-3 sm:px-5 lg:px-6 pb-12">
      {/* ── Compact Operational Hero Bar ────────────────────────────────────────── */}
      <div
        className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border shadow-xs transition ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <LayoutDashboard size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                  Operations & Inventory Dashboard
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                  <Building2 size={12} className="text-indigo-500" />
                  <span>{activeOrgChip}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                Real-time operational visibility across procurement, shipments, and inventory health
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {/* Live refresh */}
            <button
              type="button"
              onClick={fetchLiveData}
              disabled={dataLoading}
              title={`Last updated: ${lastRefreshed.toLocaleTimeString()}`}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              } ${dataLoading ? "opacity-60" : ""}`}
            >
              <RefreshCw size={12} className={dataLoading ? "animate-spin" : ""} />
              <span className="text-[11px]">{dataLoading ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Responsive Widget Grid ─────────────────────────────────────── */}
      {layoutWidgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {layoutWidgets.map((widget) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              data={liveData}
              isDark={isDark}
              isCustomizing={false}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          className={`p-12 rounded-3xl border text-center space-y-3 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <LayoutDashboard size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Your Dashboard is Empty</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              No widgets have been assigned to your role yet. Your dashboard layout is managed centrally in the Template Studio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
