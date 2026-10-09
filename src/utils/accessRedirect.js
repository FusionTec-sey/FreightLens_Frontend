/**
 * Access decisions shared by the route guard and the access-denied page.
 *
 * Kept apart from PrivateRoute so they can be tested on their own: the router is
 * ESM-only and this toolchain's Jest cannot load it.
 */

export const DASHBOARD_PATH = "/dashboard";

/**
 * Whether the user holds a permission, counting Edit/Add/Delete as granting the
 * matching View. Mirrors the backend's any-of rule.
 */
export const holds = (permissions = [], name) => {
  if (permissions.includes(name)) return true;
  if (name.startsWith("View_")) {
    const suffix = name.slice(5);
    return (
      permissions.includes(`Edit_${suffix}`) ||
      permissions.includes(`Add_${suffix}`) ||
      permissions.includes(`Delete_${suffix}`) ||
      permissions.includes(suffix)
    );
  }
  return false;
};

/**
 * Where to send someone who may not open a page. The dashboard is somewhere they
 * can work from, which a dead-end access page is not. It is only used when they
 * can actually open it, and never from the dashboard itself, or the redirect
 * would bounce back and forth forever.
 */
export const deniedRedirect = (permissions = [], pathname = "") => {
  const dashboardIsOpen = holds(permissions, "View_Dashboard");
  const alreadyThere = (pathname || "").startsWith(DASHBOARD_PATH);
  return dashboardIsOpen && !alreadyThere ? DASHBOARD_PATH : "/unauthorized";
};
