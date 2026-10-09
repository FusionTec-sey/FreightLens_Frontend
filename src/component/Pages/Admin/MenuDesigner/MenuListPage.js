import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  ListTree,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import { useAuth } from "../../../../context/AuthContext";
import { useConfirm } from "../../../../context/ConfirmContext";
import {
  createMenu,
  deleteMenu,
  fetchMenus,
  fetchOrgMenus,
} from "../../../../services/navigationApi";
import {
  PageHeader,
  actionCellClass,
  actionHeaderClass,
  buttonClass,
  cardClass,
  deleteIconButtonClass,
  editIconButtonClass,
  fieldClass,
  secondaryButtonClass,
  tableHeaderClass,
} from "../../Orders/OrderUi";

/**
 * The menus this organisation has designed.
 *
 * A menu reaches people only through the roles assigned to it: whoever holds an
 * assigned role is served it, and a role with no menu gets no sidebar at all.
 * Clicking a row opens that menu in the designer.
 */
export default function MenuListPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { permissions = [], isRoot } = useAuth();

  const [menus, setMenus] = useState([]);
  const [orgMenus, setOrgMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [seedFromDefault, setSeedFromDefault] = useState(true);

  const canManage = isRoot || permissions.includes("Manage_Menu");

  // Every menu in the response belongs to the active company, so any row names it.
  const orgName = menus.find((menu) => menu.org_name)?.org_name || null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, orgRows] = await Promise.all([
        fetchMenus(),
        // Platform admins only; a tenant admin gets 403 and simply sees no list.
        fetchOrgMenus().catch(() => []),
      ]);
      setMenus(rows);
      setOrgMenus(orgRows);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load the menus.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(
    async (event) => {
      event.preventDefault();
      const name = newName.trim();
      if (!name) {
        toast.error("Give the menu a name.");
        return;
      }
      setBusyId("new");
      try {
        const menu = await createMenu({ name, seedFromDefault });
        toast.success(
          `"${menu.name}" created. Assign it to roles so they are served it.`
        );
        navigate(`/admin/menu/${menu.id}`);
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Could not create the menu.");
      } finally {
        setBusyId(null);
      }
    },
    [navigate, newName, seedFromDefault]
  );

  const handleDelete = useCallback(
    async (menu) => {
      const servedRoles = menu.role_names?.length
        ? ` ${menu.role_names.join(", ")} will have no sidebar until another menu is assigned to them.`
        : "";
      const ok = await confirm(
        `Delete "${menu.name}" and its ${menu.item_count} item(s)?${servedRoles}`,
        { title: "Delete menu", confirmLabel: "Delete" }
      );
      if (!ok) return;
      setBusyId(menu.id);
      try {
        await deleteMenu(menu.id);
        toast.success(`"${menu.name}" deleted.`);
        await load();
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Could not delete the menu.");
      } finally {
        setBusyId(null);
      }
    },
    [confirm, load]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-2 sm:p-4">
      <div className="shrink-0">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span>Menus</span>
              {orgName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Building2 size={12} /> {orgName}
                </span>
              )}
            </span>
          }
          description="Navigation layouts belonging to this company. A menu is served to the roles assigned to it; a role with no menu gets no sidebar. Roles are shared between companies but menus are not, so a menu only reaches people whose account sits in this company."
          actions={
            <>
              <button className={secondaryButtonClass} onClick={load} type="button">
                <RefreshCw size={16} /> Refresh
              </button>
              {canManage && (
                <button
                  className={buttonClass}
                  onClick={() => setCreating((open) => !open)}
                  type="button"
                >
                  <Plus size={16} /> New menu
                </button>
              )}
            </>
          }
        />
      </div>

      {creating && canManage && (
        <form
          className={`${cardClass} mb-4 shrink-0 p-4`}
          onSubmit={handleCreate}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                htmlFor="new-menu-name"
              >
                Menu name
              </label>
              <input
                autoFocus
                className={`${fieldClass} mt-1.5`}
                id="new-menu-name"
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Warehouse menu"
                value={newName}
              />
            </div>
            <button className={buttonClass} disabled={busyId === "new"} type="submit">
              {busyId === "new" ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
              Create and open
            </button>
            <button
              className={secondaryButtonClass}
              onClick={() => setCreating(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
          <label className="mt-3 flex min-h-[44px] items-center gap-2.5 text-sm">
            <input
              checked={seedFromDefault}
              className="h-4 w-4"
              onChange={(event) => setSeedFromDefault(event.target.checked)}
              type="checkbox"
            />
            <span>
              Start from the default layout
              <span className="block text-xs opacity-60">
                Off: start empty and add every item yourself.
              </span>
            </span>
          </label>
        </form>
      )}

      {menus.length > 0 && !menus.some((menu) => menu.role_names?.length) && (
        <div className="mb-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          No menu is assigned to any role, so nobody has a sidebar — only their
          profile, theme and logout. Open a menu and assign roles to it under
          Audience. Administrators keep a link to this screen either way.
        </div>
      )}

      {error && (
        <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      {menus.length === 0 && !error && (
        <div className={`${cardClass} shrink-0 p-6 text-center`}>
          <ListTree className="mx-auto mb-3 opacity-40" size={36} />
          <p className="text-sm font-semibold">No menus designed yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm opacity-65">
            Users are currently served the layout that ships with the
            application, which grows as new screens are released. Create a menu
            to arrange navigation yourself.
          </p>
          {canManage && (
            <button
              className={`${buttonClass} mt-4`}
              onClick={() => setCreating(true)}
              type="button"
            >
              <Plus size={16} /> New menu
            </button>
          )}
        </div>
      )}

      {menus.length > 0 && (
        <div className={`${cardClass} flex min-h-0 flex-1 flex-col overflow-hidden`}>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className={`${tableHeaderClass} sticky top-0 z-10`}>
                <tr>
                  <th className="px-4 py-3 font-semibold">Menu</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Serves</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Items</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Not in menu</th>
                  <th className="px-3 py-3 font-semibold whitespace-nowrap">Last changed</th>
                  <th className="px-3 py-3 font-semibold">By</th>
                  <th className={actionHeaderClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menus.map((menu) => (
                  <tr
                    className="cursor-pointer border-t border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                    key={menu.id}
                    onClick={() => navigate(`/admin/menu/${menu.id}`)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{menu.name}</span>
                      {menu.is_shared && (
                        <span className="ml-2 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          All companies
                        </span>
                      )}
                      {menu.description && (
                        <span className="block truncate text-xs opacity-60" title={menu.description}>
                          {menu.description}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {menu.role_names?.length ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 size={12} /> In use
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          Not in use
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {menu.role_names?.length ? (
                        <span className="flex flex-wrap gap-1">
                          {menu.role_names.map((role) => (
                            <span
                              className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                              key={role}
                            >
                              {role}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs opacity-60">Nobody yet</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{menu.item_count}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {menu.unmapped_page_count > 0 ? (
                        <span
                          className="text-amber-600 dark:text-amber-400"
                          title="Pages this menu does not link to. They are reachable only by typing the URL."
                        >
                          {menu.unmapped_page_count}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {menu.updated_at ? new Date(menu.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2.5">{menu.updated_by || "—"}</td>
                    <td className={actionCellClass} onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <button
                          aria-label={`Edit ${menu.name}`}
                          className={editIconButtonClass}
                          onClick={() => navigate(`/admin/menu/${menu.id}`)}
                          title="Edit this menu"
                          type="button"
                        >
                          <Pencil size={16} />
                        </button>
                        {canManage && (
                          <button
                            aria-label={`Delete ${menu.name}`}
                            className={deleteIconButtonClass}
                            disabled={busyId === menu.id}
                            onClick={() => handleDelete(menu)}
                            title="Delete this menu"
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {orgMenus.length > 0 && (
        <details className={`${cardClass} mt-3 shrink-0 px-4 py-2.5 text-sm`}>
          <summary className="cursor-pointer font-semibold">
            Menus across organisations ({orgMenus.filter((org) => org.is_custom).length} of{" "}
            {orgMenus.length} with menus of their own)
          </summary>
          <p className="mt-2 text-xs opacity-60">
            You are editing the active organisation. Switch organisation to work
            on another one&apos;s menus.
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={tableHeaderClass}>
                <tr>
                  <th className="px-2 py-1.5">Organisation</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Roles served</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Menus</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Items</th>
                  <th className="px-2 py-1.5 whitespace-nowrap">Last changed</th>
                  <th className="px-2 py-1.5">By</th>
                </tr>
              </thead>
              <tbody>
                {orgMenus.map((org) => (
                  <tr className="border-t border-gray-100 dark:border-gray-800" key={org.org_id}>
                    <td className="px-2 py-1.5">
                      <span className={org.is_active ? "" : "opacity-50"}>{org.org_name}</span>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {org.is_custom ? (
                        org.assigned_role_count || (
                          <span className="opacity-60">None assigned</span>
                        )
                      ) : (
                        <span className="opacity-60">Shipped layout</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{org.menu_count || "—"}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{org.item_count || "—"}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {org.updated_at ? new Date(org.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-2 py-1.5">{org.updated_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
