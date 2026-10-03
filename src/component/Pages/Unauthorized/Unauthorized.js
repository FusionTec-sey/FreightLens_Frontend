import React from "react";
import { Link } from "react-router-dom";

const Unauthorized = () => {
  return (
    <div className="p-6 text-slate-900 dark:text-slate-100">
      <h1 className="text-xl font-bold">Access denied</h1>
      <p className="mt-3">Your current company access does not include this screen. Ask an administrator to review your role and module access.</p>
      <Link to="/dashboard" className="inline-block mt-4 rounded-lg bg-indigo-600 px-4 py-3 text-white">Back to dashboard</Link>
    </div>
  );
};

export default Unauthorized;
