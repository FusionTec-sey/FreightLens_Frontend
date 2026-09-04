import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, Plus, Search, Eye, X, CheckCircle2 
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { toast } from "react-toastify";

export default function PackingListsPage() {
  const { theme } = useTheme();

  const [packingLists, setPackingLists] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [viewingList, setViewingList] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    po_id: "",
    packing_list_number: "",
    supplier_invoice_ref: "",
    package_count: 1,
    total_gross_weight: "",
    total_cbm: "",
    date_issued: new Date().toISOString().split("T")[0],
    notes: "",
    items: [{ description: "", quantity_packed: 1, unit: "PCS", carton_numbers: "" }]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plRes, ordRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_NETWORK}/packing-lists`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`${process.env.REACT_APP_NETWORK}/orders`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
      ]);
      setPackingLists(plRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      toast.error("Failed to load packing lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPO = (poId) => {
    const po = orders.find(o => o.id === parseInt(poId));
    if (po) {
      const initialItems = (po.items || []).map(it => ({
        po_item_id: it.id,
        description: it.description,
        quantity_packed: it.quantity_ordered,
        unit: it.unit || "PCS",
        carton_numbers: "Carton 1"
      }));
      setFormData({
        ...formData,
        po_id: po.id,
        packing_list_number: `PL-${po.po_number}`,
        items: initialItems.length ? initialItems : [{ description: po.goods_description || "General Goods", quantity_packed: 1, unit: "PCS", carton_numbers: "Carton 1" }]
      });
    }
  };

  const handleSavePL = async (e) => {
    e.preventDefault();
    if (!formData.po_id) {
      toast.warning("Please select a Purchase Order");
      return;
    }
    try {
      await axios.post(`${process.env.REACT_APP_NETWORK}/packing-lists`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Packing List registered successfully!");
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save packing list");
    }
  };

  const filteredLists = packingLists.filter(pl => {
    const s = searchQuery.toLowerCase();
    return (
      (pl.packing_list_number || "").toLowerCase().includes(s) ||
      (pl.po_number || "").toLowerCase().includes(s) ||
      (pl.supplier_invoice_ref || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className={`p-4 md:p-6 space-y-6 ${theme.background} min-h-screen`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-500" /> Packing Lists
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Supplier packing list register, weight/CBM totals, and carton allocations.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition"
        >
          <Plus size={18} /> Register Packing List
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search packing list #, PO, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading packing lists...</div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-800">
          <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">No Packing Lists Registered</h3>
          <p className="text-sm text-gray-500 mt-1">Add supplier packing lists to track container packing.</p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase">
              <tr>
                <th className="p-3.5">Packing List #</th>
                <th className="p-3.5">PO Number</th>
                <th className="p-3.5">Invoice Ref</th>
                <th className="p-3.5">Packages / Weight</th>
                <th className="p-3.5">Date Issued</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredLists.map((pl) => (
                <tr key={pl.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                  <td className="p-3.5 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {pl.packing_list_number}
                  </td>
                  <td className="p-3.5 font-medium">{pl.po_number || `PO #${pl.po_id}`}</td>
                  <td className="p-3.5 text-gray-500 text-xs">{pl.supplier_invoice_ref || "-"}</td>
                  <td className="p-3.5 text-xs text-gray-600 dark:text-gray-300">
                    {pl.package_count ? `${pl.package_count} pkgs` : "-"} • {pl.total_gross_weight ? `${pl.total_gross_weight} kg` : "-"}
                  </td>
                  <td className="p-3.5 text-gray-500 text-xs">{pl.date_issued}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => setViewingList(pl)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold">Register Supplier Packing List</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePL} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Select Purchase Order *</label>
                  <select
                    required
                    value={formData.po_id}
                    onChange={(e) => handleSelectPO(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                  >
                    <option value="">-- Choose PO --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>{o.po_number} ({o.goods_description || o.company})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Packing List Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PL-NCE-26102"
                    value={formData.packing_list_number}
                    onChange={(e) => setFormData({ ...formData, packing_list_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Supplier Invoice Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-99"
                    value={formData.supplier_invoice_ref}
                    onChange={(e) => setFormData({ ...formData, supplier_invoice_ref: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Date Issued</label>
                  <input
                    type="date"
                    value={formData.date_issued}
                    onChange={(e) => setFormData({ ...formData, date_issued: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                  />
                </div>
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
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  Save Packing List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewingList && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                  {viewingList.packing_list_number}
                </span>
                <h2 className="text-xl font-bold mt-2">{viewingList.po_number} Packing Details</h2>
              </div>
              <button onClick={() => setViewingList(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 font-semibold text-gray-500">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3 text-right">Packed Qty</th>
                      <th className="p-3">Cartons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(viewingList.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium">{it.description}</td>
                        <td className="p-3 text-right font-bold text-blue-600">{it.quantity_packed} {it.unit}</td>
                        <td className="p-3 text-gray-500">{it.carton_numbers || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
