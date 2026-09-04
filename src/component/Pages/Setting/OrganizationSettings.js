import React, { useCallback, useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
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

export default function OrganizationSettings() {
  const { permissions } = useAuth();
  const canEdit = permissions.includes("Edit_Setting");
  const [groups, setGroups] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ordersApi.adminSettings();
      setGroups(result.groups || []);
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

  const saveGroup = async (group) => {
    try {
      await ordersApi.updateCompanyGroup(group.id, { name: group.name });
      toast.success("Organization name saved.");
      await load();
    } catch (error) {
      notifyOrderError(error);
    }
  };

  const saveCompany = async (company) => {
    try {
      await ordersApi.updateCompanySettings(company.id, {
        name: company.name,
        request_prefix: company.request_prefix,
        po_prefix: company.po_prefix,
        active: company.active,
      });
      toast.success(`${company.code} company settings saved.`);
      await load();
    } catch (error) {
      notifyOrderError(error);
    }
  };

  return (
    <div className={settingsPageClass}>
      <PageHeader
        title="Organization & companies"
        description="Maintain the group identity and companies used across dashboards, orders, shipments, defects and reports."
      />

      {!canEdit && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-900 dark:text-blue-100">
          You have read-only access to organization settings.
        </div>
      )}

      {loading && <p className="text-sm opacity-60">Loading organization settings…</p>}

      {!loading &&
        groups.map((group, index) => (
          <section key={group.id} className={`${cardClass} mb-5 p-4`}>
            <div className="mb-3 flex items-center gap-2">
              <Building2 size={18} />
              <h2 className="font-semibold">Organization group</h2>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1 block font-medium">Group name</span>
                <input
                  className={fieldClass}
                  value={group.name}
                  disabled={!canEdit}
                  onChange={(event) =>
                    setGroups((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, name: event.target.value } : row
                      )
                    )
                  }
                />
              </label>
              {canEdit && (
                <button className={buttonClass} onClick={() => saveGroup(group)}>
                  <Save className="mr-1" size={16} />
                  Save group
                </button>
              )}
            </div>
          </section>
        ))}

      <section className={`${cardClass} overflow-hidden`}>
        <div className={settingsCardHeaderClass}>
          <h2 className="font-semibold">Companies</h2>
          <p className="mt-1 text-xs opacity-65">
            Company codes remain fixed identifiers. Deactivating a company prevents new records while preserving its history.
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {companies.map((company, index) => (
            <div
              key={company.id}
              className="grid gap-3 p-4 xl:grid-cols-[120px_1fr_130px_auto] xl:items-end"
            >
              <div className="text-sm">
                <span className="mb-1 block font-medium">Code</span>
                <div className="min-h-[44px] rounded-xl bg-gray-100 dark:bg-gray-800 px-3 py-3 font-semibold">
                  {company.code}
                </div>
              </div>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Company name</span>
                <input
                  className={fieldClass}
                  disabled={!canEdit}
                  value={company.name}
                  onChange={(event) =>
                    setCompanies((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, name: event.target.value } : row
                      )
                    )
                  }
                />
              </label>
              <label className="flex min-h-[44px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={company.active}
                  onChange={(event) =>
                    setCompanies((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, active: event.target.checked } : row
                      )
                    )
                  }
                />
                Active company
              </label>
              {canEdit && (
                <button
                  aria-label={`Save ${company.name}`}
                  className={buttonClass}
                  onClick={() => saveCompany(company)}
                >
                  <Save size={16} />
                  Save
                </button>
              )}
            </div>
          ))}
          {!loading && companies.length === 0 && (
            <p className="p-6 text-center text-sm opacity-60">No companies configured.</p>
          )}
        </div>
      </section>
    </div>
  );
}
