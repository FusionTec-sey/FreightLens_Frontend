import React, { useState } from "react";
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

  if (!datasetResult) return null;

  const {
    report_title,
    category,
    generated_at,
    generated_by,
    org_name,
    filters_applied = {},
    columns = [],
    records = [],
    total_records = 0,
    is_grouped = false,
    group_field = "",
    groups = [],
    grand_totals = {},
  } = datasetResult;

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

    return <span className="text-gray-800">{String(value)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full h-full max-h-[96vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
              title="Back to Catalog"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 tracking-wider uppercase">
                  {category} REGISTER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {total_records} Records {is_grouped ? `across ${groups.length} Groups` : ""}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
                {report_title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onModifyFilters}
              className="px-3.5 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition flex items-center gap-1.5 shadow-sm"
            >
              <Filter className="w-3.5 h-3.5" />
              Modify Query
            </button>

            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="px-4 py-2 text-xs font-semibold text-emerald-100 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/40 rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {exportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Excel (.xlsx)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 rounded-lg transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              Print / PDF
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Sub-header Context Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 shrink-0">
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

        {/* Scrollable Viewport Table */}
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
                /* Flat (Ungrouped) View */
                records.map((row, rIdx) => (
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

        {/* Grand Total Sticky Footer Bar */}
        {records.length > 0 && Object.keys(grand_totals).length > 0 && (
          <div className="px-6 py-3 bg-slate-900 text-white border-t border-slate-700 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
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
