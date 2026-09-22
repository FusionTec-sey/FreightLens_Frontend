import React, { useState, useEffect, useRef, useMemo } from "react";

/**
 * Format a numeric amount with currency symbol and locale thousand separators.
 * Example: formatCurrency(1250.5, "USD", "$") => "$ 1,250.50"
 */
export function formatCurrency(amount, currency = "USD", symbol = null, decimals = 2) {
  if (amount === null || amount === undefined || amount === "") return "";
  const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
  if (isNaN(num)) return "";
  const sym = symbol || currency || "";
  const formattedNum = num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return sym ? `${sym} ${formattedNum}` : formattedNum;
}

/**
 * Read-only formatted currency presentation component.
 * Used for Line Totals, Subtotals, Due amounts, Ledger amounts, etc.
 */
export function CurrencyDisplay({
  amount,
  currency = "USD",
  symbol = null,
  decimals = 2,
  className = "",
  fallback = "-",
  showZero = true,
}) {
  const formatted = useMemo(() => {
    if (amount === null || amount === undefined || amount === "") {
      return fallback;
    }
    const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
    if (isNaN(num)) return fallback;
    if (!showZero && num === 0) return fallback;
    const sym = symbol || currency || "";
    const formattedNum = num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return sym ? `${sym} ${formattedNum}` : formattedNum;
  }, [amount, currency, symbol, decimals, fallback, showZero]);

  return <span className={className}>{formatted}</span>;
}

/**
 * CurrencyInput
 * 
 * High-performance, global ERP currency input component.
 * - Blurred/View Mode: Displays value formatted with currency symbol/code (e.g. "$ 1,200.00").
 * - Focused/Edit Mode: Switches to editing ONLY the raw numeric value (e.g. "1200.00") without any symbol,
 *   enabling seamless typing, selection, backspacing, and copy/pasting without syntax errors.
 */
export default function CurrencyInput({
  value,
  onChange,
  onValueChange,
  currency = "USD",
  symbol = null,
  decimals = 2,
  placeholder = "0.00",
  disabled = false,
  readOnly = false,
  className = "",
  align = "right",
  min,
  max,
  step = "any",
  name,
  id,
  autoFocus = false,
  onBlur,
  onFocus,
  onKeyDown,
  allowNegative = false,
  ...restProps
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef(null);

  const activeSymbol = symbol || currency || "";

  // Synchronize editValue when value prop updates from outside while not actively focused
  useEffect(() => {
    if (!isFocused) {
      if (value === null || value === undefined || value === "") {
        setEditValue("");
      } else {
        setEditValue(String(value));
      }
    }
  }, [value, isFocused]);

  // Compute blurred formatted text
  const displayFormatted = useMemo(() => {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    const num = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
    if (isNaN(num)) return "";
    const formattedNum = num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return activeSymbol ? `${activeSymbol} ${formattedNum}` : formattedNum;
  }, [value, activeSymbol, decimals]);

  // Handle focus event: switch to pure numeric edit mode
  const handleFocus = (e) => {
    if (disabled || readOnly) return;
    setIsFocused(true);
    const initialRaw = value !== null && value !== undefined ? String(value) : "";
    setEditValue(initialRaw);

    // Call external onFocus if supplied
    if (onFocus) onFocus(e);

    // Auto-select text for rapid overwriting
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 10);
  };

  // Handle blur event: commit and return to formatted display mode
  const handleBlur = (e) => {
    setIsFocused(false);

    // Clean up editValue on blur (e.g. trim trailing decimal if orphaned "12.")
    let clean = editValue.trim();
    if (clean.endsWith(".")) {
      clean = clean.slice(0, -1);
      setEditValue(clean);
      notifyChange(clean);
    }

    if (onBlur) onBlur(e);
  };

  // Dispatch change events (both standard React synthetic event and clean value callback)
  const notifyChange = (cleanVal) => {
    if (onValueChange) {
      const numVal = cleanVal === "" ? null : parseFloat(cleanVal);
      onValueChange(cleanVal, numVal);
    }
    if (onChange) {
      const syntheticEvent = {
        target: { name: name || id || "currency-input", id, value: cleanVal },
        currentTarget: { name: name || id || "currency-input", id, value: cleanVal },
      };
      onChange(syntheticEvent, cleanVal);
    }
  };

  // Handle typing inside numeric input
  const handleChange = (e) => {
    let raw = e.target.value;

    // Allow user to clear input
    if (raw === "") {
      setEditValue("");
      notifyChange("");
      return;
    }

    // Strip out non-numeric characters, preserving minus if allowNegative and at most one dot
    let sanitized = "";
    let hasDot = false;
    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];
      if (char >= "0" && char <= "9") {
        sanitized += char;
      } else if (char === "." && !hasDot && decimals > 0) {
        sanitized += char;
        hasDot = true;
      } else if (char === "-" && allowNegative && i === 0) {
        sanitized += char;
      }
    }

    setEditValue(sanitized);
    notifyChange(sanitized);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  const textAlignClass =
    align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right";

  return (
    <div className="relative w-full inline-flex items-center">
      {/* 
        When focused, show a subtle fixed currency indicator on the left side of the input 
        so user never forgets active currency, while the editable input value contains ONLY numbers.
      */}
      {isFocused && activeSymbol && (
        <span
          className="absolute left-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 pointer-events-none select-none z-10"
          title={`Currency: ${currency}`}
        >
          {activeSymbol}
        </span>
      )}

      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        name={name}
        id={id}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        value={isFocused ? editValue : displayFormatted}
        placeholder={isFocused ? placeholder : activeSymbol ? `${activeSymbol} ${placeholder}` : placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`${className} ${textAlignClass} ${
          isFocused && activeSymbol ? "pl-5" : ""
        }`}
        {...restProps}
      />
    </div>
  );
}
