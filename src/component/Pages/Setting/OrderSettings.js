import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Hash, Save } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { ordersApi, notifyOrderError } from "../../../services/ordersApi";
import {
  PageHeader,
  buttonClass,
  cardClass,
  fieldClass,
  settingsCardHeaderClass,
  settingsPageClass,
} from "../Orders/OrderUi";

/**
 * How each company numbers each kind of document.
 *
 * This screen used to show a "Request prefix" and "PO prefix" per company and
 * report success on save. Nothing was stored: the server computed both from the
 * company code on every read and echoed your input back without persisting it.
 * They now come from a configured series, one per company per document type.
 *
 * The preview is rendered by the server from the same function that issues the
 * number, so what is shown here cannot drift from what a document will get.
 */

const RESET_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const FIELD_KEYS = [
  "prefix",
  "suffix",
  "padding",
  "next_number",
  "reset_policy",
  "date_token",
  "is_active",
];

export default function OrderSettings() {
  const { permissions } = useAuth();
  const canEdit = permissions.includes("Edit_Setting");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [accessError, setAccessError] = useState(null);
  // Edits held per series id until saved, so one row's changes cannot be lost
  // by a reload triggered from another row.
  const [drafts, setDrafts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ordersApi.adminSettings();
      setCompanies(result.companies || []);
      setDrafts({});
      setAccessError(null);
    } catch (error) {
      // Numbering is behind root administrator access. Say so, rather than
      // leaving an empty table that looks like nothing has been set up.
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        setCompanies([]);
        setAccessError(
          "Document numbering can only be opened by a root administrator. " +
            "Sign in with the super administrator account, or ask for that access."
        );
      } else {
        notifyOrderError(error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seriesRows = useMemo(
    () =>
      companies.flatMap((company) =>
        (company.number_series || []).map((series) => ({
          ...series,
          companyName: company.name,
          companyCode: company.code,
        }))
      ),
    [companies]
  );

  const valueOf = (series, key) =>
    drafts[series.id]?.[key] !== undefined ? drafts[series.id][key] : series[key];

  const setValue = (seriesId, key, value) =>
    setDrafts((current) => ({
      ...current,
      [seriesId]: { ...(current[seriesId] || {}), [key]: value },
    }));

  const isDirty = (seriesId) => Boolean(drafts[seriesId]);

  const saveSeries = async (series) => {
    setSaving(series.id);
    try {
      const payload = {};
      FIELD_KEYS.forEach((key) => {
        payload[key] = valueOf(series, key);
      });
      const saved = await ordersApi.updateNumberSeries(series.id, payload);
      // Lowering the counter below what was issued is allowed, and reported.
      if (saved?.warning) toast.warning(saved.warning);
      else toast.success(`${series.companyCode} ${saved.doc_label} numbering saved.`);
      await load();
    } catch (error) {
      notifyOrderError(error);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className={settingsPageClass}>
      <PageHeader
        title="Document numbering"
        description="The prefix, start number and reset for each kind of document, per company. Existing documents keep the numbers they already have."
      />

      {!canEdit && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-900 dark:text-blue-100">
          You have read-only access to order settings.
        </div>
      )}

      {accessError && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {accessError}
        </div>
      )}

      {loading && <p className="text-sm opacity-60">Loading document numbering…</p>}

      {!loading && !accessError && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className={settingsCardHeaderClass}>
            <div className="flex items-center gap-2">
              <Hash size={18} />
              <h2 className="font-semibold">Numbering by company and document</h2>
            </div>
            <p className="mt-1 text-xs opacity-65">
              A document type that is switched off keeps the system's built-in
              format. Switch one on to use the prefix and start number below.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide dark:bg-gray-800/60">
                <tr>
                  <th className="px-3 py-2 font-semibold">Company</th>
                  <th className="px-3 py-2 font-semibold">Document</th>
                  <th className="px-3 py-2 font-semibold">Prefix</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Starts from</th>
                  <th className="px-3 py-2 font-semibold">Digits</th>
                  <th className="px-3 py-2 font-semibold">Postfix</th>
                  <th className="px-3 py-2 font-semibold">Reset</th>
                  <th className="px-3 py-2 font-semibold">On</th>
                  <th className="px-3 py-2 font-semibold">Next number</th>
                  {canEdit && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {seriesRows.map((series) => (
                  <tr
                    key={series.id}
                    className={isDirty(series.id) ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{series.companyName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{series.doc_label}</td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Prefix for ${series.companyCode} ${series.doc_label}`}
                        className={`${fieldClass} w-28`}
                        disabled={!canEdit}
                        onChange={(event) => setValue(series.id, "prefix", event.target.value)}
                        value={valueOf(series, "prefix") || ""}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Date format for ${series.companyCode} ${series.doc_label}`}
                        className={`${fieldClass} w-24`}
                        disabled={!canEdit}
                        onChange={(event) => setValue(series.id, "date_token", event.target.value)}
                        placeholder="%y%m%d-"
                        title="Optional. A date inserted between the prefix and the number, e.g. %y%m%d- gives 261012-"
                        value={valueOf(series, "date_token") || ""}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Start number for ${series.companyCode} ${series.doc_label}`}
                        className={`${fieldClass} w-28`}
                        disabled={!canEdit}
                        min={1}
                        onChange={(event) => setValue(series.id, "next_number", event.target.value)}
                        type="number"
                        value={valueOf(series, "next_number") ?? 1}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Digits for ${series.companyCode} ${series.doc_label}`}
                        className={`${fieldClass} w-20`}
                        disabled={!canEdit}
                        max={12}
                        min={0}
                        onChange={(event) => setValue(series.id, "padding", event.target.value)}
                        type="number"
                        value={valueOf(series, "padding") ?? 4}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label={`Postfix for ${series.companyCode} ${series.doc_label}`}
                        className={`${fieldClass} w-24`}
                        disabled={!canEdit}
                        onChange={(event) => setValue(series.id, "suffix", event.target.value)}
                        value={valueOf(series, "suffix") || ""}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Reset for ${series.companyCode} ${series.doc_label}`}
                        className={`${fieldClass} w-28`}
                        disabled={!canEdit}
                        onChange={(event) => setValue(series.id, "reset_policy", event.target.value)}
                        value={valueOf(series, "reset_policy") || "never"}
                      >
                        {RESET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        aria-label={`Use this numbering for ${series.companyCode} ${series.doc_label}`}
                        checked={Boolean(valueOf(series, "is_active"))}
                        className="h-4 w-4"
                        disabled={!canEdit}
                        onChange={(event) => setValue(series.id, "is_active", event.target.checked)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                        {series.preview}
                      </code>
                      {isDirty(series.id) && (
                        <span className="ml-2 text-[11px] opacity-60">save to refresh</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2">
                        <button
                          aria-label={`Save numbering for ${series.companyName} ${series.doc_label}`}
                          className={buttonClass}
                          disabled={!isDirty(series.id) || saving === series.id}
                          onClick={() => saveSeries(series)}
                        >
                          <Save size={14} />
                          {saving === series.id ? "Saving…" : "Save"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {seriesRows.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-sm opacity-60" colSpan={canEdit ? 11 : 10}>
                      No numbering configured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
