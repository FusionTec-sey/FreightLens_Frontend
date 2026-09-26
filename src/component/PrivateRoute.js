import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({
  children,                   
  requiredPermissions = [],
  requiredModules = [],
}) => {
  const { token, permissions = [], isRoot, modules = [] } = useAuth();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Superadmins / Root users bypass module & permission restrictions
  if (isRoot) {
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

