// src/hooks/useOptions.js
import { useOptionsContext } from "../context/OptionsContext";
import { useMemo } from "react";

const EMPTY_ARRAY = Object.freeze([]);

export const useOptions = () => {
  const { options = {}, loading = false, errors = {}, refresh } = useOptionsContext();

  return useMemo(() => ({
    suppliers: options?.suppliers || EMPTY_ARRAY,
    consignees: options?.consignees || EMPTY_ARRAY,
    emptyLocations: options?.emptyLocations || EMPTY_ARRAY,
    status: options?.status || EMPTY_ARRAY,
    orderStatuses: options?.orderStatuses || EMPTY_ARRAY,
    type: options?.type || EMPTY_ARRAY,
    shipping: options?.shipping || EMPTY_ARRAY,
    vessal: options?.vessal || EMPTY_ARRAY,
    logistics: options?.logistics || EMPTY_ARRAY,
    material: options?.material || EMPTY_ARRAY,
    loading,
    errors,
    refresh,
  }), [options, loading, errors, refresh]);
};

