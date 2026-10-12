import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Building2, Check, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "react-toastify";

import { useAuth } from "../../../context/AuthContext";
import { errorText } from "../../../utils/apiError";
import { PageHeader, buttonClass, cardClass, settingsPageClass } from "../Orders/OrderUi";

/**
 * Every company, and how much of each one is set up.
 *
 * Company settings used to be spread across four screens -- identity on one,
 * numbering on another, the print profile on a third -- with the company a row,
 * a column or a dropdown but never the subject. A half-configured company
 * looked exactly like a finished one until a document printed wrong.
 *
 * This is the one way in: a row opens that company, and Add opens the same page
 * empty, so creating and configuring are not separate places.
 */

const Configured = ({ done, label }) => (
  <span
    className={`inline-flex items-center gap-1 text-xs font-medium ${
      done ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"
    }`}
    title={done ? `${label} is set up` : `${label} is not set up yet`}
  >
    {done ? <Check size={14} /> : <Minus size={14} />}
    {label}
  </span>
);

export default function CompanyListPage() {
  const navigate = useNavigate();
  const { permissions = [], isSuperAdmin } = useAuth();
  const canEdit = isSuperAdmin || permissions.includes("Edit_Setting");

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${process.env.REACT_APP_NETWORK}/organisations/configuration`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setCompanies(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      // A permission failure says so, rather than leaving an empty table that
      // reads as "no companies".
      const message = await errorText(err, "Could not load companies.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (company) => navigate(`/settings/companies/${company.id}`);

  return (
    <div className={settingsPageClass}>
      <PageHeader
        title="Companies"
        description="Each company and what is set up for it. Open one to manage its details, numbering and print profile."
      />

      {canEdit && (
        <div className="mb-4 flex justify-end">
          <button className={buttonClass} onClick={() => navigate("/settings/companies/new")}>
            <Plus size={16} />
            Add company
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {error}
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-sm opacity-60">
          <Loader2 className="animate-spin" size={16} /> Loading companies…
        </p>
      )}

      {!loading && !error && (
        <section className={`${cardClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide dark:bg-gray-800/60">
                <tr>
                  <th className="px-4 py-2 font-semibold">Company</th>
                  <th className="px-4 py-2 font-semibold">Users</th>
                  <th className="px-4 py-2 font-semibold">Set up</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {companies.map((company) => (
                  <tr
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    key={company.id}
                    onClick={() => open(company)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        open(company);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Building2 className="opacity-50" size={16} />
                        {company.display_name}
                        {company.is_root && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Root
                          </span>
                        )}
                      </div>
                      {company.code && (
                        <span className="text-xs opacity-55">{company.code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{company.user_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <Configured done={company.numbering_active > 0} label="Numbering" />
                        <Configured done={company.has_print_profile} label="Print profile" />
                        <Configured done={(company.modules || []).length > 0} label="Modules" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          company.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {company.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-sm opacity-60" colSpan={4}>
                      No companies found.
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
