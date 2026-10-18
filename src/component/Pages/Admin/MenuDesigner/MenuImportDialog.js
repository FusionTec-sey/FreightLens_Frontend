import React, { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileJson, Loader2, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { importMenu, previewMenuImport } from "../../../../services/navigationApi";

/**
 * Bring a menu in from a file.
 *
 * Two steps on purpose: read the file and say what it would do, then do it.
 * The preview is the same check the save runs, so what it promises is what
 * happens, and an import from another installation stops being a leap.
 */
export default function MenuImportDialog({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setDocument(null);
    setFileName("");
    setReport(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  const readFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setReport(null);
    setFileName(file.name);
    try {
      const parsed = JSON.parse(await file.text());
      setDocument(parsed);
      setReport(await previewMenuImport(parsed));
    } catch (err) {
      const detail = err?.response?.data?.detail;
      // A file that is not JSON at all never reaches the server, so say so here.
      setReport({ can_import: false, message: detail || "That file is not a menu export." });
      setDocument(null);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!document || !report?.can_import) return;
    setBusy(true);
    try {
      const made = await importMenu(document);
      toast.success(`Imported "${made.name}". Assign a role to it so people can see it.`);
      onImported?.(made);
      close();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not import that menu");
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Upload size={16} className="text-indigo-500" /> Import a menu
          </h3>
          <button onClick={close} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full px-4 py-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 transition text-center"
          >
            <FileJson size={22} className="mx-auto text-slate-400 mb-1.5" />
            <span className="text-sm font-medium block">
              {fileName || "Choose a menu file"}
            </span>
            <span className="text-[11px] text-slate-400">
              The .json a menu was exported to, from here or from another installation
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => readFile(e.target.files?.[0])}
          />

          {busy && !report && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Loader2 size={13} className="animate-spin" /> Reading it…
            </p>
          )}

          {report && report.can_import && (
            <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/10 space-y-1.5">
              <p className="text-sm font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={15} /> Ready to import
              </p>
              <dl className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <div className="flex justify-between gap-3">
                  <dt>Will be named</dt>
                  <dd className="font-semibold">{report.final_name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Items</dt>
                  <dd>
                    {report.item_count} ({report.page_count} pages,{" "}
                    {report.separator_count} headings)
                  </dd>
                </div>
                {report.exported_from && (
                  <div className="flex justify-between gap-3">
                    <dt>Designed in</dt>
                    <dd>{report.exported_from}</dd>
                  </div>
                )}
              </dl>
              {report.final_name !== report.name && (
                <p className="text-[11px] text-slate-500">
                  A menu called “{report.name}” already exists here, so this one is named
                  differently. Nothing existing is replaced.
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                It will reach nobody until you assign a role to it.
              </p>
            </div>
          )}

          {report && !report.can_import && (
            <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-900/10 space-y-1.5">
              <p className="text-sm font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle size={15} /> This menu cannot be imported here
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{report.message}</p>
              {report.missing_pages?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {report.missing_pages.map((key) => (
                    <span
                      key={key}
                      className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-[10px] font-mono"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={close}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!report?.can_import || busy}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium inline-flex items-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
