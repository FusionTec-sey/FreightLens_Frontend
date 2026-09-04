import React, { useEffect, useMemo, useState } from "react";
import { Building2, ClipboardList, Database, LockKeyhole, Settings2, Ship } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { ordersApi } from "../../../services/ordersApi";
import { PageHeader, cardClass, settingsPageClass } from "../Orders/OrderUi";

const settingsCards = [
  {
    to: "/organization-settings",
    title: "Organization & companies",
    description: "Group identity, company names and active companies used throughout Freightliner.",
    icon: Building2,
  },
  {
    to: "/settings",
    title: "Users & access",
    description: "Roles, permissions and company data access for employees.",
    icon: LockKeyhole,
    userAccess: true,
  },
  {
    to: "/order-settings",
    title: "Orders & procurement",
    description: "Request and purchase-order numbering for each company.",
    icon: ClipboardList,
  },
  {
    to: "/logistics",
    title: "Logistics & demurrage",
    description: "Providers, free days and excluded-day defaults.",
    icon: Ship,
  },
  {
    to: "/reference-data",
    title: "Reference data",
    description: "Shared procurement, shipping, container and location lists.",
    icon: Database,
  },
];

export default function SettingsOverview() {
  const { permissions } = useAuth();
  const [summary, setSummary] = useState({ groups: 0, companies: 0, activeCompanies: 0 });

  useEffect(() => {
    let active = true;
    ordersApi
      .adminSettings()
      .then((data) => {
        if (!active) return;
        const companies = data.companies || [];
        setSummary({
          groups: (data.groups || []).length,
          companies: companies.length,
          activeCompanies: companies.filter((c) => c.active).length,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const visibleCards = useMemo(
    () =>
      settingsCards.filter(
        (card) =>
          !card.userAccess ||
          permissions.includes("View_User") ||
          permissions.includes("View_Role")
      ),
    [permissions]
  );

  return (
    <div className={settingsPageClass}>
      <PageHeader
        title="Settings"
        description="Organization-wide configuration, access control and operational defaults."
      />

      <section className={`${cardClass} mb-6 p-4`} aria-label="Organization summary">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-100 dark:bg-blue-950 p-2.5 text-blue-700 dark:text-blue-200">
            <Settings2 size={20} />
          </span>
          <div>
            <h2 className="font-semibold">Freightliner organization</h2>
            <p className="mt-1 text-sm opacity-70">
              {summary.groups || 1} group · {summary.activeCompanies} active of{" "}
              {summary.companies || 0} companies
            </p>
            <p className="mt-2 text-xs opacity-60">
              Company access is an application-wide data boundary. Shared shipments may be visible
              to more than one permitted company.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {visibleCards.map(({ to, title, description, icon: Icon }) => (
          <Link
            className={`${cardClass} group min-h-[150px] p-5 transition hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700`}
            key={to}
            to={to}
          >
            <span className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-2.5 text-slate-700 dark:text-slate-200 group-hover:bg-blue-100 group-hover:text-blue-700 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-200">
              <Icon size={20} />
            </span>
            <h2 className="mt-4 font-semibold">{title}</h2>
            <p className="mt-1 text-sm opacity-65">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
