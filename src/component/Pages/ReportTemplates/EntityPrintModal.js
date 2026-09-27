import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Printer,
  Download,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  ShieldCheck,
  Lock,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

export default function EntityPrintModal({
  isOpen,
  onClose,
  entityType = "PurchaseOrder",
  entityId,
  entityIdentifier = "",
  title = "Print Document",
}) {
  const navigate = useNavigate();
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const [renderingPreview, setRenderingPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(100);
  const iframeRef = useRef(null);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // 1. Fetch active templates for this specific entity type
  useEffect(() => {
    if (!isOpen || !entityType) return;

    setLoadingTemplates(true);
    setPreviewHtml(null);
    setTemplates([]);
    setSelectedTemplateId(null);

    axios
      .get(
        `${process.env.REACT_APP_NETWORK}/reports/templates/by-entity?entity_type=${entityType}&template_type=DOCUMENT`,
        { headers: getHeaders() }
      )
      .then((res) => {
        const activeList = res.data || [];
        setTemplates(activeList);
        if (activeList.length > 0) {
          setSelectedTemplateId(activeList[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load active templates for entity:", err);
        toast.error("Failed to load active print templates.");
      })
      .finally(() => {
        setLoadingTemplates(false);
      });
  }, [isOpen, entityType]);

  // 2. Fetch live HTML preview when template or entityId changes
  useEffect(() => {
    if (!isOpen || !selectedTemplateId || !entityId) return;

    setRenderingPreview(true);
    axios
      .post(
        `${process.env.REACT_APP_NETWORK}/reports/render`,
        {
          template_id: selectedTemplateId,
          entity_id: entityId,
          format: "html",
        },
        { headers: getHeaders() }
      )
      .then((res) => {
        setPreviewHtml(res.data);
      })
      .catch((err) => {
        console.error("Preview render failed:", err);
        setPreviewHtml(
          `<div style="padding: 40px; font-family: sans-serif; text-align: center; color: #e11d48;">
            <h3>Unable to render live preview</h3>
            <p style="font-size: 13px; color: #64748b;">${err.response?.data?.detail || err.message}</p>
          </div>`
        );
      })
      .finally(() => {
        setRenderingPreview(false);
      });
  }, [isOpen, selectedTemplateId, entityId]);

  if (!isOpen) return null;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Direct Print via hidden iframe
  const handleDirectPrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.error("Direct print failed:", err);
        handleDownloadPdf();
      }
    } else {
      handleDownloadPdf();
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!selectedTemplateId || !entityId) return;
    setDownloadingPdf(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/render`,
        {
          template_id: selectedTemplateId,
          entity_id: entityId,
          format: "pdf",
        },
        {
          headers: getHeaders(),
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      const docSlug = selectedTemplate?.slug || entityType.toLowerCase();
      link.setAttribute("download", `${docSlug}_${entityIdentifier || entityId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF generated and downloaded successfully.");
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate PDF document.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 h-[92vh]">
        
        {/* Top Header Bar */}
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
                  <span className="text-xs font-mono text-slate-300 font-semibold">
                    {entityIdentifier}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two-Pane Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* ── Left Pane (30%): Template Picker List ───────────────────── */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Active Templates ({templates.length})
              </span>
              <button
                onClick={() => {
                  onClose();
                  navigate("/reports");
                }}
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
                  <span className="text-xs">Loading active templates...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle size={15} />
                    <span>No Active Templates</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    Default templates only appear here once <strong>activated in the Template Library</strong> for your organization.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/reports");
                    }}
                    className="w-full mt-2 py-2 px-3 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>Activate in Template Library</span>
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
                      {/* Left Radio Selector */}
                      <input
                        type="radio"
                        name="template_select"
                        checked={isSelected}
                        onChange={() => setSelectedTemplateId(tmpl.id)}
                        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {tmpl.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            v{tmpl.active_version || 1}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {tmpl.description || "Official document print layout."}
                        </p>

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {tmpl.is_system ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Lock size={9} /> Default (Active)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck size={9} /> Org Custom
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

          {/* ── Right Pane (70%): Live Interactive Preview ──────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-200/60 dark:bg-slate-950">
            {/* Preview Toolbar */}
            <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedTemplate?.name || "Document Preview"}
                </span>
                {selectedTemplate && (
                  <span className="text-[11px] font-mono text-slate-400">
                    ({selectedTemplate.page_size} {selectedTemplate.orientation})
                  </span>
                )}
              </div>

              {/* Zoom & Refresh Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-slate-500"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[11px] font-mono px-1 font-semibold text-slate-700 dark:text-slate-300">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-slate-500"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-slate-500 ml-1"
                  title="Reset Zoom"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Preview Frame Area */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative">
              {renderingPreview ? (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 z-10">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Rendering live document preview...
                  </span>
                </div>
              ) : null}

              {previewHtml ? (
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="shadow-xl rounded-lg bg-white overflow-hidden border border-slate-300 dark:border-slate-700"
                >
                  <iframe
                    ref={iframeRef}
                    title="Live Document Preview"
                    srcDoc={previewHtml}
                    className="w-[210mm] min-h-[297mm] bg-white border-0"
                  />
                </div>
              ) : !renderingPreview && templates.length === 0 ? (
                <div className="text-center text-slate-400 p-8">
                  <FileText size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">No active template selected to preview.</p>
                </div>
              ) : null}
            </div>
          </div>

        </div>

        {/* Modal Footer / Direct Action Bar */}
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
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || !selectedTemplateId || templates.length === 0}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition flex items-center gap-2 shadow-2xs disabled:opacity-40 cursor-pointer"
            >
              {downloadingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={!selectedTemplateId || templates.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Direct</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
