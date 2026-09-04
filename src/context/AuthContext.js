// import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
// import axios from "axios";

// const AuthContext = createContext();
// // import { useNavigate } from "react-router-dom";

// export const AuthProvider = ({ children }) => {
//   const [token, setToken] = useState(localStorage.getItem("token") || null);
//   const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken") || null);
//   const [permissions, setPermissions] = useState(() => {
//     const stored = localStorage.getItem("permissions");
//     return stored ? JSON.parse(stored) : [];
//   });
//   // const navigate = useNavigate();
//   const [user, setUser] = useState(() => {
//     const stored = localStorage.getItem("user");
//     return stored ? JSON.parse(stored) : null;
//   });

//   const login = (accessToken, refresh, userPermissions = [], userInfo = null) => {
//     localStorage.setItem("token", accessToken);
//     localStorage.setItem("refreshToken", refresh);
//     localStorage.setItem("permissions", JSON.stringify(userPermissions));
//     if (userInfo) {
//       localStorage.setItem("user", JSON.stringify(userInfo));
//     }

//     setToken(accessToken);
//     setRefreshToken(refresh);
//     setPermissions(userPermissions);
//     setUser(userInfo);
//     console.log("✅ Login successful");
//   };

//   const logout = () => {
//     console.log("🚪 Logging out...");
//     localStorage.removeItem("token");
//     localStorage.removeItem("refreshToken");
//     localStorage.removeItem("permissions");
//     localStorage.removeItem("user");

//     setToken(null);
//     setRefreshToken(null);
//     setPermissions([]);
//     setUser(null);
//     // navigate("/login", { replace: true });
//   };

//   const refreshAccessToken = useCallback(async () => {
//     if (!refreshToken) return null;

//     console.log("🔄 Attempting to refresh access token...");
//     try {
//       const response = await axios.post(
//         `${process.env.REACT_APP_NETWORK}/refresh`,
//         refreshToken,
//         {
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       const newAccessToken = response.data.access_token;
//       localStorage.setItem("token", newAccessToken);
//       setToken(newAccessToken);
//       console.log("✅ Token refreshed successfully");
//       return newAccessToken;
//     } catch (err) {
//       console.error("❌ Error refreshing token:", err.response?.data || err.message);
//       logout();
//       return null;
//     }
//   }, [refreshToken]);

//   useEffect(() => {
//     const tryRefreshOnLoad = async () => {
//       if (token) {
//         await refreshAccessToken();
//       }
//     };
//     tryRefreshOnLoad();
//   }, [token, refreshAccessToken]);

//   return (
//     <AuthContext.Provider value={{ token, refreshAccessToken, login, logout, permissions, user }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);


import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import axios from "axios";

const AuthContext = createContext();

const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";
const PERMISSIONS_KEY = "permissions";
const USER_KEY = "user";
const ORG_ID_KEY = "org_id";
const ORG_NAME_KEY = "org_name";
const IS_ROOT_KEY = "is_root";
const SELECTED_ORG_KEY = "selected_org_id";
const MODULES_KEY = "modules";
const PLAN_KEY = "plan";

