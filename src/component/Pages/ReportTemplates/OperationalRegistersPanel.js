import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Layers,
  Loader2,
  Play,
  Plus,
  Sliders,
  Table2,
  Trash2,
} from "lucide-react";

/**
 * Operational registers, read the same way as print document templates.
 *
 * The screen used to be two stacked card grids: the registers themselves, then
 * a second section listing saved custom layouts with its own heading, its own
 * empty state and its own "New Layout Template" button -- a third copy of the
 * button already in the header. A layout belongs to the register it was
 * designed for, so it is listed under that register instead of in a separate
 * catalogue of its own, and the duplicate section is gone.
 *
 * One table, one row per register, expandable to the layouts saved against it:
 * the same shape as the document templates table next door, so moving between
 * the two screens does not mean learning a second way to read a list.
 */
export default function OperationalRegistersPanel({
  datasets = [],
  customTemplates = [],
  loading = false,
  canManage = false,
  togglingId = null,
  onRun,
  onDesignNew,
  onEditLayout,
  onDeleteLayout,
  onToggleLayoutActive,
}) {
  const [expanded, setExpanded] = useState({});

  // Layouts belong to the register they were designed against, so the list is
  // grouped by resolver key rather than left flat.
  const layoutsByRegister = useMemo(() => {
    const grouped = {};
    for (const template of customTemplates) {
      const key = template.resolver_key || "__orphan__";
      (grouped[key] = grouped[key] || []).push(template);
    }
    return grouped;
  }, [customTemplates]);

  // A layout whose register is no longer in the catalogue would otherwise
  // vanish from the screen while still being applied by the server.
  const orphanLayouts = useMemo(() => {
    const known = new Set(datasets.map((d) => d.key));
    return customTemplates.filter((t) => !known.has(t.resolver_key));
  }, [customTemplates, datasets]);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 size={26} className="animate-spin text-indigo-600" />
        <p className="text-xs">Loading the register catalogue…</p>
      </div>
    );
  }

  const layoutRow = (template) => (
    <div
      key={template.id}
      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold truncate">{template.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
            {template.table_config?.columns?.filter((c) => c.visible !== false).length || 0} cols
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
            {(template.paper_settings?.page_size || template.page_size || "A4")}{" "}
            {(template.paper_settings?.orientation || template.orientation || "landscape")}
          </span>
          {template.table_config?.group_by && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              grouped by {template.table_config.group_by}
            </span>
          )}
          {!template.is_active_for_org && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500">
              INACTIVE
            </span>
          )}
        </div>
        {template.description && (
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">{template.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onRun?.(template.resolver_key, template)}
          title="Run this register with this layout"
          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
        >
          <Play size={11} /> Run
        </button>
        {canManage && (
          <>
            <label
              className="flex items-center gap-1.5 px-1.5 cursor-pointer"
              title={template.is_active_for_org ? "Active — click to deactivate" : "Inactive — click to activate"}
            >
              <input
                type="checkbox"
                checked={Boolean(template.is_active_for_org)}
                disabled={togglingId === template.id}
                onChange={() => onToggleLayoutActive?.(template)}
                className="sr-only peer"
              />
              <span className="relative w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:border-slate-300 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <button
              type="button"
              onClick={() => onEditLayout?.(template)}
              title="Edit this layout"
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <Edit3 size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteLayout?.(template)}
              title="Delete this layout"
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead className={"bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400"}>
              <tr className="text-left">
                <th className="px-4 py-3 font-bold w-8" />
                <th className="px-4 py-3 font-bold">Register</th>
                <th className="px-4 py-3 font-bold">Module</th>
                <th className="px-4 py-3 font-bold">Columns</th>
                <th className="px-4 py-3 font-bold">Can group by</th>
                <th className="px-4 py-3 font-bold">Saved layouts</th>
                <th className="px-4 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {datasets.map((item) => {
                const layouts = layoutsByRegister[item.key] || [];
                const isOpen = Boolean(expanded[item.key]);
                return (
                  <React.Fragment key={item.key}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggle(item.key)}
                          title={isOpen ? "Hide saved layouts" : "Show saved layouts"}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onRun?.(item.key)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-left"
                        >
                          {item.name}
                        </button>
                        {item.description && (
                          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 max-w-md line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {item.columns?.length || 0} · {item.default_orientation}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-wrap gap-1">
                          {(item.supported_groupings || []).slice(0, 3).map((g) => (
                            <span key={g.key || g} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                              {g.label || g.key || g}
                            </span>
                          ))}
                          {(item.supported_groupings || []).length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{item.supported_groupings.length - 3}
                            </span>
                          )}
                          {(item.supported_groupings || []).length === 0 && (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {layouts.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggle(item.key)}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            {layouts.length} saved
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">none</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onRun?.(item.key)}
                            title="Choose filters and run this register"
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-100 dark:border-indigo-900/60 flex items-center gap-1"
                          >
                            <Play size={11} /> Run
                          </button>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => onDesignNew?.(item)}
                              title="Design a saved layout for this register"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            >
                              <Sliders size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                        <td />
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2">
                            {layouts.length === 0 ? (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                No saved layout for this register yet. A layout fixes which columns
                                appear, their labels and widths, the paper geometry and the grouping,
                                so the same register can print two different ways.
                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => onDesignNew?.(item)}
                                    className="ml-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <Plus size={10} /> Design one
                                  </button>
                                )}
                              </p>
                            ) : (
                              layouts.map(layoutRow)
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {datasets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <Table2 size={22} className="mx-auto text-slate-300 dark:text-slate-700" />
                    <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                      No operational register is available to this company
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Registers come with the modules a company subscribes to.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {orphanLayouts.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
            <h3 className="text-xs font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Layers size={13} /> Layouts whose register is no longer available
            </h3>
            <p className="mt-1 mb-2.5 text-[11px] text-amber-700 dark:text-amber-400">
              The register these were designed for is not in this company's catalogue — usually a
              module that is no longer subscribed. They are kept rather than hidden, because the
              server still applies one if something asks for it by id.
            </p>
            <div className="space-y-2">{orphanLayouts.map(layoutRow)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
