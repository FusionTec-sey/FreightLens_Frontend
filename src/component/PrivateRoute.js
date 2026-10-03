import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadError from "./LoadError";

const PrivateRoute = ({
  children,                   
  requiredPermissions = [],
  requiredModules = [],
}) => {
  const { token, permissions = [], isSuperAdmin, modules = [], accessLoading, accessError, retryAccess } = useAuth();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Never decide access using empty or previous-organisation permissions while
  // the authoritative access request is still pending.
  if (accessLoading) return <p role="status" className="p-4">Loading access…</p>;
  if (accessError) return <LoadError title="Unable to verify access" onRetry={retryAccess}>
    Your access could not be loaded. This is not a permission denial. Protected actions remain unavailable until verification succeeds.
  </LoadError>;

  // Only an explicit platform administrator bypasses module and permission restrictions.
  if (isSuperAdmin) {
    return children;
  }

  // Check required module subscription
  if (requiredModules.length > 0) {
    const hasModule = requiredModules.some((m) => (modules || []).includes(m));
    if (!hasModule) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check required permissions (including Edit/Add/Delete granting View access)
  const hasPermission =
    requiredPermissions.length === 0 ||
    requiredPermissions.some((perm) => {
      if (permissions.includes(perm)) return true;
      if (perm.startsWith("View_")) {
        const suffix = perm.slice(5);
        if (
          permissions.includes(`Edit_${suffix}`) ||
          permissions.includes(`Add_${suffix}`) ||
          permissions.includes(`Delete_${suffix}`) ||
          permissions.includes(suffix)
        ) {
          return true;
        }
      }
      return false;
    });

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PrivateRoute;
