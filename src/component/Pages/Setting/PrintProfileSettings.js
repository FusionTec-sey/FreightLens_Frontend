import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import { useAuth } from "../../../context/AuthContext";
import { errorText } from "../../../utils/apiError";
import OrgPrintProfilePanel from "../ReportTemplates/OrgPrintProfilePanel";
import { PageHeader, cardClass, fieldClass, settingsPageClass } from "../Orders/OrderUi";

/**
 * Letterhead, stamp, bank details and print defaults, per company.
 *
 * A print profile belongs to one company, so with several of them the panel
 * needs to say which one it is editing and let you choose. Living inside Print &
 * Reports it did neither: it edited whichever company the top bar happened to be
 * on, and in All-companies mode silently fell back to your own.
 *
 * The company is sent as X-Active-Org per request, so picking one here does not
 * disturb the switcher, and the server still refuses a company you may not open.
 */
export default function PrintProfileSettings() {
  const { permissions = [], isSuperAdmin, orgId, selectedOrgId } = useAuth();

  const [organisations, setOrganisations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState(selectedOrgId || orgId || null);

  const canEdit =
    isSuperAdmin ||
    permissions.includes("Manage_Print_Profile") ||
    permissions.includes("Manage_Report_Template");

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${process.env.REACT_APP_NETWORK}/organisations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.items || [];
        setOrganisations(list);
        setActiveOrgId((current) => current || list[0]?.id || null);
      })
      .catch(async (err) => {
        if (cancelled) return;
        toast.error(await errorText(err, "Could not load the list of companies."));
      })
      .finally(() => {
        if (!cancelled) setLoadingOrgs(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrg = useMemo(
    () => organisations.find((org) => org.id === activeOrgId) || null,
    [organisations, activeOrgId]
  );

  return (
    <div className={settingsPageClass}>
      <PageHeader
        title="Print profile"
        description="The letterhead, stamp, bank details and print defaults used on this company's documents. Each company has its own."
      />

      <section className={`${cardClass} mb-4 p-4`}>
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          htmlFor="print-profile-org"
        >
          Company
        </label>
        {loadingOrgs ? (
          <div className="mt-2 flex items-center gap-2 text-sm opacity-70">
            <Loader2 className="animate-spin" size={16} /> Loading companies…
          </div>
        ) : organisations.length <= 1 ? (
          <p className="mt-2 flex items-center gap-2 text-sm">
            <Building2 size={16} className="opacity-60" />
            {activeOrg?.display_name || activeOrg?.name || "Your company"}
          </p>
        ) : (
          <>
            <select
              className={`${fieldClass} mt-1.5 max-w-md`}
              id="print-profile-org"
              onChange={(event) => setActiveOrgId(Number(event.target.value))}
              value={activeOrgId || ""}
            >
              {organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.display_name || org.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs opacity-60">
              Documents printed for this company use the profile below. Choosing
              a company here does not change the company selected in the top bar.
            </p>
          </>
        )}
      </section>

      {activeOrgId && (
        // Remounted per company so the panel reloads rather than showing the
        // previous company's letterhead while the new one arrives.
        <OrgPrintProfilePanel canEdit={canEdit} key={activeOrgId} orgId={activeOrgId} />
      )}
    </div>
  );
}
