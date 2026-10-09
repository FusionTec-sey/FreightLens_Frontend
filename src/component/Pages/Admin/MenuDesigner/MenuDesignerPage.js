import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FolderPlus,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "react-toastify";

import { useAuth } from "../../../../context/AuthContext";
import { useConfirm } from "../../../../context/ConfirmContext";
import {
  fetchMenu,
  fetchPageRegistry,
  fetchRoleVisibility,
  saveMenuItems,
  updateMenu,
} from "../../../../services/navigationApi";
import {
  PageHeader,
  buttonClass,
  cardClass,
  fieldClass,
  secondaryButtonClass,
  settingsPageClass,
} from "../../Orders/OrderUi";
import MenuItemForm from "./MenuItemForm";
import MenuPreview from "./MenuPreview";
import MenuRoleAssignment from "./MenuRoleAssignment";
import MenuTreeEditor from "./MenuTreeEditor";
import {
  MAX_MENU_DEPTH,
  addItem,
  canAddUnder,
  isFolderItem,
  draftFromRegistry,
  draftFromRows,
  moveItem,
  removeItem,
  reparentItem,
  toSavePayload,
  updateItem,
  validateDraft,
} from "./menuDraft";

const paneClass = `${cardClass} flex min-h-0 flex-col overflow-hidden`;
const paneHeaderClass =
  "shrink-0 border-b border-gray-200 px-4 py-3 dark:border-gray-700";

/**
 * Menu Designer — arrange one named menu.
 *
 * Opened from the menu list, for the menu named in the route. Three panes: the
 * tree, the selected item, and a live "view as role" preview.
 * Pages come from the registry rather than typed URLs, so a menu entry always
 * carries a real route and the permissions that route already enforces.
 *
 * This screen changes what users *see*. It never changes what they may open:
 * PrivateRoute and the API permission checks remain the security boundary.
 */
