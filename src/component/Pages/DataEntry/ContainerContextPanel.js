import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  ShoppingBag,
  PackageCheck,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Layers
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { toast } from "react-toastify";

export default function ContainerContextPanel({ containerId, containerNo }) {
  const { hasModule, isRoot } = useAuth();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState("orders");
  const [contextData, setContextData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Link Order Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkableOrders, setLinkableOrders] = useState([]);
  const [searchOrder, setSearchOrder] = useState("");
  const [loadingLinkable, setLoadingLinkable] = useState(false);
  const [linkingPoId, setLinkingPoId] = useState(null);

  // Expanded POs state
  const [expandedPOs, setExpandedPOs] = useState({});

  const canViewOrders = hasModule("ORDERS");

  const fetchContext = useCallback(async () => {
    if (!containerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/containers/${containerId}/context`
      );
      setContextData(res.data);
    } catch (err) {
      console.error("Failed to load container context:", err);
      setError(err?.response?.data?.detail || "Unable to load container context");
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const fetchLinkableOrders = async (query = "") => {
    try {
      setLoadingLinkable(true);
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/containers/linkable-orders`,
        { params: { search: query } }
      );
      setLinkableOrders(res.data || []);
    } catch (err) {
      console.error("Failed to load linkable orders:", err);
      toast.error("Could not load purchase orders");
    } finally {
      setLoadingLinkable(false);
    }
  };

  const handleOpenLinkModal = () => {
    setIsLinkModalOpen(true);
    fetchLinkableOrders();
  };

  const handleLinkOrder = async (poId) => {
    try {
      setLinkingPoId(poId);
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/containers/${containerId}/link-order`,
        { po_id: poId }
      );
      toast.success(res.data.message || "Order linked successfully");
      setIsLinkModalOpen(false);
      fetchContext();
    } catch (err) {
      console.error("Failed to link order:", err);
      toast.error(err?.response?.data?.detail || "Failed to link order");
    } finally {
      setLinkingPoId(null);
    }
  };

  const handleUnlinkOrder = async (poId, poNumber) => {
    if (!window.confirm(`Unlink purchase order ${poNumber} from this container?`)) {
      return;
    }
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/containers/${containerId}/link-order/${poId}`
      );
      toast.info(`Order ${poNumber} unlinked`);
      fetchContext();
    } catch (err) {
      console.error("Failed to unlink order:", err);
      toast.error(err?.response?.data?.detail || "Failed to unlink order");
    }
  };

  const toggleExpandPO = (id) => {
    setExpandedPOs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const summary = contextData?.summary || {
    total_orders: 0,
    total_receipts: 0,
    total_defects: 0,
    open_defects: 0,
    has_discrepancies: false,
  };

  return (
    <div className={`mt-6 border rounded-xl overflow-hidden shadow-sm ${theme.border} ${theme.background}`}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50/80 dark:bg-gray-800/60 border-b border-inherit">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm">
            <Layers size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Container Context & Linked Operations
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                {containerNo || contextData?.container?.container_no}
              </span>
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cross-module data: purchase orders, receiving inspection, defects & documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchContext}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md transition"
            title="Refresh context data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          {canViewOrders && (
            <button
              type="button"
              onClick={handleOpenLinkModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <Plus size={14} /> Link Order
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-100/50 dark:bg-gray-900/30 border-b border-inherit text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-inherit">
          <ShoppingBag size={15} className="text-blue-500" />
          <span className="text-gray-500 dark:text-gray-400">Linked Orders:</span>
          <span className="font-bold ml-auto">{summary.total_orders}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-inherit">
          <PackageCheck size={15} className="text-emerald-500" />
          <span className="text-gray-500 dark:text-gray-400">Goods Receipts:</span>
          <span className="font-bold ml-auto">{summary.total_receipts}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-inherit">
          <AlertTriangle size={15} className={summary.open_defects > 0 ? "text-amber-500" : "text-gray-400"} />
          <span className="text-gray-500 dark:text-gray-400">Defects / Damage:</span>
          <span className={`font-bold ml-auto ${summary.open_defects > 0 ? "text-amber-600 font-extrabold" : ""}`}>
            {summary.open_defects} open ({summary.total_defects} total)
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-inherit">
          <FileText size={15} className="text-indigo-500" />
          <span className="text-gray-500 dark:text-gray-400">All Documents:</span>
          <span className="font-bold ml-auto">{contextData?.documents?.length || 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-inherit px-3 gap-1 bg-gray-50/50 dark:bg-gray-800/40">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "orders"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <ShoppingBag size={14} /> Orders ({contextData?.orders?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("receipts")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "receipts"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <PackageCheck size={14} /> Goods Receipts ({contextData?.receipts?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("defects")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "defects"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <AlertTriangle size={14} /> Damage & Defects ({contextData?.defects?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "documents"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          <FileText size={14} /> Documents ({contextData?.documents?.length || 0})
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {loading && !contextData ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-xs">
            <RefreshCw size={18} className="animate-spin mr-2" /> Loading container context data...
          </div>
        ) : error ? (
          <div className="p-4 text-xs rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        ) : (
          <>
            {/* TAB: ORDERS */}
            {activeTab === "orders" && (
              <div>
                {!canViewOrders ? (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
                    <strong>Procurement Module Inactive:</strong> Your organisation does not currently have access to the Orders & Procurement module. Subscribe to manage purchase orders, packing lists, and receiving.
                  </div>
                ) : contextData?.orders?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                    <ShoppingBag size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No purchase orders linked to this container.</p>
                    <p className="text-[11px] mt-1">Click &quot;Link Order&quot; above to link a PO shipped in this container.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contextData?.orders?.map((po) => {
                      const isExpanded = expandedPOs[po.id];
                      return (
                        <div
                          key={po.id}
                          className="border rounded-lg overflow-hidden border-inherit bg-white dark:bg-gray-800/80 shadow-sm"
                        >
                          <div className="flex items-center justify-between p-3 gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleExpandPO(po.id)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400"
                              >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                              <div>
                                <span className="font-bold text-xs text-blue-600 dark:text-blue-400">
                                  {po.po_number}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {po.supplier}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {po.status}
                              </span>
                              {po.total_amount > 0 && (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  {po.currency} {po.total_amount.toLocaleString()}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleUnlinkOrder(po.id, po.po_number)}
                                className="p-1 text-gray-400 hover:text-rose-600 transition"
                                title="Unlink PO"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Collapsible details: Packing lists & line items summary */}
                          {isExpanded && (
                            <div className="p-3 bg-gray-50/70 dark:bg-gray-900/40 border-t border-inherit text-xs space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>Shipment Status: <strong className="text-gray-700 dark:text-gray-300">{po.shipment_status}</strong></span>
                                <span>Line Items: <strong className="text-gray-700 dark:text-gray-300">{po.items_count} items</strong></span>
                              </div>
                              {po.packing_lists?.length > 0 ? (
                                <div className="mt-2">
                                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Packing Lists:</span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                    {po.packing_lists.map((pl) => (
                                      <div key={pl.id} className="p-2 rounded border border-inherit bg-white dark:bg-gray-800 text-[11px]">
                                        <div className="font-semibold text-blue-600">{pl.pl_number}</div>
                                        <div className="text-gray-500 mt-0.5">
                                          {pl.cartons ? `${pl.cartons} cartons` : ""} {pl.cbm ? `• ${pl.cbm} CBM` : ""} {pl.gross_weight ? `• ${pl.gross_weight} kg` : ""}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-400 italic">No packing lists recorded for this order.</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: GOODS RECEIPTS */}
            {activeTab === "receipts" && (
              <div>
                {!canViewOrders ? (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs">
                    Goods Receiving requires the Orders module.
                  </div>
                ) : contextData?.receipts?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                    <PackageCheck size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No goods receipts registered for this container yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] uppercase bg-gray-50 dark:bg-gray-800 text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Receipt #</th>
                          <th className="px-3 py-2">PO #</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Discrepancy</th>
                          <th className="px-3 py-2">Items</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {contextData?.receipts?.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                            <td className="px-3 py-2.5 font-bold text-blue-600">{r.receipt_number}</td>
                            <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300">{r.po_number || "—"}</td>
                            <td className="px-3 py-2.5 text-gray-500">{r.received_date || "—"}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === "VERIFIED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {r.has_discrepancies ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                                  Discrepancy
                                </span>
                              ) : (
                                <span className="text-emerald-600 text-[11px] flex items-center gap-1 font-medium">
                                  <CheckCircle2 size={12} /> Clear
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-semibold">{r.items_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: DEFECTS & DAMAGE */}
            {activeTab === "defects" && (
              <div>
                {contextData?.defects?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                    <AlertTriangle size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No damage or defects reported against this container.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] uppercase bg-gray-50 dark:bg-gray-800 text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Defect #</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Discovery Date</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Items</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {contextData?.defects?.map((d) => (
                          <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                            <td className="px-3 py-2.5 font-bold text-rose-600">{d.defect_number}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {d.category}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-medium">{d.title}</td>
                            <td className="px-3 py-2.5 text-gray-500">{d.discovery_date || "—"}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.status === "RESOLVED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300"
                              }`}>
                                {d.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-semibold">{d.items_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ALL DOCUMENTS */}
            {activeTab === "documents" && (
              <div>
                {contextData?.documents?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
                    <FileText size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No documents attached.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {contextData?.documents?.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-inherit bg-white dark:bg-gray-800 text-xs hover:border-blue-400 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={16} className={doc.is_order_doc ? "text-indigo-500" : "text-blue-500"} />
                          <div className="min-w-0">
                            <p className="font-medium truncate text-gray-900 dark:text-gray-100">{doc.name}</p>
                            <p className="text-[10px] text-gray-400">Source: {doc.source} • {doc.type}</p>
                          </div>
                        </div>
                        {doc.id && (
                          <a
                            href={`${process.env.REACT_APP_NETWORK}/getDocument/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 transition ml-2"
                            title="Open document"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Link Order Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-xl border ${theme.border} ${theme.background} p-4 shadow-2xl flex flex-col max-h-[85vh]`}>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ShoppingBag size={16} className="text-blue-600" /> Link Purchase Order to Container {containerNo}
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="py-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search PO #, supplier, or items..."
                  value={searchOrder}
                  onChange={(e) => {
                    setSearchOrder(e.target.value);
                    fetchLinkableOrders(e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-inherit bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {loadingLinkable ? (
                <div className="text-center py-8 text-xs text-gray-500">
                  <RefreshCw size={16} className="animate-spin mx-auto mb-2" /> Loading orders...
                </div>
              ) : linkableOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No matching purchase orders found.
                </div>
              ) : (
                linkableOrders.map((po) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-inherit bg-white dark:bg-gray-800/80 hover:border-blue-500 transition"
                  >
                    <div>
                      <span className="font-bold text-xs text-blue-600">{po.po_number}</span>
                      <span className="text-xs text-gray-500 ml-2">{po.supplier}</span>
                      {po.goods_description && (
                        <p className="text-[11px] text-gray-400 truncate max-w-xs">{po.goods_description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={linkingPoId === po.id}
                      onClick={() => handleLinkOrder(po.id)}
                      className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
                    >
                      {linkingPoId === po.id ? "Linking..." : "Link"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-inherit flex justify-end">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-inherit hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
