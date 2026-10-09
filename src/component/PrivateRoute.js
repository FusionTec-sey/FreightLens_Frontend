import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { deniedRedirect, holds } from "../utils/accessRedirect";

const PrivateRoute = ({
  children,
  requiredPermissions = [],
  requiredModules = [],
}) => {
  const {
    token,
    permissions = [],
    isSuperAdmin,
    modules = [],
    accessLoaded,
  } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Permissions arrive from /auth/me/access a moment after the token does, and
  // isSuperAdmin is derived from that same answer. Judging the route before it
  // lands denies everyone, platform administrators included, and the redirect
  // that fires is not undone when the permissions turn up -- which is why
  // signing in could land on /unauthorized.
  if (!accessLoaded) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={22} />
      </div>
    );
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
