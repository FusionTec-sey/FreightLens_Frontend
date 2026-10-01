import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Building2, Image, Loader2, Save, Upload } from "lucide-react";
import { toast } from "react-toastify";

const EMPTY_PROFILE = {
  legal_name: "",
  address: "",
  tax_id: "",
  contact_email: "",
  contact_phone: "",
  brand_color: "#1E40AF",
  font_family: "Arial",
  locale: "en-SC",
  timezone: "Indian/Mahe",
  bank_details: {},
  default_terms: {},
};

const BANK_FIELDS = [
  ["bank_name", "Bank name"],
  ["account_name", "Account name"],
  ["account_number", "Account number"],
  ["iban", "IBAN"],
  ["swift", "SWIFT / BIC"],
];

const TERM_FIELDS = [
  ["purchase_order", "Purchase order terms"],
  ["rfq", "RFQ instructions"],
  ["invoice", "Invoice terms"],
];

const ASSET_FIELDS = [
  ["logo", "logo_asset_key", "Company logo"],
  ["stamp", "stamp_asset_key", "Company stamp"],
  ["signature", "signature_asset_key", "Authorized signature"],
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-hidden transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900";

function lines(value) {
  return Array.isArray(value) ? value.join("\n") : value || "";
}

export default function OrgPrintProfilePanel({ canEdit }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }),
    []
  );

  useEffect(() => {
    let active = true;
    axios
      .get(`${process.env.REACT_APP_NETWORK}/reports/settings/print-profile`, {
        headers: headers(),
      })
      .then(({ data }) => {
        if (active) setProfile({ ...EMPTY_PROFILE, ...data });
      })
      .catch((error) => {
        console.error("Failed to load print profile:", error);
        toast.error(error.response?.data?.detail || "Failed to load print profile.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [headers]);

  const setField = (field, value) => setProfile((current) => ({ ...current, [field]: value }));
  const setNested = (section, field, value) =>
    setProfile((current) => ({
      ...current,
      [section]: { ...(current[section] || {}), [field]: value },
    }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...profile,
        bank_details: profile.bank_details || {},
        default_terms: Object.fromEntries(
          TERM_FIELDS.map(([key]) => [
            key,
            lines(profile.default_terms?.[key])
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          ])
        ),
      };
      delete payload.org_id;
      const { data } = await axios.put(
        `${process.env.REACT_APP_NETWORK}/reports/settings/print-profile`,
        payload,
        { headers: headers() }
      );
      setProfile({ ...EMPTY_PROFILE, ...data });
      toast.success("Organization print profile saved.");
    } catch (error) {
      console.error("Failed to save print profile:", error);
      toast.error(error.response?.data?.detail || "Failed to save print profile.");
    } finally {
      setSaving(false);
    }
  };

  const uploadAsset = async (assetType, file) => {
    if (!file) return;
    setUploading(assetType);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await axios.post(
        `${process.env.REACT_APP_NETWORK}/reports/settings/print-profile/assets/${assetType}`,
        form,
        { headers: headers() }
      );
      setProfile({ ...EMPTY_PROFILE, ...data });
      toast.success(`${assetType[0].toUpperCase()}${assetType.slice(1)} uploaded.`);
    } catch (error) {
      console.error("Failed to upload print asset:", error);
      toast.error(error.response?.data?.detail || "Failed to upload image.");
    } finally {
      setUploading("");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        <Loader2 className="animate-spin text-indigo-600" size={28} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950">
      <form onSubmit={save} className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Building2 size={18} className="text-indigo-600" />
              Organization Print Profile
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Identity, contact, payment, and document defaults used by generated reports.
            </p>
          </div>
          {canEdit && (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save profile
            </button>
          )}
        </div>

        <section className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Legal identity</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Legal name
              <input className={`${inputClass} mt-1`} value={profile.legal_name || ""} disabled={!canEdit} onChange={(e) => setField("legal_name", e.target.value)} />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Tax identifier
              <input className={`${inputClass} mt-1`} value={profile.tax_id || ""} disabled={!canEdit} onChange={(e) => setField("tax_id", e.target.value)} />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 md:col-span-2">
              Registered address
              <textarea rows={3} className={`${inputClass} mt-1 resize-y`} value={profile.address || ""} disabled={!canEdit} onChange={(e) => setField("address", e.target.value)} />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Contact email
              <input type="email" className={`${inputClass} mt-1`} value={profile.contact_email || ""} disabled={!canEdit} onChange={(e) => setField("contact_email", e.target.value)} />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Contact phone
              <input className={`${inputClass} mt-1`} value={profile.contact_phone || ""} disabled={!canEdit} onChange={(e) => setField("contact_phone", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Brand assets</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {ASSET_FIELDS.map(([assetType, key, label]) => (
              <div key={assetType} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <Image size={16} className="text-indigo-600" />
                  {label}
                </div>
                <p className="mt-2 truncate text-xs text-slate-500" title={profile[key] || ""}>
                  {profile[key]?.split("/").pop() || "No image uploaded"}
                </p>
                {canEdit && (
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    {uploading === assetType ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    Replace image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      disabled={Boolean(uploading)}
                      className="sr-only"
                      onChange={(event) => uploadAsset(assetType, event.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Document appearance and locale</h3>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Brand color
              <div className="mt-1 flex gap-2">
                <input type="color" className="h-9 w-11 rounded-lg border border-slate-300 bg-white p-1 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900" value={profile.brand_color || "#1E40AF"} disabled={!canEdit} onChange={(e) => setField("brand_color", e.target.value)} />
                <input className={inputClass} value={profile.brand_color || ""} disabled={!canEdit} onChange={(e) => setField("brand_color", e.target.value)} />
              </div>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Font family
              <select className={`${inputClass} mt-1`} value={profile.font_family || "Arial"} disabled={!canEdit} onChange={(e) => setField("font_family", e.target.value)}>
                <option>Arial</option><option>Inter</option><option>Roboto</option><option>Times New Roman</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Locale
              <input className={`${inputClass} mt-1`} value={profile.locale || ""} disabled={!canEdit} onChange={(e) => setField("locale", e.target.value)} />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Time zone
              <input className={`${inputClass} mt-1`} value={profile.timezone || ""} disabled={!canEdit} onChange={(e) => setField("timezone", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="space-y-4 border-b border-slate-200 pb-6 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Bank details</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {BANK_FIELDS.map(([key, label]) => (
              <label key={key} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {label}
                <input className={`${inputClass} mt-1`} value={profile.bank_details?.[key] || ""} disabled={!canEdit} onChange={(e) => setNested("bank_details", key, e.target.value)} />
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4 pb-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Default terms</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            {TERM_FIELDS.map(([key, label]) => (
              <label key={key} className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {label}
                <textarea rows={7} className={`${inputClass} mt-1 resize-y`} value={lines(profile.default_terms?.[key])} disabled={!canEdit} onChange={(e) => setNested("default_terms", key, e.target.value)} />
              </label>
            ))}
          </div>
        </section>
      </form>
    </div>
  );
}
