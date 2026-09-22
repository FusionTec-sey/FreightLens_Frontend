import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Coins,
  ArrowRightLeft,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  Building2,
  TrendingUp,
  RefreshCw,
  Calculator,
  Loader2,
  X,
  Globe
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

export default function CurrenciesPage() {
  const { isDark } = useTheme();

  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Converter State
  const [calcAmount, setCalcAmount] = useState("1000");
  const [calcFrom, setCalcFrom] = useState("USD");
  const [calcTo, setCalcTo] = useState("SCR");
  const [calcResult, setCalcResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Modals
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateFrom, setRateFrom] = useState("USD");
  const [rateTo, setRateTo] = useState("SCR");
  const [rateValue, setRateValue] = useState("");
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [newCurrCode, setNewCurrCode] = useState("");
  const [newCurrName, setNewCurrName] = useState("");
  const [newCurrSymbol, setNewCurrSymbol] = useState("");
  const [isSubmittingCurr, setIsSubmittingCurr] = useState(false);

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    skip_zrok_interstitial: "true"
  }), [token]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [curRes, orgRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_NETWORK}/master-data/currencies`, { headers }),
        axios.get(`${process.env.REACT_APP_NETWORK}/master-data/organizations`, { headers })
      ]);
      setCurrencies(curRes.data || []);
      setOrganizations(orgRes.data || []);

      if (orgRes.data?.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgRes.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load currencies/organizations:", err);
      toast.error("Failed to load currency master data.");
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeRates = async (orgId) => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/master-data/exchange-rates?org_id=${orgId || ""}`,
        { headers }
      );
      setExchangeRates(res.data?.rates || []);
    } catch (err) {
      console.error("Failed to load exchange rates:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadExchangeRates(selectedOrgId);
    }
  }, [selectedOrgId]);

  // Current selected org
  const currentOrg = useMemo(() => {
    return organizations.find((o) => o.id === selectedOrgId) || organizations[0] || { base_currency: "SCR", display_name: "Default Org" };
  }, [organizations, selectedOrgId]);

  // Run Conversion
  const handleConvert = async () => {
    const amt = parseFloat(calcAmount);
    if (isNaN(amt) || amt <= 0) return;
    setCalcLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/master-data/exchange-rates/convert?from_currency=${calcFrom}&to_currency=${calcTo}&amount=${amt}&org_id=${selectedOrgId || ""}`,
        { headers }
      );
      setCalcResult(res.data);
    } catch (err) {
      console.error("Conversion failed:", err);
      toast.error(err.response?.data?.detail || "Conversion rate unavailable.");
      setCalcResult(null);
    } finally {
      setCalcLoading(false);
    }
  };

  // Save Exchange Rate
  const handleSaveRate = async (e) => {
    e.preventDefault();
    const val = parseFloat(rateValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid rate greater than 0.");
      return;
    }
    setIsSubmittingRate(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/master-data/exchange-rates`,
        {
          org_id: selectedOrgId,
          from_currency: rateFrom,
          to_currency: rateTo,
          rate: val
        },
        { headers }
      );
      toast.success(`Exchange rate ${rateFrom} -> ${rateTo} saved.`);
      setShowRateModal(false);
      setRateValue("");
      loadExchangeRates(selectedOrgId);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save exchange rate.");
    } finally {
      setIsSubmittingRate(false);
    }
  };

  // Change Org Base Currency
  const handleSetBaseCurrency = async (newBase) => {
    if (!window.confirm(`Change base currency for '${currentOrg.display_name || currentOrg.name}' to ${newBase}?`)) return;
    try {
      await axios.put(
        `${process.env.REACT_APP_NETWORK}/master-data/organizations/${currentOrg.id}/base-currency`,
        { base_currency: newBase },
        { headers }
      );
      toast.success(`Base currency updated to ${newBase}.`);
      setOrganizations((prev) =>
        prev.map((o) => (o.id === currentOrg.id ? { ...o, base_currency: newBase } : o))
      );
      setRateTo(newBase);
      setCalcTo(newBase);
      loadExchangeRates(currentOrg.id);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update base currency.");
    }
  };

  // Toggle Currency Active Status
  const handleToggleCurrency = async (curr) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_NETWORK}/master-data/currencies/${curr.code}`,
        { is_active: !curr.is_active },
        { headers }
      );
      setCurrencies((prev) =>
        prev.map((c) => (c.code === curr.code ? { ...c, is_active: !curr.is_active } : c))
      );
      toast.success(`Currency ${curr.code} ${!curr.is_active ? "activated" : "deactivated"}.`);
    } catch (err) {
      toast.error("Failed to update currency status.");
    }
  };

  // Add Custom Currency
  const handleAddCurrency = async (e) => {
    e.preventDefault();
    if (!newCurrCode.trim() || !newCurrName.trim()) {
      toast.error("Code and Name are required.");
      return;
    }
    setIsSubmittingCurr(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/master-data/currencies`,
        {
          code: newCurrCode.trim().toUpperCase(),
          name: newCurrName.trim(),
          symbol: newCurrSymbol.trim() || newCurrCode.trim().toUpperCase(),
          is_active: true
        },
        { headers }
      );
      toast.success(`Currency ${newCurrCode.toUpperCase()} added.`);
      setShowCurrencyModal(false);
      setNewCurrCode("");
      setNewCurrName("");
      setNewCurrSymbol("");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add currency.");
    } finally {
      setIsSubmittingCurr(false);
    }
  };

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return currencies;
    const q = searchQuery.toLowerCase();
    return currencies.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.symbol && c.symbol.toLowerCase().includes(q))
    );
  }, [currencies, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Coins size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Currencies & Exchange Rates
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage enterprise world currencies, multi-organization base currencies, and live exchange conversion rates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRateModal(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>Add Exchange Rate</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCurrencyModal(true)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl transition text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <Globe size={14} />
            <span>New Currency</span>
          </button>
        </div>
      </div>

      {/* Organization Local Base Currency Card */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Organization Local / Base Currency
              </h3>
              <p className="text-xs text-slate-400">
                Each company operates in its own domestic legal currency for local valuation, accounting, and landed cost.
              </p>
            </div>
          </div>

          {/* Org Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Select Entity:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(Number(e.target.value))}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.display_name || org.name} ({org.base_currency || "SCR"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-mono text-base font-black">
              {currentOrg.base_currency || "SCR"}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                {currentOrg.display_name || currentOrg.name} Base Currency
              </span>
              <span className="text-[11px] text-slate-400">
                Exchange rates below define conversions into this organization&apos;s base currency.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Change Base:</span>
            {["SCR", "USD", "EUR", "AED"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleSetBaseCurrency(code)}
                disabled={currentOrg.base_currency === code}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition ${
                  currentOrg.base_currency === code
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Exchange Rates & Quick Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Exchange Rates to Base Currency */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Exchange Rates to {currentOrg.base_currency || "SCR"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => loadExchangeRates(selectedOrgId)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refresh Rates"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {exchangeRates.length === 0 ? (
            <div className="p-8 border border-dashed rounded-xl text-center text-slate-400 text-xs">
              No exchange rates configured yet for {currentOrg.base_currency || "SCR"}. Click &quot;Add Exchange Rate&quot; above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {exchangeRates
                .filter((r) => r.to_currency === (currentOrg.base_currency || "SCR"))
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-500/40 transition space-y-1.5 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-slate-500">
                        1 {r.from_currency}
                      </span>
                      {r.is_override && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Org Override
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-black text-base text-slate-900 dark:text-white">
                      {Number(r.rate).toFixed(4)} <span className="text-xs text-slate-400 font-normal">{r.to_currency}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-400">
                      <span>Effective: {r.effective_date || "Current"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRateFrom(r.from_currency);
                          setRateTo(r.to_currency);
                          setRateValue(String(r.rate));
                          setShowRateModal(true);
                        }}
                        className="text-blue-500 hover:text-blue-600 font-bold"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right: Quick Live Converter Calculator */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Live Currency Calculator
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Amount
              </label>
              <input
                type="number"
                step="any"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  From
                </label>
                <select
                  value={calcFrom}
                  onChange={(e) => setCalcFrom(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  To (Target)
                </label>
                <select
                  value={calcTo}
                  onChange={(e) => setCalcTo(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConvert}
              disabled={calcLoading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              {calcLoading ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />}
              <span>Convert Currency</span>
            </button>

            {calcResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                  Converted Result
                </span>
                <div className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300">
                  {calcResult.to_currency} {Number(calcResult.converted_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-400">
                  Rate: 1 {calcResult.from_currency} = {Number(calcResult.rate).toFixed(4)} {calcResult.to_currency}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* World Currencies Master Table */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              World Currencies Directory ({currencies.length})
            </h3>
            <p className="text-xs text-slate-400">
              ISO-4217 standard currency codes available across transactions, quotes, and product catalogs.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code or currency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Currency Name</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3 text-center">Decimals</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCurrencies.map((c) => (
                <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 font-mono font-black text-blue-600 dark:text-blue-400">
                    {c.code}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {c.name}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-500">
                    {c.symbol || c.code}
                  </td>
                  <td className="py-2 px-3 text-center font-mono text-slate-400">
                    {c.decimals}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        c.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {c.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleCurrency(c)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                        c.is_active
                          ? "text-rose-500 hover:bg-rose-500/10"
                          : "text-emerald-600 hover:bg-emerald-500/10"
                      }`}
                    >
                      {c.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT EXCHANGE RATE ── */}
      {showRateModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold">Set Exchange Rate</h3>
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Target Entity
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.display_name || org.name} (Base: {org.base_currency || "SCR"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    From Currency
                  </label>
                  <select
                    value={rateFrom}
                    onChange={(e) => setRateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    To Currency
                  </label>
                  <select
                    value={rateTo}
                    onChange={(e) => setRateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Conversion Rate (1 {rateFrom} = ? {rateTo}) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 14.5000"
                  value={rateValue}
                  onChange={(e) => setRateValue(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-sm bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRate}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  {isSubmittingRate && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Exchange Rate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NEW CURRENCY ── */}
      {showCurrencyModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 z-50 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold">Add Custom Currency</h3>
              <button
                type="button"
                onClick={() => setShowCurrencyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCurrency} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Currency Code (ISO 4217, 3 letters) *
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. MVR or KWD"
                  value={newCurrCode}
                  onChange={(e) => setNewCurrCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Currency Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maldivian Rufiyaa"
                  value={newCurrName}
                  onChange={(e) => setNewCurrName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rf or د.ك"
                  value={newCurrSymbol}
                  onChange={(e) => setNewCurrSymbol(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCurrencyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCurr}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  {isSubmittingCurr && <Loader2 size={13} className="animate-spin" />}
                  <span>Add Currency</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
