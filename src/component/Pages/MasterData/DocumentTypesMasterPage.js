import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Search,
  Check,
  Tag,
  Shield,
  Layers
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

const AVAILABLE_SPACES = [
  { id: "SOURCING", label: "Sourcing & RFQs", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  { id: "ORDER", label: "PO & Contracts", color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { id: "PAYMENT", label: "Financial Ledger & Swift", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { id: "SHIPPING", label: "Shipping & Logistics / BL", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
  { id: "DEFECTS", label: "Defects & QA Claims", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
];

export default function DocumentTypesMasterPage() {
  const { isDark } = useTheme();

  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [applicableSpaces, setApplicableSpaces] = useState(["ORDER"]);
  const [displayOrder, setDisplayOrder] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    skip_zrok_interstitial: "true"
  }), [token]);

  const fetchDocumentTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/master-data/document-types?active_only=false`, { headers });
      setDocumentTypes(res.data || []);
    } catch (err) {
      console.error("Failed to load document types:", err);
      toast.error("Failed to load document types.");
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setCode("");
    setName("");
    setDescription("");
    setApplicableSpaces(["ORDER"]);
    setDisplayOrder(10);
    setIsActive(true);
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setDescription(item.description || "");
    setApplicableSpaces(Array.isArray(item.applicable_spaces) ? item.applicable_spaces : []);
    setDisplayOrder(item.display_order ?? 10);
    setIsActive(item.is_active ?? true);
    setFormError("");
    setShowModal(true);
  };

  const toggleSpaceSelection = (spaceId) => {
    setApplicableSpaces((prev) => {
      if (prev.includes(spaceId)) {
        return prev.filter((s) => s !== spaceId);
      } else {
        return [...prev, spaceId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Document type name is required.");
      return;
    }
    if (!code.trim()) {
      setFormError("System code identifier is required.");
      return;
    }
    if (applicableSpaces.length === 0) {
      setFormError("Please select at least one applicable procurement space.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const payload = {
      code: code.trim().toLowerCase().replace(/\s+/g, "_"),
      name: name.trim(),
      description: description.trim() || null,
      applicable_spaces: applicableSpaces,
      display_order: parseInt(displayOrder, 10) || 0,
      is_active: isActive,
    };

    try {
      if (editingItem) {
        await axios.put(`${process.env.REACT_APP_NETWORK}/master-data/document-types/${editingItem.id}`, payload, { headers });
        toast.success(`Document type "${payload.name}" updated successfully.`);
      } else {
        await axios.post(`${process.env.REACT_APP_NETWORK}/master-data/document-types`, payload, { headers });
        toast.success(`Document type "${payload.name}" created successfully.`);
      }
      setShowModal(false);
      fetchDocumentTypes();
    } catch (err) {
      console.error("Save document type error:", err);
      const detail = err.response?.data?.detail || "Failed to save document type.";
      setFormError(detail);
      toast.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? Existing files already attached under this type will remain in storage.`)) {
      return;
    }
    try {
      await axios.delete(`${process.env.REACT_APP_NETWORK}/master-data/document-types/${item.id}`, { headers });
      toast.success(`Document type "${item.name}" deleted.`);
      fetchDocumentTypes();
    } catch (err) {
      console.error("Delete document type error:", err);
      toast.error(err.response?.data?.detail || "Failed to delete document type.");
    }
  };

  const filteredTypes = useMemo(() => {
    return documentTypes.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpace =
        selectedSpaceFilter === "ALL" ||
        (Array.isArray(d.applicable_spaces) && d.applicable_spaces.includes(selectedSpaceFilter));

      return matchesSearch && matchesSpace;
    });
  }, [documentTypes, searchQuery, selectedSpaceFilter]);

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 ${isDark ? "text-slate-100" : "text-slate-800"}`}>
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5 border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-500" />
            <span>Document Types Reference Data</span>
          </h1>
          <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
            Define system document categories and assign them to specific procurement spaces (Sourcing, Orders, Payments, Shipping, Defects).
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Document Type</span>
        </button>
      </div>

      {/* ── CONTROLS: SPACE TABS & SEARCH ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Space Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSelectedSpaceFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedSpaceFilter === "ALL"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Spaces ({documentTypes.length})
          </button>
          {AVAILABLE_SPACES.map((space) => {
            const count = documentTypes.filter((d) => Array.isArray(d.applicable_spaces) && d.applicable_spaces.includes(space.id)).length;
            const isSelected = selectedSpaceFilter === space.id;
            return (
              <button
                key={space.id}
                onClick={() => setSelectedSpaceFilter(space.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {space.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, label, or hint..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition ${
              isDark
                ? "bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500"
                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
            }`}
          />
        </div>
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden shadow-xs ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-sm text-slate-500">Loading document types...</p>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-base font-semibold">No document types found</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || selectedSpaceFilter !== "ALL"
                ? "Try clearing filters to see all document types."
                : "Get started by adding your first document type."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className={`border-b text-xs uppercase font-bold tracking-wider ${
                  isDark ? "bg-slate-800/50 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                }`}>
                  <th className="py-3.5 px-4 w-16">Order</th>
                  <th className="py-3.5 px-4">Document Type</th>
                  <th className="py-3.5 px-4">System Code</th>
                  <th className="py-3.5 px-4">Applicable Spaces</th>
                  <th className="py-3.5 px-4 w-24">Status</th>
                  <th className="py-3.5 px-4 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTypes.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      {row.display_order ?? "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {row.name}
                      </div>
                      {row.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                          {row.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {row.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {(row.applicable_spaces || []).map((spaceId) => {
                          const meta = AVAILABLE_SPACES.find((s) => s.id === spaceId);
                          return (
                            <span
                              key={spaceId}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                meta?.color || "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              <Tag className="w-3 h-3" />
                              <span>{meta?.label || spaceId}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(row)}
                          title="Edit Document Type"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          title="Delete Document Type"
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-lg rounded-2xl p-6 shadow-2xl border ${
            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-emerald-500" />
              <span>{editingItem ? "Edit Document Type" : "New Document Type"}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Specify the system code, display name, and select which procurement areas have access to this document type.
            </p>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-slate-600 dark:text-slate-300">
                  Document Type Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingItem && !code) {
                      setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
                    }
                  }}
                  placeholder="e.g. Bank Swift MT103 Slip"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-slate-600 dark:text-slate-300">
                    System Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    placeholder="e.g. payment_proof"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-slate-600 dark:text-slate-300">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-slate-600 dark:text-slate-300">
                  Description / Guidance Hint
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional hint for users explaining what file to upload here..."
                  className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {/* Space Selection Pills */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-600 dark:text-slate-300">
                  Included In Procurement Spaces *
                </label>
                <div className="space-y-2">
                  {AVAILABLE_SPACES.map((space) => {
                    const isSelected = applicableSpaces.includes(space.id);
                    return (
                      <div
                        key={space.id}
                        onClick={() => toggleSpaceSelection(space.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition ${
                          isSelected
                            ? "border-emerald-500/60 bg-emerald-50/50 dark:bg-emerald-950/20"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {space.label}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Tag: <code className="font-mono">{space.id}</code>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-semibold cursor-pointer">
                  Active (available for selection in workflows)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? "Update Document Type" : "Create Document Type"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
