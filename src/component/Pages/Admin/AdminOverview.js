import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Building2,
  Users,
  Box,
  FileCheck,
  Plus,
  Shield,
  PieChart,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { toast } from "react-toastify";

export default function AdminOverview() {
  const { theme, isDark } = useTheme();
  const { setSelectedOrgId, isRoot } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal for creating sub-org
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDisplayName, setNewOrgDisplayName] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/admin/stats`, {
        headers: { skip_zrok_interstitial: "true" },
      });
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
      toast.error(err.response?.data?.detail || "Failed to load admin stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleToggleModule = async (orgId, currentModules, moduleToToggle) => {
    const hasMod = currentModules.includes(moduleToToggle);
    let updatedModules = [];
    if (hasMod) {
      if (currentModules.length === 1) {
        toast.warning("An organisation must have at least one active module.");
        return;
      }
      updatedModules = currentModules.filter((m) => m !== moduleToToggle);
    } else {
      updatedModules = [...currentModules, moduleToToggle];
    }

    try {
      await axios.patch(
        `${process.env.REACT_APP_NETWORK}/admin/organisations/${orgId}/modules`,
        { modules: updatedModules }
      );
      toast.success(`Updated modules for organisation`);
      fetchStats();
    } catch (err) {
      console.error("Failed to update modules:", err);
      toast.error(err.response?.data?.detail || "Failed to update organisation modules");
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgDisplayName.trim()) {
      toast.error("Please fill in both slug name and display name");
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/organisations`,
        {
          name: newOrgName.trim().toLowerCase(),
          display_name: newOrgDisplayName.trim(),
          parent_org_id: 1,
        },
        { headers: { skip_zrok_interstitial: "true" } }
      );
      toast.success("Sub-organisation created successfully!");
      setShowAddModal(false);
      setNewOrgName("");
      setNewOrgDisplayName("");
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create organisation");
    }
  };

  if (loading) {
    return (
      <div className={`p-12 text-center ${theme.mutedText}`}>
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p className="text-xs font-semibold">Loading Tenant Console...</p>
      </div>
    );
  }

  const summary = stats?.summary || {};
  const orgs = stats?.organisations || [];
  const totalContainers = summary.total_containers || 1; // avoid divide by 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Header matching UI Theme */}
      <div className={`rounded-xl p-5 border shadow-sm ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                <Shield size={20} />
              </div>
              <h1 className={`text-lg font-bold ${theme.text}`}>Organisation & Tenant Console</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                Multi-Tenant Architecture
              </span>
            </div>
            <p className={`text-xs mt-1.5 max-w-2xl ${theme.mutedText}`}>
              Consignee-driven tenant management for <strong>Sahaj Construction</strong> (Root), <strong>Noblecon</strong>, and <strong>Sahajanand</strong> sub-organisations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className={`flex items-center gap-2 px-3.5 py-2 font-semibold rounded-lg text-xs transition ${theme.button}`}
          >
            <Plus size={15} />
            <span>Add Sub-Organisation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards matching Theme Context */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
          <div>
            <div className={`text-xs font-medium ${theme.mutedText}`}>Registered Orgs</div>
            <div className={`text-2xl font-bold mt-1 ${theme.text}`}>{summary.total_organisations}</div>
            <div className="text-[11px] text-blue-600 font-semibold mt-0.5">1 Root + {summary.total_organisations - 1} Sub-Orgs</div>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
            <Building2 size={22} />
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
          <div>
            <div className={`text-xs font-medium ${theme.mutedText}`}>Active Users</div>
            <div className={`text-2xl font-bold mt-1 ${theme.text}`}>{summary.total_users}</div>
            <div className={`text-[11px] font-semibold mt-0.5 ${theme.mutedText}`}>Mapped across tenants</div>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
            <Users size={22} />
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
          <div>
            <div className={`text-xs font-medium ${theme.mutedText}`}>Total Containers</div>
            <div className={`text-2xl font-bold mt-1 ${theme.text}`}>{summary.total_containers}</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Consignee Mapped</div>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
            <Box size={22} />
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
          <div>
            <div className={`text-xs font-medium ${theme.mutedText}`}>Bills of Lading</div>
            <div className={`text-2xl font-bold mt-1 ${theme.text}`}>{summary.total_bols}</div>
            <div className={`text-[11px] font-semibold mt-0.5 ${theme.mutedText}`}>Consignee Assigned</div>
          </div>
          <div className={`p-3 rounded-lg ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
            <FileCheck size={22} />
          </div>
        </div>
      </div>

      {/* Container Volume Distribution Bar */}
      <div className={`rounded-xl border p-4 space-y-3 shadow-sm ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${theme.text}`}>
            <PieChart size={15} className="text-blue-500" />
            <span>Container Distribution by Consignee Tenant</span>
          </h2>
          <span className={`text-[11px] font-mono ${theme.mutedText}`}>{summary.total_containers} total containers</span>
        </div>

        {/* Multi-segment progress bar */}
        <div className={`h-3.5 w-full rounded-full overflow-hidden flex ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
          {orgs.map((o, idx) => {
            const pct = Math.round((o.containers / totalContainers) * 100);
            const colors = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600"];
            return (
              <div
                key={o.id}
                style={{ width: `${pct}%` }}
                className={`h-full ${colors[idx % colors.length]} transition-all`}
                title={`${o.display_name}: ${o.containers} containers (${pct}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
          {orgs.map((o, idx) => {
            const pct = ((o.containers / totalContainers) * 100).toFixed(1);
            const dotColors = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600"];
            return (
              <div key={o.id} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                <span className={`font-semibold ${theme.text}`}>{o.display_name || o.name}:</span>
                <span className={`font-mono ${theme.mutedText}`}>{o.containers} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Organisations Hierarchy Cards */}
      <div className={`rounded-xl border p-4 space-y-4 shadow-sm ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? "border-slate-800" : "border-gray-200"}`}>
          <div>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${theme.text}`}>
              <Building2 size={16} className="text-blue-500" />
              <span>Organisation Hierarchy & Consignee Mapping</span>
            </h2>
            <p className={`text-[11px] mt-0.5 ${theme.mutedText}`}>
              Select an organisation to set active view context.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orgs.map((o) => (
            <div
              key={o.id}
              className={`rounded-xl border p-4 space-y-3 transition ${isDark ? "bg-slate-800/60 border-slate-700 hover:border-blue-500/50" : "bg-gray-50/80 border-gray-200 hover:border-blue-300"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`font-bold text-sm ${theme.text}`}>
                    {o.display_name || o.name}
                  </div>
                  <div className={`text-[11px] font-mono mt-0.5 ${theme.mutedText}`}>slug: {o.name} | ID #{o.id}</div>
                </div>
                {o.parent_id === null ? (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-blue-100 text-blue-800"}`}>
                    Root Tenant
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-purple-100 text-purple-800"}`}>
                    Sub-Org
                  </span>
                )}
              </div>

              <div className={`grid grid-cols-3 gap-2 py-2 px-3 rounded-lg border text-center ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
                <div>
                  <div className={`text-[10px] ${theme.mutedText}`}>Users</div>
                  <div className={`font-bold text-xs ${theme.text}`}>{o.users}</div>
                </div>
                <div>
                  <div className={`text-[10px] ${theme.mutedText}`}>Containers</div>
                  <div className="font-bold text-xs text-blue-600">{o.containers}</div>
                </div>
                <div>
                  <div className={`text-[10px] ${theme.mutedText}`}>BOLs</div>
                  <div className="font-bold text-xs text-purple-600">{o.bols}</div>
                </div>
              </div>

              {/* Module Subscriptions */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className={theme.mutedText}>Subscribed Modules:</span>
                  <span className="text-[10px] text-gray-400 font-mono uppercase">{o.plan || "complete"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!isRoot}
                    onClick={() => handleToggleModule(o.id, o.modules || ["LOGISTICS", "ORDERS", "INVENTORY"], "LOGISTICS")}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold border transition flex items-center justify-center gap-1 ${
                      (o.modules || []).includes("LOGISTICS")
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-transparent text-gray-400 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500"
                    }`}
                    title={isRoot ? "Click to enable/disable Logistics module" : "Subscribed module"}
                  >
                    <span>Logistics</span>
                    {(o.modules || []).includes("LOGISTICS") && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    disabled={!isRoot}
                    onClick={() => handleToggleModule(o.id, o.modules || ["LOGISTICS", "ORDERS", "INVENTORY"], "ORDERS")}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold border transition flex items-center justify-center gap-1 ${
                      (o.modules || []).includes("ORDERS")
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-transparent text-gray-400 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500"
                    }`}
                    title={isRoot ? "Click to enable/disable Orders module" : "Subscribed module"}
                  >
                    <span>Orders</span>
                    {(o.modules || []).includes("ORDERS") && <span>✓</span>}
                  </button>

                  <button
                    type="button"
                    disabled={!isRoot}
                    onClick={() => handleToggleModule(o.id, o.modules || ["LOGISTICS", "ORDERS", "INVENTORY"], "INVENTORY")}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-bold border transition flex items-center justify-center gap-1 ${
                      (o.modules || []).includes("INVENTORY")
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-transparent text-gray-400 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500"
                    }`}
                    title={isRoot ? "Click to enable/disable Inventory module" : "Subscribed module"}
                  >
                    <span>Inventory</span>
                    {(o.modules || []).includes("INVENTORY") && <span>✓</span>}
                  </button>
                </div>
              </div>

              {isRoot && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrgId(o.id);
                    toast.info(`Active company set to ${o.display_name || o.name}`);
                  }}
                  className={`w-full py-1.5 px-3 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isDark ? "bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border-slate-700" : "bg-white hover:bg-blue-600 text-gray-700 hover:text-white border-gray-300"}`}
                >
                  <span>Select Company</span>
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Create Sub-Organisation */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md border rounded-xl p-5 space-y-4 shadow-xl ${isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? "border-slate-800" : "border-gray-200"}`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Building2 size={18} className="text-blue-500" />
                <span>Register New Sub-Organisation</span>
              </h3>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${theme.mutedText}`}>
                  Display Name (e.g. Noblecon Construction Ltd)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Noblecon"
                  value={newOrgDisplayName}
                  onChange={(e) => setNewOrgDisplayName(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:border-blue-500 ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${theme.mutedText}`}>
                  Unique Slug Name (lowercase, e.g. noblecon)
                </label>
                <input
                  type="text"
                  required
                  placeholder="noblecon"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 ${isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-gray-50 border-gray-300 text-gray-900"}`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? "border-slate-800" : "border-gray-200"}`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition ${isDark ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${theme.button}`}
                >
                  Create Organisation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
