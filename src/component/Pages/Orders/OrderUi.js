import React, { useEffect, useId, useMemo, useState } from "react";

const statusColours = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Submitted: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  Sourcing: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
  Ordered: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
  "Part Paid": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  "In Production": "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200",
  Ready: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  Packed: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  Shipped: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  Arrived: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  Received: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  Completed: "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
  "Defect/Reopened": "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  Open: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
  "Under Review": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  Resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  Closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusColours[status] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
      {status}
    </span>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm opacity-70">{description}</p>}
      </div>
      {actions && <div className="flex w-full min-w-0 flex-wrap gap-2 xl:w-auto">{actions}</div>}
    </div>
  );
}

// ── Class token constants ─────────────────────────────────────────────────────

export const fieldClass =
  "min-h-[44px] w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-base text-gray-900 dark:text-gray-100 shadow-sm transition placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm";

export const buttonClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-sm transition hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const cardClass =
  "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm";

export const tableHeaderClass =
  "bg-gray-50 dark:bg-gray-800/60 text-left text-xs uppercase text-gray-500 dark:text-gray-400";

export const settingsPageClass = "p-2 sm:p-4";
export const settingsCardHeaderClass = "border-b border-gray-200 dark:border-gray-700 p-4";
export const actionHeaderClass = "w-[112px] px-3 py-3 text-center font-semibold";
export const actionCellClass = "w-[112px] px-3 py-1";

export const editIconButtonClass =
  "inline-flex h-11 w-11 items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 transition hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export const deleteIconButtonClass =
  "inline-flex h-11 w-11 items-center justify-center rounded-xl text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500";

// ── SearchableSelect ──────────────────────────────────────────────────────────

export function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Search records",
  emptyText = "No matching records",
  className = "",
  disabled = false,
}) {
  const generatedId = useId();
  const inputId = `searchable-${generatedId.replace(/:/g, "")}`;
  const selected = options.find((option) => String(option.value) === String(value));
  const [query, setQuery] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected?.label || "");
  }, [selected?.label]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ranked = needle
      ? options.filter((option) =>
          `${option.label} ${option.keywords || ""}`.toLowerCase().includes(needle)
        )
      : options;
    return ranked.slice(0, 12);
  }, [options, query]);

  const choose = (option) => {
    onChange(String(option.value));
    setQuery(option.label);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setOpen(true);
  };

  return (
    <label className={`relative block text-sm ${className}`} htmlFor={inputId}>
      {label && <span className="mb-1 block font-medium">{label}</span>}
      <div className="relative">
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          className={`${fieldClass} pr-12`}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open && filtered.length === 1) {
              event.preventDefault();
              choose(filtered[0]);
            }
          }}
        />
        {(query || value) && !disabled && (
          <button
            type="button"
            className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            aria-label={`Clear ${label || "selection"}`}
          >
            ×
          </button>
        )}
      </div>
      {open && !disabled && (
        <div
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 shadow-xl"
        >
          {filtered.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={String(option.value) === String(value)}
              key={option.value}
              className="flex min-h-[44px] w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-gray-800 focus:bg-blue-50 focus:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-400">{emptyText}</p>
          )}
          {options.length > filtered.length && (
            <p className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-400">
              Keep typing to narrow {options.length.toLocaleString()} records.
            </p>
          )}
        </div>
      )}
    </label>
  );
}
