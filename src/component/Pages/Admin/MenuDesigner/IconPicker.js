import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

import { fieldClass } from "../../Orders/OrderUi";
import {
  DEFAULT_MENU_ICON,
  resolveMenuIcon,
  searchMenuIcons,
} from "../../../../utils/menuIcons";

/**
 * Pick any icon the library ships.
 *
 * A dropdown of 1594 names is unusable, so this is a search box over a grid of
 * previews: you look for "truck" rather than scrolling to it. The current icon
 * stays visible and clearable.
 */
export default function IconPicker({ value, onChange, inputId = "icon-search" }) {
  const [term, setTerm] = useState("");
  const matches = useMemo(() => searchMenuIcons(term), [term]);
  const Current = resolveMenuIcon(value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          className={fieldClass}
          id={inputId}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search icons — truck, ship, box…"
          value={term}
        />
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
          title={value || `Default (${DEFAULT_MENU_ICON})`}
        >
          <Current size={18} />
        </span>
        {value && (
          <button
            aria-label="Clear icon"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onChange(null)}
            title="Use the default icon"
            type="button"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mt-2 grid max-h-44 grid-cols-8 gap-1 overflow-auto rounded-xl border border-gray-200 p-1.5 dark:border-gray-700 sm:grid-cols-10">
        {matches.map((name) => {
          const Icon = resolveMenuIcon(name);
          const selected = name === value;
          return (
            <button
              aria-label={name}
              aria-pressed={selected}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                selected
                  ? "bg-blue-100 text-blue-700 ring-1 ring-blue-400 dark:bg-blue-950 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
              key={name}
              onClick={() => onChange(name)}
              title={name}
              type="button"
            >
              <Icon size={16} />
            </button>
          );
        })}

        {matches.length === 0 && (
          <p className="col-span-full px-2 py-4 text-center text-xs text-gray-400">
            No icon matches “{term}”.
          </p>
        )}
      </div>

      <p className="mt-1.5 text-xs opacity-60">
        {value ? value : `No icon chosen — ${DEFAULT_MENU_ICON} is used.`}
      </p>
    </div>
  );
}
