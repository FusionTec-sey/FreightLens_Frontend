import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { deniedRedirect, holds } from "../utils/accessRedirect";

const PrivateRoute = ({
  children,
  requiredPermissions = [],
  requiredModules = [],
}) => {
  const { token, permissions = [], isSuperAdmin, modules = [] } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Only an explicit platform administrator bypasses module and permission restrictions.
  if (isSuperAdmin) {
    return children;
  }


  // Check required module subscription
  if (requiredModules.length > 0) {
    const hasModule = requiredModules.some((m) => (modules || []).includes(m));
    if (!hasModule) {
      return <Navigate to={deniedRedirect(permissions, location.pathname)} replace />;
    }
  }

  // Check required permissions (including Edit/Add/Delete granting View access)
  const hasPermission =
    requiredPermissions.length === 0 ||
    requiredPermissions.some((perm) => holds(permissions, perm));

  if (!hasPermission) {
    return <Navigate to={deniedRedirect(permissions, location.pathname)} replace />;
  }

  return children;
};

export default PrivateRoute;
