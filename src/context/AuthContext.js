import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext();
// import { useNavigate } from "react-router-dom";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken") || null);
  const [permissions, setPermissions] = useState(() => {
    const stored = localStorage.getItem("permissions");
    return stored ? JSON.parse(stored) : [];
  });
  // const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (accessToken, refresh, userPermissions = [], userInfo = null) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refresh);
    localStorage.setItem("permissions", JSON.stringify(userPermissions));
    if (userInfo) {
      localStorage.setItem("user", JSON.stringify(userInfo));
    }

    setToken(accessToken);
    setRefreshToken(refresh);
    setPermissions(userPermissions);
    setUser(userInfo);
    console.log("✅ Login successful");
  };

  const logout = () => {
    console.log("🚪 Logging out...");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("permissions");
    localStorage.removeItem("user");

    setToken(null);
    setRefreshToken(null);
    setPermissions([]);
    setUser(null);
    // navigate("/login", { replace: true });
  };

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) return null;

    console.log("🔄 Attempting to refresh access token...");
    try {
      const response = await axios.post(
        `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/refresh`,
        refreshToken,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const newAccessToken = response.data.access_token;
      localStorage.setItem("token", newAccessToken);
      setToken(newAccessToken);
      console.log("✅ Token refreshed successfully");
      return newAccessToken;
    } catch (err) {
      console.error("❌ Error refreshing token:", err.response?.data || err.message);
      logout();
      return null;
    }
  }, [refreshToken]);

  useEffect(() => {
    const tryRefreshOnLoad = async () => {
      if (token) {
        await refreshAccessToken();
      }
    };
    tryRefreshOnLoad();
  }, [token, refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ token, refreshAccessToken, login, logout, permissions, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
