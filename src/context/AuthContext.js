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
  };

  const login = (accessToken, refresh, userPermissions = [], userInfo = null) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(userPermissions));
    if (userInfo) localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

    setToken(accessToken);
    setRefreshToken(refresh);
    setPermissions(userPermissions);
    setUser(userInfo);
    // schedule refresh for new token
    scheduleRefresh(accessToken);
    console.log("✅ Login successful");
  };

  const logout = useCallback(() => {
    console.log("🚪 Logging out...");
    clearStorage();
    setToken(null);
    setRefreshToken(null);
    setPermissions([]);
    setUser(null);

    // clear any scheduled refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // optionally navigate to login here if you use react-router
    // navigate('/login', { replace: true });
  }, []);

  /**
   * Refresh access token using stored refreshToken.
   * Ensures only 1 refresh runs at a time; returns the new token or null on failure.
   */
  const refreshAccessToken = useCallback(async () => {
    // if already refreshing, return the same promise
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }
    if (!refreshToken) return null;

    isRefreshingRef.current = true;
    const p = (async () => {
      try {
        console.log("🔄 Attempting token refresh...");
        // Adjust the endpoint and payload to your API
        const resp = await axios.post(
          `${process.env.REACT_APP_NETWORK}/refresh`,
          { refreshToken }, // send in body (adapt if your API expects other shape)
          { headers: { "Content-Type": "application/json" } }
        );

        const newAccessToken = resp?.data?.access_token || resp?.data?.accessToken || null;
        const newRefreshToken = resp?.data?.refresh_token || resp?.data?.refreshToken || null;

        if (!newAccessToken) {
          throw new Error("No access token returned by refresh endpoint");
        }

        // store tokens
        localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
        setToken(newAccessToken);

        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          setRefreshToken(newRefreshToken);
        }

        // schedule the next refresh
        scheduleRefresh(newAccessToken);

        console.log("✅ Token refreshed successfully");
        return newAccessToken;
      } catch (err) {
        console.error("❌ Error refreshing token:", err?.response?.data || err.message);
        // refresh failed -> logout
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

      // attempt refresh this many ms before expiry (e.g., 60s)
      const REFRESH_BEFORE_MS = 60 * 1000;
      const msUntilRefresh = Math.max(0, msUntilExpiry - REFRESH_BEFORE_MS);

      // If token already expiring or very close -> refresh immediately
      if (msUntilRefresh === 0) {
        // async but don't await here
        refreshAccessToken().then((newToken) => {
          if (!newToken) {
            // refresh failed => logout already handled in refreshAccessToken
          }
        });
        return;
      }

      refreshTimeoutRef.current = setTimeout(async () => {
        const newToken = await refreshAccessToken();
        if (!newToken) {
          // logout performed inside refreshAccessToken on failure
        }
      }, msUntilRefresh);
    },
    [refreshAccessToken]
  );

  // On mount: schedule refresh if there's a stored access token
  useEffect(() => {
    if (token) scheduleRefresh(token);
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [token, scheduleRefresh]);

  // Axios interceptors: attach token and refresh when needed
  useEffect(() => {
    // request interceptor: attach Authorization header, refresh if token expired
    const reqInterceptor = axios.interceptors.request.use(
      async (config) => {
        // if no token, just pass through
        let access = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!access) return config;

        // check expiry
        const payload = decodeJwt(access);
        const nowSec = Math.floor(Date.now() / 1000);
        const expireSec = payload?.exp || 0;

        // if token expired (or close to), refresh first
        if (expireSec - nowSec <= 60) {
          // if refresh returns new token, use it. Otherwise refreshAccessToken handles logout.
          const newToken = await refreshAccessToken();
          if (newToken) {
            access = newToken;
          } else {
            // couldn't refresh -> let request proceed without auth; API should 401 and we handle it
            access = null;
          }
        }

        if (access) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${access}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // response interceptor: on 401 try to refresh once, then retry the request
    const respInterceptor = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        // Avoid infinite loop: mark retried requests
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
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
  }, [refreshAccessToken]);

  // Keep context value stable where possible
  const value = {
    token,
    refreshAccessToken,
    login,
    logout,
    permissions,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
