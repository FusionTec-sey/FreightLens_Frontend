import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, Container as ContainerIcon, Plus, Trash2, Save, PackageCheck,
  AlertTriangle, Loader2, Search,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import POTagSelector from "../../UI/UXComponent/POTagSelector";
import ProductPickerModal from "./ProductPickerModal";

/**
 * Build a packing list from a container.
 *
 * The container is picked first, not the order: a real shipment is one
 * container holding parts of several orders. Once it is chosen the lines seed
 * themselves from every order linked to it, each at what that order still
 * owes -- so a second container for the same order shows only what the first
 * one left, and a line that is fully packed does not appear at all.
 *
 * A container with no orders linked is not a dead end: the same chip control
 * used on the container form appears here, so the links can be made without
 * leaving the screen.
 */

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  skip_zrok_interstitial: "true",
});

const api = process.env.REACT_APP_NETWORK;
const num = (v) => (v === "" || v == null ? 0 : Number(v) || 0);

export default function PackingListBuilderModal({
  open, onClose, onSaved, container: presetContainer, packingListId = null,
}) {
  const [container, setContainer] = useState(presetContainer || null);
  const [containerQuery, setContainerQuery] = useState("");
  const [containerResults, setContainerResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [poIds, setPoIds] = useState([]);
  const [linkedOrders, setLinkedOrders] = useState([]);
  const [linking, setLinking] = useState(false);

  const [lines, setLines] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [header, setHeader] = useState({
    packing_list_number: "",
    supplier_invoice_ref: "",
    date_issued: new Date().toISOString().slice(0, 10),
    package_count: "",
    total_gross_weight: "",
    total_cbm: "",
    notes: "",
  });

  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const reset = useCallback(() => {
    setContainer(presetContainer || null);
    setContainerQuery("");
    setContainerResults([]);
    setPoIds([]);
    setLinkedOrders([]);
    setLines([]);
    setWarnings([]);
    setHeader((h) => ({ ...h, packing_list_number: "", supplier_invoice_ref: "", notes: "" }));
  }, [presetContainer]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // ── Container search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || container || !containerQuery.trim()) {
      setContainerResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`${api}/containers`, {
          params: { search: containerQuery.trim(), limit: 10 },
          headers: headers(),
        });
        setContainerResults(res.data?.data || []);
      } catch {
        toast.error("Could not search containers");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [containerQuery, container, open]);

  // ── Seeding ───────────────────────────────────────────────────────────────
  /**
   * Editing a draft asks the seeder the same question, passing the draft's own
   * id so its lines are excluded from what other drafts hold -- otherwise the
   * draft would be counted against itself and show less room than it has. The
   * saved lines win on quantity; the seed supplies the ordered and remaining
   * context the grid shows beside them.
   */
  const seed = useCallback(async (containerId, existing = null) => {
    setSeeding(true);
    try {
      const res = await axios.post(
        `${api}/packing-lists/draft-from-container`,
        { container_id: containerId, packing_list_id: existing?.id || undefined },
        { headers: headers() }
      );
      const data = res.data || {};
      const context = new Map(
        (data.items || []).filter((i) => i.po_item_id).map((i) => [i.po_item_id, i])
      );

      if (existing) {
        setLines(
          (existing.items || []).map((it, idx) => {
            const ctx = it.po_item_id ? context.get(it.po_item_id) : null;
            return {
              ...(ctx || {}),
              ...it,
              // The saved quantity, plus whatever this line already holds --
              // that much is still available to it.
              remaining: ctx ? ctx.remaining + Number(it.quantity_packed || 0) : null,
              key: `${it.id || it.po_item_id || "new"}-${idx}`,
            };
          })
        );
      } else {
        setLines(
          (data.items || []).map((it, idx) => ({ ...it, key: `${it.po_item_id || "new"}-${idx}` }))
        );
      }

      setWarnings(data.warnings || []);
      setLinkedOrders(data.purchase_orders || []);
      setPoIds((data.purchase_orders || []).map((po) => po.id));
      if (!existing) {
        setHeader((h) => ({ ...h, packing_list_number: data.packing_list_number || h.packing_list_number }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load this container's orders");
    } finally {
      setSeeding(false);
    }
  }, []);

  /** Open on an existing draft: load it, then seed around it. */
  const loadExisting = useCallback(async (listId) => {
    setSeeding(true);
    try {
      const res = await axios.get(`${api}/packing-lists/${listId}`, { headers: headers() });
      const data = res.data || {};
      if ((data.status || "").toUpperCase() !== "DRAFT") {
        toast.info(`${data.packing_list_number} is ${String(data.status).toLowerCase()} and cannot be edited.`);
        onClose();
        return;
      }
      setContainer({
        Container_ID: data.container_id,
        container_no: data.container_no,
        BillOfLanding: null,
      });
      setHeader({
        packing_list_number: data.packing_list_number || "",
        supplier_invoice_ref: data.supplier_invoice_ref || "",
        date_issued: data.date_issued || new Date().toISOString().slice(0, 10),
        package_count: data.package_count ?? "",
        total_gross_weight: data.total_gross_weight || "",
        total_cbm: data.total_cbm || "",
        notes: data.notes || "",
      });
      if (data.container_id) await seed(data.container_id, data);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not open that draft");
      onClose();
    } finally {
      setSeeding(false);
    }
  }, [seed, onClose]);

  useEffect(() => {
    if (!open) return;
    if (packingListId) loadExisting(packingListId);
    else if (container?.Container_ID) seed(container.Container_ID);
    // container identity changes when it is picked; packingListId is fixed per open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, packingListId, container?.Container_ID]);

  const linkAndContinue = async () => {
    if (!container) return;
    setLinking(true);
    try {
      await axios.put(
        `${api}/containers/${container.Container_ID}/purchase-orders`,
        { po_ids: poIds },
        { headers: headers() }
      );
      await seed(container.Container_ID);
      toast.success("Purchase orders linked");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not link those orders");
    } finally {
      setLinking(false);
    }
  };

  // ── Line editing ──────────────────────────────────────────────────────────
  const setLine = (key, patch) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key));

  const addProducts = (products) => {
    setLines((prev) => [
      ...prev,
      ...products.map((p, idx) => ({
        key: `off-po-${Date.now()}-${idx}`,
        po_id: null,
        po_number: null,
        po_item_id: null,
        item_code: p.code || p.sku || null,
        description: p.name || p.description || "",
        unit: p.unit || "PCS",
        quantity_packed: 1,
        remaining: null,
        carton_numbers: "",
        notes: null,
      })),
    ]);
    setPickerOpen(false);
  };

  const grouped = useMemo(() => {
    const groups = new Map();
    lines.forEach((l) => {
      const label = l.po_number || "Not on any PO";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(l);
    });
    return [...groups.entries()];
  }, [lines]);

  const overPacked = lines.filter((l) => l.remaining != null && num(l.quantity_packed) > l.remaining);
  const packable = lines.filter((l) => num(l.quantity_packed) > 0);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async (status) => {
    if (!container) return toast.warning("Pick a container first");
    if (!packable.length) return toast.warning("Nothing to pack — every line is zero");

    setSaving(true);
    try {
      const body = {
        container_id: container.Container_ID,
        status,
        ...header,
        package_count: header.package_count === "" ? null : Number(header.package_count),
        total_gross_weight: header.total_gross_weight === "" ? null : Number(header.total_gross_weight),
        total_cbm: header.total_cbm === "" ? null : Number(header.total_cbm),
        items: packable.map((l) => ({
          po_id: l.po_id,
          po_item_id: l.po_item_id,
          item_code: l.item_code,
          description: l.description,
          quantity_packed: num(l.quantity_packed),
          unit: l.unit,
          carton_numbers: l.carton_numbers,
          notes: l.notes,
        })),
      };

      if (packingListId) {
        await axios.put(`${api}/packing-lists/${packingListId}`, body, { headers: headers() });
      } else {
        await axios.post(`${api}/packing-lists`, body, { headers: headers() });
      }
      toast.success(status === "DRAFT" ? "Draft saved" : "Packing list confirmed");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not save the packing list");
    } finally {
      setSaving(false);
    }
  };

  const confirm = () => {
    const poCount = new Set(packable.filter((l) => l.po_id).map((l) => l.po_id)).size;
    const ok = window.confirm(
      `Confirm ${header.packing_list_number || "this packing list"}?\n\n` +
      `${packable.length} lines across ${poCount} purchase order${poCount === 1 ? "" : "s"}. ` +
      `Confirming moves these quantities onto the orders.`
    );
    if (ok) save("CONFIRMED");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-5xl my-8 shadow-2xl border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <PackageCheck className="text-blue-500" size={20} />
              {packingListId ? "Edit Draft Packing List" : "New Packing List"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {packingListId
                ? "Only drafts can be edited. Confirming moves these quantities onto the orders."
                : "Built from a container and the orders it carries."}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1 — container */}
          {!container ? (
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                Container *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input
                  autoFocus
                  value={containerQuery}
                  onChange={(e) => setContainerQuery(e.target.value)}
                  placeholder="Search container number…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                />
              </div>
              {searching && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
              <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                {containerResults.map((c) => (
                  <button
                    key={c.Container_ID || c.container_id}
                    onClick={() => setContainer({ ...c, Container_ID: c.Container_ID || c.container_id })}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm flex items-center justify-between"
                  >
                    <span className="font-mono font-semibold">{c.container_no}</span>
                    <span className="text-xs text-gray-500">{c.BillOfLanding || "—"}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40">
              <div className="flex items-center gap-2">
                <ContainerIcon size={16} className="text-blue-500" />
                <span className="font-mono font-bold text-sm">{container.container_no}</span>
                <span className="text-xs text-gray-500">{container.BillOfLanding || "no B/L"}</span>
              </div>
              {!presetContainer && !packingListId && (
                <button onClick={reset} className="text-xs text-blue-600 hover:underline">
                  Change
                </button>
              )}
            </div>
          )}

          {/* Step 2 — no orders linked */}
          {container && !seeding && linkedOrders.length === 0 && (
            <div className="p-4 rounded-xl border border-dashed border-amber-400/60 bg-amber-50/50 dark:bg-amber-900/10 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">No purchase orders are linked to this container.</p>
                  <p className="text-xs text-gray-500">
                    Link them here and the lines will seed themselves. Only issued POs with unpacked items appear.
                  </p>
                </div>
              </div>
              <POTagSelector
                value={poIds}
                containerId={container.Container_ID}
                onChange={setPoIds}
              />
              <button
                onClick={linkAndContinue}
                disabled={!poIds.length || linking}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium inline-flex items-center gap-2"
              >
                {linking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Link &amp; Continue
              </button>
            </div>
          )}

          {seeding && (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" /> Reading what these orders still owe…
            </div>
          )}

          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} /> {w}
            </p>
          ))}

          {/* Step 3 — the grid */}
          {!seeding && lines.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["Packing list #", "packing_list_number", "text"],
                  ["Supplier invoice ref", "supplier_invoice_ref", "text"],
                  ["Date issued", "date_issued", "date"],
                  ["Packages", "package_count", "number"],
                  ["Gross weight (kg)", "total_gross_weight", "number"],
                  ["Volume (CBM)", "total_cbm", "number"],
                ].map(([label, name, type]) => (
                  <div key={name}>
                    <label className="block text-[10px] font-semibold uppercase text-gray-500 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={header[name]}
                      onChange={(e) => setHeader({ ...header, [name]: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                {/* Desktop grid */}
                <table className="w-full text-left text-xs hidden md:table">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-right">Ordered</th>
                      <th className="p-2.5 text-right">Packed</th>
                      <th className="p-2.5 text-right">Packing now</th>
                      <th className="p-2.5">Cartons</th>
                      <th className="p-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {grouped.map(([label, group]) => (
                      <React.Fragment key={label}>
                        <tr className="bg-gray-50/70 dark:bg-gray-800/30">
                          <td colSpan={6} className="px-2.5 py-1.5 font-semibold text-[11px] text-blue-600 dark:text-blue-400">
                            {label}
                          </td>
                        </tr>
                        {group.map((l) => {
                          const over = l.remaining != null && num(l.quantity_packed) > l.remaining;
                          return (
                            <tr key={l.key} className={over ? "bg-amber-50/60 dark:bg-amber-900/10" : ""}>
                              <td className="p-2.5">
                                <div className="font-medium">{l.description}</div>
                                {l.item_code && (
                                  <div className="text-[10px] text-gray-400 font-mono">{l.item_code}</div>
                                )}
                              </td>
                              <td className="p-2.5 text-right text-gray-500">
                                {l.quantity_ordered != null ? `${l.quantity_ordered} ${l.unit}` : "—"}
                              </td>
                              <td className="p-2.5 text-right text-gray-500">
                                {l.quantity_already_packed != null ? l.quantity_already_packed : "—"}
                                {l.draft_held > 0 && (
                                  <span className="block text-[10px] text-amber-600">
                                    +{l.draft_held} on a draft
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={l.quantity_packed}
                                  onChange={(e) => setLine(l.key, { quantity_packed: e.target.value })}
                                  className={`w-24 px-2 py-1 rounded-lg border text-right text-xs outline-none bg-white dark:bg-gray-800 ${
                                    over ? "border-amber-500" : "border-gray-200 dark:border-gray-700"
                                  }`}
                                />
                                {over && (
                                  <div className="text-[10px] text-amber-600 mt-0.5">
                                    {l.remaining} outstanding
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5">
                                <input
                                  value={l.carton_numbers || ""}
                                  onChange={(e) => setLine(l.key, { carton_numbers: e.target.value })}
                                  placeholder="e.g. 1-4"
                                  className="w-24 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs outline-none"
                                />
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  onClick={() => removeLine(l.key)}
                                  className="text-gray-400 hover:text-rose-500"
                                  title="Remove this line"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Phone: a card per line — the grid does not fit */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {lines.map((l) => (
                    <div key={l.key} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{l.description}</div>
                          <div className="text-[10px] text-gray-400">
                            {l.po_number || "Not on any PO"}
                            {l.remaining != null && ` · ${l.remaining} outstanding`}
                          </div>
                        </div>
                        <button onClick={() => removeLine(l.key)} className="text-gray-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={l.quantity_packed}
                        onChange={(e) => setLine(l.key, { quantity_packed: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setPickerOpen(true)}
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus size={13} /> Add a product that is not on any PO
              </button>

              {overPacked.length > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  {overPacked.length} line{overPacked.length === 1 ? "" : "s"} exceed what the order still owes.
                  Saving will be refused unless you may override.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500">
            {packable.length} line{packable.length === 1 ? "" : "s"} to pack
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => save("DRAFT")}
              disabled={saving || !packable.length}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Save size={14} /> Save Draft
            </button>
            <button
              onClick={confirm}
              disabled={saving || !packable.length}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium inline-flex items-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
              Confirm
            </button>
          </div>
        </div>
      </div>

      <ProductPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addProducts}
      />
    </div>
  );
}
