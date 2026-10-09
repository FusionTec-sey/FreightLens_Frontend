import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../../../context/AuthContext";
import { errorText } from "../../../utils/apiError";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  Eye,
  Save,
  Rocket,
  Code2,
  Palette,
  Layout,
  HelpCircle,
  Copy,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Check,
} from "lucide-react";

export default function ReportTemplateEditorPage() {
  const { selectedOrgId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  // Template metadata
  const [templateName, setTemplateName] = useState("");
  const [templateSlug, setTemplateSlug] = useState("");
  const [resolverKey, setResolverKey] = useState("purchase_order");
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [isSystem, setIsSystem] = useState(false);
  const [activeVersionNumber, setActiveVersionNumber] = useState(null);
  const [draftVersionId, setDraftVersionId] = useState(null);
  const [lastSavedContent, setLastSavedContent] = useState(null);
  const [changelog, setChangelog] = useState("");

  // Code contents
  const [activeCodeTab, setActiveCodeTab] = useState("html"); // 'html' | 'css' | 'header' | 'footer' | 'vars'
  const [htmlContent, setHtmlContent] = useState("");
  const [cssContent, setCssContent] = useState("");
  const [headerHtml, setHeaderHtml] = useState("");
  const [footerHtml, setFooterHtml] = useState("");

  // Resolvers & Schema
  const [resolversList, setResolversList] = useState([]);
  const [resolverSchema, setResolverSchema] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Preview & Validation states
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEntityId, setPreviewEntityId] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(!isNew);

  const iframeRef = useRef(null);

  const serializeContent = () => JSON.stringify({
    html_content: htmlContent,
    css_content: cssContent,
    header_html: headerHtml,
    footer_html: footerHtml,
  });

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    // Without this the server falls back to the user's own company, so an admin
    // working in another one previewed that company's template against their
    // own data and branding.
    if (selectedOrgId) headers["X-Active-Org"] = String(selectedOrgId);
    return headers;
  };

  // 1. Fetch available resolvers list
  useEffect(() => {
    const fetchResolvers = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_NETWORK}/reports/resolvers`, {
          headers: getHeaders(),
        });
        setResolversList(res.data?.resolvers || []);
      } catch (err) {
        console.error("Failed to load resolvers:", err);
      }
    };
    fetchResolvers();
  }, []);

  // 2. Fetch resolver field schema when resolverKey changes
  useEffect(() => {
    if (!resolverKey) return;
    const fetchSchema = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_NETWORK}/reports/resolvers/${resolverKey}/schema`,
          { headers: getHeaders() }
        );
        setResolverSchema(res.data);
      } catch (err) {
        console.error("Failed to load resolver schema:", err);
      }
    };
    fetchSchema();
  }, [resolverKey]);

  // 3. If editing existing template, load its details and active version
  useEffect(() => {
    if (isNew) {
      setTemplateName("My Custom Report");
      setTemplateSlug("my_custom_report");
      setHtmlContent(`
<div class="report-box">
  <h1>{{ company.name }}</h1>
  <h2>REPORT: {{ po_number or defect_number or bl_number }}</h2>
  <hr/>
  <table class="styled-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>Qty</th>
      </tr>
    </thead>
    <tbody>
      {% for item in items %}
      <tr>
        <td>{{ loop.index }}</td>
        <td>{{ item.description or item.item_description }}</td>
        <td>{{ item.quantity_ordered or item.quantity_affected }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
`.trim());
      setCssContent(`
.report-box { font-family: -apple-system, sans-serif; color: #1e293b; }
.styled-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
.styled-table th { background: #f1f5f9; padding: 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
.styled-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
`.trim());
      setLoadingTemplate(false);
      return;
    }

    const loadTemplate = async () => {
      setLoadingTemplate(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_NETWORK}/reports/templates/${id}`,
          { headers: getHeaders() }
        );
        const tmpl = res.data;
        setTemplateName(tmpl.name);
        setTemplateSlug(tmpl.slug);
        setResolverKey(tmpl.resolver_key);
        setPageSize(tmpl.page_size || "A4");
        setOrientation(tmpl.orientation || "portrait");
        setIsSystem(tmpl.is_system);
        setActiveVersionNumber(tmpl.active_version_number || null);

        const ver = tmpl.active_version_data;
        if (ver) {
          setHtmlContent(ver.html_content || "");
          setCssContent(ver.css_content || "");
          setHeaderHtml(ver.header_html || "");
          setFooterHtml(ver.footer_html || "");
          setActiveVersionNumber(ver.version_number);
          setDraftVersionId(ver.status === "DRAFT" ? ver.id : null);
          setLastSavedContent(JSON.stringify({
            html_content: ver.html_content || "",
            css_content: ver.css_content || "",
            header_html: ver.header_html || "",
            footer_html: ver.footer_html || "",
          }));
        }
      } catch (err) {
        console.error("Failed to load template:", err);
        toast.error("Failed to load template details.");
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [id, isNew]);

  // 4. Handle Tab Key inside code textareas for 2-space indentation
  const handleKeyDown = (e, setter, val) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const updated = val.substring(0, start) + "  " + val.substring(end);
      setter(updated);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // 5. Run Syntax and Security Validation
  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/templates/validate`,
        {
          html_content: htmlContent,
          css_content: cssContent,
          header_html: headerHtml,
          footer_html: footerHtml,
          resolver_key: resolverKey,
        },
        { headers: getHeaders() }
      );
      setValidationResult(res.data);
      if (res.data.is_valid) {
        toast.success("Template syntax & security checks passed!");
      } else {
        toast.error(`Validation found ${res.data.errors.length} error(s).`);
      }
    } catch (err) {
      console.error("Validation error:", err);
      toast.error("Validation service error.");
    } finally {
      setValidating(false);
    }
  };

  // 6. Live Preview Rendering
  const handleRefreshPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/render/preview`,
        {
          html_content: htmlContent,
          css_content: cssContent,
          header_html: headerHtml,
          footer_html: footerHtml,
          resolver_key: resolverKey,
          // Sent as typed. Coercing with Number() turned a Bill of Lading
          // number into NaN, which serialised as null, which the server reads
          // as "use sample data" -- so the preview quietly showed mock records.
          entity_id: previewEntityId.trim() || 0,
          page_size: pageSize,
          orientation,
        },
        { headers: getHeaders() }
      );
      setPreviewHtml(res.data?.html || "");
    } catch (err) {
      console.error("Preview failed:", err);
      toast.error(await errorText(err, "Preview compilation failed."));
    } finally {
      setPreviewLoading(false);
    }
  };

  // Auto-render preview once initial template is loaded
  useEffect(() => {
    if (!loadingTemplate && htmlContent) {
      handleRefreshPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingTemplate]);

  // Page size and orientation change the page itself, so the preview is stale
  // the moment either does. Re-render rather than wait for a manual refresh.
  useEffect(() => {
    if (loadingTemplate || !htmlContent) return;
    handleRefreshPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, orientation]);

  // 7. Save Draft / Create Template
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const payload = {
          name: templateName,
          slug: templateSlug,
          resolver_key: resolverKey,
          template_type: "DOCUMENT",
          page_size: pageSize,
          orientation,
          initial_version: {
            html_content: htmlContent,
            css_content: cssContent,
            header_html: headerHtml,
            footer_html: footerHtml,
            changelog: changelog || "Initial draft",
          },
        };
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/reports/templates`,
          payload,
          { headers: getHeaders() }
        );
        toast.success("Custom template created successfully!");
        navigate(`/reports/editor/${res.data.id}`);
      } else {
        // Save new draft version for existing template
        const payload = {
          html_content: htmlContent,
          css_content: cssContent,
          header_html: headerHtml,
          footer_html: footerHtml,
          changelog: changelog || "Updated draft",
        };
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/reports/templates/${id}/versions`,
          payload,
          { headers: getHeaders() }
        );
        setDraftVersionId(res.data.id);
        setActiveVersionNumber(res.data.version_number);
        setLastSavedContent(serializeContent());
        toast.success(`Draft saved as version v${res.data.version_number}`);
      }
    } catch (err) {
      console.error("Save draft failed:", err);
      toast.error(err.response?.data?.detail?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // 8. Publish Active Version
  const handlePublish = async () => {
    if (isNew) {
      toast.info("Please save draft first before publishing.");
      return;
    }
    setPublishing(true);
    try {
      let version = draftVersionId && lastSavedContent === serializeContent()
        ? { id: draftVersionId, version_number: activeVersionNumber }
        : null;
      if (!version) {
        const verRes = await axios.post(
          `${process.env.REACT_APP_NETWORK}/reports/templates/${id}/versions`,
          {
            html_content: htmlContent,
            css_content: cssContent,
            header_html: headerHtml,
            footer_html: footerHtml,
            changelog: changelog || "Published update",
          },
          { headers: getHeaders() }
        );
        version = verRes.data;
      }

      await axios.put(
        `${process.env.REACT_APP_NETWORK}/reports/templates/${id}/versions/${version.id}/publish`,
        {},
        { headers: getHeaders() }
      );

      setActiveVersionNumber(version.version_number);
      setDraftVersionId(null);
      setLastSavedContent(serializeContent());
      toast.success(`Version v${version.version_number} is now LIVE and published!`);
    } catch (err) {
      console.error("Publish failed:", err);
      toast.error("Failed to publish version.");
    } finally {
      setPublishing(false);
    }
  };

  // 9. Download AI Context File
  const handleDownloadAiContext = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/resolvers/${resolverKey}/context-file`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );
      const blob = new Blob([res.data], { type: "text/markdown" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `freightlens_context_${resolverKey}.md`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("AI Developer Context (.md) downloaded.");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Could not download AI Context file.");
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (loadingTemplate) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={32} className="animate-spin text-indigo-600" />
          <p className="text-xs font-medium">Loading report template studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* ── Studio Header Bar ─────────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back button & Template Details */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/reports")}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              disabled={isSystem}
              placeholder="Template Name"
              className="text-base font-bold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-hidden text-slate-900 dark:text-white px-1 py-0.5"
            />
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {activeVersionNumber ? `v${activeVersionNumber}` : "Unsaved"} {isNew || draftVersionId ? "(Draft)" : "(Published)"}
            </span>
            {isSystem && (
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                System Template (Read Only)
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (AI Context, Validate, Save, Publish) */}
        <div className="flex items-center gap-2">
          {/* Download AI Context */}
          <button
            onClick={handleDownloadAiContext}
            title="Download AI Developer Context file to feed to ChatGPT / Claude"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={13} />
            AI Context (.md)
          </button>

          {/* Validate */}
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            {validating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            Validate
          </button>

          {/* Save Draft */}
          {!isSystem && (
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Draft
            </button>
          )}

          {/* Publish Version */}
          {!isSystem && !isNew && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              {publishing ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
              Publish Version
            </button>
          )}
        </div>
      </div>

      {/* ── Sub Header / Template Settings ─────────────────────────────── */}
      <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Resolver Key */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Resolver:</span>
            <select
              value={resolverKey}
              onChange={(e) => setResolverKey(e.target.value)}
              disabled={!isNew}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono text-[11px]"
            >
              {resolversList.map((r) => (
                <option key={r.resolver_key} value={r.resolver_key}>
                  {r.name} ({r.resolver_key})
                </option>
              ))}
            </select>
          </div>

          {/* Paper Size */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Size:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-[11px]"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>

          {/* Orientation */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Orientation:</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-[11px]"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>

        {/* Validation Warning / Error Pill */}
        {validationResult && (
          <div className="flex items-center gap-2">
            {validationResult.is_valid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                <CheckCircle size={12} /> Validated OK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                <AlertTriangle size={12} /> {validationResult.errors[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Split Editor & Preview Workspace ───────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Code Editor Tabs */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Editor Tabs Navigation */}
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveCodeTab("html")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeCodeTab === "html"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Code2 size={13} /> HTML Template
              </button>
              <button
                onClick={() => setActiveCodeTab("css")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeCodeTab === "css"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Palette size={13} /> CSS Stylesheet
              </button>
              <button
                onClick={() => setActiveCodeTab("header")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeCodeTab === "header"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layout size={13} /> Header
              </button>
              <button
                onClick={() => setActiveCodeTab("footer")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeCodeTab === "footer"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layout size={13} /> Footer
              </button>
              <button
                onClick={() => setActiveCodeTab("vars")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeCodeTab === "vars"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <HelpCircle size={13} /> Variables Reference
              </button>
            </div>
          </div>

          {/* Active Code Editor Area */}
          <div className="flex-1 p-3 overflow-hidden flex flex-col">
            {activeCodeTab === "html" && (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, setHtmlContent, htmlContent)}
                placeholder="Enter HTML & Jinja2 markup (e.g. <h1>{{ po_number }}</h1>)..."
                className="w-full h-full p-4 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-hidden resize-none selection:bg-indigo-500/30"
                spellCheck="false"
              />
            )}

            {activeCodeTab === "css" && (
              <textarea
                value={cssContent}
                onChange={(e) => setCssContent(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, setCssContent, cssContent)}
                placeholder="Enter print CSS styling (e.g. table { width: 100%; })..."
                className="w-full h-full p-4 font-mono text-xs leading-relaxed bg-slate-950 text-cyan-400 rounded-xl border border-slate-800 focus:outline-hidden resize-none selection:bg-indigo-500/30"
                spellCheck="false"
              />
            )}

            {activeCodeTab === "header" && (
              <div className="h-full flex flex-col gap-2">
                <p className="text-[11px] text-slate-500">
                  Optional HTML snippet rendered at the top of every printed page.
                </p>
                <textarea
                  value={headerHtml}
                  onChange={(e) => setHeaderHtml(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, setHeaderHtml, headerHtml)}
                  placeholder="<div class='header-title'>Confidential Purchase Order</div>"
                  className="w-full flex-1 p-4 font-mono text-xs leading-relaxed bg-slate-950 text-indigo-300 rounded-xl border border-slate-800 focus:outline-hidden resize-none"
                  spellCheck="false"
                />
              </div>
            )}

            {activeCodeTab === "footer" && (
              <div className="h-full flex flex-col gap-2">
                <p className="text-[11px] text-slate-500">
                  Optional HTML snippet rendered at the bottom of every printed page.
                </p>
                <textarea
                  value={footerHtml}
                  onChange={(e) => setFooterHtml(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, setFooterHtml, footerHtml)}
                  placeholder="<div class='footer-text'>Page generated via FreightLens</div>"
                  className="w-full flex-1 p-4 font-mono text-xs leading-relaxed bg-slate-950 text-indigo-300 rounded-xl border border-slate-800 focus:outline-hidden resize-none"
                  spellCheck="false"
                />
              </div>
            )}

            {activeCodeTab === "vars" && (
              <div className="h-full overflow-y-auto p-4 space-y-4 text-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Available Data Variables ({resolverSchema?.name || resolverKey})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click any variable to copy its Jinja2 tag directly to your clipboard.
                  </p>
                </div>

                {resolverSchema?.fields && (
                  <div className="space-y-2">
                    {Object.entries(resolverSchema.fields).map(([fieldName, meta]) => {
                      const isArray = meta.type === "array";
                      const snippet = `{{ ${fieldName} }}`;
                      return (
                        <div
                          key={fieldName}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {fieldName}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({meta.type})
                              </span>
                              {meta.restricted && (
                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded-sm border border-amber-200 dark:border-amber-800">
                                  Restricted
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {meta.description || "-"}
                            </p>
                            {meta.example && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Example: {JSON.stringify(meta.example)}
                              </p>
                            )}

                            {/* Sub items for lists */}
                            {isArray && meta.item_fields && (
                              <div className="mt-2 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800 space-y-1">
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  Iterate via: &#123;% for item in {fieldName} %&#125;
                                </span>
                                {Object.entries(meta.item_fields).map(([sKey, sMeta]) => (
                                  <div
                                    key={sKey}
                                    className="font-mono text-[10px] text-slate-600 dark:text-slate-300 cursor-pointer hover:text-indigo-500"
                                    onClick={() => copyToClipboard(`{{ item.${sKey} }}`, `${fieldName}.${sKey}`)}
                                  >
                                    • item.{sKey} ({sMeta.type})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => copyToClipboard(snippet, fieldName)}
                            className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1 transition shrink-0 cursor-pointer"
                          >
                            {copiedKey === fieldName ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                            {copiedKey === fieldName ? "Copied" : "Copy Tag"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live HTML Document Preview */}
        <div className="flex-1 flex flex-col bg-slate-200 dark:bg-slate-950 overflow-hidden">
          {/* Preview Toolbar */}
          <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Live Document Preview
              </span>
              <input
                type="text"
                placeholder="Sample Mock Data (or enter ID)"
                value={previewEntityId}
                onChange={(e) => setPreviewEntityId(e.target.value)}
                className="px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-48 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleRefreshPreview}
              disabled={previewLoading}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Refresh Live Preview"
            >
              <RefreshCw size={14} className={previewLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Iframe Preview Container */}
          <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Loader2 size={28} className="animate-spin text-indigo-500" />
                <p className="text-xs">Compiling document preview...</p>
              </div>
            ) : previewHtml ? (
              <div
                className="w-full h-full bg-white shadow-xl rounded-lg overflow-hidden border border-slate-300 dark:border-slate-800"
                style={{
                  // @page is ignored when HTML is shown in an iframe, so the
                  // sheet is sized to match the chosen orientation. Replace this
                  // with the real PDF once the preview renders one.
                  maxWidth: orientation === "landscape" ? "1120px" : "800px",
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="Live Preview"
                  sandbox=""
                  srcDoc={previewHtml}
                  className="w-full h-full border-none bg-white"
                />
              </div>
            ) : (
              <div className="text-center p-6 text-slate-400">
                <Eye size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No preview rendered yet. Click Refresh.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
