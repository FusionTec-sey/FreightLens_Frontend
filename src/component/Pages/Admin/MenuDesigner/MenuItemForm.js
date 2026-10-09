import React, { useMemo } from "react";
import { MousePointerClick, ShieldCheck } from "lucide-react";

import { fieldClass } from "../../Orders/OrderUi";
import { MENU_ICON_NAMES, resolveMenuIcon } from "../../../../utils/menuIcons";
import {
  MAX_MENU_DEPTH,
  canNestUnder,
  depthOf,
  isFolderItem,
  isSeparator,
  subtreeHeight,
} from "./menuDraft";

const labelClass = "block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

/**
 * The edit pane for the selected menu item.
 *
 * A page is chosen from the registry, never typed as a URL: that is what keeps a
 * menu entry from pointing at a renamed route or an unguarded screen. The
 * required permissions are shown read-only — they belong to the page, and
 * editing access here would put two sources of truth in conflict.
 */
export default function MenuItemForm({ item, draft, pages, onChange, maxDepth = MAX_MENU_DEPTH }) {
  const pageByKey = useMemo(
    () => new Map(pages.map((page) => [page.page_key, page])),
    [pages]
  );

  // Only folders that can legally hold this item: not itself, not its own
  // subtree, and not so deep that the item's children would have nowhere to go.
  const { parentOptions, hiddenParentCount } = useMemo(() => {
    if (!item) return { parentOptions: [], hiddenParentCount: 0 };
    const folders = draft.filter((candidate) => isFolderItem(candidate));
    const options = [];
    let hidden = 0;
    folders.forEach((candidate) => {
      if (candidate.temp_id === item.temp_id) return;
      if (canNestUnder(draft, item.temp_id, candidate.temp_id, maxDepth)) {
        options.push({
          value: candidate.temp_id,
          label: `${"— ".repeat(depthOf(draft, candidate.temp_id) - 1)}${
            candidate.label || "Untitled folder"
          }`,
        });
      } else {
        hidden += 1;
      }
    });
    return { parentOptions: options, hiddenParentCount: hidden };
  }, [draft, item, maxDepth]);

  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
        <MousePointerClick className="opacity-40" size={34} />
        <p className="text-sm">Select an item to edit it.</p>
      </div>
    );
  }

  const separator = isSeparator(item);
  const isFolder = isFolderItem(item) && !separator;
  const page = item.page_key ? pageByKey.get(item.page_key) : null;
  const Icon = resolveMenuIcon(item.icon);

  const handlePageChange = (pageKey) => {
    const selected = pageByKey.get(pageKey);
    if (!selected) {
      onChange({ page_key: null });
      return;
    }
    // Auto-fill from the registry, but only where the admin has not typed
    // something of their own.
    const changes = { page_key: pageKey };
    if (!item.label?.trim() || item.label === page?.title) changes.label = selected.title;
    if (!item.icon || item.icon === page?.default_icon) changes.icon = selected.default_icon || null;
    onChange(changes);
  };

  const switchType = (next) => {
    if (next === "folder") {
      onChange({ page_key: null, is_separator: false, show_when_locked: false });
    } else if (next === "separator") {
      // A heading holds nothing and opens nothing, so it sits at the top level.
      onChange({
        page_key: null,
        is_separator: true,
        show_when_locked: false,
        parent_temp_id: null,
      });
    } else {
      onChange({ page_key: "", is_separator: false });
    }
  };

  const currentType = separator ? "separator" : isFolder ? "folder" : "page";

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className={labelClass}>Type</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {[
            { value: "page", label: "Page" },
            { value: "folder", label: "Folder" },
            { value: "separator", label: "Separator" },
          ].map((option) => (
            <label className="inline-flex min-h-[44px] items-center gap-2 text-sm" key={option.value}>
              <input
                checked={currentType === option.value}
                className="h-4 w-4"
                name={`item-type-${item.temp_id}`}
                onChange={() => switchType(option.value)}
                type="radio"
              />
              {option.label}
            </label>
          ))}
        </div>
        {separator && (
          <p className="mt-1.5 text-xs opacity-60">
            A heading above a group of items, like “System”. It opens nothing and
            holds nothing, and is hidden when every item under it is.
          </p>
        )}
      </fieldset>

      {!isFolder && (
        <div>
          <label className={labelClass} htmlFor={`page-${item.temp_id}`}>
            Page
          </label>
          <select
            className={`${fieldClass} mt-1.5`}
            id={`page-${item.temp_id}`}
            onChange={(event) => handlePageChange(event.target.value)}
            value={item.page_key || ""}
          >
            <option value="">Select a page…</option>
            {pages.map((option) => (
              <option key={option.page_key} value={option.page_key}>
                {option.title} — {option.route}
              </option>
            ))}
          </select>
          {!item.page_key && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              Pick the page this item opens.
            </p>
          )}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor={`label-${item.temp_id}`}>
          Label
        </label>
        <input
          className={`${fieldClass} mt-1.5`}
          id={`label-${item.temp_id}`}
          onChange={(event) => onChange({ label: event.target.value })}
          placeholder={isFolder ? "Folder name" : page?.title || "Menu label"}
          value={item.label || ""}
        />
        {!item.label?.trim() && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            Every menu item needs a label.
          </p>
        )}
      </div>

      {!separator && (
      <div>
        <label className={labelClass} htmlFor={`icon-${item.temp_id}`}>
          Icon
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <select
            className={fieldClass}
            id={`icon-${item.temp_id}`}
            onChange={(event) => onChange({ icon: event.target.value || null })}
            value={item.icon || ""}
          >
            <option value="">Default</option>
            {MENU_ICON_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300">
            <Icon size={18} />
          </span>
        </div>
        {isFolder && depthOf(draft, item.temp_id) === 1 && (
          <p className="mt-1.5 text-xs opacity-60">
            A top-level folder is drawn as a section heading, which shows the
            label only. The icon appears here and in the designer, and in the
            sidebar if you nest this folder under another one.
          </p>
        )}
      </div>
      )}

      {!separator && (
      <div>
        <label className={labelClass} htmlFor={`parent-${item.temp_id}`}>
          Parent folder
        </label>
        <select
          className={`${fieldClass} mt-1.5`}
          id={`parent-${item.temp_id}`}
          onChange={(event) => onChange({ parent_temp_id: event.target.value || null })}
          value={item.parent_temp_id || ""}
        >
          <option value="">Top level</option>
          {parentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs opacity-60">
          Level {depthOf(draft, item.temp_id)} of {maxDepth}
          {subtreeHeight(draft, item.temp_id) > 1 &&
            ` · ${subtreeHeight(draft, item.temp_id)} levels including what is nested inside`}
          .
          {hiddenParentCount > 0 &&
            ` ${hiddenParentCount} folder${
              hiddenParentCount === 1 ? "" : "s"
            } not listed: moving there would nest deeper than ${maxDepth} levels, which the sidebar cannot show.`}
        </p>
      </div>
      )}

      {!isFolder && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <ShieldCheck size={14} /> Access required
          </p>
          {page ? (
            <>
              <p className="mt-2 font-mono text-xs text-gray-700 dark:text-gray-200">
                {page.permission_codes?.length
                  ? page.permission_codes.join("  ·  ")
                  : "Any signed-in user"}
              </p>
              {page.module_codes?.length > 0 && (
                <p className="mt-1 text-xs opacity-70">
                  Module: {page.module_codes.join(" or ")}
                </p>
              )}
              <p className="mt-2 text-xs opacity-60">
                Set on the page itself, not here. Changing the menu never changes
                who can open a screen.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs opacity-70">Select a page to see what it requires.</p>
          )}
        </div>
      )}

      <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <label className="flex min-h-[44px] items-center gap-2.5 text-sm">
          <input
            checked={item.is_active !== false}
            className="h-4 w-4"
            onChange={(event) => onChange({ is_active: event.target.checked })}
            type="checkbox"
          />
          <span>
            Active
            <span className="block text-xs opacity-60">
              Inactive items stay saved but are not shown to anyone.
            </span>
          </span>
        </label>

        {!isFolder && (
          <label className="flex min-h-[44px] items-center gap-2.5 text-sm">
            <input
              checked={Boolean(item.show_when_locked)}
              className="h-4 w-4"
              onChange={(event) => onChange({ show_when_locked: event.target.checked })}
              type="checkbox"
            />
            <span>
              Show locked when access is missing
              <span className="block text-xs opacity-60">
                Off: users without access never see the item. On: they see it
                greyed with a lock, so they can ask for access.
              </span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
