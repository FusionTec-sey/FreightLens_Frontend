import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X,
  Save,
  Sliders,
  Layers,
  Eye,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Loader2,
  FileText,
  Bookmark,
} from "lucide-react";

export default function TabularTemplateDesignerModal({
  isOpen,
  onClose,
  catalogItem,
  allDatasets = [],
  templateToEdit = null,
  onSaveSuccess,
}) {
  const [activeStep, setActiveStep] = useState("columns"); // 'columns' | 'groups' | 'paper' | 'info'
  const [saving, setSaving] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(100);

  // Selected target dataset
  const [selectedDatasetKey, setSelectedDatasetKey] = useState(
    catalogItem?.key || allDatasets[0]?.key || "containers_operational_register"
  );

  const currentDataset = useMemo(() => {
    return allDatasets.find((d) => d.key === selectedDatasetKey) || catalogItem || null;
  }, [allDatasets, selectedDatasetKey, catalogItem]);

  // Form & Layout Configuration States
  const [templateName, setTemplateName] = useState("");
  const [templateSlug, setTemplateSlug] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Column Configurations: [{ key, label, visible, align: 'left'|'center'|'right', format: 'text'|'currency'|'date'|'badge'|'number' }]
  const [columnsConfig, setColumnsConfig] = useState([]);

  // Grouping & Sorting
  const [groupBy, setGroupBy] = useState("none");
  const [showSubtotals, setShowSubtotals] = useState(true);
  const [showGrandTotal, setShowGrandTotal] = useState(true);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  // Paper & Geometry
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("landscape");
  const [marginPreset, setMarginPreset] = useState("compact");
  const [repeatHeaderOnBreak, setRepeatHeaderOnBreak] = useState(true);
  const [pageBreakPerGroup, setPageBreakPerGroup] = useState(false);
  const [alternateRowBanding, setAlternateRowBanding] = useState(true);

  // Live Preview Sample Data
  const [sampleData, setSampleData] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // Initialize or populate when opening / switching datasets or templateToEdit
  useEffect(() => {
    if (!isOpen) return;

    if (templateToEdit) {
      setSelectedDatasetKey(templateToEdit.resolver_key || templateToEdit.entity_type);
      setTemplateName(templateToEdit.name || "");
      setTemplateSlug(templateToEdit.slug || "");
      setTemplateDescription(templateToEdit.description || "");

      const tc = templateToEdit.table_config || {};
      if (tc.columns && Array.isArray(tc.columns)) {
        setColumnsConfig(tc.columns);
      } else if (currentDataset?.columns) {
        initColumnsFromDataset(currentDataset);
      }

      setGroupBy(tc.groupBy || "none");
      setShowSubtotals(tc.showSubtotals !== false);
      setShowGrandTotal(tc.showGrandTotal !== false);
      setSortBy(tc.sortBy || "");
      setSortOrder(tc.sortOrder || "desc");

      const ps = templateToEdit.paper_settings || {};
      setPageSize(ps.pageSize || templateToEdit.page_size || "A4");
      setOrientation(ps.orientation || templateToEdit.orientation || "landscape");
      setMarginPreset(ps.marginPreset || "compact");
      setRepeatHeaderOnBreak(ps.repeatHeaderOnBreak !== false);
      setPageBreakPerGroup(Boolean(ps.pageBreakPerGroup));
      setAlternateRowBanding(ps.alternateRowBanding !== false);
    } else if (currentDataset) {
      setTemplateName(`${currentDataset.name} (Custom Layout)`);
      setTemplateSlug(
        `${currentDataset.key}_layout_${Date.now() % 10000}`
      );
      setTemplateDescription(
        `Customized tabular layout for ${currentDataset.name} with custom columns and landscape format.`
      );
      initColumnsFromDataset(currentDataset);
      setGroupBy(
        currentDataset.supported_group_fields?.length > 0
          ? currentDataset.supported_group_fields[0].key
          : "none"
      );
      setShowSubtotals(true);
      setShowGrandTotal(true);
      setSortBy(
        currentDataset.supported_sort_fields?.length > 0
          ? currentDataset.supported_sort_fields[0].key
          : ""
      );
      setSortOrder("desc");
      setPageSize(currentDataset.default_page_size || "A4");
      setOrientation(currentDataset.default_orientation || "landscape");
      setMarginPreset("compact");
      setRepeatHeaderOnBreak(true);
      setPageBreakPerGroup(false);
      setAlternateRowBanding(true);
    }
  }, [isOpen, templateToEdit, currentDataset]);

  const initColumnsFromDataset = (dataset) => {
    if (!dataset || !dataset.columns) return;
    const initialCols = dataset.columns.map((c) => ({
      key: c.key,
      label: c.label || c.key,
      visible: true,
      align:
        c.data_type === "currency" || c.data_type === "number"
          ? "right"
          : c.data_type === "badge" || c.data_type === "date"
          ? "center"
          : "left",
      format: c.data_type || "text",
    }));
    setColumnsConfig(initialCols);
  };

  // Fetch real sample data from backend resolver
  const fetchSampleData = useCallback(async () => {
    if (!selectedDatasetKey) return;
    setLoadingPreview(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/datasets/${selectedDatasetKey}/run`,
        {
          filters: {},
          group_by: groupBy === "none" ? null : groupBy,
          sort_by: sortBy || null,
          sort_order: sortOrder || "desc",
          page: 1,
          limit: 8,
        },
        { headers: getHeaders() }
      );
      setSampleData(res.data?.records || []);
    } catch (err) {
      console.warn("Could not fetch real sample data, using fallback mockup:", err);
      generateMockupData();
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedDatasetKey, groupBy, sortBy, sortOrder]);

  useEffect(() => {
    if (isOpen) {
      fetchSampleData();
    }
  }, [isOpen, fetchSampleData]);

  // Fallback mock dataset if backend database is completely empty
  const generateMockupData = () => {
    const mocks = [
      {
        container_no: "MSKU9021841",
        container_type: "40' High Cube",
        status: "In Transit",
        status_color: "bg-blue-100 text-blue-800",
        vessel_name: "MSC REGULUS / V.2401",
        supplier_name: "Mahindra Logistics Global",
        consignee_name: "Seychelles State Trading",
        arrival_date: "2026-10-02",
        demurrage_days: 3,
        demurrage_penalty: 150.0,
        po_number: "PO-2026-0001",
        total_amount: 14500.0,
      },
      {
        container_no: "CMAU7812903",
        container_type: "20' General Standard",
        status: "At Port",
        status_color: "bg-amber-100 text-amber-800",
        vessel_name: "CMA CGM VOLGA",
        supplier_name: "EuroCarriers NV",
        consignee_name: "Seychelles Commercial Agency",
        arrival_date: "2026-09-28",
        demurrage_days: 0,
        demurrage_penalty: 0.0,
        po_number: "PO-2026-0004",
        total_amount: 8200.0,
      },
      {
        container_no: "TGHU4419201",
        container_type: "40' Reefer Temperature",
        status: "Delivered",
        status_color: "bg-emerald-100 text-emerald-800",
        vessel_name: "MAERSK IBERIA",
        supplier_name: "AgroFarms Mediterranean",
        consignee_name: "Seychelles Fresh Foods",
        arrival_date: "2026-09-24",
        demurrage_days: 0,
        demurrage_penalty: 0.0,
        po_number: "PO-2026-0007",
        total_amount: 32000.0,
      },
      {
        container_no: "MEDU8812944",
        container_type: "40' High Cube",
        status: "Demurrage Risk",
        status_color: "bg-rose-100 text-rose-800",
        vessel_name: "MSC REGULUS / V.2401",
        supplier_name: "Mahindra Logistics Global",
        consignee_name: "Victoria Ports Logistics",
        arrival_date: "2026-09-18",
        demurrage_days: 9,
        demurrage_penalty: 450.0,
        po_number: "PO-2026-0012",
        total_amount: 19800.0,
      },
    ];
    setSampleData(mocks);
  };

  // Column reordering
  const moveColumn = (index, direction) => {
    const newCols = [...columnsConfig];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newCols.length) return;
    const temp = newCols[index];
    newCols[index] = newCols[targetIdx];
    newCols[targetIdx] = temp;
    setColumnsConfig(newCols);
  };

  const toggleColumnVisibility = (index) => {
    const newCols = [...columnsConfig];
    newCols[index].visible = !newCols[index].visible;
    setColumnsConfig(newCols);
  };

  const updateColumnAlign = (index, align) => {
    const newCols = [...columnsConfig];
    newCols[index].align = align;
    setColumnsConfig(newCols);
  };

  const updateColumnLabel = (index, label) => {
    const newCols = [...columnsConfig];
    newCols[index].label = label;
    setColumnsConfig(newCols);
  };

  const visibleColumns = useMemo(() => {
    return columnsConfig.filter((c) => c.visible);
  }, [columnsConfig]);

  // Save template handler
  const handleSaveTemplate = async (e) => {
    if (e) e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Template name is required.");
      return;
    }
    if (visibleColumns.length === 0) {
      toast.error("At least one column must be visible.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: templateName.trim(),
        slug:
          templateSlug.trim() ||
          `${selectedDatasetKey}_layout_${Date.now() % 10000}`,
        description: templateDescription.trim(),
        category: currentDataset?.category || "LOGISTICS",
        resolver_key: selectedDatasetKey,
        entity_type: selectedDatasetKey,
        template_type: "OPERATIONAL_TABULAR",
        page_size: pageSize,
        orientation: orientation,
        is_active: true,
        table_config: {
          columns: columnsConfig,
          groupBy,
          showSubtotals,
          showGrandTotal,
          sortBy,
          sortOrder,
        },
        paper_settings: {
          pageSize,
          orientation,
          marginPreset,
          repeatHeaderOnBreak,
          pageBreakPerGroup,
          alternateRowBanding,
        },
      };

      if (templateToEdit?.id) {
        await axios.put(
          `${process.env.REACT_APP_NETWORK}/reports/templates/${templateToEdit.id}`,
          payload,
          { headers: getHeaders() }
        );
        toast.success(`Tabular template '${templateName}' updated successfully!`);
      } else {
        await axios.post(
          `${process.env.REACT_APP_NETWORK}/reports/templates`,
          payload,
          { headers: getHeaders() }
        );
        toast.success(`Tabular template '${templateName}' created successfully!`);
      }

      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error("Save tabular template error:", err);
      toast.error(
        err.response?.data?.detail || "Failed to save tabular report template."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-7xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* ── Top Header ────────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {templateToEdit ? "Edit Tabular Layout" : "Tabular Report Template Designer"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {currentDataset?.name}
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                {templateName || "Untitled Tabular Template"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Main Two-Pane Split Layout ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* ── Left Configuration Pane (45%) ──────────────────────────────── */}
          <div className="w-full lg:w-[480px] xl:w-[520px] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col shrink-0">
            
            {/* Step Tab Switcher */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 shrink-0 overflow-x-auto">
              {[
                { id: "columns", label: "Columns & Order", icon: Sliders, badge: visibleColumns.length },
                { id: "groups", label: "Grouping & Totals", icon: Layers },
                { id: "paper", label: "Paper & Layout", icon: FileText },
                { id: "info", label: "Details & Metadata", icon: Bookmark },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeStep === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveStep(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-indigo-800 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Step Body (Contained Scroll) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* ── TAB 1: COLUMNS CONFIGURATION ─────────────────────────── */}
              {activeStep === "columns" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Toggle visibility, reorder columns, or adjust alignment:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {visibleColumns.length} of {columnsConfig.length} active
                    </span>
                  </div>

                  <div className="space-y-2">
                    {columnsConfig.map((col, idx) => (
                      <div
                        key={col.key}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                          col.visible
                            ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs"
                            : "bg-slate-100/70 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        {/* Checkbox & Header Input */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={() => toggleColumnVisibility(idx)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={col.label}
                              onChange={(e) => updateColumnLabel(idx, e.target.value)}
                              disabled={!col.visible}
                              className="text-xs font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden text-slate-900 dark:text-white w-full truncate"
                            />
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              {col.key} • {col.format}
                            </span>
                          </div>
                        </div>

                        {/* Alignment Buttons & Reordering */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Alignment Toggle */}
                          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => updateColumnAlign(idx, "left")}
                              className={`p-1 rounded transition ${col.align === "left" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-2xs" : "text-slate-400"}`}
                              title="Align Left"
                            >
                              <AlignLeft size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateColumnAlign(idx, "center")}
                              className={`p-1 rounded transition ${col.align === "center" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-2xs" : "text-slate-400"}`}
                              title="Align Center"
                            >
                              <AlignCenter size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateColumnAlign(idx, "right")}
                              className={`p-1 rounded transition ${col.align === "right" ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-2xs" : "text-slate-400"}`}
                              title="Align Right"
                            >
                              <AlignRight size={12} />
                            </button>
                          </div>

                          {/* Reorder Buttons */}
                          <div className="flex items-center">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveColumn(idx, -1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === columnsConfig.length - 1}
                              onClick={() => moveColumn(idx, 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move Down"
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB 2: GROUPING & TOTALS ─────────────────────────────── */}
              {activeStep === "groups" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Primary Grouping Hierarchy
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Rows will be partitioned into distinct grouped bands with headers:
                    </p>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="none">No Grouping (Flat Tabular Register)</option>
                      {(currentDataset?.supported_group_fields || []).map((gf) => (
                        <option key={gf.key} value={gf.key}>
                          Group by: {gf.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="block font-bold text-slate-800 dark:text-slate-200">
                      Subtotals & Aggregations
                    </span>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSubtotals}
                        onChange={(e) => setShowSubtotals(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Group Subtotal Rows
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Calculates item counts and numerical/currency sums at the end of each group
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <input
                        type="checkbox"
                        checked={showGrandTotal}
                        onChange={(e) => setShowGrandTotal(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Report Grand Total Summary
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Displays cumulative totals card at the bottom of the register
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Sort Order Setup */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="block font-bold text-slate-800 dark:text-slate-200">
                      Default Sort Order
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                      >
                        <option value="">Default Column</option>
                        {(currentDataset?.supported_sort_fields || []).map((sf) => (
                          <option key={sf.key} value={sf.key}>
                            {sf.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white"
                      >
                        <option value="desc">Descending (High to Low / Newest)</option>
                        <option value="asc">Ascending (Low to High / Oldest)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 3: PAPER & LAYOUT ────────────────────────────────── */}
              {activeStep === "paper" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="block font-bold text-slate-800 dark:text-slate-200">
                      Paper Geometry
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Page Size
                        </label>
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                        >
                          <option value="A4">A4 (210 x 297 mm)</option>
                          <option value="A3">A3 Wide Format (297 x 420 mm)</option>
                          <option value="Letter">US Letter</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Orientation
                        </label>
                        <select
                          value={orientation}
                          onChange={(e) => setOrientation(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                        >
                          <option value="landscape">Landscape (Recommended)</option>
                          <option value="portrait">Portrait</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Margins Preset
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "compact", label: "Compact (8mm)" },
                          { id: "normal", label: "Normal (15mm)" },
                          { id: "wide", label: "Wide (25mm)" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMarginPreset(m.id)}
                            className={`py-1.5 px-2 text-center rounded-lg border font-medium transition cursor-pointer ${
                              marginPreset === m.id
                                ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="block font-bold text-slate-800 dark:text-slate-200">
                      Multi-Page & Printing Rules
                    </span>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={repeatHeaderOnBreak}
                        onChange={(e) => setRepeatHeaderOnBreak(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Repeat Column Headers on Page Break
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Keeps table header visible at the top of every subsequent printed page
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <input
                        type="checkbox"
                        checked={pageBreakPerGroup}
                        onChange={(e) => setPageBreakPerGroup(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Force New Page per Group
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Starts each group / carrier / vessel on a clean sheet
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <input
                        type="checkbox"
                        checked={alternateRowBanding}
                        onChange={(e) => setAlternateRowBanding(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          Alternate Row Banding (Zebra Striping)
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Enhances readability across wide operational datasets
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* ── TAB 4: TEMPLATE METADATA ─────────────────────────────── */}
              {activeStep === "info" && (
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Template Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Demurrage Risk Containers by Vessel"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Operational Register Dataset
                    </label>
                    <select
                      value={selectedDatasetKey}
                      onChange={(e) => setSelectedDatasetKey(e.target.value)}
                      disabled={Boolean(templateToEdit)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    >
                      {allDatasets.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.name} ({d.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Identifier Slug
                    </label>
                    <input
                      type="text"
                      value={templateSlug}
                      onChange={(e) => setTemplateSlug(e.target.value)}
                      className="w-full px-3 py-2 font-mono text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description & Notes
                    </label>
                    <textarea
                      rows={3}
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="Purpose, operational audience, or specific filter notes..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── Right Live Interactive Preview Pane (55%) ──────────────────── */}
          <div className="flex-1 bg-slate-200/80 dark:bg-slate-950 flex flex-col overflow-hidden">
            
            {/* Preview Toolbar */}
            <div className="px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye size={14} className="text-indigo-600" />
                  Live Tabular Preview
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  • {pageSize} {orientation} ({visibleColumns.length} cols)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(60, z - 10))}
                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[11px] font-mono font-semibold px-1 text-slate-600 dark:text-slate-300">
                    {previewZoom}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(150, z + 10))}
                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded"
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    onClick={() => setPreviewZoom(100)}
                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded"
                    title="Reset Zoom"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchSampleData}
                  disabled={loadingPreview}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                  title="Reload Live Sample Data"
                >
                  <RefreshCw size={14} className={loadingPreview ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Preview Sheet Viewport */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start">
              
              {/* Virtual Printed Sheet Container */}
              <div
                style={{
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: "top center",
                  transition: "transform 0.15s ease-out",
                  width: orientation === "landscape" ? "1060px" : "800px",
                }}
                className="bg-white text-slate-900 shadow-xl rounded-sm p-8 border border-slate-300 min-h-[600px] flex flex-col justify-between"
              >
                <div>
                  {/* Sheet Header */}
                  <div className="border-b-2 border-indigo-900 pb-4 mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        {currentDataset?.category || "OPERATIONAL LOGISTICS"} REGISTER
                      </div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">
                        {templateName || currentDataset?.name}
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Generated for Seychelles Sahaj Organization • {new Date().toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-indigo-900">FREIGHTLENS</div>
                      <div className="text-[10px] text-slate-400 font-mono">CONFIDENTIAL OPERATIONAL DISPATCH</div>
                    </div>
                  </div>

                  {/* Grouping Indicator Header if enabled */}
                  {groupBy !== "none" && (
                    <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-t text-xs font-bold flex items-center justify-between">
                      <span>GROUP: {groupBy.toUpperCase()} — MSC REGULUS / V.2401</span>
                      <span className="text-[10px] opacity-80 font-normal">Subtotal Group Partition</span>
                    </div>
                  )}

                  {/* Tabular Grid */}
                  <div className="overflow-x-auto border border-slate-300">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300">
                          <th className="py-2 px-3 w-8 text-center text-slate-400">#</th>
                          {visibleColumns.map((col) => (
                            <th
                              key={col.key}
                              style={{ textAlign: col.align }}
                              className="py-2.5 px-3 whitespace-nowrap"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sampleData.map((row, rIdx) => {
                          const isEven = rIdx % 2 === 0;
                          return (
                            <tr
                              key={rIdx}
                              className={
                                alternateRowBanding && !isEven
                                  ? "bg-slate-50/70"
                                  : "bg-white"
                              }
                            >
                              <td className="py-2 px-3 text-center text-[10px] text-slate-400 font-mono">
                                {rIdx + 1}
                              </td>
                              {visibleColumns.map((col) => {
                                const rawVal = row[col.key] ?? "—";
                                return (
                                  <td
                                    key={col.key}
                                    style={{ textAlign: col.align }}
                                    className="py-2 px-3 whitespace-nowrap"
                                  >
                                    {col.format === "currency" && typeof rawVal === "number" ? (
                                      <span className="font-mono font-semibold">
                                        ${rawVal.toFixed(2)}
                                      </span>
                                    ) : col.format === "badge" ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                        {String(rawVal)}
                                      </span>
                                    ) : col.format === "number" && typeof rawVal === "number" ? (
                                      <span className="font-mono">{rawVal}</span>
                                    ) : (
                                      <span>{String(rawVal)}</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>

                      {/* Subtotals Footer if enabled */}
                      {showSubtotals && groupBy !== "none" && (
                        <tfoot>
                          <tr className="bg-indigo-50/80 font-bold border-t-2 border-indigo-200 text-indigo-950">
                            <td colSpan={2} className="py-2 px-3 text-xs">
                              Group Subtotal:
                            </td>
                            {visibleColumns.slice(1).map((col, cIdx) => (
                              <td
                                key={cIdx}
                                style={{ textAlign: col.align }}
                                className="py-2 px-3 font-mono text-xs"
                              >
                                {col.format === "currency" ? "$14,500.00" : col.format === "number" ? "3" : ""}
                              </td>
                            ))}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Grand Total Summary Card if enabled */}
                  {showGrandTotal && (
                    <div className="mt-4 p-3 bg-slate-100 rounded-lg border border-slate-300 flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-800">
                        REGISTER GRAND TOTAL SUMMARY:
                      </div>
                      <div className="flex items-center gap-6 font-mono">
                        <div><strong>Total Records:</strong> {sampleData.length} Items</div>
                        <div><strong>Total Demurrage:</strong> $600.00</div>
                        <div><strong>Cumulative Value:</strong> $74,500.00</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sheet Footer */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Page 1 of 1 • Template: {templateSlug}</span>
                  <span>FreightLens Enterprise Reporting Engine • Multi-Page Contained Layout</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── Modal Footer ──────────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{templateToEdit ? "Update Custom Template" : "Save as Custom Template"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
