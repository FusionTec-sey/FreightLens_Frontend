import React, { useState } from "react";
import axios from "axios";
import { Mail, MapPin, Phone, Plus, Star, Trash2, Users, X } from "lucide-react";
import { toast } from "react-toastify";

/**
 * The people a vendor has, and the places it has.
 *
 * The supplier row holds one contact_person and one address, so the second of
 * either used to displace the first -- which is how a contact field ends up
 * reading "Ms Chen / Mr Wang (accounts)" and an address field holds three
 * addresses. Each is a row here, each says what it is for, and the row marked
 * primary is what the vendor's own single fields keep showing, so nothing that
 * still reads them disagrees with this screen.
 */

const CONTACT_ROLES = ["SALES", "ACCOUNTS", "LOGISTICS", "ESCALATION", "OTHER"];
const ADDRESS_TYPES = ["REGISTERED", "FACTORY", "WAREHOUSE", "REMIT_TO", "OTHER"];

const ROLE_LABELS = {
  SALES: "Sales",
  ACCOUNTS: "Accounts",
  LOGISTICS: "Logistics",
  ESCALATION: "Escalation",
  OTHER: "Other",
};

const TYPE_LABELS = {
  REGISTERED: "Registered office",
  FACTORY: "Factory",
  WAREHOUSE: "Warehouse",
  REMIT_TO: "Remit to",
  OTHER: "Other",
};

const EMPTY_CONTACT = { name: "", role: "SALES", job_title: "", email: "", phone: "", mobile: "", is_primary: false };
const EMPTY_ADDRESS = {
  address_type: "FACTORY", label: "", line1: "", line2: "", city: "",
  state: "", postal_code: "", country: "", is_primary: false,
};

function describeError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return fallback;
}

