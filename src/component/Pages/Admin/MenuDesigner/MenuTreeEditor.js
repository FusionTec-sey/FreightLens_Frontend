import React from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  EyeOff,
  Folder,
  Lock,
  Minus,
  Trash2,
} from "lucide-react";

import { resolveMenuIcon } from "../../../../utils/menuIcons";
import {
  buildTree,
  isFolderItem,
  isSeparator,
  isUnassignedPage,
} from "./menuDraft";

const rowBase =
  "group flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition";

/**
 * The tree pane: select, reorder and delete items.
 *
 * Reordering is up/down buttons rather than drag-and-drop: they work on touch,
 * with a keyboard and with a screen reader, and the sibling groups here are short.
 */
export default function MenuTreeEditor({
  draft,
  selectedId,
  onSelect,
  onMove,
  onRemove,
  collapsed,
  onToggleCollapse,
}) {
  const tree = buildTree(draft);

  const renderNode = (node, depth, siblings, index) => {
    const separator = isSeparator(node);
    const Icon = resolveMenuIcon(node.icon);
    const isSelected = node.temp_id === selectedId;
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.temp_id);

    return (
      <li key={node.temp_id}>
        <div
          className={`${rowBase} ${
            isSelected
              ? "bg-blue-50 ring-1 ring-blue-300 dark:bg-blue-950/60 dark:ring-blue-800"
              : "hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
          style={{ paddingLeft: `${depth * 18 + 8}px` }}
        >
          {hasChildren ? (
            <button
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? `Expand ${node.label}` : `Collapse ${node.label}`}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => onToggleCollapse(node.temp_id)}
              type="button"
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            </button>
          ) : (
            <span aria-hidden="true" className="inline-block h-7 w-7 shrink-0" />
          )}

          <button
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => onSelect(node.temp_id)}
            type="button"
          >
            {separator ? (
              <Minus className="shrink-0 opacity-40" size={16} />
            ) : (
              <Icon className="shrink-0 opacity-70" size={16} />
            )}
            <span
              className={`truncate ${
                separator
                  ? "text-[11px] font-bold uppercase tracking-wider opacity-60"
                  : "text-sm"
              } ${node.is_active === false ? "opacity-50 line-through" : ""}`}
            >
              {node.label || <span className="italic opacity-60">Untitled</span>}
            </span>
            {isFolderItem(node) && !separator && (
              <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Folder
              </span>
            )}
            {isUnassignedPage(node) && (
              <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                No page
              </span>
            )}
            {node.show_when_locked && (
              <Lock className="shrink-0 opacity-50" size={13} title="Shown locked when access is missing" />
            )}
            {node.is_active === false && (
              <EyeOff className="shrink-0 opacity-50" size={13} title="Inactive" />
            )}
          </button>

          <span className="flex shrink-0 items-center">
            <button
              aria-label={`Move ${node.label} up`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 disabled:opacity-25 dark:hover:bg-gray-700"
              disabled={index === 0}
              onClick={() => onMove(node.temp_id, "up")}
              type="button"
            >
              <ChevronUp size={15} />
            </button>
            <button
              aria-label={`Move ${node.label} down`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 disabled:opacity-25 dark:hover:bg-gray-700"
              disabled={index === siblings.length - 1}
              onClick={() => onMove(node.temp_id, "down")}
              type="button"
            >
              <ChevronDown size={15} />
            </button>
            <button
              aria-label={`Remove ${node.label}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              onClick={() => onRemove(node.temp_id)}
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </span>
        </div>

        {hasChildren && !isCollapsed && (
          <ul>
            {node.children.map((child, childIndex) =>
              renderNode(child, depth + 1, node.children, childIndex)
            )}
          </ul>
        )}
      </li>
    );
  };

  if (!draft.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
        <Folder className="opacity-40" size={36} />
        <p className="text-sm">This menu is empty.</p>
        <p className="max-w-[260px] text-xs opacity-80">
          Add a folder or a page, or load the default layout to start from the
          grouping the application ships with.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-0.5">
      {tree.map((node, index) => renderNode(node, 0, tree, index))}
    </ul>
  );
}
