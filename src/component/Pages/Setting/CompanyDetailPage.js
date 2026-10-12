import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Blocks, Building2, Hash, Loader2, Save, Stamp, Users } from "lucide-react";
import { toast } from "react-toastify";

import { useAuth } from "../../../context/AuthContext";
import { errorText } from "../../../utils/apiError";
import { ordersApi } from "../../../services/ordersApi";
import OrgPrintProfilePanel from "../ReportTemplates/OrgPrintProfilePanel";
import {
  PageHeader,
  buttonClass,
  cardClass,
  fieldClass,
  settingsPageClass,
} from "../Orders/OrderUi";

/**
 * Everything about one company, in one place.
 *
 * Identity, numbering and the print profile were three screens, each organised
 * around the setting with the company as a row, a column or a dropdown. Here
 * the company is the subject and its settings are tabs, so "is this company
 * ready?" is answerable without leaving the page.
 *
 * Each tab carries the permission its old screen carried. A tab the person
 * cannot use is not rendered, rather than the whole page becoming root-only
 * because one tab is.
 */

// What a company has subscribed to. Thirty-two routes are gated on these, and
// access_policy builds its module map from them, so switching one off removes
// those screens for everyone in that company.
const MODULES = [
  { id: "LOGISTICS", label: "Logistics", hint: "Containers, bills of lading, demurrage" },
  { id: "ORDERS", label: "Orders", hint: "Requisitions, RFQs, purchase orders, receiving" },
  { id: "INVENTORY", label: "Inventory", hint: "Products, stock and valuation" },
];

