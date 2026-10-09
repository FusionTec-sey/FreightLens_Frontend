import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Printer,
  Download,
  X,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
  Lock,
  ExternalLink,
  RefreshCw,
  Star,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

// Turn any FastAPI error body into readable text (detail may be a string,
// an object, or a list of validation errors).
const errorText = async (err) => {
  let data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch (e) {
      data = null;
    }
  }
  const detail = data?.detail;
  if (!detail) return err?.message || "Unknown error";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${(d.loc || []).slice(-1)[0] || "field"}: ${d.msg}`).join("; ");
  }
  if (typeof detail === "object") return detail.message || JSON.stringify(detail);
  return String(detail);
};

// Pick the template a user most likely wants: the org default first, then a
// template made for this exact entity type, then the first in the list.
const pickDefaultTemplate = (list, entityType) => {
  if (!list.length) return null;
  return (
    list.find((t) => t.is_default_for_org) ||
    list.find((t) => t.entity_type === entityType && !t.is_system) ||
    list.find((t) => t.entity_type === entityType) ||
    list[0]
  );
};

export default function EntityPrintModal({
  isOpen,
  onClose,
  entityType = "PurchaseOrder",
  entityId,
  entityIdentifier = "",
  entityOrgId = null,
  title = "Print Document",
}) {
  const navigate = useNavigate();
  const { selectedOrgId, orgId } = useAuth();

  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const [renderingPdf, setRenderingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [renderError, setRenderError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const iframeRef = useRef(null);

  // A document is always printed for exactly one organisation. Use the
  // organisation chosen in the top bar, else the record's own organisation,
  // else the user's home organisation.
  const printOrgId = selectedOrgId || entityOrgId || orgId || null;

  const requestHeaders = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (printOrgId) headers["X-Active-Org"] = String(printOrgId);
    return headers;
  }, [printOrgId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // Release the previous PDF object URL whenever a new one replaces it.
  useEffect(() => {
    return () => {
      if (pdfUrl) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // 1. Load the templates active for this entity type in the print organisation.
  useEffect(() => {
    if (!isOpen || !entityType) return;

    setLoadingTemplates(true);
    setTemplates([]);
    setSelectedTemplateId(null);
    setPdfUrl(null);
    setRenderError(null);

    axios
      .get(`${process.env.REACT_APP_NETWORK}/reports/templates/by-entity`, {
        params: { entity_type: entityType, template_type: "DOCUMENT" },
        headers: requestHeaders,
      })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setTemplates(list);
        const preferred = pickDefaultTemplate(list, entityType);
        setSelectedTemplateId(preferred ? preferred.id : null);
      })
      .catch(async (err) => {
        console.error("Failed to load print templates:", err);
        toast.error(`Failed to load print templates: ${await errorText(err)}`);
      })
      .finally(() => setLoadingTemplates(false));
  }, [isOpen, entityType, requestHeaders]);

  // 2. Render the real PDF (the same file that will be printed or downloaded).
  useEffect(() => {
    if (!isOpen || !selectedTemplateId || entityId === undefined || entityId === null || entityId === "") {
      return;
    }

    let cancelled = false;
    setRenderingPdf(true);
    setRenderError(null);

    axios
      .post(
        `${process.env.REACT_APP_NETWORK}/reports/render`,
        { template_id: selectedTemplateId, entity_id: entityId, format: "pdf" },
        { headers: requestHeaders, responseType: "blob" }
      )
      .then((res) => {
        if (cancelled) return;
        const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        setPdfUrl(url);
      })
      .catch(async (err) => {
        if (cancelled) return;
        console.error("Document render failed:", err);
        setPdfUrl(null);
        setRenderError(await errorText(err));
      })
      .finally(() => {
        if (!cancelled) setRenderingPdf(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedTemplateId, entityId, requestHeaders, reloadKey]);

  const fileName = useMemo(() => {
    const slug = selectedTemplate?.slug || String(entityType).toLowerCase();
    return `${slug}_${entityIdentifier || entityId}.pdf`;
  }, [selectedTemplate, entityType, entityIdentifier, entityId]);

  // Print the PDF shown in the preview. The iframe shows a blob: URL created by
  // this page, so it is same-origin and the browser allows print() on it.
  const handlePrint = useCallback(() => {
    if (!pdfUrl) return;
    try {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow) throw new Error("Preview frame is not ready");
      frameWindow.focus();
      frameWindow.print();
    } catch (err) {
      // Some browsers block print() on embedded PDFs; open the PDF in a new tab
      // where the browser's own print button is available.
      console.warn("Embedded print blocked, opening PDF in a new tab:", err);
      const opened = window.open(pdfUrl, "_blank");
      if (!opened) toast.info("Allow pop-ups for this site to print, or use Download PDF.");
    }
  }, [pdfUrl]);

  const handleDownload = useCallback(() => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [pdfUrl, fileName]);

  if (!isOpen) return null;

  const goToLibrary = () => {
    onClose();
    navigate("/reports");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 h-[92vh]">
        {/* Header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase">
                  {entityType}
                </span>
                {entityIdentifier && (
                  <span className="text-xs font-mono text-slate-300 font-semibold">{entityIdentifier}</span>
                )}
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">{title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Template list */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Templates ({templates.length})
              </span>
              <button
                onClick={goToLibrary}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                title="Manage templates in the library"
              >
                <span>Library</span>
                <ExternalLink size={11} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingTemplates ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                  <span className="text-xs">Loading templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle size={15} />
                    <span>No active templates</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    Activate a template for <strong>{entityType}</strong> in the Template Library for this organisation.
                  </p>
                  <button
                    onClick={goToLibrary}
                    className="w-full mt-2 py-2 px-3 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition flex items-center justify-center gap-1.5"
                  >
                    <span>Open Template Library</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              ) : (
                templates.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm"
                          : "bg-white/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="template_select"
                        checked={isSelected}
                        onChange={() => setSelectedTemplateId(tmpl.id)}
                        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{tmpl.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {tmpl.active_version_number ? `v${tmpl.active_version_number}` : "Draft"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {tmpl.description || "Document print layout."}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {tmpl.is_default_for_org && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Star size={9} /> Default
                            </span>
                          )}
                          {tmpl.is_system ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Lock size={9} /> System
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck size={9} /> Org custom
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tmpl.page_size} • {tmpl.orientation}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PDF preview: exactly the file that prints and downloads */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-200/60 dark:bg-slate-950">
            <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {selectedTemplate?.name || "Document preview"}
                {selectedTemplate && (
                  <span className="ml-2 font-mono font-normal text-slate-400">
                    ({selectedTemplate.page_size} {selectedTemplate.orientation})
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={!selectedTemplateId || renderingPdf}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-slate-500 disabled:opacity-40 cursor-pointer"
                title="Render again"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="flex-1 relative">
              {renderingPdf && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex flex-col items-center justify-center gap-2 z-10">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Generating PDF...</span>
                </div>
              )}

              {renderError ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="max-w-md text-center space-y-2">
                    <AlertCircle size={32} className="mx-auto text-rose-500" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Unable to generate this document</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{renderError}</p>
                  </div>
                </div>
              ) : pdfUrl ? (
                <iframe
                  ref={iframeRef}
                  title="Document preview"
                  src={pdfUrl}
                  className="w-full h-full border-0 bg-white"
                />
              ) : !renderingPdf ? (
                <div className="h-full flex items-center justify-center text-slate-400 p-8">
                  <div className="text-center">
                    <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">Select a template to preview.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!pdfUrl || renderingPdf}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-xl transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfUrl || renderingPdf}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
