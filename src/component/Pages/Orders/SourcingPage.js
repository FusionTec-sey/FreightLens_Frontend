import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  GitCompare,
  Plus,
  LayoutGrid,
  List,
  Search,
  AlertTriangle,
  FilterX,
  RefreshCw,
  Trash2,
  Sparkles
} from "lucide-react";
import axios from "axios";
import OrderCardGrid from "./OrderCardGrid";
import OrderTable from "./OrderTable";
import TemplatePickerModal from "./TemplatePickerModal";
import POVersionHistoryDrawer from "./POVersionHistoryDrawer";
import PaginationToolbar from "../../UI/UXComponent/PaginationToolbar";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

const SOURCING_LIFECYCLE_STAGES = [
  { code: "ALL", label: "All Sourcing" },
  { code: "DRAFT", label: "Draft Spec" },
  { code: "CONFIRMED", label: "Confirmed" },
  { code: "RFQ_SENT", label: "RFQ Sent" },
  { code: "QUOTE_RECEIVED", label: "Quotes In" },
  { code: "QUOTE_APPROVED", label: "Awarded / In Fulfillment" }
];

export default function SourcingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const { isRoot, permissions = [] } = useAuth();

  const hasPermission = (field) => permissions.includes(field);
  const canAddRFQ = hasPermission("Add_RFQ") || hasPermission("Add_Order") || isRoot || permissions.includes("Administrator");
  const canViewTemplates = hasPermission("View_OrderTemplate") || hasPermission("View_Order") || isRoot || permissions.includes("Administrator");
  const canDeleteRFQ = hasPermission("Delete_RFQ") || hasPermission("Delete_Order") || isRoot || permissions.includes("Administrator");

  const urlLifecycle = searchParams.get("lifecycle");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLifecycleFilter, setSelectedLifecycleFilter] = useState(urlLifecycle || "ALL");
  const [onlyUrgentFilter, setOnlyUrgentFilter] = useState(false);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (urlLifecycle) {
      setSelectedLifecycleFilter(urlLifecycle);
      setPage(1);
    }
  }, [urlLifecycle]);

  const handleUseTemplate = (template) => {
    navigate("/sourcing/new", { state: { fromTemplate: template } });
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        doc_type: "RFQ",
      };
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedLifecycleFilter && selectedLifecycleFilter !== "ALL") {
        params.lifecycle_stage = selectedLifecycleFilter;
      }
      if (onlyUrgentFilter) params.urgent_only = true;

      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/orders`, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "skip_zrok_interstitial": "true",
        },
      });
      let data = res.data;
      if (typeof data === "string") data = JSON.parse(data);
      if (data && data.items && Array.isArray(data.items)) {
        setOrders(data.items);
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
      } else if (Array.isArray(data)) {
        setOrders(data);
        setTotalCount(data.length);
        setTotalPages(1);
      } else if (data && Array.isArray(data.data)) {
        setOrders(data.data);
        setTotalCount(data.data.length);
        setTotalPages(1);
      } else {
        setOrders([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Could not fetch sourcing RFQs from DB:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, selectedLifecycleFilter, onlyUrgentFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleEditOrder = (order) => {
    navigate(`/sourcing/${order.id}/edit`, { state: { order } });
  };

  const handleStatusChange = async (orderId, newStatusKey) => {
    try {
      const res = await axios.patch(
        `${process.env.REACT_APP_NETWORK}/orders/${orderId}/status`,
        { status: newStatusKey },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "skip_zrok_interstitial": "true",
          },
        }
      );
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? res.data : o))
      );
    } catch (err) {
      console.error("Failed to update status on server:", err);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
              ...o,
              status: newStatusKey,
              status_label: newStatusKey,
            }
            : o
        )
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${process.env.REACT_APP_NETWORK}/orders/${orderToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "skip_zrok_interstitial": "true",
        },
      });
      fetchOrders();
      setOrderToDelete(null);
    } catch (err) {
      console.error("Failed to delete sourcing RFQ:", err);
      alert(err.response?.data?.detail || "Failed to delete sourcing RFQ.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* COMPACT TOP BAR & CONTROLS TOOLBAR */}
      <div
        className={`flex-none p-3.5 md:p-4 border-b shadow-xs space-y-3 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        {/* Title row + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm flex items-center justify-center">
              <GitCompare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-lg font-bold tracking-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                >
                  Sourcing & Requisitions
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                  {totalCount} RFQs
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 font-medium ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Draft specifications, material requests, and track supplier RFQs
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
              title="Refresh Sourcing RFQs"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {canViewTemplates && (
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  isDark
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
                title="Create sourcing RFQ using a pre-defined template"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Use Template</span>
              </button>
            )}

            {canAddRFQ && (
              <button
                type="button"
                onClick={() => navigate("/sourcing/new")}
                className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                <Plus size={15} />
                <span>New RFQ</span>
              </button>
            )}
          </div>
        </div>

        {/* Search, Urgent Toggle & View Mode Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs w-full">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search RFQ #, specs, items..."
                className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border outline-hidden transition ${
                  isDark
                    ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Urgent Filter Toggle */}
            <button
              type="button"
              onClick={() => {
                setOnlyUrgentFilter(!onlyUrgentFilter);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition flex-none ${
                onlyUrgentFilter
                  ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                  : isDark
                    ? "border-slate-800 text-slate-400 hover:bg-slate-800"
                    : "border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <AlertTriangle size={13} className={onlyUrgentFilter ? "text-white" : "text-rose-500"} />
              <span>Urgent Only</span>
            </button>

            {(searchQuery || onlyUrgentFilter || selectedLifecycleFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setOnlyUrgentFilter(false);
                  setSelectedLifecycleFilter("ALL");
                  setPage(1);
                }}
                className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-1 ${
                  isDark ? "border-slate-800 text-slate-400 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
                title="Reset all filters"
              >
                <FilterX size={14} />
                <span className="hidden md:inline">Reset</span>
              </button>
            )}
          </div>

          {/* View Mode Toggle (Table vs Cards) */}
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

        {/* Sourcing Stage Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin pt-0.5">
          {SOURCING_LIFECYCLE_STAGES.map((st) => {
            const isSelected = selectedLifecycleFilter === st.code;
            const count = isSelected
              ? totalCount
              : st.code === "ALL"
                ? totalCount
                : orders.filter((o) => (o.lifecycle_stage || "DRAFT").toUpperCase() === st.code).length;

            return (
              <button
                key={st.code}
                type="button"
                onClick={() => {
                  setSelectedLifecycleFilter(st.code);
                  setPage(1);
                }}
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

      {/* CONTENT REGION: Table or Grid View */}
      <div className="flex-1 min-h-0 p-3.5 md:p-4 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          {viewMode === "table" ? (
            <OrderTable
              orders={orders}
              orderStatuses={SOURCING_LIFECYCLE_STAGES}
              activeTab="sourcing"
              loading={loading}
              onEditOrder={handleEditOrder}
              onDeleteOrder={canDeleteRFQ ? (order) => setOrderToDelete(order) : undefined}
              onOpenVersionHistory={(order) => setSelectedHistoryOrder(order)}
            />
          ) : (
            <OrderCardGrid
              orders={orders}
              orderStatuses={SOURCING_LIFECYCLE_STAGES}
              activeTab="sourcing"
              loading={loading}
              onEditOrder={handleEditOrder}
              onStatusChange={handleStatusChange}
              onDeleteOrder={canDeleteRFQ ? (order) => setOrderToDelete(order) : undefined}
              onOpenVersionHistory={(order) => setSelectedHistoryOrder(order)}
            />
          )}
        </div>

        {/* Server-Side Pagination Bar - Always visible at bottom without scrolling */}
        <div className="pt-2 flex-none">
          <PaginationToolbar
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            isDark={isDark}
          />
        </div>
      </div>

      {/* TEMPLATE PICKER MODAL */}
      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        isSourcing={true}
        onSelectTemplate={handleUseTemplate}
        onManageTemplates={() => navigate("/templates")}
      />

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold">Delete Sourcing RFQ</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action will soft-delete the record from active lists.
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">RFQ Number:</span>
                <span className="font-mono font-bold text-amber-500">{orderToDelete.po_number}</span>
              </div>
              {orderToDelete.goods_description && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Materials:</span>
                  <span className="font-medium truncate max-w-[200px]">{orderToDelete.goods_description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                  isDark
                    ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                    : "border-slate-300 hover:bg-slate-100 text-slate-700"
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO STAGE VERSION HISTORY & LINEAGE DRAWER */}
      <POVersionHistoryDrawer
        isOpen={Boolean(selectedHistoryOrder)}
        onClose={() => setSelectedHistoryOrder(null)}
        poId={selectedHistoryOrder?.id}
        poNumber={selectedHistoryOrder?.po_number}
      />
    </div>
  );
}
