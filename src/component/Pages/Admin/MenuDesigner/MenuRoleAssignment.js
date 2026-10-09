import React from "react";
import { Users } from "lucide-react";

/**
 * Which roles this menu serves.
 *
 * Distinct from the preview below it: this decides what people actually get,
 * the preview only shows what a role would see. A role belongs to one menu, so
 * ticking it here moves it off whichever menu held it before.
 *
 * Roles are shared between companies but a menu belongs to one, so this reaches
 * only the people who hold the role *and* sit in this menu's company. That trips
 * people up often enough to be spelled out on screen.
 */
export default function MenuRoleAssignment({
  roles,
  selectedRoleIds,
  onChange,
  orgName = null,
  disabled = false,
}) {
  const selected = new Set(selectedRoleIds || []);

  const toggle = (roleId) => {
    const next = new Set(selected);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    onChange([...next]);
  };

  if (!roles.length) {
    return (
      <p className="text-xs text-gray-400">
        No roles are available to assign. Role assignment needs permission to
        view roles.
      </p>
    );
  }

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Users size={14} /> Serves these roles
      </p>

      <div className="mt-2 max-h-40 space-y-0.5 overflow-auto rounded-xl border border-gray-200 p-1.5 dark:border-gray-700">
        {roles.map((role) => (
          <label
            className="flex min-h-[36px] items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            key={role.role_id}
          >
            <input
              checked={selected.has(role.role_id)}
              className="h-4 w-4"
              disabled={disabled}
              onChange={() => toggle(role.role_id)}
              type="checkbox"
            />
            <span className="truncate">{role.role_name}</span>
          </label>
        ))}
      </div>

      <p className="mt-1.5 text-xs opacity-60">
        {selected.size === 0
          ? "No roles assigned, so nobody sees this menu. A role with no menu has no sidebar at all."
          : `${selected.size} role${selected.size === 1 ? "" : "s"} will be served this menu. A role can only be on one menu, so ticking it here removes it from any other.`}
      </p>

      {selected.size > 0 && orgName && (
        <p className="mt-1.5 text-xs opacity-60">
          Only users whose account sits in <strong>{orgName}</strong> are served
          this menu. The same role in another company needs a menu of its own
          there — switch company at the top right to design it.
        </p>
      )}
    </div>
  );
}
