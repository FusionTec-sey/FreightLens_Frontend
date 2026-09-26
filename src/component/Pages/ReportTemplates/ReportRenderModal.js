import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Printer,
  Download,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
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

  const iframeRef = useRef(null);

  // Headers helper
  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // 1. Fetch available templates if not locked to a specific template
  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_NETWORK}/reports/templates?limit=100`,
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
        if (key === "purchase_order") {
          const res = await axios.get(
            `${process.env.REACT_APP_NETWORK}/orders?limit=25`,
            { headers: getHeaders() }
          );
          const orders = res.data?.orders || res.data?.items || [];
          setRecentEntities(
            orders.map((o) => ({
              id: o.id,
              label: `${o.po_number || "PO #" + o.id} — ${o.status || ""} (${o.supplier_name || o.company || "Supplier"})`,
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

  const currentTmpl = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Printer size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {currentTmpl?.name || "Report & Print Studio"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate high-fidelity PDFs and print directly using WeasyPrint
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {/* Template Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Print Template
              </label>
              <select
                value={selectedTemplateId || ""}
                onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category}) {t.is_system ? "• Default" : "• Custom"}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Record Dropdown / Input */}
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
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
              className="mt-4 p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Action Buttons: Print & Download */}
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
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
        <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-6 overflow-y-auto flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Rendering document preview...</p>
            </div>
          ) : previewHtml ? (
            <div className="w-full max-w-[850px] h-full bg-white shadow-xl rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800 flex flex-col">
              <iframe
                ref={iframeRef}
                title="Report Document Preview"
                srcDoc={previewHtml}
                className="w-full h-full border-none bg-white"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 max-w-sm">
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
