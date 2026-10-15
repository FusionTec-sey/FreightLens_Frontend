import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, Download, FileText, Loader2, Lock, Printer, X } from "lucide-react";

/**
 * What a template actually looks like, before anyone has to print something to
 * find out.
 *
 * The hub listed names, paper sizes and version numbers -- nothing that told a
 * user whether "Standard Purchase Order" was the layout they wanted. Only
 * managers had any buttons at all, so a buyer could not look, and a manager
 * could only look by opening the designer, which is not a thing to hand someone
 * who just wants to see the form.
 *
 * The preview endpoint renders the template's published version against the
 * resolver's sample data, so no real order is needed and no permission beyond
 * being signed in: reading a blank form is not reading anyone's data.
 */
export default function TemplatePreviewModal({ template, isDark = false, onClose, onEdit, canEdit = false }) {
  const api = process.env.REACT_APP_NETWORK;
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const headers = useCallback(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, []);

  const load = useCallback(async () => {
    if (!template?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(
        `${api}/reports/render/preview`,
        { template_id: template.id, format: "html" },
        { headers: headers() }
      );
      setHtml(res.data?.html || "");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : detail?.message || "This template could not be rendered. It may have no published version yet."
      );
    } finally {
      setLoading(false);
    }
  }, [api, headers, template]);

  useEffect(() => { load(); }, [load]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await axios.post(
        `${api}/reports/render/preview`,
        { template_id: template.id, format: "pdf" },
        { headers: headers(), responseType: "blob" }
      );
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(template.name || "template").replace(/[^\w.-]+/g, "_")}-sample.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("The PDF could not be produced. The HTML preview above is still the layout.");
    } finally {
      setDownloading(false);
    }
  };

  // Printed from the frame, so what goes to the printer is the document rather
  // than the application around it.
  const printIt = () => {
    const frame = document.getElementById("template-preview-frame");
    try {
      frame?.contentWindow?.focus();
      frame?.contentWindow?.print();
    } catch {
      setError("The browser would not open the print dialog for this frame.");
    }
  };

  if (!template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6">
      <div className={`w-full max-w-5xl h-full max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${isDark
        ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}>

        <div className={`px-5 py-3.5 border-b flex items-start justify-between gap-3 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText size={15} className="text-indigo-500 shrink-0" />
              <h2 className="text-sm font-bold truncate">{template.name}</h2>
              {template.is_system && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Lock size={8} /> SYSTEM DEFAULT
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {[template.page_size, template.orientation, template.entity_type].filter(Boolean).join(" · ")}
              {" · sample data, not a real record"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={printIt}
              disabled={loading || Boolean(error)}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5"
            >
              <Printer size={12} /> Print
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={loading || downloading || Boolean(error)}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1.5"
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
            </button>
            {canEdit && !template.is_system && (
              <button
                type="button"
                onClick={() => onEdit?.(template)}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Edit layout
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-auto ${isDark ? "bg-slate-950" : "bg-slate-100"} p-3 sm:p-5`}>
          {loading && (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 gap-2">
              <Loader2 size={15} className="animate-spin text-indigo-500" />
              Rendering the template…
            </div>
          )}

          {!loading && error && (
            <div className="max-w-xl mx-auto mt-10 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
              <p className="flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            </div>
          )}

          {!loading && !error && (
            <iframe
              id="template-preview-frame"
              title={`Preview of ${template.name}`}
              srcDoc={html}
              // Scripts stay off: a template is a document, and a preview must
              // not be a way to run anything in the application's origin.
              sandbox=""
              className="w-full h-full min-h-[70vh] bg-white rounded-lg shadow-xs border border-slate-200 dark:border-slate-800"
            />
          )}
        </div>

        {template.is_system && (
          <div className={`px-5 py-2.5 border-t text-[11px] text-slate-500 dark:text-slate-400 ${isDark ? "border-slate-800" : "border-slate-200"}`}>
            A system default cannot be edited — clone it first, and the copy belongs to this company.
          </div>
        )}
      </div>
    </div>
  );
}
