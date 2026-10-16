import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import axios from "axios";

/**
 * The purchase orders a container carries, as chips.
 *
 * Shaped after MaterialTagSelector (ids in, ids out) with one deliberate
 * difference: AsyncSelect, not CreatableSelect. A material may be invented
 * while typing; a purchase order may not, so there is no create path at all.
 *
 * Only orders that can still be packed are offered -- issued, not shipped out,
 * and with something left over after what confirmed packing lists took and
 * what other open drafts hold. An order already linked stays in the menu,
 * greyed, rather than vanishing: a user who searches for the one they just
 * added and sees nothing adds it twice.
 */

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  skip_zrok_interstitial: "true",
});

const optionOf = (po) => ({
  value: po.id,
  label: `${po.po_number}${po.company ? ` · ${po.company}` : ""}`,
  po,
});

const POTagSelector = ({
  value = [],
  onChange,
  containerId = null,
  disabled = false,
  /** Called with the typed text when the search found nothing and the user
   *  chooses to record it as written. Omit it and no such offer is made. */
  onTyped = null,
  /** [{id, po_number, company}] from the container payload, so chips have
   *  labels on first paint -- an async select cannot resolve one from an id. */
  initialOrders = [],
  placeholder = "Search purchase orders…",
}) => {
  const [selected, setSelected] = useState([]);
  const [failed, setFailed] = useState(false);
  const known = useRef(new Map());
  const debounce = useRef(null);

  useEffect(() => {
    (initialOrders || []).forEach((po) => known.current.set(po.id, po));
    setSelected(
      (value || [])
        .map((id) => known.current.get(id))
        .filter(Boolean)
        .map(optionOf)
    );
    // value is the ids the parent holds; initialOrders only ever adds labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialOrders]);

  const fetchOptions = useCallback(
    async (input) => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_NETWORK}/orders/open-for-container`,
          {
            params: {
              search: input || undefined,
              limit: 20,
              container_id: containerId || undefined,
            },
            headers: authHeaders(),
          }
        );
        setFailed(false);
        const items = res.data?.items || [];
        items.forEach((po) => known.current.set(po.id, po));
        return items.map(optionOf);
      } catch (err) {
        // An empty menu would read as "no such PO". Say what actually happened.
        setFailed(true);
        return [];
      }
    },
    [containerId]
  );

  const loadOptions = useCallback(
    (input) =>
      new Promise((resolve) => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => resolve(fetchOptions(input)), 300);
      }),
    [fetchOptions]
  );

  const handleChange = (options) => {
    const next = options || [];
    setSelected(next);
    onChange(next.map((o) => o.value));
  };

  const noOptionsMessage = ({ inputValue }) => {
    if (failed) return "Could not reach the order list. Try again.";
    const typed = (inputValue || "").trim();
    // Offered only here, once the search has come back empty: a free-text box
    // beside the picker would invite a typo where a real order was available.
    if (onTyped && typed) {
      return (
        <span className="flex flex-col gap-1.5 items-start text-left">
          <span>No open PO matches "{typed}".</span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onTyped(typed.toUpperCase());
            }}
            className="px-2 py-1 rounded-md bg-slate-800 dark:bg-slate-200 dark:text-slate-900 text-white text-[11px] font-semibold"
          >
            Use "{typed.toUpperCase()}" as a typed reference
          </button>
          <span className="text-[10px] text-slate-400">
            Recorded as written. It links to nothing and cannot seed a packing list.
          </span>
        </span>
      );
    }
    return "No open POs match. Only issued POs with unpacked items appear here.";
  };

  const formatOptionLabel = (option, meta) => {
    const po = option.po || {};
    if (meta.context === "value") return option.label;
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{po.po_number}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            {po.already_linked ? "Linked" : po.status_label || po.lifecycle_stage}
          </span>
        </div>
        <span className="text-[10px] text-slate-500">
          {po.company || "—"}
          {po.open_item_count != null && ` · ${po.open_item_count} unpacked`}
          {po.revision_open && " · under revision"}
        </span>
      </div>
    );
  };

  const styles = useMemo(
    () => ({
      option: (base, state) => ({
        ...base,
        opacity: state.data?.po?.already_linked ? 0.55 : 1,
      }),
    }),
    []
  );

  return (
    <AsyncSelect
      isMulti
      cacheOptions
      defaultOptions
      isDisabled={disabled}
      value={selected}
      onChange={handleChange}
      loadOptions={loadOptions}
      formatOptionLabel={formatOptionLabel}
      noOptionsMessage={noOptionsMessage}
      placeholder={placeholder}
      styles={styles}
      className="text-[11px]"
      classNamePrefix="po-select"
    />
  );
};

export default POTagSelector;
