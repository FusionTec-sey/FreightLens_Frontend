import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowLeft,
  Layers,
  Building2,
  Clock,
  Loader2,
  AlertCircle,
  FileText,
  Table,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

export default function DatasetReportView({
  reportKey,
  datasetResult,
  querySpec,
  onModifyFilters,
  onClose,
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Pagination State
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // View Mode: 'table' vs 'print_layout'
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'print_layout'
  const [zoomLevel, setZoomLevel] = useState(100);

  const {
    report_title = "",
    category = "",
    generated_at = "",
    generated_by = "",
    org_name = "",
    filters_applied = {},
    columns = [],
    records = [],
    total_records = 0,
    is_grouped = false,
    group_field = "",
    groups = [],
    grand_totals = {},
  } = datasetResult || {};

  const toggleGroup = (groupVal) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupVal]: !prev[groupVal],
    }));
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // Download Excel
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/datasets/${reportKey}/export`,
        querySpec,
        {
          headers: getHeaders(),
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportKey}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Excel spreadsheet downloaded successfully.");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Failed to export Excel spreadsheet.");
    } finally {
      setExportingExcel(false);
    }
  };

  // Render & Download PDF
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/datasets/${reportKey}/render`,
        querySpec,
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
      console.error("PDF render error:", err);
      toast.error("Failed to compile Landscape PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Pagination Calculations
  const effectivePageSize = pageSize === "All" ? Math.max(1, records.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(records.length / effectivePageSize));

  const paginatedRecords = useMemo(() => {
    if (pageSize === "All") return records;
    const start = (currentPage - 1) * effectivePageSize;
    return records.slice(start, start + effectivePageSize);
  }, [records, currentPage, effectivePageSize, pageSize]);

  // Slices for Print Layout Pages (approx 22 rows per Landscape A4 sheet)
  const ROWS_PER_PRINT_SHEET = 22;
  const printSheets = useMemo(() => {
    const sheets = [];
    for (let i = 0; i < records.length; i += ROWS_PER_PRINT_SHEET) {
      sheets.push(records.slice(i, i + ROWS_PER_PRINT_SHEET));
    }
    return sheets.length > 0 ? sheets : [[]];
  }, [records]);

  // Cell renderer helper
  const renderCell = (col, value, row) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-gray-400 font-mono">—</span>;
    }

    if (col.data_type === "currency") {
      const cur = row.currency || "USD";
      return (
        <span className="font-semibold text-gray-800">
          {cur} {Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }

    if (col.data_type === "number") {
      return (
        <span className="font-mono text-gray-700">
          {Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      );
    }

    if (col.data_type === "badge") {
      const valStr = String(value).toUpperCase();
      let colorClass = "bg-gray-100 text-gray-700 border-gray-200";
      if (valStr.includes("CRITICAL") || valStr.includes("DEMURRAGE") || valStr.includes("OVERDUE")) {
        colorClass = "bg-rose-50 text-rose-700 border-rose-200 font-medium";
      } else if (valStr.includes("HIGH") || valStr.includes("WARN")) {
        colorClass = "bg-amber-50 text-amber-700 border-amber-200 font-medium";
      } else if (valStr.includes("ARRIVED") || valStr.includes("COMPLETE") || valStr.includes("CLEARED") || valStr.includes("PAID")) {
        colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium";
      } else if (valStr.includes("TRANSIT") || valStr.includes("PORT") || valStr.includes("INBOUND")) {
        colorClass = "bg-blue-50 text-blue-700 border-blue-200 font-medium";
      }
      return (
        <span className={`inline-block px-2.5 py-0.5 text-xs rounded-full border ${colorClass}`}>
          {value}
        </span>
      );
    }

    const isTruncate = col.overflow_mode === "truncate";
    return (
      <span
        className={`block ${
          isTruncate ? "truncate" : "break-words"
        }`}
        style={col.width ? { maxWidth: col.width } : undefined}
        title={String(value)}
      >
        {String(value)}
      </span>
    );
  };

  if (!datasetResult) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl h-[94vh] flex flex-col overflow-hidden">
        
        {/* Top Operational Header Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Back to Catalog"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {category}
                </span>
                <span className="text-xs font-mono text-slate-400">{reportKey}</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight mt-0.5">
                {report_title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Table Grid vs Print Layout */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 mr-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Data Table View"
              >
                <Table size={13} />
                <span>Grid View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("print_layout")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === "print_layout"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Print Layout View: Simulates physical landscape A4 sheets with repeating headers"
              >
                <FileText size={13} />
                <span>Print Layout ({printSheets.length} Sheets)</span>
              </button>
            </div>

            {onModifyFilters && (
              <button
                onClick={onModifyFilters}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition flex items-center gap-1.5 shadow-2xs"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                Filters
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="px-3.5 py-1.5 text-xs font-semibold text-emerald-100 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/40 rounded-xl transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {exportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Excel (.xlsx)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 rounded-xl transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              Compile PDF
            </button>
          </div>
        </div>

        {/* Sub-header Context Bar */}
        <div className="px-6 py-2 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-800">{org_name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span>Generated: <strong className="text-gray-700">{generated_at}</strong> by <strong className="text-gray-700">{generated_by || "System"}</strong></span>
            </div>
            {is_grouped && (
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Grouped By: <strong className="text-indigo-700 uppercase">{group_field.replace(/_/g, " ")}</strong></span>
              </div>
            )}
          </div>

          {/* Applied filters pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(filters_applied).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 text-[11px] shadow-2xs"
              >
                <strong className="text-gray-800 capitalize">{k.replace(/_/g, " ")}:</strong> {String(v)}
              </span>
            ))}
          </div>
        </div>

        {/* ── View 1: Data Table Grid View with Server/Client Pagination ───── */}
        {viewMode === "table" ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Table Scrollable Container */}
            <div className="flex-1 overflow-auto bg-white relative">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs text-slate-700 uppercase font-semibold tracking-wider text-[11px] border-b border-gray-300 shadow-2xs">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{ width: col.width }}
                        className={`py-3 px-3.5 border-r border-gray-200 last:border-r-0 ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {/* Grouped View */}
                  {is_grouped && groups.length > 0 ? (
                    groups.map((grp) => {
                      const isCollapsed = Boolean(collapsedGroups[grp.group_value]);
                      return (
                        <React.Fragment key={grp.group_value}>
                          {/* Group Header Row */}
                          <tr
                            onClick={() => toggleGroup(grp.group_value)}
                            className="bg-indigo-50/80 hover:bg-indigo-100/80 cursor-pointer border-t-2 border-indigo-200 transition select-none"
                          >
                            <td colSpan={columns.length} className="py-2.5 px-4 font-semibold text-indigo-950">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-indigo-600" />
                                  )}
                                  <span className="text-sm font-bold tracking-tight">
                                    {grp.group_label}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-800 font-mono font-medium">
                                    {grp.count || grp.records?.length || 0} items
                                  </span>
                                </div>
                                <span className="text-[11px] text-indigo-700/80 font-normal">
                                  {isCollapsed ? "Click to expand" : "Click to collapse"}
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* Group Rows (if not collapsed) */}
                          {!isCollapsed &&
                            grp.records.map((row, rIdx) => (
                              <tr
                                key={row.id || rIdx}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                {columns.map((col) => (
                                  <td
                                    key={col.key}
                                    className={`py-2 px-3.5 border-r border-gray-100 last:border-r-0 ${
                                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                    }`}
                                  >
                                    {renderCell(col, row[col.key], row)}
                                  </td>
                                ))}
                              </tr>
                            ))}

                          {/* Group Subtotal Row (if not collapsed) */}
                          {!isCollapsed && (
                            <tr className="bg-slate-100/90 font-bold border-y border-slate-300 text-slate-900">
                              {columns.map((col, cIdx) => {
                                if (cIdx === 0) {
                                  return (
                                    <td key={col.key} className="py-2 px-3.5 text-xs italic text-indigo-900">
                                      Subtotal ({grp.group_label})
                                    </td>
                                  );
                                }
                                const subVal = grp.subtotals[col.key];
                                return (
                                  <td
                                    key={col.key}
                                    className={`py-2 px-3.5 border-r border-gray-200 last:border-r-0 ${
                                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                    }`}
                                  >
                                    {subVal !== undefined ? renderCell(col, subVal, {}) : ""}
                                  </td>
                                );
                              })}
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    /* Flat (Ungrouped) Paginated View */
                    paginatedRecords.map((row, rIdx) => (
                      <tr
                        key={row.id || rIdx}
                        className="hover:bg-slate-50 transition-colors even:bg-slate-50/40"
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`py-2 px-3.5 border-r border-gray-100 last:border-r-0 ${
                              col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                            }`}
                          >
                            {renderCell(col, row[col.key], row)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}

                  {records.length === 0 && (
                    <tr>
                      <td colSpan={columns.length} className="py-16 text-center text-gray-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium text-gray-600">No records found matching query criteria.</p>
                        <p className="text-xs text-gray-400 mt-1">Try expanding the date range or clearing filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Bar */}
            <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value === "All" ? "All" : Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-md font-medium text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value="All">All ({records.length})</option>
                </select>
                <span className="text-slate-400">|</span>
                <span className="font-mono text-slate-700">
                  Showing{" "}
                  <strong>
                    {records.length === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1}
                  </strong>{" "}
                  –{" "}
                  <strong>
                    {Math.min(currentPage * effectivePageSize, records.length)}
                  </strong>{" "}
                  of <strong>{records.length}</strong> entries
                </span>
              </div>

              {pageSize !== "All" && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage <= 1}
                    className="px-2 py-1 rounded bg-white border border-slate-300 font-medium disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1 rounded bg-white border border-slate-300 font-medium disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 font-mono font-semibold">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1 rounded bg-white border border-slate-300 font-medium disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    className="px-2 py-1 rounded bg-white border border-slate-300 font-medium disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── View 2: Multi-Page Landscape Print Layout Preview ───────────── */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-200/80">
            {/* Print Layout Toolbar */}
            <div className="px-6 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  Landscape A4 Sheets ({printSheets.length} Printed Pages)
                </span>
                <span className="text-[11px] text-slate-400">
                  • 297mm × 210mm • Repeating Headers on every sheet
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(40, z - 15))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-[11px] font-mono font-semibold px-1 text-slate-700">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(130, z + 15))}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 ml-1 cursor-pointer"
                  title="Reset Zoom"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* Stacked Physical Landscape A4 Sheets */}
            <div className="flex-1 overflow-auto p-8 flex flex-col items-center gap-8">
              {printSheets.map((sheetRows, sheetIdx) => (
                <div
                  key={sheetIdx}
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s ease-out",
                    width: "297mm",
                    minHeight: "210mm",
                    boxSizing: "border-box",
                  }}
                  className="bg-white shadow-2xl rounded-sm border border-slate-300 p-[12mm] flex flex-col justify-between relative my-2"
                >
                  {/* Sheet Content Area */}
                  <div>
                    {/* Running Header on every sheet */}
                    <div className="border-b-2 border-slate-800 pb-2 mb-3 flex items-center justify-between text-[9pt]">
                      <div>
                        <span className="font-extrabold text-slate-900 uppercase tracking-tight text-[11pt]">
                          {org_name}
                        </span>
                        <span className="text-slate-400 mx-2">•</span>
                        <span className="font-bold text-indigo-700">{report_title}</span>
                      </div>
                      <div className="text-[8pt] text-slate-500 font-mono">
                        {generated_at}
                      </div>
                    </div>

                    {/* Filter Summary on Page 1 */}
                    {sheetIdx === 0 && (
                      <div className="text-[8pt] text-slate-600 bg-slate-50 border border-slate-200 rounded p-1.5 mb-3">
                        <strong>Filters:</strong>{" "}
                        {Object.entries(filters_applied).length > 0
                          ? Object.entries(filters_applied)
                              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                              .join(" | ")
                          : "All Active Records"}{" "}
                        | <strong>Total Records:</strong> {total_records}
                      </div>
                    )}

                    {/* Repeating Table with dark header */}
                    <table className="w-full text-left border-collapse text-[8pt]">
                      <thead>
                        <tr>
                          {columns.map((col) => (
                            <th
                              key={col.key}
                              style={{ width: col.width }}
                              className={`bg-slate-900 text-white font-semibold text-[7.5pt] uppercase py-1.5 px-2 border border-slate-700 ${
                                col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                              }`}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sheetRows.map((row, rIdx) => (
                          <tr
                            key={row.id || rIdx}
                            className="even:bg-slate-50/60"
                          >
                            {columns.map((col) => (
                              <td
                                key={col.key}
                                className={`py-1 px-2 border border-slate-200 ${
                                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                }`}
                              >
                                {renderCell(col, row[col.key], row)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Grand totals on the final sheet */}
                    {sheetIdx === printSheets.length - 1 && Object.keys(grand_totals).length > 0 && (
                      <div className="mt-3 p-2 bg-slate-100 border border-slate-300 flex items-center justify-between text-[8.5pt]">
                        <span className="font-extrabold text-slate-800 uppercase">
                          GRAND TOTAL ({total_records} Records)
                        </span>
                        <div className="flex items-center gap-4 font-mono font-bold text-slate-900">
                          {Object.entries(grand_totals).map(([k, v]) => (
                            <span key={k}>
                              {k}: {Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Running Sheet Footer */}
                  <div className="border-t border-slate-300 pt-2 mt-4 flex items-center justify-between text-[7.5pt] text-slate-400 font-semibold uppercase tracking-wider">
                    <span>CLASSIFICATION: INTERNAL OPERATIONAL REGISTER</span>
                    <span>
                      Page {sheetIdx + 1} of {printSheets.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grand Total Sticky Footer Bar (In Table View) */}
        {viewMode === "table" && records.length > 0 && Object.keys(grand_totals).length > 0 && (
          <div className="px-6 py-2.5 bg-slate-900 text-white border-t border-slate-700 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/50">
                GRAND TOTAL
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {total_records} records aggregated
              </span>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              {Object.entries(grand_totals).map(([k, v]) => {
                const colDef = columns.find((c) => c.key === k);
                const label = colDef ? colDef.label : k.replace(/_/g, " ");
                const formatted =
                  colDef?.data_type === "currency"
                    ? `$ ${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase font-medium">{label}:</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">{formatted}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
