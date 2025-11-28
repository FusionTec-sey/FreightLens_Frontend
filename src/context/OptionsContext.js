import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// List of option paths
const OPTION_PATHS = {
  suppliers: "supplierDetails",
  consignees: "consignee",
  emptyLocations: "unloadVenue",
  status: "status",
  type: "containerType",
  shipping: "shippingDocument",
  vessal: "vessal",
  logistics: "logisticsProvider",
  material: "material"
};

const OptionsContext = createContext();

export const OptionsProvider = ({ children }) => {
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  // Helper to fetch one path
  const fetchPath = async (pathKey) => {
    const path = OPTION_PATHS[pathKey];
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/${path}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "skip_zrok_interstitial": "true",
          },
          withCredentials: false,
        }
      );

      let data = res.data;
      if (typeof data === "string") data = JSON.parse(data);

      return data.data.map(([id, name]) => ({ id, name }));
    } catch (err) {
      console.error(`Failed to fetch ${pathKey}:`, err);
      throw err;
    }
  };

  // Fetch all options initially
  const fetchAllOptions = async () => {
    setLoading(true);
    const newOptions = {};
    const newErrors = {};

    await Promise.all(
      Object.keys(OPTION_PATHS).map(async (key) => {
        try {
          newOptions[key] = await fetchPath(key);
        } catch (error) {
          newOptions[key] = [];
          newErrors[key] = true;
        }
      })
    );

    setOptions(newOptions);
    setErrors(newErrors);
    setLoading(false);
  };

  // Refresh specific path
  const refresh = async (key) => {
    try {
      const updated = await fetchPath(key);
      setOptions((prev) => ({ ...prev, [key]: updated }));
      setErrors((prev) => ({ ...prev, [key]: false }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [key]: true }));
    }
  };

  useEffect(() => {
    fetchAllOptions();
  }, []);

  return (
    <OptionsContext.Provider value={{ options, loading, errors, refresh }}>
      {children}
    </OptionsContext.Provider>
  );
};

export const useOptionsContext = () => {
  const ctx = useContext(OptionsContext);
  if (!ctx) throw new Error("useOptionsContext must be used within OptionsProvider");
  return ctx;
};
