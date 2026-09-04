import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
const hasViewPermission = (key, permissions) => {
  return permissions.includes(`View_${key}`);
};

const FilterPopup = ({ columns, userPermissions = [], handleFilterChange }) => {
  const filterableColumns = columns.filter(
    (col) => col.filterable && hasViewPermission(col.key, userPermissions)
  );
  // const { theme } = useTheme();
  const [selectedField, setSelectedField] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const selectedColumn = filterableColumns.find((col) => col.key === selectedField);

  // Debounce logic
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (selectedField) {
        handleFilterChange(selectedField, searchValue);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeout);
  }, [searchValue, selectedField]);

  return (
    <div className={`flex flex-col gap-4 `}>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Filter By</label>
        <select
          className="border p-1 rounded text-gray-900"
          value={selectedField}
          onChange={(e) => {
            setSelectedField(e.target.value);
            setSearchValue(""); // Reset on new selection
          }}
        >
          <option value="" className="text-gray-900">-- Select Field --</option>
          {filterableColumns.map(({ key, label }) => (
            <option key={key} value={key} className="text-gray-900">
              {label}
            </option>
          ))}
        </select>
      </div>

      {selectedColumn && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{selectedColumn.label}</label>
          {selectedColumn.type === "select" ? (
            <select
              className="border p-1 rounded"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            >
              <option value="">-- Select --</option>
              {selectedColumn.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={selectedColumn.type || "text"}
              className="border p-1 rounded"
              placeholder={`Search ${selectedColumn.label}`}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPopup;
