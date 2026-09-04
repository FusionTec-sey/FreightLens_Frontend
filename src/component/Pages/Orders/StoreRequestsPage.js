import React, { useState, useEffect } from "react";
import { 
  FileText, Plus, Search, CheckCircle2, Clock, 
  Trash2, Edit3, Send, Undo2, AlertCircle, X, ChevronRight 
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

export default function StoreRequestsPage() {
  const { theme, isDark } = useTheme();
  const { user, isRoot } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    store_location: "",
    required_date: "",
    notes: "",
    items: [{ description: "", quantity_requested: 1, unit: "PCS", notes: "" }]
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/store-requests`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setRequests(res.data || []);
    } catch (err) {
      toast.error("Failed to fetch store requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity_requested: 1, unit: "PCS", notes: "" }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems.length ? newItems : [{ description: "", quantity_requested: 1, unit: "PCS", notes: "" }] });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmitDraft = async (e) => {
    e.preventDefault();
    if (!formData.items.some(i => i.description.trim())) {
      toast.warning("Please add at least one item with a description");
      return;
    }
    try {
      await axios.post(`${process.env.REACT_APP_NETWORK}/store-requests`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Store Request draft created successfully!");
      setShowModal(false);
      setFormData({
        title: "",
        department: "",
        store_location: "",
        required_date: "",
        notes: "",
        items: [{ description: "", quantity_requested: 1, unit: "PCS", notes: "" }]
      });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create store request");
    }
  };

  const handleSubmitToSourcing = async (id) => {
    try {
      await axios.post(`${process.env.REACT_APP_NETWORK}/store-requests/${id}/submit`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Request submitted to Sourcing & Accounts!");
      fetchRequests();
      if (viewingRequest?.id === id) {
        setViewingRequest(null);
      }
    } catch (err) {
      toast.error("Failed to submit request");
    }
  };

  const handleWithdraw = async (id) => {
    try {
      await axios.post(`${process.env.REACT_APP_NETWORK}/store-requests/${id}/withdraw`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.info("Request withdrawn to draft.");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to withdraw request");
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      (r.request_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.department || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`p-4 md:p-6 space-y-6 ${theme.background} min-h-screen`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="text-blue-500" /> Store Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, track, and submit store material requirements for sourcing and PO generation.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition"
        >
          <Plus size={18} /> New Request
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search request #, title, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["ALL", "DRAFT", "SUBMITTED", "ORDERED", "WITHDRAWN"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Grid / Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading store requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-800">
          <FileText size={48} className="mx-auto text-gray-400 mb-3 opacity-50" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">No Store Requests Found</h3>
          <p className="text-sm text-gray-500 mt-1">Create a new requirement draft to begin tracking goods.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    {req.request_number}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    req.status === "SUBMITTED" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                    req.status === "ORDERED" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                    req.status === "WITHDRAWN" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                    "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}>
                    {req.status_label || req.status}
                  </span>
                </div>

                <h3 className="font-bold text-base line-clamp-1">{req.title || "Materials Request"}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Dept: <span className="font-medium text-gray-700 dark:text-gray-300">{req.department || "General"}</span> • Location: <span className="font-medium text-gray-700 dark:text-gray-300">{req.store_location || "Central"}</span>
                </p>

                <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Requested Items ({req.items?.length || 0})</span>
                  <ul className="mt-2 space-y-1">
                    {(req.items || []).slice(0, 3).map((item, idx) => (
                      <li key={idx} className="text-xs flex justify-between text-gray-600 dark:text-gray-300">
                        <span className="truncate max-w-[200px]">{item.description}</span>
                        <span className="font-semibold">{item.quantity_requested} {item.unit}</span>
                      </li>
                    ))}
                    {req.items?.length > 3 && (
                      <li className="text-xs text-blue-500 font-medium">+ {req.items.length - 3} more items</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <button
                  onClick={() => setViewingRequest(req)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Details <ChevronRight size={14} />
                </button>

                <div className="flex items-center gap-2">
                  {req.status === "DRAFT" && (
                    <button
                      onClick={() => handleSubmitToSourcing(req.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow-sm transition"
                    >
                      <Send size={12} /> Submit
                    </button>
                  )}
                  {req.status === "SUBMITTED" && (
                    <button
                      onClick={() => handleWithdraw(req.id)}
                      className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-lg hover:bg-amber-100 flex items-center gap-1 transition"
                    >
                      <Undo2 size={12} /> Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold">New Store Procurement Request</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitDraft} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Request Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electrical fittings for Selma site"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Electrical / Mechanical / Civil"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Store / Site Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Providence Store #2"
                    value={formData.store_location}
                    onChange={(e) => setFormData({ ...formData, store_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Required By Date</label>
                  <input
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Required Items</h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Another Item
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {formData.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/60 flex items-center gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Item Description / Specs"
                        value={it.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                      />
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        placeholder="Qty"
                        value={it.quantity_requested}
                        onChange={(e) => handleItemChange(idx, "quantity_requested", e.target.value)}
                        className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  placeholder="Additional specifications, urgency notes, site contact..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Details Modal */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                  {viewingRequest.request_number}
                </span>
                <h2 className="text-xl font-bold mt-2">{viewingRequest.title}</h2>
              </div>
              <button onClick={() => setViewingRequest(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase">Department</span>
                  <p className="font-medium">{viewingRequest.department || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase">Store Location</span>
                  <p className="font-medium">{viewingRequest.store_location || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase">Status</span>
                  <p className="font-medium text-blue-600">{viewingRequest.status_label}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase">Required Date</span>
                  <p className="font-medium">{viewingRequest.required_date || "Not specified"}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Item Specifications</h4>
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 font-semibold text-gray-500">
                      <tr>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Requested</th>
                        <th className="p-3 text-right">Ordered</th>
                        <th className="p-3 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(viewingRequest.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="p-3 font-medium">{it.description}</td>
                          <td className="p-3 text-right">{it.quantity_requested} {it.unit}</td>
                          <td className="p-3 text-right text-purple-600 font-semibold">{it.quantity_ordered} {it.unit}</td>
                          <td className="p-3 text-right text-emerald-600 font-semibold">{it.quantity_received} {it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingRequest.notes && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-bold">Notes:</span> {viewingRequest.notes}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-400">Created: {new Date(viewingRequest.created_at).toLocaleDateString()}</span>
              {viewingRequest.status === "DRAFT" && (
                <button
                  onClick={() => handleSubmitToSourcing(viewingRequest.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition"
                >
                  <Send size={14} /> Submit to Sourcing
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
