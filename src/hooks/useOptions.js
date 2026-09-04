// src/hooks/useOptions.js
import { useOptionsContext } from "../context/OptionsContext";
import { useEffect } from "react";

export const useOptions = () => {
  const { options, loading, errors, refresh } = useOptionsContext();

  // List of all option keys we care about
  const optionKeys = [
    "suppliers",
    "consignees",
    "emptyLocations",
    "status",
    "type",
    "shipping",
    "vessal",
    "logistics",
    "material",
  ];

  // On mount, refresh any missing or empty option arrays
  useEffect(() => {
    if (!loading) {
      optionKeys.forEach((key) => {
        if (!options[key] || options[key].length === 0) {
          refresh(key);
        }
      });
    }
  }, [loading, options, refresh]);

  return {
    suppliers: options.suppliers || [],
    consignees: options.consignees || [],
    emptyLocations: options.emptyLocations || [],
    status: options.status || [],
    type: options.type || [],
    shipping: options.shipping || [],
    vessal: options.vessal || [],
    logistics: options.logistics || [],
    material: options.material || [],
    loading,
    errors,
    refresh,
  };
};
