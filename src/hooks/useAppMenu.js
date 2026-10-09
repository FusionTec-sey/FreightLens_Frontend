import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { fetchMyMenu } from "../services/navigationApi";

/**
 * Loads the server-filtered navigation tree for the active organisation.
 *
 * The sidebar can render this instead of a hardcoded tree. It is a UX layer:
 * PrivateRoute still guards every route and the API still checks permissions,
 * so an empty or stale menu can never grant access.
 *
 * The request carries its own Authorization header rather than relying on the
 * axios interceptors. React runs a child's effects before its parent's, so this
 * hook fires before AuthProvider has registered them: on a page reload the first
 * request went out unauthenticated, the menu showed "could not be loaded", and
 * Retry then worked because by that point the interceptors existed.
 *
 * Returns { menu, isDefault, loading, error, reload }.
 * `isDefault` is true while no admin has arranged a menu and the tree came from
 * the page registry.
 */
export const useAppMenu = () => {
  const { token, selectedOrgId } = useAuth();
  const [menu, setMenu] = useState([]);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!token) {
      setMenu([]);
      setIsDefault(false);
      setError(null);
      return;
    }
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);

    const headers = { Authorization: `Bearer ${token}` };
    if (selectedOrgId) headers["X-Active-Org"] = String(selectedOrgId);

    try {
      let data;
      try {
        data = await fetchMyMenu({ headers });
      } catch (err) {
        // A stored token that expired during the reload is refreshed by the
        // interceptors, which are registered by now, so one retry resolves it.
        if (err?.response?.status === 401) data = await fetchMyMenu();
        else throw err;
      }
      // Ignore a response that an org switch has already superseded.
      if (requestRef.current !== requestId) return;
      setMenu(Array.isArray(data?.menu) ? data.menu : []);
      setIsDefault(Boolean(data?.is_default));
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setMenu([]);
      setError(err);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [token, selectedOrgId]);

  // Reload on sign-in, sign-out and organisation switch.
  useEffect(() => {
    load();
  }, [load]);

  return { menu, isDefault, loading, error, reload: load };
};

export default useAppMenu;
