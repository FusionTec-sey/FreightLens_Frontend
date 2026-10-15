import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Building,
  Check,
  CreditCard,
  Eye,
  Globe,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { COUNTRIES, getCountryFlag } from "../../../utils/countries";
import { mediaUrl } from "../../../utils/mediaUrl";

/**
 * Registering or editing a vendor, on a screen of its own.
 *
 * It was a single-column dialog with eleven fields stacked in it, which is
 * already cramped and cannot grow: contacts, addresses, bank accounts and
 * documents are all coming, and none of them fits in a dialog. So this is a
 * route, laid out as sections with a rail down the side -- a new section is one
 * entry in SECTIONS and one card, and nothing else moves.
 */

const IDENTIFIER_TYPES = ["TAX", "VAT", "REGISTRATION", "GLN", "DUNS", "LEI", "OTHER"];

export default function SupplierFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { isRoot } = useAuth();

  const [form, setForm] = useState({
    name: "",
    code: "",
    country: "China",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    default_currency: "USD",
    default_payment_term_id: "",
    variance_threshold_pct: "2.0",
    notes: "",
    is_shared: false,
    is_active: true,
    logo_url: "",
  });
  const [issuedCode, setIssuedCode] = useState("");
  const [identifiers, setIdentifiers] = useState([]);
  const [newIdentifier, setNewIdentifier] = useState({ id_type: "REGISTRATION", value: "", country: "" });

  const [currencies, setCurrencies] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeSection, setActiveSection] = useState("identity");

  const sectionRefs = useRef({});
  const api = process.env.REACT_APP_NETWORK;
  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    skip_zrok_interstitial: "true",
  }), [token]);

  const describeError = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d) => d?.msg).filter(Boolean).join("; ") || fallback;
    if (detail && typeof detail === "object") return detail.message || fallback;
    return fallback;
  };

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [curRes, ptRes] = await Promise.all([
          axios.get(`${api}/master-data/currencies?active_only=true`, { headers }),
          axios.get(`${api}/master-data/payment-terms?active_only=true`, { headers }),
        ]);
        setCurrencies(curRes.data || []);
        setPaymentTerms(ptRes.data || []);
      } catch {
        // The lists are conveniences; typing can continue without them.
      }
    })();
  }, [api, headers]);

  const loadSupplier = useCallback(async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const res = await axios.get(`${api}/master-data/suppliers/${id}/profile`, { headers });
      const s = res.data || {};
      setForm({
        name: s.name || "",
        code: s.code || "",
        country: s.country || "",
        contact_person: s.contact_person || "",
        email: s.email || "",
        phone: s.phone || "",
        address: s.address || "",
        default_currency: s.default_currency || "USD",
        default_payment_term_id: s.default_payment_term_id ? String(s.default_payment_term_id) : "",
        variance_threshold_pct: String(s.variance_threshold_pct ?? "2.0"),
        notes: s.notes || "",
        is_shared: Boolean(s.is_shared),
        is_active: s.is_active !== false,
        logo_url: s.logo_url || "",
      });
      setIssuedCode(s.code || "");
      setIdentifiers(s.identifiers || []);
      setLogoPreview(mediaUrl(s, "logo_url") || "");
      setDirty(false);
    } catch (err) {
      toast.error(describeError(err, "Could not open this supplier."));
      navigate("/master-data/suppliers");
    } finally {
      setLoading(false);
    }
  }, [api, headers, id, isEdit, navigate]);

  useEffect(() => { loadSupplier(); }, [loadSupplier]);

  // Leaving with unsaved work is the commonest way a long form loses an
  // afternoon, so the browser asks.
  useEffect(() => {
    const warn = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const SECTIONS = useMemo(() => ([
    { key: "identity", label: "Identity", icon: Building, done: Boolean(form.name.trim() && form.country) },
    { key: "contact", label: "Contact", icon: Users, done: Boolean(form.contact_person || form.email || form.phone) },
    { key: "commercial", label: "Commercial terms", icon: CreditCard, done: Boolean(form.default_currency && form.default_payment_term_id) },
    { key: "visibility", label: "Visibility & status", icon: Globe, done: true },
    ...(isEdit ? [{ key: "identifiers", label: "Identifiers", icon: ShieldCheck, done: identifiers.length > 0 }] : []),
  ]), [form, identifiers.length, isEdit]);

  // The rail follows the page rather than only driving it, so it always says
  // where you are.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target?.dataset?.section) setActiveSection(visible.target.dataset.section);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0.01 }
    );
    SECTIONS.forEach((s) => {
      const node = sectionRefs.current[s.key];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [SECTIONS, loading]);

  const goTo = (key) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "A vendor needs a name.";
    if (!form.country) next.country = "Country decides duties, identifiers and lead times — it is worth having.";
    if (!form.default_currency) next.default_currency = "Pick the currency this vendor quotes in.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "That does not look like an email address.";
    const variance = parseFloat(form.variance_threshold_pct);
    if (form.variance_threshold_pct !== "" && (Number.isNaN(variance) || variance < 0 || variance > 100)) {
      next.variance_threshold_pct = "A percentage between 0 and 100.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = ["name", "country", "default_currency", "email", "variance_threshold_pct"]
        .find((f) => next[f]);
      const owner = { name: "identity", country: "identity", default_currency: "commercial", email: "contact", variance_threshold_pct: "commercial" }[first];
      if (owner) goTo(owner);
      return false;
    }
    return true;
  };

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setDirty(true);
  };

  const save = async () => {
    if (!validate()) {
      toast.error("Some fields still need attention.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      // An issued code is the reference on documents already sent, so it is
      // never sent back changed; the server refuses that with a 409 anyway.
      code: issuedCode || (form.code.trim() ? form.code.trim().toUpperCase() : null),
      address: form.address.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      contact_person: form.contact_person.trim() || null,
      country: form.country || null,
      logo_url: form.logo_url.trim() || null,
      default_currency: (form.default_currency || "USD").toUpperCase(),
      default_payment_term_id: form.default_payment_term_id ? Number(form.default_payment_term_id) : null,
      variance_threshold_pct: parseFloat(form.variance_threshold_pct) || 2.0,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      is_shared: isRoot ? form.is_shared : false,
    };
    try {
      let savedId = id;
      if (isEdit) {
        await axios.put(`${api}/master-data/suppliers/${id}`, payload, { headers });
      } else {
        const res = await axios.post(`${api}/master-data/suppliers`, payload, { headers });
        savedId = res.data?.supplier_id;
      }
      if (logoFile && savedId) {
        try {
          const body = new FormData();
          body.append("file", logoFile);
          await axios.post(`${api}/master-data/suppliers/${savedId}/logo`, body, {
            headers: { ...headers, "Content-Type": "multipart/form-data" },
          });
        } catch {
          toast.warn("Saved, but the logo could not be uploaded.");
        }
      }
      setDirty(false);
      toast.success(isEdit ? `${payload.name} updated.` : `${payload.name} registered.`);
      navigate(savedId ? `/master-data/suppliers/${savedId}` : "/master-data/suppliers");
    } catch (err) {
      toast.error(describeError(err, "Could not save this supplier."));
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    if (dirty && !window.confirm("Leave without saving? The changes on this screen will be lost.")) return;
    navigate(isEdit ? `/master-data/suppliers/${id}` : "/master-data/suppliers");
  };

  // The profile is where this vendor's products, orders and quotes live. Nothing
  // on the form said so, so there was no way to find it but to edit the URL.
  const viewProfile = () => {
    if (dirty && !window.confirm("Leave without saving? The changes on this screen will be lost.")) return;
    navigate(`/master-data/suppliers/${id}`);
  };

  const addIdentifier = async () => {
    if (!newIdentifier.value.trim()) {
      toast.error("An identifier needs a number.");
      return;
    }
    try {
      const res = await axios.post(
        `${api}/master-data/suppliers/${id}/identifiers`,
        { ...newIdentifier, country: newIdentifier.country || form.country || null },
        { headers }
      );
      setIdentifiers(res.data?.items || []);
      setNewIdentifier({ id_type: "REGISTRATION", value: "", country: "" });
      toast.success("Identifier recorded.");
    } catch (err) {
      toast.error(describeError(err, "Could not record that identifier."));
    }
  };

  const removeIdentifier = async (identifierId) => {
    try {
      const res = await axios.delete(`${api}/master-data/suppliers/${id}/identifiers/${identifierId}`, { headers });
      setIdentifiers(res.data?.items || []);
    } catch (err) {
      toast.error(describeError(err, "Could not remove that identifier."));
    }
  };

  // ── presentation helpers ──────────────────────────────────────────────────
  const field = `w-full px-3 py-2 rounded-lg border text-xs transition outline-none ${isDark
    ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
    : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"}`;
  const label = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1";
  const card = `rounded-2xl border p-4 sm:p-5 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"}`;

  const Field = ({ name, children, hint, span }) => (
    <div className={span === 2 ? "sm:col-span-2" : ""}>
      {children}
      {errors[name] ? (
        <p className="mt-1 text-[11px] text-rose-500">{errors[name]}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );

  const Section = ({ sectionKey, title, blurb, children }) => (
    <section
      ref={(node) => { sectionRefs.current[sectionKey] = node; }}
      data-section={sectionKey}
      className="scroll-mt-24 space-y-3"
    >
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
        {blurb && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{blurb}</p>}
      </div>
      <div className={card}>{children}</div>
    </section>
  );

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin inline-block mr-2 text-indigo-500" />
        Loading vendor…
      </div>
    );
  }

  return (
    <div className="pb-28 sm:pb-12">
      {/* Sticky action bar: the title says which vendor, and Save never scrolls away */}
      <div className={`sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-5 border-b backdrop-blur ${isDark
        ? "bg-slate-950/85 border-slate-800" : "bg-white/85 border-slate-200"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={leave}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {isEdit ? (form.name || "Vendor") : "Register a vendor"}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {isEdit
                  ? `${issuedCode || "no code"} · ${form.is_shared ? "all companies" : "one company"}${form.is_active ? "" : " · inactive"}`
                  : "The code is issued on save. Everything else can be filled in later."}
                {dirty && <span className="ml-2 text-amber-600 dark:text-amber-400 font-bold">unsaved changes</span>}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {isEdit && (
              <button
                type="button"
                onClick={viewProfile}
                title="Products, purchase orders, quotes and identity for this vendor"
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Eye size={13} />
                View profile
              </button>
            )}
            <button
              type="button"
              onClick={leave}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {isEdit ? "Save changes" : "Register vendor"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* The rail. A new section is one entry here and one card below. */}
        <nav className="hidden lg:block w-52 shrink-0">
          <ul className="sticky top-24 space-y-1">
            {SECTIONS.map(({ key, label: text, icon: Icon, done }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => goTo(key)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    activeSection === key
                      ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={13} />
                  <span className="flex-1 truncate">{text}</span>
                  {done && <Check size={13} className="text-emerald-500" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Chips instead of a rail on a phone */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1">
            {SECTIONS.map(({ key, label: text }) => (
              <button
                key={key}
                type="button"
                onClick={() => goTo(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border ${
                  activeSection === key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-slate-300 dark:border-slate-700 text-slate-500"
                }`}
              >
                {text}
              </button>
            ))}
          </div>

          <Section
            sectionKey="identity"
            title="Identity"
            blurb="Who this vendor is. The name and country are what every document, duty and duplicate check rests on."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field name="name" span={2} hint="The legal entity, not the group. Two entities are two vendors.">
                <label className={label}>Vendor name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="e.g. Foshan Golden Ceramic Co."
                  className={`${field} font-bold ${errors.name ? "border-rose-400" : ""}`}
                />
              </Field>

              <Field
                name="code"
                hint={issuedCode
                  ? "Fixed once issued — it is the reference on documents already sent."
                  : "Left blank, the server issues the next free code."}
              >
                <label className={label}>Vendor code</label>
                <input
                  type="text"
                  value={issuedCode || form.code}
                  onChange={(e) => set("code")(e.target.value)}
                  readOnly={Boolean(issuedCode)}
                  placeholder={issuedCode ? "" : "Issued automatically"}
                  className={`${field} font-mono font-bold uppercase ${issuedCode ? "bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" : ""}`}
                />
              </Field>

              <Field name="country">
                <label className={label}>Country *</label>
                <select
                  value={form.country}
                  onChange={(e) => set("country")(e.target.value)}
                  className={`${field} font-semibold ${errors.country ? "border-rose-400" : ""}`}
                >
                  <option value="">— not recorded —</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.flag} {c.name} ({c.code})</option>
                  ))}
                </select>
              </Field>

              <Field name="logo" span={2} hint="Shown on the directory and the vendor's profile.">
                <label className={label}>Logo</label>
                <div className="flex items-center gap-3">
                  {logoPreview || form.logo_url ? (
                    <img
                      src={logoPreview || mediaUrl(form.logo_url)}
                      alt="Logo"
                      className="w-11 h-11 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white p-1 shrink-0"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                      <Building size={16} />
                    </div>
                  )}
                  <input
                    type="text"
                    value={form.logo_url}
                    onChange={(e) => { set("logo_url")(e.target.value); setLogoPreview(e.target.value); }}
                    placeholder="https://example.com/logo.png"
                    className={field}
                  />
                  <label className="cursor-pointer px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                    <Upload size={13} /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                  </label>
                </div>
              </Field>
            </div>
          </Section>

          <Section
            sectionKey="contact"
            title="Contact"
            blurb="One contact for now. Several named contacts and addresses are the next thing this screen will hold."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field name="contact_person">
                <label className={label}>Contact person</label>
                <input type="text" value={form.contact_person} onChange={(e) => set("contact_person")(e.target.value)}
                  placeholder="e.g. Mr. Chen Wei" className={field} />
              </Field>
              <Field name="email">
                <label className={label}>Email</label>
                <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)}
                  placeholder="export@supplier.com" className={`${field} ${errors.email ? "border-rose-400" : ""}`} />
              </Field>
              <Field name="phone">
                <label className={label}>Phone or WhatsApp</label>
                <input type="text" value={form.phone} onChange={(e) => set("phone")(e.target.value)}
                  placeholder="+86 138 0000 0000" className={field} />
              </Field>
              <Field name="address" span={2} hint="Where goods ship from, or the office that issues the invoice.">
                <label className={label}>Address</label>
                <input type="text" value={form.address} onChange={(e) => set("address")(e.target.value)}
                  placeholder="Factory road, Chancheng District, Foshan, Guangdong" className={field} />
              </Field>
            </div>
          </Section>

          <Section
            sectionKey="commercial"
            title="Commercial terms"
            blurb="What this vendor quotes in, and how payment is normally staged. Both are defaults a purchase order can override."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field name="default_currency">
                <label className={label}>Quoting currency *</label>
                <select value={form.default_currency} onChange={(e) => set("default_currency")(e.target.value)}
                  className={`${field} font-mono font-bold ${errors.default_currency ? "border-rose-400" : ""}`}>
                  {(currencies.length ? currencies : [{ code: "USD", name: "US Dollar" }]).map((c) => (
                    <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
                  ))}
                </select>
              </Field>
              <Field name="variance_threshold_pct" hint="How far a quote may drift from the request before it is flagged.">
                <label className={label}>Variance threshold %</label>
                <input type="number" step="0.1" min="0" max="100" value={form.variance_threshold_pct}
                  onChange={(e) => set("variance_threshold_pct")(e.target.value)}
                  className={`${field} font-mono ${errors.variance_threshold_pct ? "border-rose-400" : ""}`} />
              </Field>
              <Field name="default_payment_term_id" span={2}
                hint="Populates cashflow milestones and advance targets when a purchase order is raised for this vendor.">
                <label className={label}>Default payment terms</label>
                <select value={form.default_payment_term_id} onChange={(e) => set("default_payment_term_id")(e.target.value)}
                  className={`${field} font-semibold`}>
                  <option value="">— none bound —</option>
                  {paymentTerms.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.advance_pct}% advance · {pt.balance_pct}% balance)
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section
            sectionKey="visibility"
            title="Visibility & status"
            blurb="Who may use this vendor, and whether it is available for new work."
          >
            <div className="space-y-3">
              {isRoot ? (
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input type="checkbox" checked={form.is_shared}
                    onChange={(e) => set("is_shared")(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>
                    <span className="block text-xs font-bold">Available to every company</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      How almost every vendor here is held: one record the whole group buys through, with
                      prices and history staying company by company. Unchecked, only the company that
                      created it can use it.
                    </span>
                  </span>
                </label>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Shared vendors are managed by the root organisation. This vendor belongs to your company.
                </p>
              )}

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => set("is_active")(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span>
                  <span className="block text-xs font-bold">Active</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Unchecked, the vendor stays in the directory and in its history but cannot be used on
                    new orders or quotes. Retiring it for good is on its profile.
                  </span>
                </span>
              </label>

              <Field name="notes" hint="Packing notes, inspection requirements, anything a buyer should read first.">
                <label className={label}>Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => set("notes")(e.target.value)}
                  placeholder="Supplier specifications, packing notes, inspection requirements…"
                  className={field} />
              </Field>
            </div>
          </Section>

          {isEdit && (
            <Section
              sectionKey="identifiers"
              title="Identifiers"
              blurb="A tax or registration number is what proves this is the company you think it is — and the same number in the same country is how the next duplicate gets caught."
            >
              <div className="space-y-3">
                <ul className="space-y-2">
                  {identifiers.map((ident) => (
                    <li key={ident.id} className="flex items-center justify-between gap-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
                      <span>
                        <span className="font-bold">{ident.id_type}</span>
                        <span className="font-mono ml-2">{ident.value}</span>
                        {ident.country && <span className="text-slate-400 ml-2">{getCountryFlag(ident.country)} {ident.country}</span>}
                        <span className={`ml-2 text-[10px] font-bold ${ident.verified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {ident.verified ? "VERIFIED" : "AS CLAIMED"}
                        </span>
                      </span>
                      <button type="button" onClick={() => removeIdentifier(ident.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 shrink-0" title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                  {identifiers.length === 0 && (
                    <li className="text-[11px] text-slate-400">Nothing recorded yet.</li>
                  )}
                </ul>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <select value={newIdentifier.id_type}
                    onChange={(e) => setNewIdentifier((n) => ({ ...n, id_type: e.target.value }))}
                    className={`${field} w-auto font-bold`}>
                    {IDENTIFIER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="text" value={newIdentifier.value}
                    onChange={(e) => setNewIdentifier((n) => ({ ...n, value: e.target.value }))}
                    placeholder="Number" className={`${field} flex-1 min-w-[140px] font-mono`} />
                  <input type="text" value={newIdentifier.country}
                    onChange={(e) => setNewIdentifier((n) => ({ ...n, country: e.target.value }))}
                    placeholder={form.country || "Country"} className={`${field} w-32`} />
                  <button type="button" onClick={addIdentifier}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
                    <Plus size={13} /> Add
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Recorded as claimed. Marking one as checked against a register is done on the profile,
                  so the check and who made it stay on the record.
                </p>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* On a phone the actions sit where the thumb is */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-3 border-t flex items-center gap-2 ${isDark
        ? "bg-slate-950/95 border-slate-800" : "bg-white/95 border-slate-200"}`}>
        {isEdit && (
          <button type="button" onClick={viewProfile} title="View profile"
            className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <Eye size={15} />
          </button>
        )}
        <button type="button" onClick={leave}
          className="flex-1 px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving}
          className="flex-[2] px-3 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white flex items-center justify-center gap-1.5 disabled:opacity-60">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isEdit ? "Save changes" : "Register vendor"}
        </button>
      </div>
    </div>
  );
}
