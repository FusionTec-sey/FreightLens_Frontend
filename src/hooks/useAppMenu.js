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
    try {
      const data = await fetchMyMenu();
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
  }, [token]);

  // Reload on sign-in, sign-out and organisation switch.
  useEffect(() => {
    load();
  }, [load, selectedOrgId]);

  return { menu, isDefault, loading, error, reload: load };
};

export default useAppMenu;