export default function SupplierPeoplePlaces({
  supplierId,
  contacts = [],
  addresses = [],
  canEdit = false,
  isDark = false,
  headers,
  onChanged,
}) {
  const api = process.env.REACT_APP_NETWORK;
  const [contactDraft, setContactDraft] = useState(null);   // null = closed, object = open
  const [addressDraft, setAddressDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  const card = `rounded-2xl border ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"} p-4 sm:p-5`;
  const field = `w-full px-2.5 py-1.5 text-xs border rounded-lg ${isDark
    ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`;

  const saveContact = async () => {
    if (!contactDraft?.name?.trim()) {
      toast.error("A contact needs a name.");
      return;
    }
    setBusy(true);
    try {
      const base = `${api}/master-data/suppliers/${supplierId}/contacts`;
      if (contactDraft.id) {
        await axios.put(`${base}/${contactDraft.id}`, contactDraft, { headers });
      } else {
        await axios.post(base, contactDraft, { headers });
      }
      setContactDraft(null);
      onChanged?.();
    } catch (err) {
      toast.error(describeError(err, "Could not save that contact."));
    } finally {
      setBusy(false);
    }
  };

  const removeContact = async (contact) => {
    if (!window.confirm(`Remove ${contact.name}? The removal is recorded in the audit log.`)) return;
    try {
      await axios.delete(`${api}/master-data/suppliers/${supplierId}/contacts/${contact.id}`, { headers });
      onChanged?.();
    } catch (err) {
      toast.error(describeError(err, "Could not remove that contact."));
    }
  };

  const saveAddress = async () => {
    if (!addressDraft?.line1?.trim() && !addressDraft?.city?.trim()) {
      toast.error("An address needs at least a street or a city.");
      return;
    }
    setBusy(true);
    try {
      const base = `${api}/master-data/suppliers/${supplierId}/addresses`;
      if (addressDraft.id) {
        await axios.put(`${base}/${addressDraft.id}`, addressDraft, { headers });
      } else {
        await axios.post(base, addressDraft, { headers });
      }
      setAddressDraft(null);
      onChanged?.();
    } catch (err) {
      toast.error(describeError(err, "Could not save that address."));
    } finally {
      setBusy(false);
    }
  };

  const removeAddress = async (address) => {
    if (!window.confirm("Remove this address? The removal is recorded in the audit log.")) return;
    try {
      await axios.delete(`${api}/master-data/suppliers/${supplierId}/addresses/${address.id}`, { headers });
      onChanged?.();
    } catch (err) {
      toast.error(describeError(err, "Could not remove that address."));
    }
  };

  const primaryBadge = (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
      <Star size={8} /> PRIMARY
    </span>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── People ────────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <Users size={14} className="text-indigo-500" /> Contacts
          </h2>
          {canEdit && !contactDraft && (
            <button
              type="button"
              onClick={() => setContactDraft({ ...EMPTY_CONTACT })}
              className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          Who to write to, and what each of them is for. The primary contact is the one the
          vendor's own contact field shows, so an order never goes out addressed to nobody.
        </p>

        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold">{c.name}</span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {ROLE_LABELS[c.role] || c.role || "Other"}
                    </span>
                    {c.is_primary && primaryBadge}
                  </div>
                  {c.job_title && (
                    <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{c.job_title}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:underline">
                        <Mail size={9} className="text-slate-400" />{c.email}
                      </a>
                    )}
                    {(c.phone || c.mobile) && (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={9} className="text-slate-400" />{[c.phone, c.mobile].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setContactDraft({ ...EMPTY_CONTACT, ...c })}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeContact(c)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {contacts.length === 0 && !contactDraft && (
            <li className="text-xs text-slate-400">Nobody recorded yet.</li>
          )}
        </ul>

        {contactDraft && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold">{contactDraft.id ? "Edit contact" : "New contact"}</h3>
              <button type="button" onClick={() => setContactDraft(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={field} placeholder="Name" value={contactDraft.name}
                onChange={(e) => setContactDraft((d) => ({ ...d, name: e.target.value }))} />
              <select className={field} value={contactDraft.role}
                onChange={(e) => setContactDraft((d) => ({ ...d, role: e.target.value }))}>
                {CONTACT_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <input className={field} placeholder="Job title" value={contactDraft.job_title || ""}
                onChange={(e) => setContactDraft((d) => ({ ...d, job_title: e.target.value }))} />
              <input className={field} placeholder="Email" value={contactDraft.email || ""}
                onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))} />
              <input className={field} placeholder="Phone" value={contactDraft.phone || ""}
                onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))} />
              <input className={field} placeholder="Mobile" value={contactDraft.mobile || ""}
                onChange={(e) => setContactDraft((d) => ({ ...d, mobile: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={Boolean(contactDraft.is_primary)}
                onChange={(e) => setContactDraft((d) => ({ ...d, is_primary: e.target.checked }))} />
              Primary contact — replaces whoever holds it now
            </label>
            <button type="button" onClick={saveContact} disabled={busy}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60">
              {contactDraft.id ? "Save contact" : "Add contact"}
            </button>
          </div>
        )}
      </div>

      {/* ── Places ────────────────────────────────────────────────────────── */}
      <div className={card}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <MapPin size={14} className="text-indigo-500" /> Addresses
          </h2>
          {canEdit && !addressDraft && (
            <button
              type="button"
              onClick={() => setAddressDraft({ ...EMPTY_ADDRESS })}
              className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          A registered office is not the factory, the factory is not where goods ship from, and
          none of them is where a payment advice goes. Each is a different mistake on a
          different document, so each gets its own row and its own type.
        </p>

        <ul className="space-y-2">
          {addresses.map((a) => (
            <li key={a.id} className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold">{TYPE_LABELS[a.address_type] || a.address_type}</span>
                    {a.label && <span className="text-slate-400 text-[10px]">{a.label}</span>}
                    {a.is_primary && primaryBadge}
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                    {[a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean).join(", ")}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAddressDraft({ ...EMPTY_ADDRESS, ...a })}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(a)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {addresses.length === 0 && !addressDraft && (
            <li className="text-xs text-slate-400">No address recorded yet.</li>
          )}
        </ul>

        {addressDraft && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold">{addressDraft.id ? "Edit address" : "New address"}</h3>
              <button type="button" onClick={() => setAddressDraft(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className={field} value={addressDraft.address_type}
                onChange={(e) => setAddressDraft((d) => ({ ...d, address_type: e.target.value }))}>
                {ADDRESS_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              <input className={field} placeholder="Label (optional)" value={addressDraft.label || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, label: e.target.value }))} />
              <input className={`${field} col-span-2`} placeholder="Street" value={addressDraft.line1 || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, line1: e.target.value }))} />
              <input className={`${field} col-span-2`} placeholder="Street (second line)" value={addressDraft.line2 || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, line2: e.target.value }))} />
              <input className={field} placeholder="City" value={addressDraft.city || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))} />
              <input className={field} placeholder="State / province" value={addressDraft.state || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, state: e.target.value }))} />
              <input className={field} placeholder="Postal code" value={addressDraft.postal_code || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, postal_code: e.target.value }))} />
              <input className={field} placeholder="Country" value={addressDraft.country || ""}
                onChange={(e) => setAddressDraft((d) => ({ ...d, country: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={Boolean(addressDraft.is_primary)}
                onChange={(e) => setAddressDraft((d) => ({ ...d, is_primary: e.target.checked }))} />
              Primary address — the one the vendor's own address field shows
            </label>
            <button type="button" onClick={saveAddress} disabled={busy}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60">
              {addressDraft.id ? "Save address" : "Add address"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
