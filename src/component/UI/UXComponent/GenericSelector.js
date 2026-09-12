import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";
export default function GenericSelector({
  options = [],
  value = null,
  onChange,
  labelKey = "name",
  valueKey = "id",
  placeholder = "Select",
  disabled = false,
  onAddNew = null,
  addApi = null,
  className = "",
  inputClassName = "",
}) {
  const [input, setInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const containerRef = useRef(null);
  const { theme } = useTheme();
  useEffect(() => {
    if (value === null || value === undefined || value === "") {
      setInput("");
      return;
    }
    const selectedItem = options.find(
      (item) => String(item[valueKey]) === String(value) ||
                (item[labelKey] && String(item[labelKey]).toLowerCase() === String(value).toLowerCase())
    );
    if (selectedItem) {
      setInput(selectedItem[labelKey]);
    } else if (typeof value === "string") {
      setInput(value);
    }
  }, [value, options, labelKey, valueKey]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setShowPopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((item) =>
    item[labelKey]?.toLowerCase().includes(input.toLowerCase())
  );

  const handleSelect = (item) => {
    setInput(item[labelKey]);
    onChange(item[valueKey]);
    setDropdownOpen(false);
  };

  const handleAddNew = async (newName) => {
    if (!addApi || !newName.trim()) return;

    try {
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/${addApi}`,
        { [labelKey]: newName.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "skip_zrok_interstitial": "true",
          },
          
        }
      );
      onAddNew?.(); // Notify parent to refresh
    } catch (err) {
      console.error("Add new failed:", err);
      alert("Failed to add new item.");
    } finally {
      setInput("");
      setShowPopup(false);
      setDropdownOpen(false);
    }
  };

  const handleInputChange = (val) => {
    setInput(val);
    setDropdownOpen(true);
    if (!val.trim()) {
      onChange(null); // Clear selected ID if empty
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <input
        type="text"
        value={input}
        disabled={disabled}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => !disabled && setDropdownOpen(true)}
        placeholder={placeholder}
        className={`w-full border px-2.5 py-1.5 rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 ${theme.background} ${theme.text} ${
          disabled ? "bg-gray-100 text-gray-500" : "focus:ring-blue-500"
        } ${inputClassName}`}
      />

      {dropdownOpen && (
        <ul className="absolute z-30 mt-1 w-full border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto bg-white dark:bg-slate-900 text-[11px]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item) => (
              <li
                key={item[valueKey]}
                className="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-slate-800 dark:text-slate-100 transition-colors"
                onClick={() => handleSelect(item)}
              >
                {item[labelKey]}
              </li>
            ))
          ) : (
            <li
              className="px-3 py-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer font-bold flex items-center gap-1.5"
              onClick={() => setShowPopup(true)}
            >
              <span>+ Create new entry</span>
            </li>
          )}
        </ul>
      )}



      {/* {dropdownOpen && input && !itemExists && addApi && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowPopup(true)}
            className="px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
          >
            Add "{input}" as new
          </button>
        </div>
      )} */}

      {showPopup && (
        <AddNewPopup
          label={input}
          onAdd={handleAddNew}
          onCancel={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}

function AddNewPopup({ label, onAdd, onCancel }) {
  const [newLabel, setNewLabel] = useState(label);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="p-6 rounded-lg shadow-xl w-96 bg-white ">
        <h2 className="text-lg font-semibold mb-4">Add New</h2>
        <input
          className="w-full border px-3 py-2 rounded mb-4"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Enter name"
        />
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => onAdd(newLabel)}
            disabled={!newLabel.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