const RESET_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function CompanyDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { permissions = [], isSuperAdmin } = useAuth();

  const isNew = companyId === "new";
  const canEditIdentity =
    isSuperAdmin ||
    permissions.includes("Manage_TenantConsole") ||
    permissions.includes("Edit_Setting");
  const canSeeNumbering =
    isSuperAdmin || permissions.includes("View_Setting") || permissions.includes("Edit_Setting");
  const canSeePrint = canSeeNumbering;

  const [company, setCompany] = useState(null);
  const [series, setSeries] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [identity, setIdentity] = useState({ display_name: "", name: "", is_active: true });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(null);
  const [activeTab, setActiveTab] = useState("identity");
  const [modules, setModules] = useState([]);

  const load = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      const { data } = await axios.get(
        `${process.env.REACT_APP_NETWORK}/organisations/configuration`,
        { headers }
      );
      const found = (Array.isArray(data) ? data : []).find(
        (row) => String(row.id) === String(companyId)
      );
      if (!found) {
        toast.error("That company is not available to you.");
        navigate("/settings/companies");
        return;
      }
      setCompany(found);
      setIdentity({
        display_name: found.display_name || "",
        name: found.name || "",
        is_active: Boolean(found.is_active),
      });
      setModules(found.modules || []);

      // Numbering lives behind the admin console, so a company administrator
      // may legitimately not get it; the tab is hidden rather than erroring.
      if (canSeeNumbering) {
        try {
          const settings = await ordersApi.adminSettings();
          const match = (settings.companies || []).find(
            (row) => String(row.id) === String(companyId)
          );
          setSeries(match?.number_series || []);
        } catch {
          setSeries([]);
        }
      }
    } catch (err) {
      toast.error(await errorText(err, "Could not load this company."));
    } finally {
      setLoading(false);
    }
  }, [companyId, isNew, navigate, canSeeNumbering]);

  useEffect(() => {
    load();
  }, [load]);

  const saveIdentity = async () => {
    setSaving("identity");
    try {
      if (isNew) {
        const { data } = await axios.post(
          `${process.env.REACT_APP_NETWORK}/organisations`,
          {
            name: identity.name.trim(),
            display_name: identity.display_name.trim(),
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        toast.success(`${data.display_name || data.name} created.`);
        // Straight into the company just created, so its remaining tabs can be
        // filled in without going back to the list.
        navigate(`/settings/companies/${data.id}`);
        return;
      }
      await axios.patch(
        `${process.env.REACT_APP_NETWORK}/organisations/${companyId}`,
        { display_name: identity.display_name.trim(), is_active: identity.is_active },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Company details saved.");
      await load();
    } catch (err) {
      toast.error(await errorText(err, "Could not save this company."));
    } finally {
      setSaving(null);
    }
  };

  const saveModules = async () => {
    setSaving("modules");
    try {
      await axios.patch(
        `${process.env.REACT_APP_NETWORK}/organisations/${companyId}`,
        { modules },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Modules saved.");
      await load();
    } catch (err) {
      toast.error(await errorText(err, "Could not save modules."));
    } finally {
      setSaving(null);
    }
  };

  const valueOf = (row, key) =>
    drafts[row.id]?.[key] !== undefined ? drafts[row.id][key] : row[key];

  const setValue = (id, key, value) =>
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] || {}), [key]: value } }));

  const saveSeries = async (row) => {
    setSaving(row.id);
    try {
      const payload = {};
      ["prefix", "suffix", "padding", "next_number", "reset_policy", "date_token", "is_active"]
        .forEach((key) => {
          payload[key] = valueOf(row, key);
        });
      const saved = await ordersApi.updateNumberSeries(row.id, payload);
      if (saved?.warning) toast.warning(saved.warning);
      else toast.success(`${saved.doc_label} numbering saved.`);
      setDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (err) {
      toast.error(await errorText(err, "Could not save numbering."));
    } finally {
      setSaving(null);
    }
  };

  const tabs = useMemo(() => {
    const list = [{ id: "identity", label: "Details", icon: Building2 }];
    if (!isNew) list.push({ id: "modules", label: "Modules", icon: Blocks });
    if (!isNew && canSeeNumbering) list.push({ id: "numbering", label: "Numbering", icon: Hash });
    if (!isNew && canSeePrint) list.push({ id: "print", label: "Print profile", icon: Stamp });
    if (!isNew) list.push({ id: "users", label: "Users", icon: Users });
    return list;
  }, [isNew, canSeeNumbering, canSeePrint]);

  if (loading) {
    return (
      <div className={settingsPageClass}>
        <p className="flex items-center gap-2 text-sm opacity-60">
          <Loader2 className="animate-spin" size={16} /> Loading company…
        </p>
      </div>
    );
  }

  return (
    <div className={settingsPageClass}>
      <button
        className="mb-3 flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100"
        onClick={() => navigate("/settings/companies")}
      >
        <ArrowLeft size={15} /> All companies
      </button>

      <PageHeader
        title={isNew ? "New company" : identity.display_name || "Company"}
        description={
          isNew
            ? "Create the company here, then fill in its numbering and print profile on the tabs that appear."
            : "Details, numbering and print profile for this company."
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-700 dark:text-blue-300"
                : "border-transparent opacity-65 hover:opacity-100"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "identity" && (
        <section className={`${cardClass} p-4`}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Company name</span>
              <input
                className={fieldClass}
                disabled={!canEditIdentity}
                onChange={(event) =>
                  setIdentity((current) => ({ ...current, display_name: event.target.value }))
                }
                value={identity.display_name}
              />
            </label>
            {isNew && (
              <label className="text-sm">
                <span className="mb-1 block font-medium">Short code</span>
                <input
                  className={fieldClass}
                  onChange={(event) =>
                    setIdentity((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="noblecon"
                  value={identity.name}
                />
                <span className="mt-1 block text-xs opacity-60">
                  Used internally and cannot be changed afterwards.
                </span>
              </label>
            )}
            {!isNew && (
              <label className="flex items-center gap-2 self-end text-sm">
                <input
                  checked={identity.is_active}
                  className="h-4 w-4"
                  disabled={!canEditIdentity}
                  onChange={(event) =>
                    setIdentity((current) => ({ ...current, is_active: event.target.checked }))
                  }
                  type="checkbox"
                />
                Active
              </label>
            )}
          </div>
          {canEditIdentity && (
            <div className="mt-4">
              <button
                className={buttonClass}
                disabled={saving === "identity" || !identity.display_name.trim()}
                onClick={saveIdentity}
              >
                <Save size={15} />
                {saving === "identity" ? "Saving…" : isNew ? "Create company" : "Save details"}
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === "modules" && (
        <section className={`${cardClass} p-4`}>
          <p className="mb-3 text-sm opacity-70">
            What this company has subscribed to. Switching one off hides those
            screens for everyone in the company; it does not delete any data.
          </p>
          <div className="space-y-2">
            {MODULES.map((module) => (
              <label
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                key={module.id}
              >
                <input
                  checked={modules.includes(module.id)}
                  className="mt-0.5 h-4 w-4"
                  disabled={!isSuperAdmin}
                  onChange={(event) =>
                    setModules((current) =>
                      event.target.checked
                        ? [...current, module.id]
                        : current.filter((id) => id !== module.id)
                    )
                  }
                  type="checkbox"
                />
                <span className="text-sm">
                  <span className="font-medium">{module.label}</span>
                  <span className="block text-xs opacity-60">{module.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {isSuperAdmin ? (
            <button className={`${buttonClass} mt-4`} disabled={saving === "modules"} onClick={saveModules}>
              <Save size={15} />
              {saving === "modules" ? "Saving…" : "Save modules"}
            </button>
          ) : (
            <p className="mt-3 text-xs opacity-60">
              Only a root administrator can change which modules a company has.
            </p>
          )}
        </section>
      )}

      {activeTab === "numbering" && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide dark:bg-gray-800/60">
                <tr>
                  <th className="px-3 py-2 font-semibold">Document</th>
                  <th className="px-3 py-2 font-semibold">Prefix</th>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Starts from</th>
                  <th className="px-3 py-2 font-semibold">Digits</th>
                  <th className="px-3 py-2 font-semibold">Postfix</th>
                  <th className="px-3 py-2 font-semibold">Reset</th>
                  <th className="px-3 py-2 font-semibold">On</th>
                  <th className="px-3 py-2 font-semibold">Next</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {series.map((row) => (
                  <tr key={row.id} className={drafts[row.id] ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}>
                    <td className="px-3 py-2 whitespace-nowrap">{row.doc_label}</td>
                    <td className="px-3 py-2">
                      <input
                        className={`${fieldClass} w-28`}
                        onChange={(event) => setValue(row.id, "prefix", event.target.value)}
                        value={valueOf(row, "prefix") || ""}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${fieldClass} w-24`}
                        onChange={(event) => setValue(row.id, "date_token", event.target.value)}
                        placeholder="%y%m%d-"
                        title="Optional date between the prefix and the number, e.g. %y%m%d- gives 261012-"
                        value={valueOf(row, "date_token") || ""}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${fieldClass} w-28`}
                        min={1}
                        onChange={(event) => setValue(row.id, "next_number", event.target.value)}
                        type="number"
                        value={valueOf(row, "next_number") ?? 1}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${fieldClass} w-20`}
                        max={12}
                        min={0}
                        onChange={(event) => setValue(row.id, "padding", event.target.value)}
                        type="number"
                        value={valueOf(row, "padding") ?? 4}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${fieldClass} w-24`}
                        onChange={(event) => setValue(row.id, "suffix", event.target.value)}
                        value={valueOf(row, "suffix") || ""}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={`${fieldClass} w-28`}
                        onChange={(event) => setValue(row.id, "reset_policy", event.target.value)}
                        value={valueOf(row, "reset_policy") || "never"}
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
                        checked={Boolean(valueOf(row, "is_active"))}
                        className="h-4 w-4"
                        onChange={(event) => setValue(row.id, "is_active", event.target.checked)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">
                        {row.preview}
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className={buttonClass}
                        disabled={!drafts[row.id] || saving === row.id}
                        onClick={() => saveSeries(row)}
                      >
                        <Save size={14} />
                        {saving === row.id ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
                {series.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-sm opacity-60" colSpan={10}>
                      Numbering for this company is managed by a root administrator.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "print" && (
        <OrgPrintProfilePanel canEdit={canEditIdentity} key={companyId} orgId={Number(companyId)} />
      )}

      {activeTab === "users" && (
        <section className={`${cardClass} p-4 text-sm`}>
          <p>
            <strong>{company?.user_count ?? 0}</strong> user
            {company?.user_count === 1 ? "" : "s"} belong to this company.
          </p>
          <p className="mt-2 opacity-70">
            Users and roles are managed together for all companies, so that they can be
            compared in one place.
          </p>
          <button className={`${buttonClass} mt-3`} onClick={() => navigate("/settings")}>
            Open Users &amp; access
          </button>
        </section>
      )}
    </div>
  );
}
