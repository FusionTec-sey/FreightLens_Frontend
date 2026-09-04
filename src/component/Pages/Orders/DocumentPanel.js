import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileUp, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { notifyOrderError, ordersApi } from "../../../services/ordersApi";
import { buttonClass, fieldClass, secondaryButtonClass } from "./OrderUi";

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function DocumentPanel({
  requestId,
  purchaseOrderId,
  defectReportId,
  title = "Supporting documents",
  description = "Upload and retain evidence against this order record.",
  allowedTypes,
  onUploaded,
}) {
  const { permissions, isRoot } = useAuth();
  const canDelete =
    permissions.includes("Delete_Document") ||
    permissions.includes("Manage_Orders") ||
    permissions.includes("Delete_Defect") ||
    isRoot ||
    permissions.includes("Administrator");
  const canUpload =
    permissions.includes("Upload_Document") ||
    permissions.includes("Edit_Document") ||
    permissions.includes("Add_Order") ||
    permissions.includes("Add_Defect") ||
    permissions.includes("Edit_Defect") ||
    isRoot ||
    permissions.includes("Administrator");
  const [documents, setDocuments] = useState([]);
  const [types, setTypes] = useState([]);
  const [documentType, setDocumentType] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = useMemo(
    () => ({
      ...(requestId ? { request_id: requestId } : {}),
      ...(purchaseOrderId ? { purchase_order_id: purchaseOrderId } : {}),
      ...(defectReportId ? { defect_report_id: defectReportId } : {}),
    }),
    [defectReportId, purchaseOrderId, requestId]
  );

  const load = useCallback(async () => {
    try {
      const [config, rows] = await Promise.all([
        ordersApi.documentConfig(),
        ordersApi.documents(params),
      ]);
      const available = (config.document_types || []).filter(
        (type) =>
          type.can_upload && (!allowedTypes || allowedTypes.includes(type.value))
      );
      setTypes(available);
      setDocumentType((current) => current || available[0]?.value || "");
      setDocuments(rows);
    } catch (error) {
      notifyOrderError(error);
    }
  }, [allowedTypes, params]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    if (!file || !documentType) {
      toast.error("Choose a document type and file.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("document_type", documentType);
      if (requestId) form.append("request_id", requestId);
      if (purchaseOrderId) form.append("purchase_order_id", purchaseOrderId);
      if (defectReportId) form.append("defect_report_id", defectReportId);
      form.append("file", file);
      await ordersApi.uploadDocument(form);
      toast.success("Document saved.");
      setFile(null);
      await load();
      onUploaded?.();
    } catch (error) {
      notifyOrderError(error);
    } finally {
      setBusy(false);
    }
  };

  const download = async (row) => {
    try {
      downloadBlob(await ordersApi.downloadDocument(row.id), row.original_name);
    } catch (error) {
      notifyOrderError(error);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.original_name} from the document register?`)) return;
    try {
      await ordersApi.deleteDocument(row.id);
      toast.success("Document removed from the register.");
      await load();
    } catch (error) {
      notifyOrderError(error);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-xs opacity-60">{description}</p>
      </div>

      {canUpload && types.length > 0 && (
        <div className="grid gap-3 border-b border-gray-200 dark:border-gray-700 p-4 md:grid-cols-[240px_1fr_auto] md:items-end">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Document type</span>
            <select
              className={fieldClass}
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
            >
              {types.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">File (maximum 25 MB)</span>
            <input
              className={fieldClass}
              type="file"
              accept=".pdf,.xlsx,.xlsm,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <button className={buttonClass} disabled={busy || !file} onClick={upload}>
            <FileUp className="mr-1 inline" size={16} />
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {documents.map((row) => (
          <div
            className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            key={row.id}
          >
            <div>
              <p className="font-medium">{row.original_name}</p>
              <p className="text-xs opacity-60">
                {row.document_label} · {row.uploaded_by || "System"} ·{" "}
                {new Date(row.uploaded_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button className={secondaryButtonClass} onClick={() => download(row)}>
                <Download className="mr-1 inline" size={15} />
                Download
              </button>
              {canDelete && (
                <button
                  className="rounded-lg border border-red-300 dark:border-red-800 px-3 py-2 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => remove(row)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
        {documents.length === 0 && (
          <p className="p-5 text-center text-sm opacity-60">
            No supporting documents recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}
