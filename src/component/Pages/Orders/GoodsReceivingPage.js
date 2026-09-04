import React, { useState, useEffect } from "react";
import { 
  CheckSquare, Plus, Search, CheckCircle2, AlertTriangle, 
  PackageCheck, Camera, X, ChevronRight, FileSpreadsheet, Eye 
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { toast } from "react-toastify";

export default function GoodsReceivingPage() {
  const { theme } = useTheme();

  const [receipts, setReceipts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  // New Verification Form
  const [selectedPO, setSelectedPO] = useState(null);
  const [formData, setFormData] = useState({
    po_id: "",
    warehouse_location: "Providence Warehouse #1",
    received_date: new Date().toISOString().split("T")[0],
    notes: "",
    items: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, ordRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_NETWORK}/goods-receiving`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${process.env.REACT_APP_NETWORK}/orders`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      ]);
      setReceipts(recRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      toast.error("Failed to load receiving data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPO = (poId) => {
    const po = orders.find(o => o.id === parseInt(poId));
    setSelectedPO(po);
    if (po) {
      const initialItems = (po.items || []).map(it => ({
        po_item_id: it.id,
        description: it.description,
        expected_quantity: it.quantity_ordered,
        received_quantity: it.quantity_ordered,
        missing_quantity: 0,
        excess_quantity: 0,
        damaged_quantity: 0,
        incorrect_quantity: 0,
        unit: it.unit || "PCS",
        condition_ok: true,
        notes: ""
      }));
      setFormData({
        ...formData,
        po_id: po.id,
        items: initialItems.length ? initialItems : [{ description: po.goods_description || "General Goods", expected_quantity: 1, received_quantity: 1, missing_quantity: 0, excess_quantity: 0, damaged_quantity: 0, incorrect_quantity: 0, unit: "PCS", condition_ok: true, notes: "" }]
      });
    }
  };

  const handleItemChange = (idx, field, value) => {
    const newItems = [...formData.items];
    newItems[idx][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSaveReceipt = async (isFinalSubmit = false) => {
    if (!formData.po_id) {
      toast.warning("Please select a Purchase Order to verify");
      return;
    }
    try {
      const payload = {
        ...formData,
        status: isFinalSubmit ? "SUBMITTED" : "DRAFT"
      };
      await axios.post(`${process.env.REACT_APP_NETWORK}/goods-receiving`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success(isFinalSubmit ? "Goods verified and submitted to system!" : "Receipt draft saved.");
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save goods receipt");
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const search = searchQuery.toLowerCase();
    return (
      (r.receipt_number || "").toLowerCase().includes(search) ||
      (r.po_number || "").toLowerCase().includes(search) ||
      (r.warehouse_location || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className={`p-4 md:p-6 space-y-6 ${theme.background} min-h-screen`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageCheck className="text-emerald-500" /> Goods Receiving & Verification
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Warehouse receiving confirmation, discrepancy checks, and milestone completions.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition"
        >
          <Plus size={18} /> Verify New Delivery
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search receipt #, PO, warehouse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading receipts...</div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-800">
          <PackageCheck size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">No Goods Receipts Yet</h3>
          <p className="text-sm text-gray-500 mt-1">Record warehouse delivery verification to complete orders.</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="p-3.5">Receipt #</th>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Warehouse</th>
                <th className="p-3.5">Received Date</th>
                <th className="p-3.5">Condition / Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredReceipts.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                  <td className="p-3.5 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {rec.receipt_number}
                  </td>
                  <td className="p-3.5 font-medium">{rec.po_number || `PO #${rec.po_id}`}</td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-300">{rec.warehouse_location || "Central"}</td>
                  <td className="p-3.5 text-gray-500 text-xs">{rec.received_date}</td>
                  <td className="p-3.5">
                    {rec.has_discrepancies ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        <AlertTriangle size={12} /> Discrepancies
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 size={12} /> Verified OK
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setViewingReceipt(rec)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium inline-flex items-center gap-1"
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Verify Goods Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckSquare className="text-emerald-500" /> Warehouse Delivery Verification
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Select Purchase Order *</label>
                  <select
                    value={formData.po_id}
                    onChange={(e) => handleSelectPO(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose PO --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.po_number} ({o.goods_description || o.company || "PO"})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Warehouse Location</label>
                  <input
                    type="text"
                    value={formData.warehouse_location}
                    onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Received Date</label>
                  <input
                    type="date"
                    value={formData.received_date}
                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Items Verification Checklist */}
              {formData.items.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Item Verification & Quantities</h3>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {formData.items.map((it, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/60 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{it.description}</span>
                          <span className="text-xs text-gray-500">Expected: <strong className="text-gray-800 dark:text-gray-200">{it.expected_quantity} {it.unit}</strong></span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-400">Received Qty</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.received_quantity}
                              onChange={(e) => handleItemChange(idx, "received_quantity", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-amber-500">Missing / Short</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.missing_quantity}
                              onChange={(e) => handleItemChange(idx, "missing_quantity", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-sm text-center text-amber-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-rose-500">Damaged Qty</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.damaged_quantity}
                              onChange={(e) => handleItemChange(idx, "damaged_quantity", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-gray-800 text-sm text-center text-rose-600 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-purple-500">Wrong / Incorrect</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.incorrect_quantity}
                              onChange={(e) => handleItemChange(idx, "incorrect_quantity", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-sm text-center text-purple-600 font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Receiving Remarks / Seal Check</label>
                <textarea
                  rows="2"
                  placeholder="Container condition, seal numbers match, pallet remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReceipt(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReceipt(true)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  Submit & Confirm Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Receipt Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                  {viewingReceipt.receipt_number}
                </span>
                <h2 className="text-xl font-bold mt-2">{viewingReceipt.po_number} Receipt Verification</h2>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase">Warehouse</span>
                  <p className="font-medium">{viewingReceipt.warehouse_location}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase">Received Date</span>
                  <p className="font-medium">{viewingReceipt.received_date}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Verified Items</h4>
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 font-semibold text-gray-500">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3 text-right">Expected</th>
                        <th className="p-3 text-right">Received</th>
                        <th className="p-3 text-right">Exceptions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(viewingReceipt.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-medium">{it.description}</td>
                          <td className="p-3 text-right">{it.expected_quantity} {it.unit}</td>
                          <td className="p-3 text-right text-emerald-600 font-semibold">{it.received_quantity} {it.unit}</td>
                          <td className="p-3 text-right">
                            {it.damaged_quantity > 0 && <span className="text-red-500 mr-1 font-bold">-{it.damaged_quantity} dmg</span>}
                            {it.missing_quantity > 0 && <span className="text-amber-500 font-bold">-{it.missing_quantity} short</span>}
                            {it.damaged_quantity === 0 && it.missing_quantity === 0 && <span className="text-emerald-500 font-medium">OK</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingReceipt.notes && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
                  <span className="font-bold">Notes:</span> {viewingReceipt.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
