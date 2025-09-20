import { useState, useEffect, useRef } from "react";
import { useTheme } from "../../../context/ThemeContext";

function TypableSelect({ options, value, onChange, placeholder, disabled }) {
  const { theme } = useTheme();
  const [filter, setFilter] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);
  // const formattedOptions = Array.isArray(options) ? options.map((opt) => ({ label: opt, value: opt })) : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When selected value changes, update filter to show selected name
  useEffect(() => {
    const selectedOption = options.find((opt) => opt.id === value);
    setFilter(selectedOption ? selectedOption.name : "");
  }, [value, options]);

  // Filter options based on filter text (case-insensitive)
  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(filter.toLowerCase())
  );

  const handleInputChange = (e) => {
    setFilter(e.target.value);
    setShowDropdown(true);
  };

  const handleOptionClick = (opt) => {
    onChange(opt.id);
    setFilter(opt.name);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={filter}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded px-3 py-2 text-base ${theme.border} ${theme.background} ${theme.text} placeholder-gray-400 dark:placeholder-gray-500 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        autoComplete="off"
      />
      {showDropdown && !disabled && filteredOptions.length > 0 && (
        <ul className={`absolute z-10 border w-full max-h-40 overflow-auto mt-1 rounded shadow ${theme.border} ${theme.background}`}>
          {filteredOptions.map((opt) => (
            <li
              key={opt.id}
              onMouseDown={() => handleOptionClick(opt)} // onMouseDown prevents input blur before click
              className={`px-3 py-2 cursor-pointer ${theme.text} ${theme.hover}`}
            >
              {opt.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default TypableSelect;