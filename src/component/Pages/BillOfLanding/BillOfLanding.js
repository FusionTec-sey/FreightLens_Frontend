import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  Ship,
  Anchor,
  Search,
  Plus,
  RefreshCw,
  FilterX,
  Calendar,
  Building,
  Trash2,
  Pencil,
  X,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import BillOfLandingSiderDrawer from './BillOfLandingSiderDrawer';

export default function BillOfLanding() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { confirm } = useConfirm();
  const { permissions, logout, isRoot } = useAuth();

  // Primary Data State
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsigneeFilter, setSelectedConsigneeFilter] = useState("ALL");

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedBL, setSelectedBL] = useState(null);

  const canAdd = permissions.includes("Add_BillOfLanding") || permissions.includes("BillOfLanding") || permissions.includes("View_BL") || isRoot || permissions.includes("Administrator");
  const canDelete = permissions.includes("Delete_BillOfLanding") || permissions.includes("BillOfLanding") || isRoot || permissions.includes("Administrator");

  // Fetch Bills of Lading
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const params = {
        offset,
        limit: pageSize,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (selectedConsigneeFilter !== "ALL") {
        params.ConsigneeName = selectedConsigneeFilter;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/bill-of-landing`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            skip_zrok_interstitial: "true"
          }
        }
      );

      const { data, total_count } = response.data || {};
      const formattedData = (data || []).map(item => ({
        ...item,
        arrivalDateFormatted: item.ArrivalDate ? formatDateTime12hr(item.ArrivalDate) : 'N/A'
      }));

      setRows(formattedData);
      setTotalCount(total_count || 0);
    } catch (error) {
      console.error("Failed to fetch bills of lading:", error);
      if (error.response?.status === 401) {
        toast.warn("Session expired. Please log in again.");
        logout();
      } else {
        toast.error("Failed to load bills of lading");
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, selectedConsigneeFilter, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique consignees for filter
  const consigneeOptions = useMemo(() => {
    const set = new Set();
    rows.forEach(r => {
      if (r.consignee_name) set.add(r.consignee_name);
    });
    return Array.from(set);
  }, [rows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedConsigneeFilter !== "ALL") count++;
    return count;
  }, [searchQuery, selectedConsigneeFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedConsigneeFilter("ALL");
    setPage(1);
  };

  const handleEdit = useCallback((rowOrId) => {
    const blId = typeof rowOrId === 'string' ? rowOrId : (rowOrId?.BillOfLanding || rowOrId);
    const rowData = typeof rowOrId === 'object' && rowOrId !== null ? rowOrId : rows.find(r => r.BillOfLanding === blId);
    setSelectedBL(rowData);
    setIsDrawerOpen(true);
  }, [rows]);

  const handleAdd = useCallback(() => {
    setSelectedBL(null);
    setIsDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedBL(null);
  }, []);

  const handleDrawerSuccess = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedBL(null);
    fetchData();
  }, [fetchData]);

  const handleDelete = useCallback(async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm("Are you sure you want to delete this Bill of Lading? All container linkages will be affected.");
    if (!isConfirmed) return;

    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/bill-of-landing/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            skip_zrok_interstitial: "true"
          }
        }
      );
      toast.success("Bill of Lading deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.detail || "Failed to delete Bill of Lading");
    }
  }, [confirm, fetchData]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full flex-1 min-h-0 overflow-hidden space-y-4">
      {/* ── Page Header Banner ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 flex items-center justify-center p-2.5 flex-shrink-0 shadow-xs">
            <Anchor size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Logistics & Freight
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Bills of Lading (B/L)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Ocean freight manifests, shipping lines, carrier vessels, and port arrivals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={isLoading}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title="Refresh Bills of Lading"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-sky-600" : ""} />
          </button>

          {canAdd && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow transition cursor-pointer"
            >
              <Plus size={16} className="stroke-[2.5]" />
              <span>Add Bill of Lading</span>
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
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search B/L ID, Vessel Name, Consignee..."
                className={`w-full pl-9 pr-8 py-1.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
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

            {/* Consignee Select Filter */}
            {consigneeOptions && consigneeOptions.length > 0 && (
              <select
                value={selectedConsigneeFilter}
                onChange={(e) => {
                  setSelectedConsigneeFilter(e.target.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition focus:outline-none cursor-pointer ${
                  selectedConsigneeFilter !== "ALL"
                    ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"
                    : isDark
                    ? "bg-slate-800/80 text-slate-300 border-slate-700"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <option value="ALL">Consignee: All</option>
                {consigneeOptions.map(c => (
                  <option key={c} value={c}>
                    {c}
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
                <th className="py-3 px-4 w-48">Bill of Lading ID</th>
                <th className="py-3 px-4">Vessel Name</th>
                <th className="py-3 px-4">Consignee</th>
                <th className="py-3 px-4 w-44">Arrival Date</th>
                <th className="py-3 px-4 w-20 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-sky-600 dark:text-sky-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading bills of lading...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <Anchor size={26} className="opacity-60" />
                      </div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Bills of Lading Found</p>
                      <p className="text-xs text-slate-400">
                        {activeFilterCount > 0 ? "Try adjusting or clearing your filters." : "Create a new Bill of Lading to begin tracking maritime shipments."}
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.BillOfLanding}
                    onClick={() => handleEdit(row)}
                    className={`transition cursor-pointer group ${
                      isDark
                        ? "hover:bg-slate-800/60 text-slate-300"
                        : "hover:bg-sky-50/40 text-slate-700"
                    }`}
                  >
                    {/* Bill of Lading ID */}
                    <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                      <div className="flex items-center gap-1.5">
                        <FileText size={14} className="opacity-60 flex-shrink-0" />
                        <span>{row.BillOfLanding}</span>
                      </div>
                    </td>

                    {/* Vessel Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                        <Ship size={14} className="text-slate-400 flex-shrink-0" />
                        <span>{row.vessel_name || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Consignee */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Building size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{row.consignee_name || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Arrival Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{row.arrivalDateFormatted || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition"
                          title="Edit Bill of Lading"
                        >
                          <Pencil size={14} />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(row.BillOfLanding, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                            title="Delete Bill of Lading"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* ── Slide-Over Bill of Lading Sider Drawer ─────────────────────────── */}
      <BillOfLandingSiderDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        billOfLanding={selectedBL}
        onSubmitSuccess={handleDrawerSuccess}
        onDelete={handleDelete}
      />
    </div>
  );
}