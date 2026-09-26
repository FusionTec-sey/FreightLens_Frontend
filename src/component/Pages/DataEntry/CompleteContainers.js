import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  PackageCheck,
  Search,
  RefreshCw,
  FilterX,
  Clock,
  Calendar,
  MapPin,
  Building,
  CheckCircle2,
  Trash2,
  Pencil,
  X,
  Container,
  Package,
  Layers,
  Archive
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useOptions } from '../../../hooks/useOptions';
import PaginationToolbar from '../../UI/UXComponent/PaginationToolbar';
import ContainerSiderDrawer from './ContainerSiderDrawer';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { getMaterialNames } from '../../../utils/reSolveMaterial';

export default function CompleteContainer() {
  const { isDark } = useTheme();
  const { confirm } = useConfirm();
  const { permissions, logout, isRoot } = useAuth();
  const {
    material: materialOptions = [],
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
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState("ALL");
  const [selectedConsigneeFilter, setSelectedConsigneeFilter] = useState("ALL");

  // Sider Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  const canDelete = permissions.includes("Delete_Container") || permissions.includes("Container") || (Array.isArray(permissions) && permissions.includes("Administrator"));
  const canViewSupplier = Array.isArray(permissions) && (
    permissions.includes("View_Supplier") ||
    permissions.includes("Supplier") ||
    permissions.includes("Edit_Supplier") ||
    permissions.includes("Add_Supplier")
  );

  // Data transform
  const transformData = useCallback((apiData) => {
    return (apiData || []).map(c => {
      const freeDaysVal = c.FreeDays !== null && c.FreeDays !== undefined ? c.FreeDays : (c.bill_of_landing?.FreeDays ?? 10);
      return {
        ContainerId: c.Container_ID,
        Container: c.container_no || "",
        Consignee: c.bill_of_landing?.consignee_name || "",
        Supplier: canViewSupplier ? (c.bill_of_landing?.supplier_name || "") : "",
        ArrivalDate: c.bill_of_landing?.ArrivalDate
          ? formatDateTime12hr(c.bill_of_landing.ArrivalDate.slice(0, 16))
          : "",
        EmptyAt: c.location || "",
        Demurrage: `${freeDaysVal} Free Days`,
        Status: c.state || "Completed",
        Material: getMaterialNames(c.materials, materialOptions),
        created_at: c.created_at ? formatDateTime12hr(c.created_at.slice(0, 16)) : "",
        updated_at: c.updated_at ? formatDateTime12hr(c.updated_at.slice(0, 16)) : "",
        created_by_name: c.created_by_name || "System",
        updated_by_name: c.updated_by_name || "System",
        rawData: c
      };
    });
  }, [materialOptions]);

  // Fetch Completed Containers
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const params = {
        status: 4, // 4 = Completed
        offset,
        limit: pageSize,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedSupplierFilter !== "ALL") params.SupplierName = selectedSupplierFilter;
      if (selectedConsigneeFilter !== "ALL") params.ConsigneeName = selectedConsigneeFilter;

      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/containers`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            skip_zrok_interstitial: "true"
          },
        }
      );

      const { data, total_count } = response.data || {};
      setRows(transformData(data || []));
      setTotalCount(total_count || 0);
    } catch (error) {
      console.error("Failed to fetch completed containers:", error);
      if (error.response?.status === 401) {
        toast.warn("Session expired. Please log in again.");
        logout();
      } else {
        toast.error("Failed to load completed containers");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    selectedSupplierFilter,
    selectedConsigneeFilter,
    transformData,
    logout
  ]);

  useEffect(() => {
    if (!optionsLoading) {
      fetchData();
    }
  }, [fetchData, optionsLoading]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedSupplierFilter !== "ALL") count++;
    if (selectedConsigneeFilter !== "ALL") count++;
    return count;
  }, [searchQuery, selectedSupplierFilter, selectedConsigneeFilter]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSupplierFilter("ALL");
    setSelectedConsigneeFilter("ALL");
    setPage(1);
  };

  const handleEdit = useCallback((row) => {
    const containerData = row?.rawData || row;
    setSelectedContainer(containerData);
    setIsDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(async (containerId, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm("Are you sure you want to delete this completed container record?");
    if (!isConfirmed) return;

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
  }, [confirm, fetchData]);

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedContainer(null);
  };

  const handleDrawerSuccess = () => {
    handleDrawerClose();
    fetchData();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full flex-1 min-h-0 overflow-hidden space-y-4">
      {/* ── Page Header Banner ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600/10 dark:bg-teal-400/10 text-teal-600 dark:text-teal-400 flex items-center justify-center p-2.5 flex-shrink-0 shadow-xs">
            <PackageCheck size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Logistics & Freight
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Completed Containers
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Historical archive of returned and discharged containers.
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
            title="Refresh Completed Containers"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin text-teal-600" : ""} />
          </button>
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
                placeholder="Search Container No, Supplier, Consignee..."
                className={`w-full pl-9 pr-8 py-1.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
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
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700"
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
                    ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700"
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
                <th className="py-3 px-4 w-32">Demurrage</th>
                <th className="py-3 px-4 w-28">Status</th>
                <th className="py-3 px-4 w-20 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading completed containers...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <PackageCheck size={26} className="opacity-60" />
                      </div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Completed Containers Found</p>
                      <p className="text-xs text-slate-400">
                        {activeFilterCount > 0 ? "Try adjusting or clearing your filters." : "Completed container shipments will appear here once discharged."}
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-2 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800"
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
                    key={row.ContainerId || row.Container}
                    onClick={() => handleEdit(row)}
                    className={`transition cursor-pointer group ${
                      isDark
                        ? "hover:bg-slate-800/60 text-slate-300"
                        : "hover:bg-teal-50/40 text-slate-700"
                    }`}
                  >
                    {/* Container No */}
                    <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400 group-hover:underline">
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Clock size={11} className="text-slate-400 flex-shrink-0" />
                        <span>{row.Demurrage}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border-teal-200 dark:border-teal-800">
                        {row.Status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-800 transition"
                          title="Edit Container Details"
                        >
                          <Pencil size={14} />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(row.ContainerId, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                            title="Delete Container Record"
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
