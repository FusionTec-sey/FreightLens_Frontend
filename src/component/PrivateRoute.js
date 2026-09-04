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

  // Check required permissions
  const hasPermission =
    requiredPermissions.length === 0 ||
    requiredPermissions.some((perm) => permissions.includes(perm));

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default PrivateRoute;
