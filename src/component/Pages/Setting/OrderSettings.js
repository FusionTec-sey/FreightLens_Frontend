import React, { useCallback, useEffect, useState } from "react";
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

export default function OrderSettings() {
  const { permissions } = useAuth();
  const canEdit = permissions.includes("Edit_Setting");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ordersApi.adminSettings();
      setCompanies(result.companies || []);
    } catch (error) {
      notifyOrderError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCompany = async (company) => {
    try {
      await ordersApi.updateCompanySettings(company.id, {
        name: company.name,
        request_prefix: company.request_prefix,
        po_prefix: company.po_prefix,
        active: company.active,
      });
      toast.success(`${company.code} numbering saved.`);
      await load();
    } catch (error) {
      notifyOrderError(error);
    }
  };

  return (
    <div className={settingsPageClass}>
      <PageHeader
        title="Orders & procurement"
        description="Maintain company-specific numbering used when Freightliner creates requests and purchase orders."
      />

      {!canEdit && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-900 dark:text-blue-100">
          You have read-only access to order settings.
        </div>
      )}

      {loading && <p className="text-sm opacity-60">Loading order settings…</p>}

      {!loading && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className={settingsCardHeaderClass}>
            <div className="flex items-center gap-2">
              <Hash size={18} />
              <h2 className="font-semibold">Company numbering</h2>
            </div>
            <p className="mt-1 text-xs opacity-65">
              Changes apply only to records created after the change. Existing request and PO numbers remain unchanged.
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {companies.map((company, index) => (
              <div
                key={company.id}
                className="grid gap-3 p-4 xl:grid-cols-[150px_1fr_1fr_auto] xl:items-end"
              >
                <div className="text-sm">
                  <span className="mb-1 block font-medium">Company</span>
                  <div className="min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-3 font-semibold">
                    {company.name}
                  </div>
                </div>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Request prefix</span>
                  <input
                    className={fieldClass}
                    disabled={!canEdit}
                    value={company.request_prefix || ""}
                    onChange={(event) =>
                      setCompanies((rows) =>
                        rows.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, request_prefix: event.target.value }
                            : row
                        )
                      )
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">PO prefix</span>
                  <input
                    className={fieldClass}
                    disabled={!canEdit}
                    value={company.po_prefix || ""}
                    onChange={(event) =>
                      setCompanies((rows) =>
                        rows.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, po_prefix: event.target.value }
                            : row
                        )
                      )
                    }
                  />
                </label>
                {canEdit && (
                  <button
                    aria-label={`Save numbering for ${company.name}`}
                    className={buttonClass}
                    onClick={() => saveCompany(company)}
                  >
                    <Save size={16} />
                    Save
                  </button>
                )}
              </div>
            ))}
            {companies.length === 0 && (
              <p className="p-6 text-center text-sm opacity-60">No companies found.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