export default function MenuDesignerPage() {
  const { confirm } = useConfirm();
  const { isRoot } = useAuth();
  const navigate = useNavigate();
  const { menuId } = useParams();

  const [menu, setMenu] = useState(null);
  const [name, setName] = useState("");
  const [roleIds, setRoleIds] = useState([]);
  const [savedRoleIds, setSavedRoleIds] = useState([]);
  const [isShared, setIsShared] = useState(false);

  const [pages, setPages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [limits, setLimits] = useState({ maxDepth: MAX_MENU_DEPTH, maxItems: 300 });
  const [roles, setRoles] = useState([]);
  const [draft, setDraft] = useState([]);
  const [savedDraft, setSavedDraft] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [previewRoleId, setPreviewRoleId] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [registry, detail, roleVisibility] = await Promise.all([
        fetchPageRegistry(),
        fetchMenu(menuId),
        // The preview is a convenience: losing it must not block the designer.
        fetchRoleVisibility().catch(() => []),
      ]);
      setPages(registry.pages);
      setGroups(registry.groups);
      setLimits({
        maxDepth: registry.maxMenuDepth || MAX_MENU_DEPTH,
        maxItems: registry.maxMenuItems || 300,
      });
      setRoles(roleVisibility);
      setMenu(detail);
      setName(detail.name || "");
      const assigned = [...(detail.role_ids || [])].sort();
      setRoleIds(assigned);
      setSavedRoleIds(assigned);
      setIsShared(Boolean(detail.is_shared));

      const loaded = draftFromRows(detail.items || []);
      setDraft(loaded);
      setSavedDraft(loaded);
      setSelectedId(loaded[0]?.temp_id || null);
    } catch (err) {
      setError(
        err?.response?.status === 404
          ? "This menu no longer exists."
          : err?.response?.data?.detail || "Could not load the menu. Try again."
      );
    } finally {
      setLoading(false);
    }
  }, [menuId]);

  useEffect(() => {
    load();
  }, [load]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(draft) !== JSON.stringify(savedDraft) ||
      (menu ? name.trim() !== menu.name : false) ||
      (menu ? Boolean(menu.is_shared) !== isShared : false) ||
      JSON.stringify([...roleIds].sort()) !== JSON.stringify(savedRoleIds),
    [draft, savedDraft, menu, name, roleIds, savedRoleIds, isShared]
  );

  // Losing an arranged menu to a stray tab close is worth one browser prompt.
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const activePageKeys = useMemo(() => pages.map((page) => page.page_key), [pages]);
  const { errors, warnings } = useMemo(
    () => validateDraft(draft, activePageKeys, limits.maxDepth),
    [draft, activePageKeys, limits.maxDepth]
  );

  // The backend keeps the designer reachable for admins even when it is left
  // out, but anyone else arranging navigation should be told it is missing.
  const designerWarning = useMemo(
    () =>
      draft.some((item) => item.page_key === "MENU_DESIGNER")
        ? null
        : "This menu does not include the Menu Designer. Administrators keep a link to it either way, but add it so it is easy to find.",
    [draft]
  );

  const unmappedPages = useMemo(() => {
    const used = new Set(draft.map((item) => item.page_key).filter(Boolean));
    return pages.filter((page) => !used.has(page.page_key));
  }, [draft, pages]);

  const selected = draft.find((item) => item.temp_id === selectedId) || null;

  const handleChange = useCallback(
    (changes) => {
      if (!selected) return;
      if ("parent_temp_id" in changes) {
        const { draft: next, error: reparentError } = reparentItem(
          draft,
          selected.temp_id,
          changes.parent_temp_id,
          limits.maxDepth
        );
        if (reparentError) {
          toast.error(reparentError);
          return;
        }
        const rest = { ...changes };
        delete rest.parent_temp_id;
        setDraft(Object.keys(rest).length ? updateItem(next, selected.temp_id, rest) : next);
        return;
      }
      setDraft((current) => updateItem(current, selected.temp_id, changes));
    },
    [draft, limits.maxDepth, selected]
  );

  /**
   * Where a new item would go: inside the selected folder, otherwise beside the
   * selection. A folder needs room for a child, so it counts as two levels.
   */
  const addTarget = useCallback(
    (asFolder) => {
      const preferred =
        selected && isFolderItem(selected)
          ? selected.temp_id
          : selected?.parent_temp_id || null;
      const height = asFolder ? 2 : 1;
      if (canAddUnder(draft, preferred, limits.maxDepth, height)) {
        return { parent: preferred, movedUp: false };
      }
      // Too deep for the sidebar to render: fall back to the level above.
      const fallback = preferred
        ? draft.find((item) => item.temp_id === preferred)?.parent_temp_id || null
        : null;
      if (canAddUnder(draft, fallback, limits.maxDepth, height)) {
        return { parent: fallback, movedUp: true };
      }
      return { parent: null, movedUp: true };
    },
    [draft, limits.maxDepth, selected]
  );

  const handleAdd = useCallback(
    (asFolder) => {
      if (draft.length >= limits.maxItems) {
        toast.error(`A menu may hold at most ${limits.maxItems} items.`);
        return;
      }
      const { parent, movedUp } = addTarget(asFolder);
      const next = addItem(draft, {
        label: asFolder ? "New folder" : "",
        page_key: asFolder ? null : "",
        parent_temp_id: parent,
        sort_order: draft.length,
      });
      setDraft(next);
      setSelectedId(next[next.length - 1].temp_id);
      if (movedUp) {
        toast.info(
          `Added one level up: the sidebar shows ${limits.maxDepth} levels, and ${
            asFolder ? "a folder needs room for the items inside it" : "there was no room deeper"
          }.`
        );
      }
    },
    [addTarget, draft, limits.maxDepth, limits.maxItems]
  );

  const handleRemove = useCallback(
    async (tempId) => {
      const item = draft.find((entry) => entry.temp_id === tempId);
      const children = draft.filter((entry) => entry.parent_temp_id === tempId).length;
      const message = children
        ? `Remove "${item?.label || "this item"}" and the ${children} item(s) inside it?`
        : `Remove "${item?.label || "this item"}" from the menu?`;
      const ok = await confirm(message, {
        title: "Remove menu item",
        confirmLabel: "Remove",
      });
      if (!ok) return;
      setDraft((current) => removeItem(current, tempId));
      setSelectedId((current) => (current === tempId ? null : current));
    },
    [confirm, draft]
  );

  const handleLoadDefault = useCallback(async () => {
    const ok = draft.length
      ? await confirm("Replace the current menu with the default layout?", {
          title: "Load default menu",
          confirmLabel: "Replace",
        })
      : true;
    if (!ok) return;
    const next = draftFromRegistry(pages, groups);
    setDraft(next);
    setSelectedId(next[0]?.temp_id || null);
  }, [confirm, draft.length, groups, pages]);

  const handleDiscard = useCallback(async () => {
    const ok = await confirm("Discard your unsaved changes to this menu?", {
      title: "Discard changes",
      confirmLabel: "Discard",
    });
    if (!ok) return;
    setDraft(savedDraft);
    setName(menu?.name || "");
    setRoleIds(savedRoleIds);
    setIsShared(Boolean(menu?.is_shared));
    setSelectedId(savedDraft[0]?.temp_id || null);
  }, [confirm, menu, savedDraft, savedRoleIds]);

  const handleToggleCollapse = useCallback((tempId) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }
    const missingPage = draft.find((item) => item.page_key === "");
    if (missingPage) {
      setSelectedId(missingPage.temp_id);
      toast.error(`"${missingPage.label || "An item"}" has no page selected.`);
      return;
    }
    setSaving(true);
    try {
      await saveMenuItems(menuId, toSavePayload(draft));
      const trimmed = name.trim();
      const renamed = trimmed && trimmed !== menu?.name;
      const reassigned =
        JSON.stringify([...roleIds].sort()) !== JSON.stringify(savedRoleIds);
      const reshared = Boolean(menu?.is_shared) !== isShared;
      if (renamed || reassigned || reshared) {
        await updateMenu(menuId, {
          ...(renamed ? { name: trimmed } : {}),
          ...(reassigned ? { roleIds } : {}),
          ...(reshared ? { isShared } : {}),
        });
      }
      toast.success(
        roleIds.length
          ? "Menu saved. Those roles see it the next time their menu loads."
          : "Menu saved. Nobody sees it until a role is assigned to it."
      );
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save the menu.");
    } finally {
      setSaving(false);
    }
  }, [draft, errors, isShared, load, menu, menuId, name, roleIds, savedRoleIds]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={settingsPageClass}>
        <PageHeader title="Menu Designer" description="Arrange the navigation your organisation sees." />
        <div className={`${cardClass} p-6 text-center`}>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button className={secondaryButtonClass} onClick={load} type="button">
              Try again
            </button>
            <button
              className={secondaryButtonClass}
              onClick={() => navigate("/admin/menu")}
              type="button"
            >
              Back to menus
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-2 sm:p-4">
      <div className="shrink-0">
        <Link
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          to="/admin/menu"
        >
          <ArrowLeft size={15} /> All menus
        </Link>
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span>{menu?.name || "Menu"}</span>
              {isShared && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <Building2 size={12} /> All companies
                </span>
              )}
              {!isShared && menu?.org_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Building2 size={12} /> {menu.org_name}
                </span>
              )}
              {roleIds.length ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 size={12} /> Serves {roleIds.length} role
                  {roleIds.length === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Not in use
                </span>
              )}
            </span>
          }
          description={
            roleIds.length
              ? "Served to the roles assigned under Audience. Access itself is set by roles and permissions, not here."
              : "Not in use: no role is assigned to it, so nobody sees it. Assign roles under Audience."
          }
          actions={
            <>
              <button className={secondaryButtonClass} onClick={() => handleAdd(true)} type="button">
                <FolderPlus size={16} /> Folder
              </button>
              <button className={secondaryButtonClass} onClick={() => handleAdd(false)} type="button">
                <Sparkles size={16} /> Page
              </button>
              <button className={secondaryButtonClass} onClick={handleLoadDefault} type="button">
                Load default
              </button>
              <button
                className={secondaryButtonClass}
                disabled={!isDirty || saving}
                onClick={handleDiscard}
                type="button"
              >
                <RotateCcw size={16} /> Discard
              </button>
              <button
                className={buttonClass}
                disabled={!isDirty || saving || errors.length > 0}
                onClick={handleSave}
                type="button"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? "Saving…" : "Save menu"}
              </button>
            </>
          }
        />
      </div>

      {errors.length > 0 && (
        <div className="mb-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Tree */}
        <section className={paneClass}>
          <div className={paneHeaderClass}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" htmlFor="menu-name">
              Menu name
            </label>
            <input
              className={`${fieldClass} mt-1.5`}
              id="menu-name"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Menu name"
              value={name}
            />
            <p className="mt-2 text-xs opacity-60">
              {draft.length} item{draft.length === 1 ? "" : "s"} · up to {limits.maxDepth} levels
              {isDirty && " · unsaved changes"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <MenuTreeEditor
              collapsed={collapsed}
              draft={draft}
              onMove={(tempId, direction) =>
                setDraft((current) => moveItem(current, tempId, direction))
              }
              onRemove={handleRemove}
              onSelect={setSelectedId}
              onToggleCollapse={handleToggleCollapse}
              selectedId={selectedId}
            />
          </div>

          {(warnings.length > 0 || unmappedPages.length > 0 || designerWarning) && (
            <div className="shrink-0 space-y-1.5 border-t border-gray-200 px-4 py-3 text-xs dark:border-gray-700">
              {[...warnings, ...(designerWarning ? [designerWarning] : [])].map((message) => (
                <p className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400" key={message}>
                  <TriangleAlert className="mt-px shrink-0" size={13} /> {message}
                </p>
              ))}
              {unmappedPages.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-amber-600 dark:text-amber-400">
                    {unmappedPages.length} page{unmappedPages.length === 1 ? "" : "s"} not in this
                    menu — reachable only by typing the URL
                  </summary>
                  <ul className="mt-1.5 space-y-0.5 pl-4 opacity-75">
                    {unmappedPages.map((page) => (
                      <li key={page.page_key}>{page.title}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>

        {/* Editor */}
        <section className={paneClass}>
          <div className={paneHeaderClass}>
            <h2 className="text-sm font-semibold">Edit item</h2>
            <p className="mt-0.5 truncate text-xs opacity-60">
              {selected ? selected.label || "Untitled" : "Nothing selected"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <MenuItemForm
              draft={draft}
              item={selected}
              maxDepth={limits.maxDepth}
              onChange={handleChange}
              pages={pages}
            />
          </div>
        </section>

        {/* Preview */}
        <section className={paneClass}>
          <div className={paneHeaderClass}>
            <h2 className="text-sm font-semibold">Audience</h2>
            <p className="mt-0.5 text-xs opacity-60">
              Who gets this menu, and what they would see
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
            {isRoot && (
              <label className="flex min-h-[44px] items-start gap-2.5 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700">
                <input
                  checked={isShared}
                  className="mt-0.5 h-4 w-4"
                  onChange={(event) => setIsShared(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  Share with all companies
                  <span className="block text-xs opacity-60">
                    Off: only people in {menu?.org_name || "this company"} are
                    served it. On: its roles are served it in every company, the
                    way a shared role works. Only shared roles can be assigned to
                    a shared menu.
                  </span>
                </span>
              </label>
            )}

            <MenuRoleAssignment
              onChange={setRoleIds}
              orgName={isShared ? null : menu?.org_name}
              roles={roles}
              selectedRoleIds={roleIds}
            />

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              {roles.length > 0 ? (
                <MenuPreview
                  draft={draft}
                  onSelectRole={setPreviewRoleId}
                  roles={roles}
                  selectedRoleId={previewRoleId}
                />
              ) : (
                <p className="py-8 text-center text-xs text-gray-400">
                  Role preview is unavailable. It needs permission to view roles.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
