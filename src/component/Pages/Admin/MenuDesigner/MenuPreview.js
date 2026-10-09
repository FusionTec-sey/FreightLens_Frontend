import React from "react";
import { Lock, TriangleAlert } from "lucide-react";

import { fieldClass } from "../../Orders/OrderUi";
import { resolveMenuIcon } from "../../../../utils/menuIcons";
import { isSeparator, previewForRole } from "./menuDraft";

/**
 * "View as role" preview.
 *
 * The allowed page keys come from the backend, which computes them with the same
 * rule `/my-menu` uses, so this preview cannot disagree with what the role gets.
 * It is what catches "this role would see an empty menu" before saving.
 */
export default function MenuPreview({ draft, roles, selectedRoleId, onSelectRole }) {
  const role = roles.find((entry) => String(entry.role_id) === String(selectedRoleId));
  const tree = role ? previewForRole(draft, role.allowed_page_keys) : [];

  const renderNodes = (nodes, depth = 0) =>
    nodes.map((node) => {
      const Icon = resolveMenuIcon(node.icon);
      if (isSeparator(node)) {
        return (
          <li key={node.temp_id}>
            <div
              className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider opacity-50"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              {node.label}
            </div>
          </li>
        );
      }
      return (
        <li key={node.temp_id}>
          <div
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
              node.locked ? "opacity-55" : ""
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <Icon className="shrink-0 opacity-70" size={15} />
            <span className="truncate">{node.label || "Untitled"}</span>
            {node.locked && <Lock className="shrink-0 opacity-70" size={12} />}
          </div>
          {node.children.length > 0 && <ul>{renderNodes(node.children, depth + 1)}</ul>}
        </li>
      );
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <label
          className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          htmlFor="preview-role"
        >
          Preview as role (changes nothing)
        </label>
        <select
          className={`${fieldClass} mt-1.5`}
          id="preview-role"
          onChange={(event) => onSelectRole(event.target.value)}
          value={selectedRoleId || ""}
        >
          <option value="">Select a role…</option>
          {roles.map((entry) => (
            <option key={entry.role_id} value={entry.role_id}>
              {entry.role_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/40">
        {!role && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            Pick a role to see the sidebar it would get.
          </p>
        )}

        {role && tree.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <TriangleAlert className="text-amber-500" size={22} />
            <p className="text-sm font-semibold">{role.role_name} would see an empty menu.</p>
            <p className="text-xs opacity-70">
              Add a page this role can open, or mark an item "show locked" so the
              role can request access.
            </p>
          </div>
        )}

        {role && tree.length > 0 && <ul className="space-y-0.5">{renderNodes(tree)}</ul>}
      </div>

      {role?.is_platform_admin && (
        <p className="mt-2 shrink-0 text-xs opacity-60">
          Platform administrators bypass every permission check, so this role sees
          every page in the menu.
        </p>
      )}
    </div>
  );
}
