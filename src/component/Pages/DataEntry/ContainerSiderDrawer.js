import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X,
  Container,
  Anchor,
  FileText,
  Clock,
  AlertTriangle,
  Trash2,
  Save,
  Building,
  Calendar,
  MapPin,
  Copy,
  Check,
  Shield,
  Lock,
  Plus,
  UploadCloud,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  FileCheck,
  Mail
} from "lucide-react";

import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useConfirm } from "../../../context/ConfirmContext";
import { useOptions } from "../../../hooks/useOptions";
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import MaterialTagSelector from "../../UI/UXComponent/TagInput";
import ContainerContextPanel from "./ContainerContextPanel";
import { calculateDemurrage } from "../../../utils/DemurrageUtil";

export default function ContainerSiderDrawer({
  isOpen,
  onClose,
  container = null, // null for create mode, or object for edit mode
  onSubmitSuccess,
  onDelete = null
}) {
  const { isDark } = useTheme();
  const { permissions, isRoot } = useAuth();
  const { confirm } = useConfirm();

  const {
    suppliers,
    consignees,
    emptyLocations,
    status: statusOptions,
    type: containerTypes,
    shipping,
    vessal: vesselList,
    material: materialOptions,
    refresh
  } = useOptions();

  // Active Tab: "container" | "bl" | "documents" | "context"
  const [activeTab, setActiveTab] = useState("container");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    container_id: null,
    containerNo: "",
    type: null,
    status: null,
    in_bound: "",
    out_bound: "",
    unloaded_at_port: "",
    empty_date: "",
    emptied_at: null,
    material: [],
    freeDays: null,
    note: "",
    tax: 0,
    PONo: "",
    // Bill of Lading Linkage
    BillOfLanding: "",
    vessal: null,
    provider: null,
    consignee: null,
    supplier: null,
    shippingType: null,
    arrival_on_port: "",
    blFreeDays: null,
    blStatus: null,
  });

  const [originalData, setOriginalData] = useState({});
  const [documents, setDocuments] = useState([]);
  const [removedDocIds, setRemovedDocIds] = useState([]);
  const [inboundImages, setInboundImages] = useState([]);
  const [emptyImages, setEmptyImages] = useState([]);

  const fileInputRef = useRef(null);
  const inboundInputRef = useRef(null);
  const emptyInputRef = useRef(null);

  // ── RBAC & Vendor Security Permissions ─────────────────────────────────────
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

  const canViewBL = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("View_BL") ||
      permissions.includes("BillOfLanding") ||
      permissions.includes("Add_BillOfLanding") ||
      permissions.includes("Edit_BillOfLanding")
    );
  }, [permissions]);

  const canViewDocuments = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("View_Document") ||
      permissions.includes("Upload_Document") ||
      permissions.includes("Edit_Document") ||
      permissions.includes("Delete_Document") ||
      permissions.includes("View_OrderDocument")
    );
  }, [permissions]);

  const canUploadDocuments = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("Upload_Document") ||
      permissions.includes("Edit_Document")
    );
  }, [permissions]);

  const canDeleteDocuments = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("Delete_Document")
    );
  }, [permissions]);

  const canViewOperations = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("View_Order") ||
      permissions.includes("Order") ||
      permissions.includes("View_GoodsReceipt") ||
      permissions.includes("Verify_Receipt") ||
      permissions.includes("View_PackingList") ||
      permissions.includes("View_StoreRequest")
    );
  }, [permissions]);

  const canViewDemurrage = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("View_Demurrage") ||
      permissions.includes("Administrator")
    );
  }, [permissions]);

  const canDeleteContainer = useMemo(() => {
    return Array.isArray(permissions) && (
      permissions.includes("Delete_Container") ||
      permissions.includes("Administrator")
    );
  }, [permissions]);

  const canMail = useMemo(() => {
    return isRoot || (Array.isArray(permissions) && (
      permissions.includes("Mail_Container") ||
      permissions.includes("Mail") ||
      permissions.includes("Container") ||
      permissions.includes("Administrator")
    ));
  }, [permissions, isRoot]);

  const isEditMode = !!container;

  // Reset active tab to container if current active tab is unauthorized
  useEffect(() => {
    if (activeTab === "bl" && !canViewBL) {
      setActiveTab("container");
    } else if (activeTab === "documents" && !canViewDocuments) {
      setActiveTab("container");
    } else if (activeTab === "context" && (!canViewOperations || !isEditMode)) {
      setActiveTab("container");
    }
  }, [activeTab, canViewBL, canViewDocuments, canViewOperations, isEditMode]);

  // ── Initialize or populate form on open ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (container) {
      const raw = container.rawData || container;
      const bill = raw.bill_of_landing || {};

      const matchedVessel = (vesselList || []).find(v => v.id === raw.VessalID || v.name === bill?.vessal);
      const matchedConsignee = (consignees || []).find(c => c.name === bill?.consignee_name || c.id === bill?.Consignee);
      const matchedSupplier = (suppliers || []).find(s => s.name === bill?.supplier_name || s.id === bill?.Supplier);
      const matchedType = (containerTypes || []).find(t => t.name === raw.containerType || t.id === raw.type);
      const matchedStatus = (statusOptions || []).find(s => s.name === raw.state || s.id === raw.status);
      const matchedEmptyLocation = (emptyLocations || []).find(l => l.name === raw.location || l.id === raw.emptied_at);
      const matchedShipping = (shipping || []).find(d => d.name === bill?.Doc_name || d.id === bill?.Doc);

      const initialForm = {
        container_id: raw.Container_ID || raw.ContainerId || null,
        containerNo: raw.container_no || raw.Container || "",
        type: matchedType?.id || raw.type || null,
        status: matchedStatus?.id || raw.status || null,
        in_bound: raw.in_bound ? raw.in_bound.slice(0, 16) : "",
        out_bound: raw.out_bound ? raw.out_bound.slice(0, 16) : "",
        unloaded_at_port: raw.unloaded_at_port ? raw.unloaded_at_port.slice(0, 10) : "",
        empty_date: raw.empty_date ? raw.empty_date.slice(0, 10) : "",
        emptied_at: matchedEmptyLocation?.id || raw.emptied_at || null,
        material: raw.materials ? raw.materials.map(m => m.Id || m.id || m) : [],
        freeDays: raw.FreeDays ?? null,
        note: raw.note || "",
        tax: raw.tax || 0,
        PONo: raw.PONo || "",
        // Bill of Lading Linkage
        BillOfLanding: raw.BillOfLanding || bill?.BillOfLanding || "",
        vessal: matchedVessel?.id || bill?.Vessel || null,
        provider: bill?.Provider || null,
        consignee: matchedConsignee?.id || bill?.Consignee || null,
        supplier: matchedSupplier?.id || bill?.Supplier || null,
        shippingType: matchedShipping?.id || bill?.Doc || null,
        arrival_on_port: bill?.ArrivalDate ? bill.ArrivalDate.slice(0, 16) : "",
        blFreeDays: bill?.FreeDays ?? null,
        blStatus: (statusOptions || []).find(s => s.name === bill?.status_name)?.id || bill?.status || null,
      };

      setFormData(initialForm);
      setOriginalData(initialForm);

      // Populate Documents & Photos
      if (raw.documents && Array.isArray(raw.documents)) {
        setDocuments(
          raw.documents
            .filter(d => d.Type === "D")
            .map(d => ({ isExisting: true, file_path: d.path, id: d.docs_id, name: d.path?.split(/[\\/]/).pop() }))
        );
        setInboundImages(
          raw.documents
            .filter(d => d.Type === "AD")
            .map(d => ({ isExisting: true, file_path: d.path, id: d.docs_id, name: d.path?.split(/[\\/]/).pop() }))
        );
        setEmptyImages(
          raw.documents
            .filter(d => d.Type === "ED")
            .map(d => ({ isExisting: true, file_path: d.path, id: d.docs_id, name: d.path?.split(/[\\/]/).pop() }))
        );
      } else {
        setDocuments([]);
        setInboundImages([]);
        setEmptyImages([]);
      }
      setRemovedDocIds([]);
    } else {
      // Add / Create Mode default
      const defaultConsignee = consignees?.length === 1 ? consignees[0].id : null;
      const initialForm = {
        container_id: null,
        containerNo: "",
        type: null,
        status: statusOptions?.[0]?.id || null,
        in_bound: "",
        out_bound: "",
        unloaded_at_port: "",
        empty_date: "",
        emptied_at: null,
        material: [],
        freeDays: null,
        note: "",
        tax: 0,
        PONo: "",
        BillOfLanding: "",
        vessal: null,
        provider: null,
        consignee: defaultConsignee,
        supplier: null,
        shippingType: null,
        arrival_on_port: "",
        blFreeDays: null,
        blStatus: null,
      };
      setFormData(initialForm);
      setOriginalData(initialForm);
      setDocuments([]);
      setInboundImages([]);
      setEmptyImages([]);
      setRemovedDocIds([]);
    }

    setActiveTab("container");
  }, [isOpen, container, consignees, containerTypes, emptyLocations, shipping, statusOptions, suppliers, vesselList]);

  // Synchronize status and options when statusOptions loads
  useEffect(() => {
    if (!isOpen || !container || !statusOptions?.length) return;
    const raw = container.rawData || container;
    const bill = raw.bill_of_landing || {};

    setFormData(prev => {
      let updated = { ...prev };
      let changed = false;

      if (!prev.status) {
        const foundStatus = statusOptions.find(s => 
          String(s.id) === String(raw.status) || 
          (raw.state && s.name && s.name.toLowerCase() === String(raw.state).toLowerCase())
        );
        if (foundStatus) {
          updated.status = foundStatus.id;
          changed = true;
        }
      }

      if (!prev.blStatus && bill) {
        const foundBlStatus = statusOptions.find(s => 
          String(s.id) === String(bill.status) || 
          (bill.status_name && s.name && s.name.toLowerCase() === String(bill.status_name).toLowerCase())
        );
        if (foundBlStatus) {
          updated.blStatus = foundBlStatus.id;
          changed = true;
        }
      }

      return changed ? updated : prev;
    });
  }, [isOpen, container, statusOptions]);

  // Live Demurrage Status Badge for Drawer Header (respects milestone status)
  const demurrageBadge = useMemo(() => {
    const raw = container ? (container.rawData || container) : null;
    const currentStatusId = formData.status;
    const currentStatusName = (statusOptions || []).find(s => String(s.id) === String(currentStatusId))?.name || raw?.state || "";

    const freeDaysVal = formData.freeDays !== null && formData.freeDays !== undefined && formData.freeDays !== ""
      ? Number(formData.freeDays)
      : (formData.blFreeDays !== null && formData.blFreeDays !== undefined && formData.blFreeDays !== "" ? Number(formData.blFreeDays) : 10);

    const isTransit = !currentStatusName || currentStatusName.toLowerCase().includes("transit") || currentStatusName.toLowerCase().includes("sailing");
    const isCompleted = currentStatusName.toLowerCase().includes("complete") || currentStatusName.toLowerCase().includes("empty");

    if (isCompleted) {
      return {
        text: "Completed / Empty Returned",
        isOverdue: false,
        isCompleted: true
      };
    }

    if (isTransit) {
      return {
        text: `In Transit • ${freeDaysVal} Free Days`,
        isOverdue: false,
        isTransit: true
      };
    }

    if (!formData.arrival_on_port) {
      return {
        text: `${freeDaysVal} Free Days Allowance`,
        isOverdue: false
      };
    }

    try {
      const resultText = calculateDemurrage({
        ExcludeDayBitmask: 96, // default weekend bitmask
        ArrivalDate: formData.arrival_on_port,
        FreeDay: freeDaysVal
      });
      const isOverdue = String(resultText).toLowerCase().includes("overdue");
      return {
        text: resultText,
        isOverdue
      };
    } catch (e) {
      return null;
    }
  }, [formData.arrival_on_port, formData.freeDays, formData.blFreeDays, formData.status, statusOptions, container]);

  // Field change helper
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleCopyContainerNo = () => {
    if (!formData.containerNo) return;
    navigator.clipboard.writeText(formData.containerNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendContainerEmail = () => {
    const cNo = formData.containerNo || "Container";
    const statusObj = (statusOptions || []).find(s => String(s.id) === String(formData.status));
    const statusName = statusObj?.name || "In Transit";
    const subject = `Container Status Notice: ${cNo}`;
    const body = `Dear Team,\n\nPlease see the operational status details for container ${cNo}:\n\n` +
      `- Container Number: ${cNo}\n` +
      `- Ocean B/L: ${formData.BillOfLanding || "N/A"}\n` +
      `- Milestone Status: ${statusName}\n` +
      `- Port Arrival: ${formData.arrival_on_port || "N/A"}\n` +
      `- Demurrage / Free Days: ${demurrageBadge?.text || `${formData.freeDays || formData.blFreeDays || 10} Free Days`}\n` +
      `- In-Bound Date: ${formData.in_bound || "N/A"}\n` +
      `- Empty Date: ${formData.empty_date || "N/A"}\n` +
      (formData.note ? `- Notes: ${formData.note}\n` : "") +
      `\nBest regards,\nLogistics Operations`;

    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    toast.info(`Drafted email notice for container ${cNo}.`);
  };

  // ── Document and Image Pickers ─────────────────────────────────────────────
  const handleAddDocumentFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocuments(prev => [...prev, { file, name: file.name }]);
    e.target.value = "";
  };

  const removeDocument = (index) => {
    setDocuments(docs => {
      const doc = docs[index];
      if (doc?.isExisting && doc.id) {
        setRemovedDocIds(prev => [...prev, doc.id]);
      }
      return docs.filter((_, i) => i !== index);
    });
  };

  const handleInboundUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const wrapped = files.map(file => ({ file, name: file.name }));
      setInboundImages(prev => [...prev, ...wrapped]);
    }
    e.target.value = "";
  };

  const removeInboundImage = (index) => {
    setInboundImages(imgs => {
      const img = imgs[index];
      if (img?.isExisting && img.id) {
        setRemovedDocIds(prev => [...prev, img.id]);
      }
      return imgs.filter((_, i) => i !== index);
    });
  };

  const handleEmptyUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const wrapped = files.map(file => ({ file, name: file.name }));
      setEmptyImages(prev => [...prev, ...wrapped]);
    }
    e.target.value = "";
  };

  const removeEmptyImage = (index) => {
    setEmptyImages(imgs => {
      const img = imgs[index];
      if (img?.isExisting && img.id) {
        setRemovedDocIds(prev => [...prev, img.id]);
      }
      return imgs.filter((_, i) => i !== index);
    });
  };

  // ── Submit & Save Handler ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!formData.containerNo || !formData.containerNo.trim()) {
      toast.error("Container Number is required");
      setActiveTab("container");
      return;
    }

    if (canViewBL && (!formData.BillOfLanding || !formData.BillOfLanding.trim())) {
      toast.error("Bill of Lading number is required");
      setActiveTab("bl");
      return;
    }

    setIsSubmitting(true);
    const payload = new FormData();

    const safeAppend = (key, val) => {
      if (val !== null && val !== undefined && val !== "" && val !== "null") {
        payload.append(key, val);
      }
    };

    // Container Fields
    safeAppend("container_no", formData.containerNo.trim().toUpperCase());
    safeAppend("in_bound", formData.in_bound || null);
    safeAppend("empty_date", formData.empty_date || null);
    safeAppend("out_bound", formData.out_bound || null);
    safeAppend("unloaded_at_port", formData.unloaded_at_port || null);
    safeAppend("note", formData.note || null);
    safeAppend("tax", formData.tax || 0);
    safeAppend("PONo", formData.PONo || null);
    safeAppend("status", formData.status || null);
    safeAppend("FreeDays", formData.freeDays || null);
    safeAppend("type", formData.type || null);
    safeAppend("emptied_at", formData.emptied_at || null);

    // Bill of Lading Fields
    if (canViewBL && formData.BillOfLanding && formData.BillOfLanding.trim()) {
      safeAppend("bill_of_landing.BillOfLanding", formData.BillOfLanding.trim().toUpperCase());
      safeAppend("bill_of_landing.Vessel", formData.vessal || null);
      safeAppend("bill_of_landing.Provider", formData.provider || null);
      safeAppend("bill_of_landing.Consignee", formData.consignee || null);
      if (canViewSupplier) {
        safeAppend("bill_of_landing.Supplier", formData.supplier || null);
      }
      safeAppend("bill_of_landing.Doc", formData.shippingType || null);
      safeAppend("bill_of_landing.ArrivalDate", formData.arrival_on_port || null);
      safeAppend("bill_of_landing.FreeDays", formData.blFreeDays || null);
      safeAppend("bill_of_landing.status", formData.blStatus || null);
    }

    // Materials
    (formData.material || []).forEach(matId => {
      payload.append("materials", matId);
    });

    // File Attachments
    documents.forEach(doc => {
      if (doc.file) payload.append("documents", doc.file);
    });

    inboundImages.forEach(img => {
      if (img.file) payload.append("inbound_images", img.file);
    });

    emptyImages.forEach(img => {
      if (img.file) payload.append("empty_images", img.file);
    });

    removedDocIds.forEach(id => {
      payload.append("remove_doc_ids", id);
    });

    const isUpdate = !!formData.container_id;
    const url = isUpdate
      ? `${process.env.REACT_APP_NETWORK}/containers/${formData.container_id}/status`
      : `${process.env.REACT_APP_NETWORK}/containers`;

    try {
      await axios({
        method: isUpdate ? "patch" : "post",
        url,
        data: payload,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
          skip_zrok_interstitial: "true",
        }
      });

      toast.success(isUpdate ? "Container updated successfully" : "Container registered successfully");
      if (onSubmitSuccess) onSubmitSuccess();
      onClose();
    } catch (error) {
      console.error("Container save error:", error);
      if (error.response?.status === 409) {
        toast.error(
          `Conflict: ${error.response.data?.detail || "Cannot update parent Bill of Lading value."}`
        );
      } else {
        toast.error(error.response?.data?.detail || "Failed to save container");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.container_id || !onDelete) return;
    const confirmed = await confirm(
      `Are you sure you want to delete container ${formData.containerNo || "record"}? This action cannot be undone.`
    );
    if (!confirmed) return;

    onDelete(formData.container_id);
    onClose();
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Container size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {isEditMode ? "Container Workspace" : "New Container Shipment"}
                </span>
                {formData.containerNo && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {formData.containerNo}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyContainerNo}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                      title="Copy Container Number"
                    >
                      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold tracking-tight truncate">
                  {formData.containerNo || "New Container Entry"}
                </h2>
                {(() => {
                  const currentStatusObj = (statusOptions || []).find(s => String(s.id) === String(formData.status));
                  const statusName = currentStatusObj?.name || (container?.rawData?.state || container?.state || "In Transit");
                  const sLower = statusName.toLowerCase();
                  const isCompleted = sLower.includes('complete') || sLower.includes('empty');
                  const isPort = sLower.includes('port') || sLower.includes('discharg');
                  const isGate = sLower.includes('gate') || sLower.includes('deliver');

                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : isPort
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        : isGate
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    }`}>
                      {statusName}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {demurrageBadge && (
              <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                demurrageBadge.isOverdue
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-900"
                  : demurrageBadge.isCompleted
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-900"
                  : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-900"
              }`}>
                {demurrageBadge.isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
                <span>{demurrageBadge.text}</span>
              </span>
            )}

            {canMail && formData.containerNo && (
              <button
                type="button"
                onClick={handleSendContainerEmail}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Send Container Notice Email"
              >
                <Mail size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close drawer (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Sider Tabs Navigation ─────────────────────────────────────────── */}
        <div className={`shrink-0 flex items-center gap-1 px-6 border-b overflow-x-auto ${
          isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("container")}
            className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "container"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Container size={14} />
            <span>Container & Freight</span>
          </button>

          {canViewBL && (
            <button
              type="button"
              onClick={() => setActiveTab("bl")}
              className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "bl"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Anchor size={14} />
              <span>Bill of Lading (B/L)</span>
              {formData.BillOfLanding && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                  {formData.BillOfLanding}
                </span>
              )}
            </button>
          )}

          {canViewDocuments && (
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "documents"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <FileText size={14} />
              <span>Documents & Proofs</span>
              {(documents.length + inboundImages.length + emptyImages.length) > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 font-bold text-indigo-600 dark:text-indigo-400">
                  {documents.length + inboundImages.length + emptyImages.length}
                </span>
              )}
            </button>
          )}

          {isEditMode && canViewOperations && (
            <button
              type="button"
              onClick={() => setActiveTab("context")}
              className={`py-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "context"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Layers size={14} />
              <span>Operations & Orders</span>
            </button>
          )}
        </div>

        {/* ── Scrollable Tab Content ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CONTAINER & FREIGHT */}
          {activeTab === "container" && (
            <div className="space-y-6">
              {/* Primary Identity Section */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-4`}>
                <div className="flex items-center gap-2">
                  <Container size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Container Identification & Status
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Container Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="containerNo"
                      value={formData.containerNo}
                      onChange={handleInputChange}
                      placeholder="e.g. MSKU1234567"
                      className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Container Type</label>
                    <GenericSelector
                      options={containerTypes}
                      value={formData.type}
                      onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                      placeholder="Select Type (20ft, 40ft...)"
                      addApi="setContainerType"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Operational Status</label>
                    <select
                      name="status"
                      value={formData.status || ""}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="">Select Status</option>
                      {(statusOptions || []).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Logistics Milestones Grid */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-4`}>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-sky-600 dark:text-sky-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Logistics Milestones & Port Operations
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">In-Bound (Port Entry)</label>
                    <input
                      type="datetime-local"
                      name="in_bound"
                      value={formData.in_bound}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Unloaded at Port</label>
                    <input
                      type="date"
                      name="unloaded_at_port"
                      value={formData.unloaded_at_port}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Out-Bound (Gate Pass / Port Exit)</label>
                    <input
                      type="datetime-local"
                      name="out_bound"
                      value={formData.out_bound}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Empty Date</label>
                    <input
                      type="date"
                      name="empty_date"
                      value={formData.empty_date}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Empty Return Venue</label>
                    <GenericSelector
                      options={emptyLocations}
                      value={formData.emptied_at}
                      onChange={(val) => setFormData(prev => ({ ...prev, emptied_at: val }))}
                      placeholder="Select Facility/Depot"
                      addApi="setUnloadVenue"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold">Free Days (Container Override)</label>
                      {formData.freeDays !== null && formData.freeDays !== undefined && formData.freeDays !== "" && formData.blFreeDays !== null && Number(formData.freeDays) !== Number(formData.blFreeDays) ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Lock size={10} /> Custom Override Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Inheriting B/L ({formData.blFreeDays || 10} days)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      name="freeDays"
                      value={formData.freeDays ?? ""}
                      onChange={handleInputChange}
                      placeholder={`Inherit from B/L (${formData.blFreeDays || 10} days)`}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Leave empty to inherit standard manifest allowance ({formData.blFreeDays || 10} days). Enter a number to set an individual exception.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cargo, Purchase Order, and Notes */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-4`}>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Cargo Description & Notes
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1">Cargo Materials & Categories</label>
                    <MaterialTagSelector
                      value={formData.material}
                      options={materialOptions}
                      onChange={(ids) => setFormData(prev => ({ ...prev, material: ids }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">PO Reference Number</label>
                    <input
                      type="text"
                      name="PONo"
                      value={formData.PONo}
                      onChange={handleInputChange}
                      placeholder="e.g. PO-2026-081"
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Tax Exemption</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="taxCheckbox"
                        name="tax"
                        checked={!!formData.tax}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="taxCheckbox" className="text-xs text-slate-600 dark:text-slate-300">
                        Container Subject to Customs Tax / Duty
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1">Internal Operations Note</label>
                    <textarea
                      name="note"
                      rows={2}
                      value={formData.note}
                      onChange={handleInputChange}
                      placeholder="Add inspection observations, seal numbers, or warehouse instructions..."
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BILL OF LADING (B/L) DETAILS */}
          {activeTab === "bl" && canViewBL && (
            <div className="space-y-6">
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Anchor size={16} className="text-sky-600 dark:text-sky-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Associated Ocean Manifest (Bill of Lading)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Controls Port Arrival Date & Free Days
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Bill of Lading Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="BillOfLanding"
                      value={formData.BillOfLanding}
                      onChange={handleInputChange}
                      placeholder="e.g. GGZ2601947"
                      className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Carrier Vessel</label>
                    <GenericSelector
                      options={vesselList}
                      value={formData.vessal}
                      onChange={(val) => setFormData(prev => ({ ...prev, vessal: val }))}
                      placeholder="Select Vessel"
                      addApi="setVessal"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Port Arrival Date & Time</label>
                    <input
                      type="datetime-local"
                      name="arrival_on_port"
                      value={formData.arrival_on_port}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Shipping Document Type</label>
                    <GenericSelector
                      options={shipping}
                      value={formData.shippingType}
                      onChange={(val) => setFormData(prev => ({ ...prev, shippingType: val }))}
                      placeholder="Select Doc Type"
                      addApi="setShippingDocument"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Consignee</label>
                    <GenericSelector
                      options={consignees}
                      value={formData.consignee}
                      onChange={(val) => setFormData(prev => ({ ...prev, consignee: val }))}
                      placeholder="Select Consignee"
                      addApi="setConsignee"
                    />
                  </div>

                  {/* VENDOR SECURITY GUARDED FIELD */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold">Supplier / Vendor</label>
                      {!canViewSupplier && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                          <Lock size={10} /> Protected
                        </span>
                      )}
                    </div>
                    {canViewSupplier ? (
                      <GenericSelector
                        options={suppliers}
                        value={formData.supplier}
                        onChange={(val) => setFormData(prev => ({ ...prev, supplier: val }))}
                        placeholder="Select Supplier"
                        addApi="setSupplier"
                        disabled={!canEditSupplier && isEditMode}
                      />
                    ) : (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-slate-400 ${
                        isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-100 border-slate-200"
                      }`}>
                        <Shield size={14} className="text-amber-500" />
                        <span>Confidential Supplier Partner</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold">B/L Free Days Allowance</label>
                      {formData.freeDays !== null && formData.freeDays !== undefined && formData.freeDays !== "" && Number(formData.freeDays) !== Number(formData.blFreeDays) ? (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Overridden on Container ({formData.freeDays}d)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Active for this container
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      name="blFreeDays"
                      value={formData.blFreeDays ?? ""}
                      onChange={handleInputChange}
                      placeholder="Default (10 days)"
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">B/L Master Status</label>
                    <select
                      name="blStatus"
                      value={formData.blStatus || ""}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="">Inherit or Select</option>
                      {(statusOptions || []).map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCUMENTS & ATTACHMENTS */}
          {activeTab === "documents" && canViewDocuments && (
            <div className="space-y-6">
              {/* General Shipping Documents */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Transport Documents & Manifests
                    </h3>
                  </div>
                  {canUploadDocuments && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Attach Document</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAddDocumentFile}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No documents attached yet. Click &quot;Attach Document&quot; to upload customs forms or delivery notes.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCheck size={14} className="text-indigo-500 shrink-0" />
                          {doc.isExisting ? (
                            <a
                              href={`${process.env.REACT_APP_NETWORK}/getDocument/${doc.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                            >
                              {doc.name || "Document File"}
                            </a>
                          ) : (
                            <span className="font-medium truncate">{doc.name}</span>
                          )}
                        </div>
                        {canDeleteDocuments && (
                          <button
                            type="button"
                            onClick={() => removeDocument(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inbound Inspection Photos */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className="text-sky-600 dark:text-sky-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Inbound Arrival Inspection Photos
                    </h3>
                  </div>
                  {canUploadDocuments && (
                    <>
                      <button
                        type="button"
                        onClick={() => inboundInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-sky-100 transition cursor-pointer"
                      >
                        <UploadCloud size={14} />
                        <span>Upload Arrival Photos</span>
                      </button>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        ref={inboundInputRef}
                        onChange={handleInboundUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                {inboundImages.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No inbound arrival inspection photos recorded.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {inboundImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl border p-2 bg-white dark:bg-slate-800 shadow-xs">
                        <div className="text-[11px] truncate mb-1 text-slate-700 dark:text-slate-300">
                          {img.name}
                        </div>
                        {canDeleteDocuments && (
                          <button
                            type="button"
                            onClick={() => removeInboundImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Empty Return Photos */}
              <div className={`p-4 rounded-2xl border ${
                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/60 border-slate-200/80"
              } space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Empty Return Yard Proofs
                    </h3>
                  </div>
                  {canUploadDocuments && (
                    <>
                      <button
                        type="button"
                        onClick={() => emptyInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <UploadCloud size={14} />
                        <span>Upload Empty Proof</span>
                      </button>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        ref={emptyInputRef}
                        onChange={handleEmptyUpload}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                {emptyImages.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No empty return yard receipts attached.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {emptyImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl border p-2 bg-white dark:bg-slate-800 shadow-xs">
                        <div className="text-[11px] truncate mb-1 text-slate-700 dark:text-slate-300">
                          {img.name}
                        </div>
                        {canDeleteDocuments && (
                          <button
                            type="button"
                            onClick={() => removeEmptyImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OPERATIONS CONTEXT & PO LINKAGE */}
          {activeTab === "context" && isEditMode && canViewOperations && (
            <div className="space-y-4">
              <ContainerContextPanel
                containerId={formData.container_id}
                containerNo={formData.containerNo}
              />
            </div>
          )}
        </div>

        {/* ── Sticky Sider Footer ───────────────────────────────────────────── */}
        <div className={`shrink-0 flex items-center justify-between px-6 py-4 border-t ${
          isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50/80"
        }`}>
          <div>
            {isEditMode && canDeleteContainer && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Delete Container</span>
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{isEditMode ? "Save Changes" : "Create Container"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
