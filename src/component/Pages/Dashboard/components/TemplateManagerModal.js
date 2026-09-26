import React, { useState } from "react";
import { X, Save, ShieldCheck } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const AVAILABLE_ROLES = [
  "Administrator",
  "Director",
  "General_Manager",
  "Inventory_Manager",
  "Logistics_Operator",
  "Procurement_Officer",
  "Operations_Manager",
  "Auditor_ReadOnly",
  "Store_User",
  "Standard_User",
];

export default function TemplateManagerModal({
  currentWidgets,
  isDark,
  onClose,
  onTemplateCreated,
}) {
  const [templateName, setTemplateName] = useState("");
  const [targetRole, setTargetRole] = useState("Administrator");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/dashboard/templates`,
        {
          name: templateName.trim(),
          role_name: targetRole,
          description: description.trim() || undefined,
          is_default: isDefault,
          widgets: currentWidgets.map((w) => ({
            id: w.id,
            col_span: w.col_span || 1,
            visible: w.visible !== false,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Template '${templateName}' saved successfully!`);
      onTemplateCreated();
      onClose();
    } catch (err) {
      console.error("Failed to save template:", err);
      toast.error(err.response?.data?.detail || "Failed to save dashboard template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black">Publish Role Template</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Save current layout as a shared default for team members.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveTemplate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Warehouse Fleet Operations"
              className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Target Role *</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
              }`}
            >
              {AVAILABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              Users assigned to this role will default to this dashboard configuration.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what key metrics this template prioritizes..."
              className={`w-full px-3.5 py-2 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
              }`}
            />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <div>
              <div className="text-xs font-bold">Set as Default Role Template</div>
              <div className="text-[10px] text-slate-400">
                New users in this role will automatically receive this layout.
              </div>
            </div>
          </label>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <Save size={14} />
              <span>{isSubmitting ? "Publishing..." : "Publish Template"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
