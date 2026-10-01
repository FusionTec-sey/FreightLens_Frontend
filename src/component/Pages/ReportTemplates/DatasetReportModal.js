import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Printer,
  FileSpreadsheet,
  X,
  Play,
  Layers,
  ArrowUpDown,
  Calendar,
  Settings2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter,
  Search,
  Save,
  Bookmark,
} from "lucide-react";

export default function DatasetReportModal({
  catalogItem,
  isOpen,
  onClose,
  onRunReport,
}) {
  const [running, setRunning] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Paper & geometry settings accordion
  const [showPaperSettings, setShowPaperSettings] = useState(false);

  // Master data for filters
  const [suppliersList, setSuppliersList] = useState([]);
  const [vesselsList, setVesselsList] = useState([]);
  const [venuesList, setVenuesList] = useState([]);

  // Form State
  const [datePreset, setDatePreset] = useState("THIS_MONTH");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedVessels, setSelectedVessels] = useState([]);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [groupBy, setGroupBy] = useState(
    catalogItem?.supported_group_fields?.[0]?.key || "none"
  );
  const [sortBy, setSortBy] = useState(
    catalogItem?.supported_sort_fields?.[0]?.key || ""
  );
  const [sortOrder, setSortOrder] = useState("desc");

  // Paper Settings
  const [pageSize, setPageSize] = useState(catalogItem?.default_page_size || "A4");
  const [orientation, setOrientation] = useState(catalogItem?.default_orientation || "landscape");
  const [marginPreset, setMarginPreset] = useState("normal");
  const [repeatHeaderOnBreak, setRepeatHeaderOnBreak] = useState(true);
  const [pageBreakPerGroup, setPageBreakPerGroup] = useState(false);
  const [avoidRowSplit, setAvoidRowSplit] = useState(true);
  const [sheetPerGroup, setSheetPerGroup] = useState(true);

  // Tabular Report Layout Templates State
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedSavedTemplateId, setSelectedSavedTemplateId] = useState("default");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Fetch saved tabular templates for this dataset resolver
  const fetchSavedTemplates = useCallback(async () => {
    if (!catalogItem?.key) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/templates/by-entity?entity_type=${catalogItem.key}&template_type=OPERATIONAL_TABULAR`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedTemplates(res.data || []);
    } catch (err) {
      console.warn("Failed to load saved tabular templates:", err);
    }
  }, [catalogItem?.key]);

  useEffect(() => {
    if (isOpen && catalogItem?.key) {
      fetchSavedTemplates();
    }
  }, [isOpen, catalogItem?.key, fetchSavedTemplates]);

  // Handle selecting a saved template
  const handleSelectTemplate = (templateId) => {
    setSelectedSavedTemplateId(templateId);
    if (templateId === "default") {
      if (catalogItem?.supported_group_fields?.length > 0) {
        setGroupBy(catalogItem.supported_group_fields[0].key);
      } else {
        setGroupBy("none");
      }
      if (catalogItem?.supported_sort_fields?.length > 0) {
        setSortBy(catalogItem.supported_sort_fields[0].key);
      }
      setSortOrder("desc");
      setPageSize(catalogItem?.default_page_size || "A4");
      setOrientation(catalogItem?.default_orientation || "landscape");
      setMarginPreset("normal");
      setRepeatHeaderOnBreak(true);
      setPageBreakPerGroup(false);
      setSheetPerGroup(true);
      return;
    }

    const tmpl = savedTemplates.find((t) => t.id === Number(templateId));
    if (!tmpl) return;

    if (tmpl.table_config) {
      if (tmpl.table_config.group_by) setGroupBy(tmpl.table_config.group_by);
      if (tmpl.table_config.sort_by) setSortBy(tmpl.table_config.sort_by);
      if (tmpl.table_config.sort_order) setSortOrder(tmpl.table_config.sort_order);
      if (tmpl.table_config.date_preset) applyDatePreset(tmpl.table_config.date_preset);
      if (tmpl.table_config.supplier_ids) setSelectedSuppliers(tmpl.table_config.supplier_ids);
      if (tmpl.table_config.vessel_ids) setSelectedVessels(tmpl.table_config.vessel_ids);
      if (tmpl.table_config.venue_ids) setSelectedVenues(tmpl.table_config.venue_ids);
      if (tmpl.table_config.search) setSearchTerm(tmpl.table_config.search);
    }

    if (tmpl.paper_settings) {
      if (tmpl.paper_settings.page_size) setPageSize(tmpl.paper_settings.page_size);
      if (tmpl.paper_settings.orientation) setOrientation(tmpl.paper_settings.orientation);
      if (tmpl.paper_settings.margin_preset) setMarginPreset(tmpl.paper_settings.margin_preset);
      if (tmpl.paper_settings.repeat_header !== undefined)
        setRepeatHeaderOnBreak(tmpl.paper_settings.repeat_header);
      if (tmpl.paper_settings.break_per_group !== undefined)
        setPageBreakPerGroup(tmpl.paper_settings.break_per_group);
      if (tmpl.paper_settings.sheet_per_group !== undefined)
        setSheetPerGroup(tmpl.paper_settings.sheet_per_group);
    }

    toast.info(`Applied layout template '${tmpl.name}'`);
  };

  // Handle saving the current configuration as a template
  const handleSaveAsTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    setSavingTemplate(true);
    try {
      const token = localStorage.getItem("token");
      const slug = `${catalogItem.key}_${templateName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 25)}_${Date.now() % 10000}`;
      const payload = {
        name: templateName.trim(),
        slug,
        description: templateDescription.trim() || `Custom layout for ${catalogItem.name}`,
        resolver_key: catalogItem.key,
        template_type: "OPERATIONAL_TABULAR",
        page_size: pageSize,
        orientation: orientation,
        is_active: true,
        table_config: {
          group_by: groupBy !== "none" ? groupBy : null,
          sort_by: sortBy || null,
          sort_order: sortOrder,
          date_preset: datePreset,
          supplier_ids: selectedSuppliers,
          vessel_ids: selectedVessels,
          venue_ids: selectedVenues,
          search: searchTerm || null,
        },
        paper_settings: {
          page_size: pageSize,
          orientation,
          margin_preset: marginPreset,
          repeat_header: repeatHeaderOnBreak,
          break_per_group: pageBreakPerGroup,
          avoid_row_split: avoidRowSplit,
          sheet_per_group: sheetPerGroup,
        },
      };

      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/templates`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Template '${res.data.name}' saved to Template Library!`);
      setShowSaveTemplateModal(false);
      setTemplateName("");
      setTemplateDescription("");
      await fetchSavedTemplates();
      setSelectedSavedTemplateId(res.data.id);
    } catch (err) {
      console.error("Save template failed:", err);
      toast.error(err.response?.data?.detail || "Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  // Initialize dates based on preset
  useEffect(() => {
    applyDatePreset("THIS_MONTH");
  }, []);

  // Update default groupBy/sortBy when catalogItem changes
  useEffect(() => {
    if (catalogItem) {
      if (catalogItem.supported_group_fields?.length > 0) {
        setGroupBy(catalogItem.supported_group_fields[0].key);
      } else {
        setGroupBy("none");
      }
      if (catalogItem.supported_sort_fields?.length > 0) {
        setSortBy(catalogItem.supported_sort_fields[0].key);
      }
      setPageSize(catalogItem.default_page_size || "A4");
      setOrientation(catalogItem.default_orientation || "landscape");
    }
  }, [catalogItem]);

  // Fetch Master Data for dropdowns
  useEffect(() => {
    if (!isOpen) return;

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    // Fetch suppliers
    axios
      .get(`${process.env.REACT_APP_NETWORK}/suppliers`, { headers })
      .then((res) => {
        const raw = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        const list = (raw.data || []).map((row) => ({
          id: row[0],
          name: row[1],
        }));
        setSuppliersList(list);
      })
      .catch((err) => console.error("Failed to load suppliers:", err));

    // Fetch vessels
    axios
      .get(`${process.env.REACT_APP_NETWORK}/vessels`, { headers })
      .then((res) => {
        const raw = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        const list = (raw.data || []).map((row) => ({
          id: row[0],
          name: row[1],
        }));
        setVesselsList(list);
      })
      .catch(() => {});

    // Fetch unload venues
    axios
      .get(`${process.env.REACT_APP_NETWORK}/unload-venues`, { headers })
      .then((res) => {
        const raw = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
        const list = (raw.data || []).map((row) => ({
          id: row[0],
          name: row[1],
        }));
        setVenuesList(list);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !catalogItem) return null;

  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const fmt = (dt) => dt.toISOString().slice(0, 10);

    if (preset === "TODAY") {
      const todayStr = fmt(now);
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === "THIS_WEEK") {
      const dayOfWeek = now.getDay() || 7; // Monday = 1
      const start = new Date(y, m, d - dayOfWeek + 1);
      setDateFrom(fmt(start));
      setDateTo(fmt(now));
    } else if (preset === "THIS_MONTH") {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      setDateFrom(fmt(start));
      setDateTo(fmt(end));
    } else if (preset === "LAST_30_DAYS") {
      const start = new Date(y, m, d - 30);
      setDateFrom(fmt(start));
      setDateTo(fmt(now));
    } else if (preset === "THIS_QUARTER") {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qStartMonth, 1);
      const end = new Date(y, qStartMonth + 3, 0);
      setDateFrom(fmt(start));
      setDateTo(fmt(end));
    } else if (preset === "THIS_YEAR") {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      setDateFrom(fmt(start));
      setDateTo(fmt(end));
    } else if (preset === "ALL") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const buildQuerySpec = () => {
    const marginsMap = {
      compact: { top: "8mm", bottom: "8mm", left: "8mm", right: "8mm" },
      normal: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
      spacious: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
    };

    return {
      template_id: selectedSavedTemplateId || null,
      date_from: dateFrom || null,
      date_to: dateTo || null,
      supplier_ids: selectedSuppliers.length > 0 ? selectedSuppliers : null,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : null,
      vessel_ids: selectedVessels.length > 0 ? selectedVessels : null,
      venue_ids: selectedVenues.length > 0 ? selectedVenues : null,
      search: searchTerm.trim() || null,
      group_by: groupBy !== "none" ? groupBy : null,
      sort_by: sortBy || null,
      sort_order: sortOrder,
      page_size: pageSize,
      orientation,
      margin_top: (marginsMap[marginPreset] || marginsMap.normal).top,
      margin_bottom: (marginsMap[marginPreset] || marginsMap.normal).bottom,
      margin_left: (marginsMap[marginPreset] || marginsMap.normal).left,
      margin_right: (marginsMap[marginPreset] || marginsMap.normal).right,
      repeat_header: repeatHeaderOnBreak,
      break_per_group: pageBreakPerGroup,
      sheet_per_group: sheetPerGroup,
    };
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // Run On-Screen
  const handleRun = async () => {
    setRunning(true);
    const spec = buildQuerySpec();
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/datasets/${catalogItem.key}/run`,
        spec,
        { headers: getHeaders() }
      );
      toast.success(`Loaded ${res.data?.total_records || 0} records.`);
      onRunReport(res.data, spec);
      onClose();
    } catch (err) {
      console.error("Run error:", err);
      toast.error(err.response?.data?.detail || "Failed to execute report query.");
    } finally {
      setRunning(false);
    }
  };

  // Direct Excel Export
  const handleExportExcel = async () => {
    setExportingExcel(true);
    const spec = buildQuerySpec();
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/datasets/${catalogItem.key}/export`,
        spec,
        {
          headers: getHeaders(),
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${catalogItem.key}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Excel report exported successfully.");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel report.");
    } finally {
      setExportingExcel(false);
    }
  };

  // Direct PDF Render
  const handleExportPdf = async () => {
    setExportingPdf(true);
    const spec = buildQuerySpec();
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/datasets/${catalogItem.key}/render`,
        spec,
        {
          headers: getHeaders(),
          responseType: "blob",
        }
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast.success("Landscape PDF compiled and opened.");
    } catch (err) {
      console.error("Render error:", err);
      toast.error("Failed to compile report PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase">
                  {catalogItem.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {catalogItem.columns?.length || 0} Columns Available
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {catalogItem.name}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Contained Scroll) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-xs text-gray-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
            {catalogItem.description}
          </p>

          {/* Template Layout Preset Selector Bar */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-slate-50 border border-indigo-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">Saved Layout Template:</span>
                <p className="text-[11px] text-slate-500">Apply or save customized column, grouping & paper setup</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedSavedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="text-xs font-medium py-1.5 px-3 bg-white border border-indigo-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="default">Default Standard Layout</option>
                {savedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_system ? "(System)" : "(Custom)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Save current settings as a reusable template layout"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Layout</span>
              </button>
            </div>
          </div>

          {/* Section 1: Date Range & Quick Presets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Date Range Filter
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { id: "THIS_MONTH", label: "This Month" },
                  { id: "LAST_30_DAYS", label: "30 Days" },
                  { id: "THIS_QUARTER", label: "Quarter" },
                  { id: "THIS_YEAR", label: "Year" },
                  { id: "ALL", label: "All Time" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDatePreset(p.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition ${
                      datePreset === p.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setDatePreset("CUSTOM");
                  }}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1 block">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setDatePreset("CUSTOM");
                  }}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Grouping & Sorting Controls */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Group By */}
              <div>
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Group Records By
                </label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="none">None (Flat Record Table)</option>
                  {(catalogItem.supported_group_fields || []).map((gf) => (
                    <option key={gf.key} value={gf.key}>
                      {gf.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Enables subtotals per group and optional multi-sheet tab splitting in Excel.
                </span>
              </div>

              {/* Sort Order */}
              <div>
                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                  Sort Order
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    {(catalogItem.supported_sort_fields || []).map((sf) => (
                      <option key={sf.key} value={sf.key}>
                        {sf.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                    className="px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition text-gray-700"
                  >
                    {sortOrder.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Entity Filters (Suppliers, Search, Venues) */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Entity Filters & Search
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Suppliers Filter */}
              <div>
                <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                  Filter by Supplier / Vendor
                </label>
                <select
                  multiple
                  value={selectedSuppliers.map(String)}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions, (o) => parseInt(o.value, 10));
                    setSelectedSuppliers(opts);
                  }}
                  className="w-full text-xs p-2 border border-gray-300 rounded-lg bg-white h-24 focus:ring-2 focus:ring-indigo-500"
                >
                  {suppliersList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Hold Ctrl/Cmd to select multiple vendors (Leave empty for All).
                </span>
              </div>

              {/* Text Search & Venues */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                    Search Keyword
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Container #, PO #, BL #..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {venuesList.length > 0 && (
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                      Filter by Unload Venue
                    </label>
                    <select
                      value={selectedVenues[0] || ""}
                      onChange={(e) => {
                        const val = e.target.value ? [parseInt(e.target.value, 10)] : [];
                        setSelectedVenues(val);
                      }}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Venues</option>
                      {venuesList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {vesselsList.length > 0 && (
                  <div>
                    <label className="text-[11px] font-medium text-gray-600 mb-1 block">
                      Filter by Vessel
                    </label>
                    <select
                      value={selectedVessels[0] || ""}
                      onChange={(e) => {
                        const val = e.target.value ? [parseInt(e.target.value, 10)] : [];
                        setSelectedVessels(val);
                      }}
                      className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Vessels</option>
                      {vesselsList.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Paper Setup & Page Margins Accordion */}
          <div className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-50/30">
            <button
              type="button"
              onClick={() => setShowPaperSettings((s) => !s)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-indigo-950 hover:bg-indigo-100/50 transition"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <span>Paper Layout, Margins & Print Geometry</span>
                <span className="text-[10px] font-normal text-indigo-700 font-mono">
                  ({pageSize} {orientation.toUpperCase()}, {marginPreset} margins)
                </span>
              </div>
              {showPaperSettings ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
            </button>

            {showPaperSettings && (
              <div className="p-4 pt-1 space-y-4 border-t border-indigo-100 text-xs text-gray-700 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Paper Size</label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md bg-white text-xs"
                    >
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="A3">A3 (297 × 420 mm - Wide)</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                      <option value="Legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Orientation</label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md bg-white text-xs"
                    >
                      <option value="landscape">Landscape (Recommended)</option>
                      <option value="portrait">Portrait</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Page Margins</label>
                    <select
                      value={marginPreset}
                      onChange={(e) => setMarginPreset(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md bg-white text-xs"
                    >
                      <option value="compact">Compact (8 mm)</option>
                      <option value="normal">Standard (12 mm)</option>
                      <option value="spacious">Spacious (18 mm)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={repeatHeaderOnBreak}
                      onChange={(e) => setRepeatHeaderOnBreak(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Repeat table headers on every printed page</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={avoidRowSplit}
                      onChange={(e) => setAvoidRowSplit(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Prevent splitting table rows across page breaks</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pageBreakPerGroup}
                      onChange={(e) => setPageBreakPerGroup(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Force new page before each group / shift</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sheetPerGroup}
                      onChange={(e) => setSheetPerGroup(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Create separate Excel sheet tab per group</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || running}
              className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              {exportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />}
              Export Excel
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || running}
              className="px-4 py-2 text-xs font-semibold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 rounded-lg transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5 text-indigo-700" />}
              Print / PDF
            </button>

            <button
              type="button"
              onClick={handleRun}
              disabled={running || exportingExcel || exportingPdf}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Interactive Register
            </button>
          </div>
        </div>

      </div>

      {/* Save Template Modal Dialog */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-300" />
                <h3 className="text-sm font-bold">Save as Tabular Layout Template</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="text-indigo-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsTemplate} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Saves the current column configuration, filters, grouping level, and paper geometry settings into your organization's template library.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Weekly Demurrage Summary by Port"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes on usage or intended operational audience..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <div><strong>Group By:</strong> {groupBy}</div>
                <div><strong>Sort By:</strong> {sortBy || "Default"} ({sortOrder})</div>
                <div><strong>Paper:</strong> {pageSize} • {orientation}</div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-3.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
