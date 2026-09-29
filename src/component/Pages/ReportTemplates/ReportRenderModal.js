import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Printer,
  Download,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

export default function ReportRenderModal({
  isOpen,
  onClose,
  templateId = null,
  templateSlug = null,
  resolverKey = null,
  entityId = null,
  entityType = null,
}) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);

  // Template selection state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templateId);

  // Entity selection state
  const [selectedEntityId, setSelectedEntityId] = useState(entityId || "");
  const [recentEntities, setRecentEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Multi-page & Preview Geometry State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [previewMode, setPreviewMode] = useState("continuous"); // 'continuous' | 'paged'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const iframeRef = useRef(null);

  // Headers helper
  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const isLandscape = selectedTemplate?.orientation?.toLowerCase() === "landscape";
  const pageHeightPx = isLandscape ? 794 : 1123;
  const pageWidthPx = isLandscape ? 1123 : 794;

  // Listen to message from preview iframe about detected page count
  useEffect(() => {
    const handleMsg = (e) => {
      if (e.data && e.data.type === "DOC_PREVIEW_PAGES") {
        const pages = Math.max(1, e.data.pages || 1);
        setTotalPages(pages);
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  // 1. Fetch available templates if not locked to a specific template
  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_NETWORK}/reports/templates?limit=100&template_type=DOCUMENT`,
          { headers: getHeaders() }
        );
        const allTemplates = res.data?.items || [];
        setTemplates(allTemplates);

        if (templateId) {
          setSelectedTemplateId(templateId);
        } else if (templateSlug) {
          const match = allTemplates.find((t) => t.slug === templateSlug);
          if (match) setSelectedTemplateId(match.id);
        } else if (resolverKey) {
          const matching = allTemplates.filter((t) => t.resolver_key === resolverKey);
          if (matching.length > 0) setSelectedTemplateId(matching[0].id);
        } else if (allTemplates.length > 0) {
          setSelectedTemplateId(allTemplates[0].id);
        }
      } catch (err) {
        console.error("Failed to load templates:", err);
      }
    };

    fetchTemplates();
  }, [isOpen, templateId, templateSlug, resolverKey]);

  // 2. Fetch recent entities based on the selected template's resolver
  useEffect(() => {
    if (!isOpen || !selectedTemplateId) return;

    const selectedTmpl = templates.find((t) => t.id === selectedTemplateId);
    const key = selectedTmpl?.resolver_key || resolverKey;

    if (!key) return;

    const fetchEntities = async () => {
      setLoadingEntities(true);
      try {
        if (key === "purchase_order" || key === "sourcing_rfq" || key === "quote_comparison") {
          const res = await axios.get(
            `${process.env.REACT_APP_NETWORK}/orders?limit=30`,
            { headers: getHeaders() }
          );
          const orders = res.data?.orders || res.data?.items || [];
          setRecentEntities(
            orders.map((o) => ({
              id: o.id,
              label: `${o.po_number || "Order #" + o.id} — ${o.status || ""} (${o.supplier_name || o.company || "Supplier"})`,
            }))
          );
          if (!selectedEntityId && orders.length > 0) {
            setSelectedEntityId(orders[0].id);
          }
        } else if (key === "defect_report") {
          const res = await axios.get(
            `${process.env.REACT_APP_NETWORK}/defects?limit=25`,
            { headers: getHeaders() }
          );
          const defects = res.data?.items || res.data || [];
          setRecentEntities(
            defects.map((d) => ({
              id: d.id,
              label: `${d.defect_number || "DEF #" + d.id} — ${d.title || d.category}`,
            }))
          );
          if (!selectedEntityId && defects.length > 0) {
            setSelectedEntityId(defects[0].id);
          }
        } else if (key === "bl_summary") {
          const res = await axios.get(
            `${process.env.REACT_APP_NETWORK}/billOfLanding?limit=25`,
            { headers: getHeaders() }
          );
          const bls = res.data?.items || res.data || [];
          setRecentEntities(
            bls.map((b) => ({
              id: b.BillOfLanding || b.id,
              label: `${b.BillOfLanding} — Carrier: ${b.carrier_name || "N/A"}`,
            }))
          );
          if (!selectedEntityId && bls.length > 0) {
            setSelectedEntityId(bls[0].BillOfLanding || bls[0].id);
          }
        } else if (key === "container_details") {
          const res = await axios.get(
            `${process.env.REACT_APP_NETWORK}/containers?limit=25`,
            { headers: getHeaders() }
          );
          const cntrs = res.data?.items || res.data || [];
          setRecentEntities(
            cntrs.map((c) => ({
              id: c.Container_ID || c.id || c.container_no,
              label: `${c.Container_No || c.container_no} — B/L: ${c.BillOfLanding || "N/A"}`,
            }))
          );
          if (!selectedEntityId && cntrs.length > 0) {
            setSelectedEntityId(cntrs[0].Container_ID || cntrs[0].id || cntrs[0].container_no);
          }
        }
      } catch (e) {
        console.warn("Could not auto-fetch entities for selector:", e);
      } finally {
        setLoadingEntities(false);
      }
    };

    fetchEntities();
  }, [isOpen, selectedTemplateId, templates, resolverKey]);

  // 3. Auto-load preview when template and entity are chosen
  useEffect(() => {
    if (isOpen && selectedTemplateId && selectedEntityId) {
      handleGeneratePreview();
    }
  }, [isOpen, selectedTemplateId, selectedEntityId]);

  const handleGeneratePreview = async () => {
    if (!selectedTemplateId) return;
    setLoading(true);
    setCurrentPage(1);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/render/preview`,
        {
          template_id: selectedTemplateId,
          entity_id: selectedEntityId || 0,
        },
        { headers: getHeaders() }
      );
      setPreviewHtml(res.data?.html || "");
    } catch (err) {
      console.error("Preview render failed:", err);
      toast.error(err.response?.data?.detail || "Failed to render document preview.");
    } finally {
      setLoading(false);
    }
  };

  // Inject page break indicators, sheet styling, and page detection into HTML
  const enhancedHtml = useMemo(() => {
    if (!previewHtml) return "";

    const injector = `
      <style id="preview-page-break-styles">
        @media screen {
          html {
            background-color: #f1f5f9 !important;
            padding: 16px 0 !important;
            min-height: 100% !important;
            box-sizing: border-box !important;
          }
          body {
            background: #ffffff !important;
            width: ${pageWidthPx}px !important;
            min-height: ${pageHeightPx}px !important;
            margin: 0 auto !important;
            padding: 15mm !important;
            box-sizing: border-box !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
            position: relative !important;
          }
          .preview-page-break-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: repeating-linear-gradient(90deg, #94a3b8 0, #94a3b8 6px, transparent 6px, transparent 12px);
            z-index: 9999;
            pointer-events: none;
          }
          .preview-page-break-badge {
            position: absolute;
            right: 16px;
            top: -10px;
            background: #475569;
            color: #ffffff;
            font-size: 9px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-weight: 700;
            padding: 2px 10px;
            border-radius: 9999px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            letter-spacing: 0.3px;
          }
        }
      </style>
      <script>
        window.addEventListener('load', function() {
          try {
            var pageH = ${pageHeightPx};
            var bodyH = document.body.scrollHeight;
            var pages = Math.max(1, Math.ceil(bodyH / pageH));
            for (var p = 1; p < pages; p++) {
              var marker = document.createElement('div');
              marker.className = 'preview-page-break-line';
              marker.style.top = (p * pageH) + 'px';
              var badge = document.createElement('span');
              badge.className = 'preview-page-break-badge';
              badge.innerText = 'Page ' + p + ' / Page ' + (p + 1) + ' Break';
              marker.appendChild(badge);
              document.body.appendChild(marker);
            }
            window.parent.postMessage({ type: 'DOC_PREVIEW_PAGES', pages: pages, pageHeight: pageH }, '*');
          } catch(e) { console.error('Preview measurement failed', e); }
        });
      </script>
    `;

    if (previewHtml.includes("</head>")) {
      return previewHtml.replace("</head>", `${injector}</head>`);
    }
    return injector + previewHtml;
  }, [previewHtml, pageWidthPx, pageHeightPx]);

  // 4. Download PDF Stream
  const handleDownloadPdf = async () => {
    if (!selectedTemplateId || !selectedEntityId) {
      toast.warning("Please select a document/entity to render.");
      return;
    }
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/render`,
        {
          template_id: selectedTemplateId,
          entity_id: selectedEntityId,
          format: "pdf",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          responseType: "blob",
        }
      );

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const tmpl = templates.find((t) => t.id === selectedTemplateId);
      const slug = tmpl?.slug || "report";

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${slug}_${selectedEntityId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully.");
    } catch (err) {
      console.error("PDF download failed:", err);
      toast.error("Failed to generate and download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  // 5. Native Print Action via iframe
  const handlePrint = () => {
    if (!iframeRef.current) return;
    try {
      const iframeWindow =
        iframeRef.current.contentWindow || iframeRef.current;
      iframeWindow.focus();
      iframeWindow.print();
    } catch (e) {
      console.error("Print trigger failed:", e);
      toast.error("Unable to launch print dialog. Please download the PDF instead.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Printer size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedTemplate?.name || "Report & Print Studio"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate high-fidelity PDFs and print directly using WeasyPrint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-sm shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[320px]">
            {/* Template Dropdown */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Print Template
              </label>
              <select
                value={selectedTemplateId || ""}
                onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 max-w-[240px]"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Record Dropdown / Input */}
            <div className="flex flex-col gap-0.5 flex-1 max-w-xs">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Select Record</span>
                {loadingEntities && <span className="text-[10px] text-indigo-500 font-normal lowercase">(loading...)</span>}
              </label>
              {recentEntities.length > 0 ? (
                <select
                  value={selectedEntityId || ""}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {recentEntities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Record ID or Reference (e.g. 42)"
                  value={selectedEntityId || ""}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Refresh preview button */}
            <button
              onClick={handleGeneratePreview}
              disabled={loading}
              title="Refresh Preview"
              className="mt-3.5 p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Center Mode Controls & Zoom */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewMode("continuous")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  previewMode === "continuous"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Continuous Sheets: Scroll through all pages with visible sheet boundaries"
              >
                <Layers size={13} />
                <span>Continuous</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("paged")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  previewMode === "paged"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Paged View: View one page at a time with Prev / Next navigation"
              >
                <FileText size={13} />
                <span>Paged</span>
              </button>
            </div>

            {/* Paged Navigation Bar */}
            {previewMode === "paged" && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] font-mono font-semibold px-1 text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-slate-500 cursor-pointer"
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
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-slate-500 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition text-slate-500 ml-0.5 cursor-pointer"
                title="Reset Zoom"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* Action Buttons: Print & Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !previewHtml}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {downloading ? "Rendering PDF..." : "Download PDF"}
            </button>
          </div>
        </div>

        {/* Live Preview Document Area */}
        <div className="flex-1 bg-slate-200/80 dark:bg-slate-950 p-4 overflow-auto flex items-start justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500 my-auto">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Rendering document preview...</p>
            </div>
          ) : previewHtml ? (
            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
                width: `${pageWidthPx + 32}px`,
                ...(previewMode === "paged"
                  ? {
                      height: `${pageHeightPx}px`,
                      overflow: "hidden",
                    }
                  : {}),
              }}
              className="shadow-2xl rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 my-2"
            >
              <div
                style={{
                  transform: previewMode === "paged" ? `translateY(-${(currentPage - 1) * pageHeightPx}px)` : "none",
                  transition: "transform 0.2s ease-in-out",
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="Report Document Preview"
                  srcDoc={enhancedHtml}
                  className="border-0 bg-white"
                  style={{
                    width: `${pageWidthPx + 32}px`,
                    height: `${Math.max(pageHeightPx, totalPages * pageHeightPx + 40)}px`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 max-w-sm my-auto">
              <AlertCircle size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No Preview Available
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select a valid record above or click Refresh to generate the document.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