/** Helper to decode JWT payload (no validation) */
const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem(ACCESS_TOKEN_KEY) || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem(REFRESH_TOKEN_KEY) || null);
  const [permissions, setPermissions] = useState(() => {
    const stored = localStorage.getItem(PERMISSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [orgId, setOrgId] = useState(() => {
    const stored = localStorage.getItem(ORG_ID_KEY);
    return stored ? parseInt(stored, 10) : 1;
  });
  const [orgName, setOrgName] = useState(() => {
    return localStorage.getItem(ORG_NAME_KEY) || "Sahaj Construction";
  });
  const [isRoot, setIsRoot] = useState(() => {
    const stored = localStorage.getItem(IS_ROOT_KEY);
    return stored ? stored === "true" : true;
  });
  const [modules, setModules] = useState(() => {
    const stored = localStorage.getItem(MODULES_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    const tok = localStorage.getItem(ACCESS_TOKEN_KEY);
    const payload = decodeJwt(tok);
    return payload?.modules || ["LOGISTICS", "ORDERS"];
  });
  const [plan, setPlan] = useState(() => {
    return localStorage.getItem(PLAN_KEY) || "complete";
  });
  const [selectedOrgId, setSelectedOrgIdState] = useState(() => {
    const stored = localStorage.getItem(SELECTED_ORG_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const setSelectedOrgId = (id) => {
    if (id) {
      localStorage.setItem(SELECTED_ORG_KEY, id.toString());
      setSelectedOrgIdState(id);
    } else {
      localStorage.removeItem(SELECTED_ORG_KEY);
      setSelectedOrgIdState(null);
    }
  };

  // used to schedule refresh
  const refreshTimeoutRef = useRef(null);

  // used to avoid concurrent refreshes and queue requests
  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef(null);

  const clearStorage = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ORG_ID_KEY);
    localStorage.removeItem(ORG_NAME_KEY);
    localStorage.removeItem(IS_ROOT_KEY);
    localStorage.removeItem(SELECTED_ORG_KEY);
    localStorage.removeItem(MODULES_KEY);
    localStorage.removeItem(PLAN_KEY);
  };

  const login = (accessToken, refresh, userPermissions = [], userInfo = null, orgMeta = {}) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(userPermissions));
    if (userInfo) localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

    const tokenPayload = decodeJwt(accessToken) || {};
    const oid = orgMeta?.org_id || tokenPayload.org_id || 1;
    const oname = orgMeta?.org_name || tokenPayload.org_name || "Sahaj Construction";
    const rootFlag = orgMeta?.is_root !== undefined ? orgMeta.is_root : (tokenPayload.is_root !== undefined ? tokenPayload.is_root : true);
    const userModules = orgMeta?.modules || tokenPayload.modules || ["LOGISTICS", "ORDERS"];
    const userPlan = orgMeta?.plan || tokenPayload.plan || "complete";

    localStorage.setItem(ORG_ID_KEY, oid.toString());
    localStorage.setItem(ORG_NAME_KEY, oname);
    localStorage.setItem(IS_ROOT_KEY, rootFlag.toString());
    localStorage.setItem(MODULES_KEY, JSON.stringify(userModules));
    localStorage.setItem(PLAN_KEY, userPlan);

    setToken(accessToken);
    setRefreshToken(refresh);
    setPermissions(userPermissions);
    setUser(userInfo);
    setOrgId(oid);
    setOrgName(oname);
    setIsRoot(rootFlag);
    setModules(userModules);
    setPlan(userPlan);
    
    // schedule refresh for new token
    scheduleRefresh(accessToken);
    console.log("✅ Login successful with org:", oname, "modules:", userModules);
  };

  const logout = useCallback(() => {
    console.log("🚪 Logging out...");
    clearStorage();
    setToken(null);
    setRefreshToken(null);
    setPermissions([]);
    setUser(null);
    setOrgId(1);
    setOrgName("Sahaj Construction");
    setIsRoot(true);
    setModules(["LOGISTICS", "ORDERS"]);
    setPlan("complete");
    setSelectedOrgIdState(null);

    // clear any scheduled refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  /**
   * Refresh access token using stored refreshToken.
   */
  const refreshAccessToken = useCallback(async () => {
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }
    if (!refreshToken) return null;

    isRefreshingRef.current = true;
    const p = (async () => {
      try {
        console.log("🔄 Attempting token refresh...");
        const resp = await axios.post(
          `${process.env.REACT_APP_NETWORK}/refresh`,
          refreshToken,
          { headers: { "Content-Type": "application/json", "skip_zrok_interstitial": "true" } }
        );

        const newAccessToken = resp?.data?.access_token || resp?.data?.accessToken || null;
        const newRefreshToken = resp?.data?.refresh_token || resp?.data?.refreshToken || null;

        if (!newAccessToken) {
          throw new Error("No access token returned by refresh endpoint");
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        setToken(newAccessToken);

        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          setRefreshToken(newRefreshToken);
        }

        scheduleRefresh(newAccessToken);
        return newAccessToken;
      } catch (err) {
        console.error("❌ Error refreshing token:", err?.response?.data || err.message);
        logout();
        return null;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = p;
    return p;
  }, [refreshToken, logout]);

  /** schedule refresh to happen some time before token expiry */
  const scheduleRefresh = useCallback(
    (accessToken) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (!accessToken) return;

      const payload = decodeJwt(accessToken);
      if (!payload || !payload.exp) return;

      const expiresAtMs = payload.exp * 1000;
      const now = Date.now();
      const msUntilExpiry = Math.max(0, expiresAtMs - now);

      const REFRESH_BEFORE_MS = 60 * 1000;
      const msUntilRefresh = Math.max(0, msUntilExpiry - REFRESH_BEFORE_MS);

      if (msUntilRefresh === 0) {
        refreshAccessToken().then((newToken) => {});
        return;
      }

      refreshTimeoutRef.current = setTimeout(async () => {
        await refreshAccessToken();
      }, msUntilRefresh);
    },
    [refreshAccessToken]
  );

  useEffect(() => {
    if (token) {
      const payload = decodeJwt(token);
      const nowSec = Math.floor(Date.now() / 1000);
      if (payload && payload.exp && payload.exp <= nowSec) {
        console.log("⚠️ Stored token is expired on mount, clearing session.");
        clearStorage();
        setToken(null);
        setRefreshToken(null);
        setPermissions([]);
        setUser(null);
      } else {
        scheduleRefresh(token);
      }
    }
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  // Axios interceptors: attach token and X-Active-Org header
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use(
      async (config) => {
        const url = config.url || "";
        const isAuthEndpoint = url.endsWith("/token") || url.endsWith("/refresh");
        if (isAuthEndpoint) return config;

        let access = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!access) return config;

        const payload = decodeJwt(access);
        const nowSec = Math.floor(Date.now() / 1000);
        const expireSec = payload?.exp || 0;

        if (expireSec - nowSec <= 60) {
          const newToken = await refreshAccessToken();
          if (newToken) access = newToken;
          else access = null;
        }

        if (access) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${access}`;
          if (selectedOrgId) {
            config.headers["X-Active-Org"] = selectedOrgId.toString();
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const respInterceptor = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        const url = originalRequest.url || "";
        const isAuthEndpoint = url.endsWith("/token") || url.endsWith("/refresh");

        if (
          error.response &&
          error.response.status === 401 &&
          !originalRequest._retry &&
          !isAuthEndpoint
        ) {
          originalRequest._retry = true;
          const newToken = await refreshAccessToken();
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(respInterceptor);
    };
  }, [refreshAccessToken, selectedOrgId]);

  const value = {
    token,
    refreshAccessToken,
    login,
    logout,
    permissions,
    user,
    orgId,
    orgName,
    isRoot,
    modules,
    plan,
    hasModule: (mod) => isRoot || (modules || []).includes(mod),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


export const useAuth = () => useContext(AuthContext);


