import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingBag,
  Plus,
  LayoutGrid,
  List,
  Search,
  AlertTriangle,
  FilterX,
  RefreshCw,
  Trash2,
  Sparkles,
  Layers,
  GitCompare
} from "lucide-react";
import axios from "axios";
import { STATUS_PIPELINE } from "./mockOrders";
import OrderCardGrid from "./OrderCardGrid";
import OrderTable from "./OrderTable";
import OrderForm from "./OrderForm";
import OrderTemplatesPage from "./OrderTemplatesPage";
import TemplatePickerModal from "./TemplatePickerModal";
import POVersionHistoryDrawer from "./POVersionHistoryDrawer";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useOptions } from "../../../hooks/useOptions";

function getUserInfo() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const QUOTE_BIDDING_STAGES = [
  { code: "ALL", label: "All Bidding & Quotes" },
  { code: "RFQ_SENT", label: "RFQ Sent / Pending Quotes" },
  { code: "QUOTE_RECEIVED", label: "Quotes In / Ready to Compare" },
  { code: "QUOTE_APPROVED", label: "Awarded / Ready to Issue PO" }
];

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const { isRoot, permissions = [] } = useAuth();
  const { orderStatuses = [] } = useOptions();
  const userInfo = getUserInfo();

  const hasPermission = (field) => permissions.includes(field);
  const canViewPO = hasPermission("View_Order") || isRoot || permissions.includes("Administrator");
  const canViewRFQ = hasPermission("View_RFQ") || canViewPO;
  const canViewTemplates = hasPermission("View_OrderTemplate") || canViewPO;
  const canAddRFQ = hasPermission("Add_RFQ") || hasPermission("Add_Order") || isRoot || permissions.includes("Administrator");
  const canAddPO = hasPermission("Add_Order") || isRoot || permissions.includes("Administrator");
  const canAddTemplate = hasPermission("Add_OrderTemplate") || hasPermission("Add_Order") || isRoot || permissions.includes("Administrator");

  const isAccountsOrAdmin = userInfo?.roles?.some((r) => {
    const lower = (r || "").toLowerCase();
    return (
      lower.includes("admin") ||
      lower.includes("account") ||
      lower.includes("finance") ||
      lower.includes("procurement") ||
      lower.includes("buyer") ||
      lower.includes("manager")
    );
  });

  const visibleStages = useMemo(() => {
    if (orderStatuses && orderStatuses.length > 0) {
      return orderStatuses;
    }
    return STATUS_PIPELINE;
  }, [orderStatuses]);

  const urlLifecycle = searchParams.get("lifecycle");
  const urlTab = searchParams.get("tab");
  const urlView = searchParams.get("view");

  useEffect(() => {
    if (urlView === "quotes") navigate("/orders/quotes", { replace: true });
    else if (urlTab === "templates") navigate("/templates", { replace: true });
  }, [urlView, urlTab, navigate]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateForOrder, setTemplateForOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [onlyUrgentFilter, setOnlyUrgentFilter] = useState(false);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState(null);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUseTemplate = (template) => {
    navigate("/orders/new", { state: { fromTemplate: template } });
  };

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
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && Array.isArray(data.data)) {
        setOrders(data.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Could not fetch orders from DB:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const poOrders = useMemo(() => {
    return orders.filter((o) => o.doc_type === "PO" || !o.doc_type);
  }, [orders]);

  // Filter logic
  const filteredOrders = poOrders.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.goods_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isAccountsOrAdmin && o.po_nce?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.origin_rfq_number?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      selectedStatusFilter === "ALL" ||
      o.status === selectedStatusFilter ||
      o.status_label === selectedStatusFilter;

    const matchesUrgent = !onlyUrgentFilter || o.urgent_action === true;

    return matchesSearch && matchesStatus && matchesUrgent;
  });

  const activeFilterCount =
    (selectedStatusFilter !== "ALL" ? 1 : 0) +
    (onlyUrgentFilter ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatusFilter("ALL");
    setOnlyUrgentFilter(false);
  };

  const handleSaveOrder = async (newOrUpdatedOrder) => {
    try {
      if (editingOrder && editingOrder.id) {
        const res = await axios.put(
          `${process.env.REACT_APP_NETWORK}/orders/${editingOrder.id}`,
          newOrUpdatedOrder,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "skip_zrok_interstitial": "true",
            },
          }
        );
        setOrders((prev) =>
          prev.map((o) => (o.id === editingOrder.id ? res.data : o))
        );
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/orders`,
          newOrUpdatedOrder,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "skip_zrok_interstitial": "true",
            },
          }
        );
        setOrders((prev) => [res.data, ...prev]);
      }
      setShowDrawer(false);
      setEditingOrder(null);
    } catch (err) {
      console.error("Failed to save order to database:", err);
      alert(err.response?.data?.detail || "Failed to save purchase order.");
    }
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
      // Local fallback
      const statusObj = visibleStages.find((s) => s.key === newStatusKey || s.code === newStatusKey);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
              ...o,
              status: newStatusKey,
              status_label: statusObj ? statusObj.name || statusObj.label : newStatusKey,
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
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
      setOrderToDelete(null);
    } catch (err) {
      console.error("Failed to delete purchase order:", err);
      alert(err.response?.data?.detail || "Failed to delete purchase order.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col overflow-hidden ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
        }`}
    >
      {/* COMPACT TOP BAR & CONTROLS TOOLBAR */}
      <div
        className={`flex-none p-3.5 md:p-4 border-b shadow-xs space-y-3 ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
      >
        {/* Title row + Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"
                    }`}
                >
                  Purchase Orders
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                  {filteredOrders.length} Orders
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 font-medium ${isDark ? "text-slate-400" : "text-slate-500"
                  }`}
              >
                Track purchasing lifecycle, delivery milestones & supplier orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchOrders}
              className={`p-2 rounded-xl border transition ${isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-400"
                  : "border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}
              title="Refresh Orders"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {canViewTemplates && (
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${isDark
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                title="Create order using a pre-defined template"
              >
                <Sparkles size={14} className="text-indigo-500" />
                <span>Use Template</span>
              </button>
            )}

            {canAddPO && (
              <button
                type="button"
                onClick={() => navigate("/orders/new?doc_type=PO")}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                <Plus size={15} />
                <span>New PO</span>
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search PO#, Supplier, Material..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  }`}
              />
            </div>

            {/* Urgent Filter Toggle */}
            <button
              type="button"
              onClick={() => setOnlyUrgentFilter(!onlyUrgentFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition ${onlyUrgentFilter
                  ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                  : isDark
                    ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                }`}
            >
              <AlertTriangle size={13} className={onlyUrgentFilter ? "text-white" : "text-rose-500"} />
              <span>Urgent Only</span>
            </button>

            {/* Reset Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 transition"
              >
                <FilterX size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Segmented View Switcher */}
          <div
            className={`flex items-center p-0.5 rounded-xl border w-full sm:w-auto justify-center ${isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
              }`}
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition flex-1 sm:flex-none justify-center ${viewMode === "table"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <List size={14} />
              <span>Table View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition flex-1 sm:flex-none justify-center ${viewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-xs"
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

        {/* PO Operational Pipeline Stage Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedStatusFilter("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold whitespace-nowrap transition ${selectedStatusFilter === "ALL"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : isDark
                  ? "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              }`}
          >
            <span>All Stages</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${selectedStatusFilter === "ALL"
                  ? "bg-blue-800 text-white"
                  : isDark
                    ? "bg-slate-700 text-slate-300"
                    : "bg-slate-200 text-slate-700"
                }`}
            >
              {poOrders.length}
            </span>
          </button>

          {visibleStages.map((stage) => {
            const stageKey = stage.key || stage.code || stage.name;
            const stageLabel = stage.name || stage.label;
            const count = poOrders.filter(
              (o) => o.status === stageKey || o.status_label === stageLabel
            ).length;
            const isSelected = selectedStatusFilter === stageKey;

            return (
              <button
                key={stage.id || stageKey}
                type="button"
                onClick={() => setSelectedStatusFilter(stageKey)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition ${isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : isDark
                      ? "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
              >
                <span>{stageLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${isSelected
                      ? "bg-blue-800 text-white"
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

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 overflow-hidden p-3 md:p-4 flex flex-col">
        {viewMode === "grid" ? (
          <OrderCardGrid
            orders={filteredOrders}
            orderStatuses={visibleStages}
            onStatusChange={handleStatusChange}
            onEditOrder={(order) => {
              navigate(`/orders/${order.id}/edit`, { state: { order } });
            }}
            onDeleteOrder={(order) => setOrderToDelete(order)}
            onOpenVersionHistory={(order) => setSelectedHistoryOrder(order)}
          />
        ) : (
          <OrderTable
            orders={filteredOrders}
            orderStatuses={visibleStages}
            activeTab="orders"
            onEditOrder={(order) => {
              navigate(`/orders/${order.id}/edit`, { state: { order } });
            }}
            onDeleteOrder={(order) => setOrderToDelete(order)}
            onOpenVersionHistory={(order) => setSelectedHistoryOrder(order)}
          />
        )}
      </div>

      {/* DRAWER FORM */}
      {showDrawer && (
        <OrderForm
          editData={editingOrder}
          fromTemplate={templateForOrder}
          orderStatuses={visibleStages}
          onClose={() => {
            setShowDrawer(false);
            setEditingOrder(null);
            setTemplateForOrder(null);
          }}
          onSave={handleSaveOrder}
        />
      )}

      {/* TEMPLATE PICKER MODAL */}
      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelectTemplate={handleUseTemplate}
        onManageTemplates={() => navigate("/templates")}
      />

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold">Delete Purchase Order</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action will soft-delete the record from active lists.
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
            >
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">PO Number:</span>
                <span className="font-mono font-bold text-blue-500">{orderToDelete.po_number}</span>
              </div>
              {orderToDelete.company && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Supplier:</span>
                  <span className="font-bold">{orderToDelete.company}</span>
                </div>
              )}
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
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${isDark
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
