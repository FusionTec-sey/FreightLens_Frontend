import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Coins,
  Loader2,
  X,
  ExternalLink,
  Building,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import { COUNTRIES, getCountryFlag, formatCountryDisplay } from "../../../utils/countries";

export default function SuppliersMasterPage() {
  const { isDark } = useTheme();

  const [suppliers, setSuppliers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [country, setCountry] = useState("China");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [defaultPaymentTermId, setDefaultPaymentTermId] = useState("");
  const [varianceThreshold, setVarianceThreshold] = useState("2.0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    skip_zrok_interstitial: "true"
  }), [token]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [supRes, curRes, ptRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_NETWORK}/master-data/suppliers?active_only=false`, { headers }),
        axios.get(`${process.env.REACT_APP_NETWORK}/master-data/currencies?active_only=true`, { headers }),
        axios.get(`${process.env.REACT_APP_NETWORK}/master-data/payment-terms?active_only=true`, { headers }),
      ]);
      const supList = Array.isArray(supRes.data)
        ? supRes.data
        : (Array.isArray(supRes.data?.items) ? supRes.data.items : (supRes.data?.data || []));
      setSuppliers(supList);
      setCurrencies(curRes.data || []);
      setPaymentTerms(ptRes.data || []);
    } catch (err) {
      console.error("Failed to load supplier master data:", err);
      toast.error("Failed to load supplier master data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAllData();
  }, []);

  const loadAllAllData = () => {
    loadAllData();
  };

  const handleOpenCreateModal = () => {
    setEditingSupplier(null);
    setName("");
    setCode("");
    setAddress("");
    setEmail("");
    setPhone("");
    setContactPerson("");
    setCountry("China");
    setLogoUrl("");
    setLogoFile(null);
    setLogoPreview("");
    setDefaultCurrency("USD");
    setDefaultPaymentTermId(paymentTerms.length > 0 ? String(paymentTerms[0].id) : "");
    setVarianceThreshold("2.0");
    setNotes("");
    setShowModal(true);
  };

  const handleOpenEditModal = (sup) => {
    setEditingSupplier(sup);
    setName(sup.name || "");
    setCode(sup.code || "");
    setAddress(sup.address || "");
    setEmail(sup.email || "");
    setPhone(sup.phone || "");
    setContactPerson(sup.contact_person || "");
    setCountry(sup.country || "China");
    setLogoUrl(sup.logo_url || "");
    setLogoFile(null);
    setLogoPreview(sup.logo_url || "");
    setDefaultCurrency(sup.default_currency || "USD");
    setDefaultPaymentTermId(sup.default_payment_term_id ? String(sup.default_payment_term_id) : "");
    setVarianceThreshold(String(sup.variance_threshold_pct || "2.0"));
    setNotes(sup.notes || "");
    setShowModal(true);
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Supplier name is required.");
      return;
    }
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      code: code.trim() ? code.trim().toUpperCase() : null,
      address: address.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      contact_person: contactPerson.trim() || null,
      country: country.trim() || "Seychelles",
      logo_url: logoUrl.trim() || null,
      default_currency: defaultCurrency.trim().toUpperCase() || "USD",
      default_payment_term_id: defaultPaymentTermId ? Number(defaultPaymentTermId) : null,
      variance_threshold_pct: parseFloat(varianceThreshold) || 2.0,
      notes: notes.trim() || null,
      is_active: true
    };

    try {
      let savedSupplierId = editingSupplier ? (editingSupplier.id || editingSupplier.supplier_id) : null;
      if (editingSupplier) {
        await axios.put(
          `${process.env.REACT_APP_NETWORK}/master-data/suppliers/${savedSupplierId}`,
          payload,
          { headers }
        );
        toast.success(`Supplier '${payload.name}' updated.`);
      } else {
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/master-data/suppliers`,
          payload,
          { headers }
        );
        savedSupplierId = res.data.supplier_id;
        toast.success(`Supplier '${payload.name}' created.`);
      }

      // If a local logo file was selected for upload, upload it to the logo endpoint
      if (logoFile && savedSupplierId) {
        try {
          const formData = new FormData();
          formData.append("file", logoFile);
          await axios.post(
            `${process.env.REACT_APP_NETWORK}/master-data/suppliers/${savedSupplierId}/logo`,
            formData,
            { headers: { ...headers, "Content-Type": "multipart/form-data" } }
          );
        } catch (uploadErr) {
          console.warn("Logo file upload failed:", uploadErr);
        }
      }

      setShowModal(false);
      loadAllData();
    } catch (err) {
      console.error("Save supplier failed:", err);
      toast.error(err.response?.data?.detail || "Failed to save supplier.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sup) => {
    const id = sup.id || sup.supplier_id;
    if (!window.confirm(`Delete supplier '${sup.name}'?`)) return;
    try {
      await axios.delete(`${process.env.REACT_APP_NETWORK}/master-data/suppliers/${id}`, { headers });
      toast.success("Supplier deleted.");
      loadAllData();
    } catch (err) {
      toast.error("Failed to delete supplier.");
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (currencyFilter !== "ALL" && s.default_currency !== currencyFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.country && s.country.toLowerCase().includes(q))
      );
    });
  }, [suppliers, searchQuery, currencyFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Suppliers Master Directory
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage global vendors, contract terms, default trade currencies, and cashflow binding.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus size={14} />
          <span>New Supplier</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor name, code, contact, country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Currency Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-bold mr-1">Currency:</span>
          {["ALL", "USD", "EUR", "CNY", "SCR", "AED"].map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setCurrencyFilter(curr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                currencyFilter === curr
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Supplier / Vendor</th>
                <th className="py-2.5 px-3">Contact Person & Country</th>
                <th className="py-2.5 px-3">Contact Details</th>
                <th className="py-2.5 px-3 text-center">Default Currency</th>
                <th className="py-2.5 px-3">Bound Payment Terms</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <Loader2 size={16} className="animate-spin inline-block mr-2 text-indigo-500" />
                    Loading suppliers...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No suppliers found matching your query.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id || s.supplier_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-mono font-bold text-slate-500">
                      {s.code || `VEND-${s.supplier_id}`}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        {s.logo_url ? (
                          <img
                            src={s.logo_url.startsWith("http") ? s.logo_url : `${process.env.REACT_APP_NETWORK}/blobs/${s.logo_url}`}
                            alt={s.name}
                            className="w-7 h-7 rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-0.5 shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20 shrink-0">
                            {s.name ? s.name.charAt(0).toUpperCase() : "V"}
                          </div>
                        )}
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                      <div>{s.contact_person || "—"}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="text-sm leading-none">{getCountryFlag(s.country)}</span>
                        <span>{formatCountryDisplay(s.country)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={11} className="text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <Phone size={10} className="text-slate-400" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {!s.email && !s.phone && "—"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {s.default_currency || "USD"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {s.payment_term ? (
                        <div className="space-y-0.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                            {s.payment_term.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.payment_term.advance_pct}% Adv • {s.payment_term.balance_pct}% Bal ({s.payment_term.balance_trigger})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No terms bound</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          s.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}
                      >
                        {s.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(s)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                          title="Edit Supplier"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition"
                          title="Delete Supplier"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT SUPPLIER ── */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold">
                {editingSupplier ? "Edit Supplier Profile" : "Register New Supplier"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Company / Supplier Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Foshan Golden Ceramic Co."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Vendor Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VEND-0012"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Country of Origin *
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Logo */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Company Logo (URL or Upload Image)
                  </label>
                  <div className="flex items-center gap-3">
                    {logoPreview || logoUrl ? (
                      <img
                        src={logoPreview || (logoUrl.startsWith("http") ? logoUrl : `${process.env.REACT_APP_NETWORK}/blobs/${logoUrl}`)}
                        alt="Logo preview"
                        className="w-10 h-10 rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-white p-1 shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                        <Building size={16} />
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png or upload below"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setLogoPreview(e.target.value);
                      }}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                    <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                      <Upload size={13} />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Chen Wei"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="export@supplier.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Phone Number / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+86 138 0000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Default Currency *
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bound Payment Terms Selection */}
              <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                  <CreditCard size={14} />
                  <span>Bind Default Payment Terms</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically populates cashflow milestones and advance clearance targets when raising POs for this vendor.
                </p>
                <select
                  value={defaultPaymentTermId}
                  onChange={(e) => setDefaultPaymentTermId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- No Payment Term Bound --</option>
                  {paymentTerms.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.advance_pct}% Adv • {pt.balance_pct}% Bal)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Physical Address / Port City
                </label>
                <input
                  type="text"
                  placeholder="Factory road, Chancheng District, Foshan, Guangdong"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Notes & Special Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Supplier specifications, packing notes, inspection requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingSupplier ? "Update Supplier" : "Register Supplier"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
