import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Lock } from "lucide-react";

import { useAuth } from "../../../context/AuthContext";

/**
 * Where someone lands when they may not open a page and have no dashboard of
 * their own to be sent to instead. It names the permission they are missing when
 * the caller passes one, so they can ask for the right thing rather than report
 * "access denied".
 */
const Unauthorized = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { permissions = [], isSuperAdmin } = useAuth();

  const needed = (params.get("need") || "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

  const canOpenDashboard =
    isSuperAdmin || permissions.includes("View_Dashboard");

  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          <Lock size={26} />
        </span>

        <h1 className="mt-4 text-xl font-bold">You don't have access to this page</h1>

        {needed.length > 0 ? (
          <p className="mt-2 text-sm opacity-70">
            It needs{" "}
            {needed.map((code, index) => (
              <React.Fragment key={code}>
                {index > 0 && " or "}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-800">
                  {code}
                </code>
              </React.Fragment>
            ))}
            .
          </p>
        ) : (
          <p className="mt-2 text-sm opacity-70">
            Your role does not include the permission this page requires.
          </p>
        )}

        <p className="mt-2 text-sm opacity-60">
          Ask an administrator to add it to your role.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {canOpenDashboard && (
            <Link
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              to="/dashboard"
            >
              <LayoutDashboard size={16} /> Go to dashboard
            </Link>
          )}
          <button
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
