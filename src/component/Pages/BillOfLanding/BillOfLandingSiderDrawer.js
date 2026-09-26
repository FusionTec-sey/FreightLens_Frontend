import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X,
  Anchor,
  Ship,
  FileText,
  Clock,
  Trash2,
  Save,
  Building,
  Calendar,
  Copy,
  Check,
  Shield,
  Lock,
  Plus,
  ExternalLink,
  Container,
  Loader2,
  AlertTriangle,
  Search,
  CheckCircle2
} from "lucide-react";

import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useConfirm } from "../../../context/ConfirmContext";
import { useOptions } from "../../../hooks/useOptions";
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import { formatDateTime12hr } from "../../../utils/DateFormater";

export default function BillOfLandingSiderDrawer({
  isOpen,
  onClose,
  billOfLanding = null, // null for create, object for edit
  onSubmitSuccess,
  onDelete = null,
  onOpenContainerDrawer = null
}) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { permissions, isRoot } = useAuth();
  const { confirm } = useConfirm();

  const {
    suppliers,
    consignees,
    shipping,
    vessal: vesselList,
    logistics,
    status: statusOptions,
  } = useOptions();

  const [activeTab, setActiveTab] = useState("manifest"); // "manifest" | "containers"
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCarrier, setIsSearchingCarrier] = useState(false);
  const [carrierSynced, setCarrierSynced] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    billOfLadingNumber: "",
    vessel: null,
    provider: null,
    consignee: null,
    supplier: null,
    doc: null,
    arrivalDate: "",
    freeDays: 14,
    status: null,
  });

  const [containersList, setContainersList] = useState([]);

  const isEditMode = !!billOfLanding;

  // ── Vendor Security ────────────────────────────────────────────────────────
  const canViewSupplier = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("View_Supplier") ||
      permissions.includes("Supplier") ||
      permissions.includes("Edit_Supplier") ||
      permissions.includes("Add_Supplier")
    );
  }, [permissions]);

  const canEditSupplier = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("Edit_Supplier") ||
      permissions.includes("Add_Supplier")
    );
  }, [permissions]);

  const canDeleteBL = useMemo(() => {
    return isRoot || (Array.isArray(permissions) && (
      permissions.includes("Delete_BL") ||
      permissions.includes("Delete_BillOfLanding") ||
      permissions.includes("Administrator")
    ));
  }, [permissions, isRoot]);

  // Helper to resolve human-readable milestone status text
  const resolveStatusName = (c) => {
    if (!c) return "In Transit";
    const textCandidates = [c.state, c.status_name, c.milestone, c.status];
    for (const cand of textCandidates) {
      if (cand !== null && cand !== undefined && cand !== "") {
        const str = String(cand).trim();
        if (isNaN(Number(str))) return str;
      }
    }
    const numId = c.status ?? c.status_id;
    if (numId !== null && numId !== undefined && statusOptions?.length) {
      const found = statusOptions.find(s => String(s.id) === String(numId));
      if (found?.name) return found.name;
    }
    return "In Transit";
  };

  // Check if any containers under this B/L have custom FreeDays overrides
  const hasCustomFreeDays = useMemo(() => {
    if (!containersList || containersList.length === 0) return false;
    const bolFreeDays = formData.freeDays !== "" && formData.freeDays !== undefined && formData.freeDays !== null
      ? Number(formData.freeDays)
      : null;
    if (bolFreeDays === null) return false;
    return containersList.some(c => {
      const cFd = c.FreeDays;
      return cFd !== null && cFd !== undefined && cFd !== "" && Number(cFd) !== Number(bolFreeDays);
    });
  }, [containersList, formData.freeDays]);

  // Check if any containers under this B/L have distinct custom status
  const hasCustomStatus = useMemo(() => {
    if (!containersList || containersList.length === 0 || !statusOptions?.length) return false;
    const bolStatusId = formData.status ? String(formData.status) : null;
    if (!bolStatusId) return false;
    const bolStatusName = statusOptions.find(opt => String(opt.id) === bolStatusId)?.name;
    if (!bolStatusName) return false;
    return containersList.some(c => {
      const cState = resolveStatusName(c);
      return cState && String(cState).toLowerCase() !== bolStatusName.toLowerCase();
    });
  }, [containersList, formData.status, statusOptions]);

  // ── Populate form data on open ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (billOfLanding) {
      const blNumber = billOfLanding.BillOfLanding || billOfLanding.billOfLadingNumber || "";
      const matchedVessel = (vesselList || []).find(v => v.id === billOfLanding.Vessel || v.name === billOfLanding.vessel_name);
      const matchedConsignee = (consignees || []).find(c => c.id === billOfLanding.Consignee || c.name === billOfLanding.consignee_name);
      const matchedSupplier = (suppliers || []).find(s => s.id === billOfLanding.Supplier || s.name === billOfLanding.supplier_name);
      const matchedDoc = (shipping || []).find(d => d.id === billOfLanding.Doc || d.name === billOfLanding.Doc_name);
      const matchedStatus = (statusOptions || []).find(s => s.id === billOfLanding.status || s.name === billOfLanding.status_name);

      setFormData({
        billOfLadingNumber: blNumber,
        vessel: matchedVessel?.id || billOfLanding.Vessel || null,
        provider: billOfLanding.Provider || null,
        consignee: matchedConsignee?.id || billOfLanding.Consignee || null,
        supplier: matchedSupplier?.id || billOfLanding.Supplier || null,
        doc: matchedDoc?.id || billOfLanding.Doc || null,
        arrivalDate: billOfLanding.ArrivalDate ? billOfLanding.ArrivalDate.slice(0, 16) : "",
        freeDays: billOfLanding.FreeDays ?? 14,
        status: matchedStatus?.id || billOfLanding.status || null,
      });

      // Populate containers if returned with BL or fetch them
      if (Array.isArray(billOfLanding.containers)) {
        setContainersList(billOfLanding.containers);
      } else if (blNumber) {
        // Fetch containers attached to this BL
        axios
          .get(`${process.env.REACT_APP_NETWORK}/containers?BillOfLanding=${encodeURIComponent(blNumber)}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true"
            }
          })
          .then(res => {
            setContainersList(res.data?.data || []);
          })
          .catch(err => {
            console.warn("Failed to load containers for BL:", err);
            setContainersList([]);
          });
      }
    } else {
      setFormData({
        billOfLadingNumber: "",
        vessel: null,
        provider: null,
        consignee: consignees?.[0]?.id || null,
        supplier: null,
        doc: null,
        arrivalDate: "",
        freeDays: 14,
        status: statusOptions?.[0]?.id || null,
      });
      setContainersList([]);
    }

    setCarrierSynced(false);
    setActiveTab("manifest");
  }, [isOpen, billOfLanding, consignees, shipping, statusOptions, suppliers, vesselList]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCopyBL = () => {
    if (!formData.billOfLadingNumber) return;
    navigator.clipboard.writeText(formData.billOfLadingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Live Carrier Sync Lookup
  const handleSearchCarrier = async () => {
    if (!formData.billOfLadingNumber || !formData.billOfLadingNumber.trim()) {
      toast.warn("Please enter a Bill of Lading number first");
      return;
    }

    setIsSearchingCarrier(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/logistics/track/${encodeURIComponent(formData.billOfLadingNumber.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        }
      );

      if (res.data) {
        setCarrierSynced(true);
        if (res.data.vessel_name && !formData.vessel) {
          const matchV = (vesselList || []).find(v => v.name?.toLowerCase() === res.data.vessel_name?.toLowerCase());
          if (matchV) setFormData(p => ({ ...p, vessel: matchV.id }));
        }
        if (res.data.eta && !formData.arrivalDate) {
          setFormData(p => ({ ...p, arrivalDate: res.data.eta.slice(0, 16) }));
        }
        toast.success("Carrier tracking data retrieved!");
      }
    } catch (err) {
      console.warn("Carrier search did not find automatic match:", err);
      toast.info("No automatic carrier match found. You can enter details manually.");
    } finally {
      setIsSearchingCarrier(false);
    }
  };

  // Save / Update B/L
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.billOfLadingNumber || !formData.billOfLadingNumber.trim()) {
      toast.error("Bill of Lading number is required");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode) {
        // Update existing BL
        const patchData = {
          Consignee: formData.consignee,
          Vessel: formData.vessel,
          ArrivalDate: formData.arrivalDate ? new Date(formData.arrivalDate).toISOString() : null,
          Doc: formData.doc,
          Provider: formData.provider,
          FreeDays: formData.freeDays !== "" ? parseInt(formData.freeDays, 10) : null,
          status: formData.status,
        };
        if (canViewSupplier && canEditSupplier) {
          patchData.Supplier = formData.supplier;
        }

        await axios.patch(
          `${process.env.REACT_APP_NETWORK}/bills-of-lading/${encodeURIComponent(formData.billOfLadingNumber.trim())}`,
          patchData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true"
            }
          }
        );
        toast.success("Bill of Lading updated successfully");
      } else {
        // Create new BL
        const postData = {
          BillOfLanding: formData.billOfLadingNumber.trim().toUpperCase(),
          Consignee: formData.consignee,
          Vessel: formData.vessel,
          ArrivalDate: formData.arrivalDate ? new Date(formData.arrivalDate).toISOString() : null,
          Doc: formData.doc,
          Supplier: canViewSupplier ? formData.supplier : null,
          Provider: formData.provider,
          FreeDays: formData.freeDays !== "" ? parseInt(formData.freeDays, 10) : 14,
          status: formData.status,
          new_containers: []
        };

        await axios.post(
          `${process.env.REACT_APP_NETWORK}/bills-of-lading`,
          postData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true"
            }
          }
        );
        toast.success("Bill of Lading created successfully");
      }

      if (onSubmitSuccess) onSubmitSuccess();
      onClose();
    } catch (err) {
      console.error("Save BL error:", err);
      toast.error(err.response?.data?.detail || "Failed to save Bill of Lading");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!billOfLanding || !onDelete) return;
    const blId = billOfLanding.BillOfLanding || billOfLanding.id;
    const confirmed = await confirm(
      `Are you sure you want to delete Bill of Lading "${blId}"? All container linkages will be affected.`
    );
    if (!confirmed) return;

    onDelete(blId);
    onClose();
  };

  const handleOpenFullWorkspace = () => {
    onClose();
    navigate("/bill-of-landing-info", {
      state: {
        mode: isEditMode ? "edit" : "create",
        billOfLandingId: formData.billOfLadingNumber,
        data: billOfLanding
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl h-full flex flex-col shadow-2xl border-l transition-all animate-in slide-in-from-right duration-200 ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* ── Sider Header ──────────────────────────────────────────────────── */}
        <div className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${
          isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-100 bg-slate-50/60"
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-600/10 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Anchor size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {isEditMode ? "Bill of Lading Manifest" : "New Manifest Entry"}
                </span>
                {formData.billOfLadingNumber && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      {formData.billOfLadingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyBL}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Copy B/L Number"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
                {carrierSynced && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 size={10} /> Carrier Synced
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold tracking-tight truncate">
                {formData.billOfLadingNumber || "New Bill of Lading"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick action to open dedicated full workspace */}
            <button
              type="button"
              onClick={handleOpenFullWorkspace}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Open full-screen workspace with bulk container spreadsheet"
            >
              <ExternalLink size={13} />
              <span>Full Workspace</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Tabs Navigation ───────────────────────────────────────────────── */}
        <div className={`shrink-0 flex items-center gap-1 px-6 border-b overflow-x-auto ${
          isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("manifest")}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "manifest"
                ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Anchor size={14} />
            <span>Manifest & Carrier Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("containers")}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "containers"
                ? "border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Container size={14} />
            <span>Linked Containers</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 font-bold text-sky-700 dark:text-sky-300">
              {containersList.length}
            </span>
          </button>
        </div>

        {/* ── Scrollable Tab Content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: MANIFEST & CARRIER DETAILS */}
          {activeTab === "manifest" && (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ship size={16} className="text-sky-600 dark:text-sky-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Ocean Freight Information
                    </h3>
                  </div>

                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={handleSearchCarrier}
                      disabled={isSearchingCarrier || !formData.billOfLadingNumber}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-sky-100 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSearchingCarrier ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                      <span>Lookup Carrier API</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Bill of Lading Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="billOfLadingNumber"
                      value={formData.billOfLadingNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. GGZ2601947"
                      disabled={isEditMode}
                      className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      } disabled:opacity-60`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Carrier Vessel</label>
                    <GenericSelector
                      options={vesselList}
                      value={formData.vessel}
                      onChange={(val) => setFormData(p => ({ ...p, vessel: val }))}
                      placeholder="Select Vessel"
                      addApi="setVessal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Port Arrival Date</label>
                    <input
                      type="datetime-local"
                      name="arrivalDate"
                      value={formData.arrivalDate}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Document / Shipping Type</label>
                    <GenericSelector
                      options={shipping}
                      value={formData.doc}
                      onChange={(val) => setFormData(p => ({ ...p, doc: val }))}
                      placeholder="Select Shipping Type"
                      addApi="setShippingDocument"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Consignee</label>
                    <GenericSelector
                      options={consignees}
                      value={formData.consignee}
                      onChange={(val) => setFormData(p => ({ ...p, consignee: val }))}
                      placeholder="Select Consignee"
                      addApi="setConsignee"
                    />
                  </div>

                  {/* VENDOR SECURITY GUARDED SUPPLIER */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold">Supplier / Shipper</label>
                      {!canViewSupplier && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          <Lock size={10} /> Confidential
                        </span>
                      )}
                    </div>
                    {canViewSupplier ? (
                      <GenericSelector
                        options={suppliers}
                        value={formData.supplier}
                        onChange={(val) => setFormData(p => ({ ...p, supplier: val }))}
                        placeholder="Select Supplier"
                        addApi="setSupplier"
                        disabled={!canEditSupplier && isEditMode}
                      />
                    ) : (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-slate-400 ${
                        isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-100 border-slate-200"
                      }`}>
                        <Shield size={14} className="text-amber-500" />
                        <span>Confidential Shipper Partner</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold">Free Days Allowance</label>
                      {hasCustomFreeDays && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <Lock size={10} /> Overridden
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      name="freeDays"
                      value={formData.freeDays}
                      onChange={handleInputChange}
                      disabled={hasCustomFreeDays}
                      placeholder="10"
                      className={`w-full px-3 py-2 text-xs rounded-xl border transition ${
                        hasCustomFreeDays
                          ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 cursor-not-allowed"
                          : isDark
                          ? "bg-slate-800 border-slate-700 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                    {hasCustomFreeDays && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertTriangle size={11} /> Locked: Individual container overrides exist in manifest.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold">Manifest Status</label>
                      {hasCustomStatus && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <Lock size={10} /> Distinct States
                        </span>
                      )}
                    </div>
                    <select
                      name="status"
                      value={formData.status || ""}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="">Select Status</option>
                      {(statusOptions || []).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    {hasCustomStatus && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                        <AlertTriangle size={11} /> Containers have varying milestone states.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LINKED CONTAINERS */}
          {activeTab === "containers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Containers in this Bill of Lading ({containersList.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    All freight containers consigned under manifest {formData.billOfLadingNumber}
                  </p>
                </div>

                {onOpenContainerDrawer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenContainerDrawer({
                        bill_of_landing: {
                          BillOfLanding: formData.billOfLadingNumber,
                          ArrivalDate: formData.arrivalDate,
                          vessal: formData.vessel,
                          consignee: formData.consignee,
                          supplier: formData.supplier,
                        }
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Container</span>
                  </button>
                )}
              </div>

              {containersList.length === 0 ? (
                <div className="text-center py-12 border rounded-2xl border-dashed border-slate-300 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                  <Container size={32} className="mx-auto opacity-40 text-sky-500" />
                  <p className="font-semibold">No containers registered under this manifest yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Add containers from the Container Register or click the Full Workspace button.
                  </p>
                </div>
              ) : (
                <div className="border rounded-2xl overflow-hidden shadow-xs divide-y dark:divide-slate-800">
                  {containersList.map((c, idx) => (
                    <div
                      key={c.Container_ID || c.ContainerId || idx}
                      className={`p-3 flex items-center justify-between transition cursor-pointer ${
                        isDark ? "hover:bg-slate-800/60 bg-slate-900" : "hover:bg-sky-50/50 bg-white"
                      }`}
                      onClick={() => {
                        if (onOpenContainerDrawer) {
                          onClose();
                          onOpenContainerDrawer(c);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                            {c.container_no || c.Container || `Container #${idx + 1}`}
                          </span>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{c.containerType || c.type_rel?.type || "20ft"}</span>
                            <span>•</span>
                            <span>{c.location || c.emptied_at_rel?.venue || "Yard"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {(() => {
                          const sName = resolveStatusName(c);
                          const sLower = sName.toLowerCase();
                          const isCompleted = sLower.includes('complete') || sLower.includes('empty');
                          const isPort = sLower.includes('port') || sLower.includes('discharg');
                          const isGate = sLower.includes('gate') || sLower.includes('deliver');

                          return (
                            <div className="flex items-center gap-2">
                              {c.FreeDays !== null && c.FreeDays !== undefined && c.FreeDays !== "" && Number(c.FreeDays) !== Number(formData.freeDays) && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                  {c.FreeDays}d Free
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : isPort
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : isGate
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}>
                                {sName}
                              </span>
                            </div>
                          );
                        })()}
                        <ExternalLink size={13} className="text-slate-400 opacity-60" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky Sider Footer ───────────────────────────────────────────── */}
        <div className={`shrink-0 flex items-center justify-between px-6 py-4 border-t ${
          isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50/80"
        }`}>
          <div>
            {isEditMode && canDeleteBL && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Delete Manifest</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{isEditMode ? "Save Changes" : "Create Manifest"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
