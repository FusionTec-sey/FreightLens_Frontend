import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Container,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  FilterX,
  Clock,
  Calendar,
  MapPin,
  Building,
  CheckCircle2,
  Trash2,
  Pencil,
  X,
  Layers,
  ArrowRight,
  Package,
  Ship,
  Eye,
  Mail,
  ChevronDown,
  Truck,
  ArrowDownRight,
  Loader2
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useOptions } from '../../../hooks/useOptions';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import ContainerSiderDrawer from './ContainerSiderDrawer';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { getMaterialNames } from '../../../utils/reSolveMaterial';
import { calculateDemurrage } from '../../../utils/DemurrageUtil';

export default function ContainerEntry() {
  const { isDark } = useTheme();
  const { confirm } = useConfirm();
  const { permissions, logout, isRoot } = useAuth();
  const {
    material: materialOptions = [],
    status: statusOptions = [],
    suppliers = [],
    consignees = [],
    loading: optionsLoading
  } = useOptions();

  // Primary Data State
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("ALL");
  const [selectedConsigneeFilter, setSelectedConsigneeFilter] = useState("ALL");
  const [onlyOverdueFilter, setOnlyOverdueFilter] = useState(false);

  // Modal State
  // Drawer State for row click and container creation
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  // Mail Dispatch State
  const [isMailMenuOpen, setIsMailMenuOpen] = useState(false);
  const [isLoadingMail, setIsLoadingMail] = useState(false);
  const mailMenuRef = useRef(null);

  const canAdd = permissions.includes("Add_Container") || permissions.includes("Container") || (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canDelete = permissions.includes("Delete_Container") || permissions.includes("Container") || (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canMail = useMemo(() => {
    return isRoot || (Array.isArray(permissions) && (
      permissions.includes("Mail_Container") ||
      permissions.includes("Mail") ||
      permissions.includes("Container") ||
      permissions.includes("Administrator")
    ));
  }, [permissions, isRoot]);
  const canViewSupplier = Array.isArray(permissions) && (
    permissions.includes("View_Supplier") ||
    permissions.includes("Supplier") ||
    permissions.includes("Edit_Supplier") ||
    permissions.includes("Add_Supplier")
  );

  // Close mail menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mailMenuRef.current && !mailMenuRef.current.contains(e.target)) {
        setIsMailMenuOpen(false);
      }
    };
    if (isMailMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMailMenuOpen]);

  // ── Mail Dispatch Handlers ────────────────────────────────────────────────
  const handlePickupEmail = async () => {
    setIsLoadingMail(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_NETWORK}/toPickup`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true",
        },
      });

      const containers = response.data || [];
      if (!containers.length) {
        toast.info("No arrived containers found awaiting pickup.");
        return;
      }

      const subject = `Pickup Request for Containers (${containers.length} Units)`;
      let body = "Please arrange pickup for the following containers:\n\n";

      containers.forEach((c, i) => {
        body += `${i + 1}. Container: ${c.container_no || "N/A"}\n   Location: ${c.venue || "N/A"}\n   Empty Date: ${c.emptyDate || "N/A"}\n\n`;
      });

      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      toast.success(`Generated pickup email for ${containers.length} container(s).`);
    } catch (err) {
      console.error("Failed to fetch pickup containers:", err);
      toast.error("Error generating pickup email.");
    } finally {
      setIsLoadingMail(false);
      setIsMailMenuOpen(false);
    }
  };

  const handleDropoffEmail = async () => {
    setIsLoadingMail(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_NETWORK}/arrived`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true",
        },
      });

      const containers = response.data || [];
      if (!containers.length) {
        toast.info("No arrived containers found awaiting dropoff.");
        return;
      }

      const subject = `Drop-off Request for Arrived Containers (${containers.length} Units)`;
      let body = "Please arrange drop-off for the following arrived containers:\n\n";

      containers.forEach((c, i) => {
        body += `${i + 1}. Container: ${c.container_no || "N/A"}\n   Location: ${c.venue || "Port Victoria"}\n   Arrival: ${c.arrival_on_port ? String(c.arrival_on_port).slice(0, 10) : "N/A"}\n\n`;
      });

      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      toast.success(`Generated drop-off email for ${containers.length} container(s).`);
    } catch (err) {
      console.error("Failed to fetch arrived containers:", err);
      toast.error("Error generating drop-off email.");
    } finally {
      setIsLoadingMail(false);
      setIsMailMenuOpen(false);
    }
  };

  const handleSingleContainerEmail = (c) => {
    const cNo = c.Container || c.container_no || "Container";
    const subject = `Container Status Notice: ${cNo}`;
    let body = `Dear Team,\n\nPlease find the current status details for container ${cNo}:\n\n` +
      `- Container Number: ${cNo}\n` +
      `- Status: ${c.Status || c.state || "N/A"}\n` +
      `- Consignee: ${c.Consignee || "N/A"}\n` +
      `- Arrival Date: ${c.ArrivalDate || "N/A"}\n` +
      `- Location: ${c.EmptyAt || c.location || "Port Victoria"}\n` +
      `- Demurrage: ${c.Demurrage || "N/A"}\n\n` +
      `Best regards,\nLogistics Operations`;

    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.info(`Drafted email notice for container ${cNo}.`);
  };

  // Transform raw API data into presentation format
  const transformData = useCallback((apiData) => {
    if (!apiData) return [];
    return apiData.map(c => {
      const freeDaysVal = c.FreeDays !== null && c.FreeDays !== undefined ? c.FreeDays : (c.bill_of_landing?.FreeDays ?? 10);
      const demurrageText = c.bill_of_landing?.ArrivalDate && c.state !== "In Transit"
        ? calculateDemurrage({
            ExcludeDayBitmask: c.bill_of_landing.ExcludingDay,
            ArrivalDate: c.bill_of_landing.ArrivalDate,
            FreeDay: freeDaysVal
          })
        : `${freeDaysVal} Free Days`;

      return {
        ContainerId: c.Container_ID,
        Container: c.container_no || "",
        Consignee: c.bill_of_landing?.consignee_name || "",
        Supplier: canViewSupplier ? (c.bill_of_landing?.supplier_name || "") : "",
        Demurrage: demurrageText,
        ArrivalDate: c.bill_of_landing?.ArrivalDate
          ? formatDateTime12hr(c.bill_of_landing.ArrivalDate.slice(0, 16))
          : "",
        EmptyAt: c.location || "",
        Status: c.state || "In Transit",
        Material: getMaterialNames(c.materials, materialOptions),
        rawData: c
      };
    });
  }, [materialOptions]);

  // Status ID helper
  const getStatusIdByName = useCallback((name) => {
    const found = (statusOptions || []).find(item => item.name === name);
    return found ? found.id : null;
  }, [statusOptions]);

  // Fetch Containers
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const searchParams = new URLSearchParams();
      searchParams.append("offset", offset);
      searchParams.append("limit", pageSize);

      if (searchQuery.trim()) {
        searchParams.append("search", searchQuery.trim());
      }
      if (selectedStatusFilter !== "ALL") {
        const sId = getStatusIdByName(selectedStatusFilter);
        if (sId) searchParams.append("status", sId);
      } else {
        // Exclude status 4 (Completed) from Active Register
        searchParams.append("excStatus", "4");
      }

      if (selectedSupplierFilter !== "ALL") {
        searchParams.append("SupplierName", selectedSupplierFilter);
      }
      if (selectedConsigneeFilter !== "ALL") {
        searchParams.append("ConsigneeName", selectedConsigneeFilter);
      }

      // Default prioritization order
      const statusOrder = [7, 6, 3, 2, 1, 8];
      statusOrder.forEach(id => searchParams.append("status_order", id));
      searchParams.append("order_by_arrival", "false");

      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/containers?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            skip_zrok_interstitial: "true",
          },
        }
      );

      const { data, total_count } = response.data || {};
      setRows(transformData(data || []));
      setTotalCount(total_count || 0);
    } catch (error) {
      console.error("Failed to fetch active containers:", error);
      if (error.response?.status === 401) {
        toast.warn("Session expired. Please log in again.");
        logout();
      } else {
        toast.error("Failed to load containers");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    selectedStatusFilter,
    selectedSupplierFilter,
    selectedConsigneeFilter,
    getStatusIdByName,
    transformData,
    logout
  ]);

  useEffect(() => {
    if (!optionsLoading) {
      fetchData();
    }
  }, [fetchData, optionsLoading]);

  // Client-side filter for urgent/overdue toggle if requested
  const displayedRows = useMemo(() => {
    if (!onlyOverdueFilter) return rows;
    return rows.filter(r => String(r.Demurrage).toLowerCase().includes("overdue"));
  }, [rows, onlyOverdueFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedStatusFilter !== "ALL") count++;
    if (selectedSupplierFilter !== "ALL") count++;
    if (selectedConsigneeFilter !== "ALL") count++;
    if (onlyOverdueFilter) count++;
    return count;
  }, [searchQuery, selectedStatusFilter, selectedSupplierFilter, selectedConsigneeFilter, onlyOverdueFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatusFilter("ALL");
    setSelectedSupplierFilter("ALL");
    setSelectedConsigneeFilter("ALL");
    setOnlyOverdueFilter(false);
    setPage(1);
  };

  const handleEdit = useCallback((row) => {
    const containerData = row?.rawData || row;
    setSelectedContainer(containerData);
    setIsDrawerOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedContainer(null);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedContainer(null);
  }, []);

  const handleDrawerSuccess = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedContainer(null);
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(async (containerId) => {
    if (!containerId) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/containers/${containerId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            skip_zrok_interstitial: "true"
          },
        }
      );
      toast.success("Container deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Failed to delete container:", error);
      toast.error(error.response?.data?.detail || "Failed to delete container");
    }
  }, [fetchData]);

  // Status pill styling
  const getStatusBadgeClass = (statusName) => {
    switch ((statusName || "").toLowerCase()) {
      case "gate pass":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
      case "arrived":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800";
      case "on port":
        return "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border-sky-200 dark:border-sky-800";
      case "in transit":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      case "unloaded":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full flex-1 min-h-0 overflow-hidden space-y-4">
      {/* ── Page Header Banner ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center p-2.5 flex-shrink-0 shadow-xs">
            <Container size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Logistics & Freight
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Container Register
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Live container inventory, port status, and real-time demurrage tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canMail && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMailMenuOpen(prev => !prev)}
                disabled={isLoadingMail}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition shadow-xs cursor-pointer ${
                  isMailMenuOpen
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                    : isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title="Container Email Dispatch & Requests"
              >
                {isLoadingMail ? <Loader2 size={15} className="animate-spin text-indigo-600" /> : <Mail size={15} />}
                <span>Mail Dispatch</span>
                <ChevronDown size={13} className={`transition-transform duration-200 ${isMailMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isMailMenuOpen && (
                <div 
                  ref={mailMenuRef}
                  className={`absolute right-0 mt-1.5 w-64 rounded-2xl border shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150 ${
                    isDark ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-inherit mb-1">
                    Container Email Requests
                  </div>

                  <button
                    type="button"
                    onClick={handlePickupEmail}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition cursor-pointer ${
                      isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-indigo-50 text-slate-700 hover:text-indigo-700"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <Truck size={14} />
                    </div>
                    <div>
                      <div className="font-bold">Pick Up Request</div>
                      <div className="text-[10px] text-slate-400">Containers ready for pickup</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleDropoffEmail}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition cursor-pointer mt-1 ${
                      isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <ArrowDownRight size={14} />
                    </div>
                    <div>
                      <div className="font-bold">Drop Off Request</div>
                      <div className="text-[10px] text-slate-400">Arrived containers at port</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title="Refresh Container Data"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-indigo-600" : ""} />
          </button>

          {canAdd && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow transition cursor-pointer"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Add Container</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filters & Search Control Bar ──────────────────────────────────── */}
      <div className={`p-3 rounded-2xl border transition-all ${
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200/80 shadow-xs"
      } space-y-2.5 shrink-0`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Container No, Supplier, Consignee..."
                className={`w-full pl-9 pr-8 py-1.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isDark
                    ? "bg-slate-800/90 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Overdue Demurrage Filter Button */}
            <button
              type="button"
              onClick={() => setOnlyOverdueFilter(!onlyOverdueFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                onlyOverdueFilter
                  ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                  : isDark
                  ? "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <AlertTriangle size={13} className={onlyOverdueFilter ? "text-white" : "text-rose-500"} />
              <span>Overdue Demurrage</span>
            </button>

            {/* Supplier Select Filter - Only visible if user has supplier permission */}
            {canViewSupplier && suppliers && suppliers.length > 0 && (
              <select
                value={selectedSupplierFilter}
                onChange={(e) => {
                  setSelectedSupplierFilter(e.target.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition focus:outline-none cursor-pointer ${
                  selectedSupplierFilter !== "ALL"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                    : isDark
                    ? "bg-slate-800/80 text-slate-300 border-slate-700"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <option value="ALL">Supplier: All</option>
                {suppliers.map(s => (
                  <option key={s.id || s.name} value={s.name || s}>
                    {s.name || s}
                  </option>
                ))}
              </select>
            )}

            {/* Consignee Select Filter */}
            {consignees && consignees.length > 0 && (
              <select
                value={selectedConsigneeFilter}
                onChange={(e) => {
                  setSelectedConsigneeFilter(e.target.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition focus:outline-none cursor-pointer ${
                  selectedConsigneeFilter !== "ALL"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                    : isDark
                    ? "bg-slate-800/80 text-slate-300 border-slate-700"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <option value="ALL">Consignee: All</option>
                {consignees.map(c => (
                  <option key={c.id || c.name} value={c.name || c}>
                    {c.name || c}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filters Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                <FilterX size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {["ALL", "In Transit", "On port", "Arrived", "Gate Pass", "Unloaded"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setSelectedStatusFilter(st);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedStatusFilter === st
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : isDark
                  ? "bg-slate-800/70 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
                  : "bg-slate-100/80 text-slate-600 border-slate-200 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              <span>{st === "ALL" ? "All Statuses" : st}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table Container ───────────────────────────────────────────────── */}
      <div className={`flex-1 overflow-auto rounded-2xl border transition relative flex flex-col min-h-0 ${
        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200 shadow-xs"
      }`}>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className={`sticky top-0 z-10 border-b backdrop-blur-md ${
              isDark
                ? "bg-slate-900/95 border-slate-800 text-slate-400"
                : "bg-slate-50/95 border-slate-200 text-slate-500"
            } text-[11px] font-bold uppercase tracking-wider`}>
              <tr>
                <th className="py-3 px-4 w-28">Container No</th>
                <th className="py-3 px-4">{canViewSupplier ? "Supplier & Consignee" : "Consignee"}</th>
                <th className="py-3 px-4">Materials / Cargo</th>
                <th className="py-3 px-4 w-36">Arrival Date</th>
                <th className="py-3 px-4 w-32">Empty At</th>
                <th className="py-3 px-4 w-36">Free Days / D&D</th>
                <th className="py-3 px-4 w-28">Status</th>
                <th className="py-3 px-4 w-20 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading container register...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Container size={26} className="opacity-60" />
                      </div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Containers Found</p>
                      <p className="text-xs text-slate-400">
                        {activeFilterCount > 0 ? "Try adjusting or clearing your filters." : "No active containers registered yet."}
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const isOverdue = String(row.Demurrage).toLowerCase().includes("overdue");
                  return (
                    <tr
                      key={row.ContainerId || row.Container}
                      onClick={() => handleEdit(row)}
                      className={`transition cursor-pointer group ${
                        isDark
                          ? "hover:bg-slate-800/60 text-slate-300"
                          : "hover:bg-indigo-50/40 text-slate-700"
                      }`}
                    >
                      {/* Container No */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        <div className="flex items-center gap-1.5">
                          <Container size={14} className="opacity-60 flex-shrink-0" />
                          <span>{row.Container || `ID: ${row.ContainerId}`}</span>
                        </div>
                      </td>

                      {/* Supplier & Consignee */}
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="flex flex-col">
                          {canViewSupplier ? (
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {row.Supplier || "No Supplier"}
                            </span>
                          ) : null}
                          <span className={`${canViewSupplier ? "text-[11px] text-slate-400" : "font-semibold text-slate-900 dark:text-white"} truncate flex items-center gap-1`}>
                            <Building size={11} className="opacity-60" />
                            {row.Consignee || "No Consignee"}
                          </span>
                        </div>
                      </td>

                      {/* Materials */}
                      <td className="py-3 px-4 max-w-[200px] truncate">
                        {row.Material ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium truncate max-w-[180px]" title={row.Material}>
                            {row.Material}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Arrival Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {row.ArrivalDate ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                            <span>{row.ArrivalDate}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Empty At */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {row.EmptyAt ? (
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                            <span>{row.EmptyAt}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Demurrage */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            <AlertTriangle size={11} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
                            <span>{row.Demurrage}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <Clock size={11} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            <span>{row.Demurrage}</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClass(row.Status)}`}>
                          {row.Status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canMail && (
                            <button
                              type="button"
                              onClick={() => handleSingleContainerEmail(row)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                              title="Send Container Notice Email"
                            >
                              <Mail size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition"
                            title="Edit Container Details"
                          >
                            <Pencil size={14} />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(row.ContainerId, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                              title="Delete Container"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Sticky Pagination Footer ────────────────────────────────────── */}
        <PaginationToolbar
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          isDark={isDark}
          className="border-t border-slate-200 dark:border-slate-800 rounded-none border-x-0 border-b-0"
        />
      </div>

      {/* ── Slide-Over Container Sider Drawer ─────────────────────────────── */}
      <ContainerSiderDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        container={selectedContainer}
        onSubmitSuccess={handleDrawerSuccess}
        onDelete={handleDelete}
      />
    </div>
  );
}