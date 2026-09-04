import { useRef, useEffect, useState } from "react";
import axios from "axios";
import TypableSelect from "../../UI/UXComponent/TypebleSelect.js";
import MaterialTagSelector from "../../UI/UXComponent/TagInput.js";
import GenericSelector from "../../UI/UXComponent/GenericSelector.js";
import { useOptions } from "../../../hooks/useOptions";
import { useTheme } from "../../../context/ThemeContext";
import { toast } from 'react-toastify';
import { Box, FileText, Image as ImageIcon, Plus, Trash2, X, Upload } from 'lucide-react';

// Helper for flexible / forwarder-tolerant container type resolution
const resolveContainerTypeId = (data, typeOptions) => {
  if (!data || !typeOptions || typeOptions.length === 0) return data?.type || "";

  // 1. Direct ID match (number or string representation)
  const rawId = data.type ?? data.type_id;
  if (rawId !== null && rawId !== undefined && rawId !== "") {
    const matched = typeOptions.find(t => String(t.id) === String(rawId));
    if (matched) return matched.id;
  }

  // 2. Build list of candidate strings from various forwarder formats
  const candidates = [
    data.containerType,
    data.type_name,
    data.type && typeof data.type === 'string' ? data.type : null,
    data.iso_code ? `ISO ${data.iso_code}` : null,
    data.weight && typeof data.weight === 'string' && !data.weight.endsWith('kg') ? data.weight : null,
    data.equipment_type,
    data.size_type
  ].filter(Boolean).map(s => String(s).trim());

  // Also infer from container number prefix if candidate list is empty
  const cNo = String(data.container_no || data.containerNo || "").toUpperCase();
  if (candidates.length === 0 && cNo) {
    if (cNo.startsWith("TC") || cNo.startsWith("CMAU") || cNo.startsWith("TEMU") || cNo.startsWith("TCNU")) {
      candidates.push("40 High Cube");
    } else if (cNo.startsWith("CA") || cNo.startsWith("MSKU") || cNo.startsWith("SEGU") || cNo.startsWith("CAAU")) {
      candidates.push("20 Dry");
    }
  }

  for (const str of candidates) {
    const lower = str.toLowerCase();

    // 2a. Exact match
    const exact = typeOptions.find(t => t.name && t.name.toLowerCase() === lower);
    if (exact) return exact.id;

    // 2b. Substring match
    const sub = typeOptions.find(t => t.name && (t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase())));
    if (sub) return sub.id;

    // 2c. Heuristic matching across forwarder variations
    const is40HC = (lower.includes("40") && (lower.includes("cube") || lower.includes("hc") || lower.includes("high") || lower.includes("hq"))) || lower.includes("45g1") || lower.includes("42u1");
    if (is40HC) {
      const match = typeOptions.find(t => {
        const n = (t.name || '').toLowerCase();
        return n.includes("40") && (n.includes("cube") || n.includes("hc") || n.includes("high"));
      });
      if (match) return match.id;
    }

    const is20Dry = (lower.includes("20") && (lower.includes("dry") || lower.includes("gp") || lower.includes("std") || lower.includes("standard") || lower.includes("freight"))) || lower.includes("22g1");
    if (is20Dry) {
      const match = typeOptions.find(t => {
        const n = (t.name || '').toLowerCase();
        return n.includes("20") && (n.includes("dry") || n.includes("gp") || n.includes("standard") || n.includes("freight"));
      });
      if (match) return match.id;
    }

    const is40Dry = (lower.includes("40") && (lower.includes("dry") || lower.includes("gp") || lower.includes("standard") || lower.includes("freight"))) || lower.includes("42g1");
    if (is40Dry) {
      const match = typeOptions.find(t => {
        const n = (t.name || '').toLowerCase();
        return n.includes("40") && (n.includes("dry") || n.includes("standard") || n.includes("gp"));
      });
      if (match) return match.id;
    }

    if (lower.includes("45")) {
      const match = typeOptions.find(t => (t.name || '').includes("45"));
      if (match) return match.id;
    }

    if (lower.includes("reefer") || lower.includes("refrig") || lower.includes("rf")) {
      const match = typeOptions.find(t => (t.name || '').toLowerCase().includes("reefer"));
      if (match) return match.id;
    }

    if (lower.includes("open top") || lower.includes("ot")) {
      const match = typeOptions.find(t => (t.name || '').toLowerCase().includes("open"));
      if (match) return match.id;
    }

    if (lower.includes("flat") || lower.includes("fr")) {
      const match = typeOptions.find(t => (t.name || '').toLowerCase().includes("flat"));
      if (match) return match.id;
    }
  }

  // Fallback: return raw type if it's already an ID/string, or default to first type
  return rawId || (typeOptions[0]?.id || "");
};

// Helper for status resolution
const resolveStatusId = (data, statusOptions) => {
  if (!data || !statusOptions || statusOptions.length === 0) return data?.status || "";

  const rawId = data.status;
  if (rawId !== null && rawId !== undefined && rawId !== "") {
    const matched = statusOptions.find(s => String(s.id) === String(rawId));
    if (matched) return matched.id;
  }

  const candidates = [
    data.state,
    data.status && typeof data.status === 'string' ? data.status : null,
    data.milestone,
    data.latest_milestone
  ].filter(Boolean).map(s => String(s).trim());

  for (const str of candidates) {
    const lower = str.toLowerCase();
    const exact = statusOptions.find(s => s.name && s.name.toLowerCase() === lower);
    if (exact) return exact.id;

    const sub = statusOptions.find(s => s.name && (s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())));
    if (sub) return sub.id;

    if (lower.includes("transit") || lower.includes("sailing") || lower.includes("depart")) {
      const match = statusOptions.find(s => (s.name || '').toLowerCase().includes("transit"));
      if (match) return match.id;
    }
    if (lower.includes("port") || lower.includes("discharg") || lower.includes("arriv") || lower.includes("berth")) {
      const match = statusOptions.find(s => (s.name || '').toLowerCase().includes("port") || (s.name || '').toLowerCase().includes("arriv"));
      if (match) return match.id;
    }
    if (lower.includes("deliver") || lower.includes("gate") || lower.includes("release")) {
      const match = statusOptions.find(s => (s.name || '').toLowerCase().includes("gate") || (s.name || '').toLowerCase().includes("deliver"));
      if (match) return match.id;
    }
    if (lower.includes("empty") || lower.includes("return") || lower.includes("complete")) {
      const match = statusOptions.find(s => (s.name || '').toLowerCase().includes("empty") || (s.name || '').toLowerCase().includes("complete"));
      if (match) return match.id;
    }
  }

  return rawId || (statusOptions[0]?.id || "");
};

// Helper for location resolution
const resolveLocationId = (data, emptyLocations) => {
  if (!data || !emptyLocations || emptyLocations.length === 0) return data?.emptied_at || "";

  const rawId = data.emptied_at;
  if (rawId !== null && rawId !== undefined && rawId !== "") {
    const matched = emptyLocations.find(l => String(l.id) === String(rawId));
    if (matched) return matched.id;
  }

  const candidates = [
    data.location,
    data.venue,
    data.empty_at_name
  ].filter(Boolean).map(s => String(s).trim());

  for (const str of candidates) {
    const lower = str.toLowerCase();
    const exact = emptyLocations.find(l => l.name && l.name.toLowerCase() === lower);
    if (exact) return exact.id;
    const sub = emptyLocations.find(l => l.name && (l.name.toLowerCase().includes(lower) || lower.includes(l.name.toLowerCase())));
    if (sub) return sub.id;
  }

  return rawId || "";
};

function ContainerEntryForm({
  editData,
  onSubmitSuccess,
  onCancel,
  userPermissions = [],
  handleDeleteFunction=null,
  mode = "edit" // "add" or "edit"
 }) {
    // console.log("Edit Data in ContainerEntryForm:", onSubmitSuccess);
    const { theme } = useTheme();
    const {
      suppliers,
      consignees,
      emptyLocations,
      status: statusOptions,
      type,
      shipping,
      vessal: vesselList,
      material: materialOptions,
      refresh,
      loading: optionsLoading,
    } = useOptions();

  const [formData, setFormData] = useState(() => {
    if (!editData) {
      return {
        container_id: null,
        consignee: null,
        PONo: "",
        supplier: null,
        shippingType: null,
        material: [],
        arrivalDate: null,
        arrivalTime: null,
        vessal: null,
        type: "",
        containerNo: "",
        container_no: "",
        in_bound: "",
        empty_date: "",
        out_bound: "",
        unloaded_at_port: "",
        emptied_at: "",
        note: "",
        tax: 0,
        status: "",
        provider: null,
        FreeDays: "",
      };
    }
    const resolvedType = resolveContainerTypeId(editData, type);
    const resolvedStatus = resolveStatusId(editData, statusOptions);
    const resolvedLocation = resolveLocationId(editData, emptyLocations);
    const rawMaterials = editData.materials || editData.material || [];
    const normalizedMaterials = Array.isArray(rawMaterials) 
      ? rawMaterials.map(item => typeof item === 'object' && item !== null ? (item.Id || item.id) : item)
      : [];

    return {
      container_id: editData.Container_ID || editData.container_id || null,
      container_no: editData.container_no || editData.containerNo || "",
      containerNo: editData.container_no || editData.containerNo || "",
      PONo: editData.PONo || "",
      note: editData.note || "",
      FreeDays: editData.FreeDays !== undefined && editData.FreeDays !== null ? String(editData.FreeDays) : (editData.freeDays ?? ""),
      type: resolvedType,
      material: normalizedMaterials,
      status: resolvedStatus,
      in_bound: editData.in_bound ? String(editData.in_bound).slice(0, 16) : "",
      empty_date: editData.empty_date ? String(editData.empty_date).slice(0, 10) : "",
      out_bound: editData.out_bound ? String(editData.out_bound).slice(0, 16) : "",
      unloaded_at_port: editData.unloaded_at_port ? String(editData.unloaded_at_port).slice(0, 10) : "",
      emptied_at: resolvedLocation,
      tax: editData.tax || 0,
      provider: editData.provider || null,
      consignee: editData.consignee || null,
      supplier: editData.supplier || null,
      shippingType: editData.shippingType || null,
      vessal: editData.VessalID || editData.vessal || null
    };
  });
  const [originalData, setOriginalData] = useState({});
  const [documents, setDocuments] = useState([]);
  const fileInputRef = useRef(null);
  const [removedDocIds, setRemovedDocIds] = useState([]);
  const [inboundImages, setInboundImages] = useState([]);
  const [emptyImages, setEmptyImages] = useState([]);

  const inboundInputRef = useRef(null);
  const emptyInputRef = useRef(null);
  const [selectedVessel, setSelectedVessel] = useState([]);

  useEffect(() => {
    if (editData) {
      const matchedVessel = vesselList?.find(
        (v) => v.id === editData.VessalID 
      );

      const resolvedType = resolveContainerTypeId(editData, type);
      const resolvedStatus = resolveStatusId(editData, statusOptions);
      const resolvedLocation = resolveLocationId(editData, emptyLocations);

      const rawMaterials = editData.materials || editData.material || [];
      const normalizedMaterials = Array.isArray(rawMaterials) 
        ? rawMaterials.map(item => typeof item === 'object' && item !== null ? (item.Id || item.id) : item)
        : [];

      setFormData({
        container_id: editData.Container_ID || editData.container_id || null,
        container_no: editData.container_no || editData.containerNo || "",
        containerNo: editData.container_no || editData.containerNo || "",
        PONo: editData.PONo || "",
        note: editData.note || "",
        FreeDays: editData.FreeDays !== undefined && editData.FreeDays !== null ? String(editData.FreeDays) : (editData.freeDays ?? ""),
        type: resolvedType,
        material: normalizedMaterials,
        status: resolvedStatus,
        in_bound: editData.in_bound ? String(editData.in_bound).slice(0, 16) : "",
        empty_date: editData.empty_date ? String(editData.empty_date).slice(0, 10) : "",
        out_bound: editData.out_bound ? String(editData.out_bound).slice(0, 16) : "",
        unloaded_at_port: editData.unloaded_at_port ? String(editData.unloaded_at_port).slice(0, 10) : "",
        emptied_at: resolvedLocation,
        tax: editData.tax || 0,
        provider: editData.provider || null,
        consignee: editData.consignee || null,
        supplier: editData.supplier || null,
        shippingType: editData.shippingType || null,
        vessal: matchedVessel?.id || editData.VessalID || editData.vessal || null
      });

      setOriginalData({
        ...editData,
        container_id: editData.Container_ID || editData.container_id,
        vessal: matchedVessel || ""
      });

      // Documents setup
      if (editData.documents) {
        const formattedDocs = editData.documents
          .filter((doc) => doc.Type === "D")
          .map((doc) => ({
            isExisting: true,
            file_path: doc.path,
            id: doc.docs_id,
            type: doc.Type
          }));
        setDocuments(formattedDocs);

        const inbound = editData.documents
          .filter((doc) => doc.Type === "AD")
          .map((img) => ({
            isExisting: true,
            file_path: img.path,
            id: img.docs_id
          }));
        setInboundImages(inbound);

        const empty = editData.documents
          .filter((doc) => doc.Type === "ED")
          .map((img) => ({
            isExisting: true,
            file_path: img.path,
            id: img.docs_id
          }));
        setEmptyImages(empty);
      }
    }

  }, [editData, vesselList, type, statusOptions, emptyLocations, materialOptions]);

  const handleInboundImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      const wrapped = files?.map(file => ({ file }));
      setInboundImages(prev => [...prev, ...wrapped]);
    }
  };

  const handleEmptyImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      const wrapped = files?.map(file => ({ file }));
      setEmptyImages(prev => [...prev, ...wrapped]);
    }
  };

  // const handleRemove = () => {
  //   if (onRemove && typeof index === 'number') {
  //     onRemove(index);
  //   }
  // };

  const hasViewPermission = (field) => {
    if (!userPermissions || userPermissions.length === 0) return true;
    if (
      userPermissions.includes("Administrator") ||
      userPermissions.includes("Admin") ||
      userPermissions.includes("Container") ||
      userPermissions.includes("Edit_Container") ||
      userPermissions.includes("SuperAdmin")
    ) {
      return true;
    }
    if (field === "Demurrage" || field === "FreeDays") return true;
    const basicFields = ["ContainerNo", "Status", "ContainerType", "ArrivalDate", "EmptyDate", "EmptyAt", "UnloadedAtDock", "InBound", "OutBound", "Material", "BL", "PoNo"];
    if (basicFields.includes(field)) return true;
    return userPermissions.includes(`View_${field}`);
  };

  const hasEditPermission = (field) => {
    if (!userPermissions || userPermissions.length === 0) return true;
    if (
      userPermissions.includes("Administrator") ||
      userPermissions.includes("Admin") ||
      userPermissions.includes("Container") ||
      userPermissions.includes("Edit_Container") ||
      userPermissions.includes("Edit_BillOfLanding") ||
      userPermissions.includes("SuperAdmin")
    ) {
      return true;
    }
    if (field === "Demurrage" || field === "FreeDays") return true;
    return userPermissions.includes(`Edit_${field}`);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const removeInboundImage = (index) => {
    setInboundImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeEmptyImage = (index) => {
    setEmptyImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleAddNewFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDocuments((prev) => [...prev, { file }]);
    e.target.value = "";
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeDocumentInput = (index) => {
    setDocuments((docs) => {
      const docToRemove = docs[index];
      if (docToRemove.isExisting && docToRemove.id) {
        setRemovedDocIds((prev) => [...prev, docToRemove.id]);
      }
      return docs.filter((_, i) => i !== index);
    });
    
  };

  const removeInboundImageInput = (index) => {
    setInboundImages((docs) => {
      const docToRemove = docs[index];
      if (docToRemove.isExisting && docToRemove.id) {
        setRemovedDocIds((prev) => [...prev, docToRemove.id]);
      }
      return docs.filter((_, i) => i !== index);
    });
    
  };

  const removeEmptyImageInput = (index) => {
    setEmptyImages((docs) => {
      const docToRemove = docs[index];
      if (docToRemove.isExisting && docToRemove.id) {
        setRemovedDocIds((prev) => [...prev, docToRemove.id]);
      }
      return docs.filter((_, i) => i !== index);
    });
    
  };

  // useEffect(() => {
  //   if (onFormDataChange) {
  //     onFormDataChange(formData);
  //   }
  // }, [formData, onFormDataChange]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const missingFields = fields.filter(f => f.required && hasViewPermission(f.permission) && (!formData[f.name] || String(formData[f.name]).trim() === ""));
    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map(f => f.label).join(", ");
      toast.error(`Missing input field: ${fieldLabels}`);
      return;
    }

    // console.log("Form submission triggered");
    // Check if any update is needed
    const hasChangedFields = Object.entries(formData).some(
      ([key, value]) => originalData && value !== originalData[key]
    );

    const hasNewDocuments = documents.some(doc => doc.file);
    const hasRemovedDocuments = removedDocIds.length > 0;
    const hasInboundImages = inboundImages.some(img => img.file);
    const hasEmptyImages = emptyImages.some(img => img.file);

    if (
      originalData?.container_id &&
      mode !== "add" &&
      !hasChangedFields &&
      !hasNewDocuments &&
      !hasRemovedDocuments &&
      !hasInboundImages &&
      !hasEmptyImages
    ) {
      toast.info("No update found");
      return;
    }

    const payload = new FormData();

    const safeAppend = (key, value) => {
      if (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        value !== "null"
      ) {
        payload.append(key, value);
      }
    };
    // ✅ Basic fields
    
    safeAppend("container_no", formData.container_no || null);
    safeAppend("in_bound", formData.in_bound || null);
    safeAppend("empty_date", formData.empty_date || null);
    safeAppend("out_bound", formData.out_bound || null);
    safeAppend("unloaded_at_port", formData.unloaded_at_port || null);
    safeAppend("note", formData.note || null);
    safeAppend("tax", formData.tax || null);
    safeAppend("PONo", formData.PONo || null);
    safeAppend("status", formData.status || null);
    safeAppend("type", formData.type || null);
    safeAppend("emptied_at", formData.emptied_at || null);
    safeAppend("FreeDays", formData.FreeDays !== "" ? formData.FreeDays : null);
    // console.log(formData.inBound, "ljh")
    // ✅ Bill of Lading
    safeAppend("bill_of_landing.BillOfLanding", formData.BillOfLanding || null);
    safeAppend("bill_of_landing.Vessel", formData.vessal || null);
    safeAppend("bill_of_landing.Provider", formData.provider || null);
    safeAppend("bill_of_landing.Consignee", formData.consignee || null);
    safeAppend("bill_of_landing.Supplier", formData.supplier || null);
    safeAppend("bill_of_landing.Doc", formData.shippingType || null);
    safeAppend("bill_of_landing.ArrivalDate", formData.arrival_on_port || null);

    formData.material?.forEach(mat => {
      payload.append("materials", mat)
    })
    // ✅ New Documents
    documents.forEach(doc => {
      if (doc.file) {
        payload.append("new_docs", doc.file); // File
      }
    });
    // console.log(inboundImages)

    // ✅ Inbound Images
    inboundImages.forEach(img => {
      if (img.file) {
        payload.append("inbound_images", img.file);
      }
    });

    // ✅ Empty Images
    emptyImages.forEach(img => {
      if (img.file) {
        payload.append("empty_images", img.file);
      }
    });

    // ✅ Removed Document IDs
    removedDocIds.forEach(id => {
      payload.append("remove_doc_ids", id);
    });
    
    // for (const [key, value] of payload.entries()) {
    //   console.log("Value", `${key}: ${value}`);
    // }

    // console.log(payload)
    // console.log("Val",payload)
    // console.log(mode)
    // const submissionData = {
    //   container_no: payload.get('container_no'),
    //   type: payload.get('type'),
    //   status: payload.get('status'),
    //   // Include all other fields...
    //   material: payload.getAll('material'),
    //   inboundImages: inboundImages.filter(img => img.file),
    //   emptyImages: emptyImages.filter(img => img.file),
    //   documents: documents.filter(doc => doc.file)
    // };
      // for (var pair of payload.entries()) {
      //     console.log(pair[0]+ ', ' + pair[1]); 
      // }
    onSubmitSuccess(payload)

  };
  
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
    
  //   // Prepare form data without submitting
  //   const formData = new FormData(e.target);
  //   const formJson = Object.fromEntries(formData.entries());
    
  //   // Clean and transform data as needed
  //   const cleanedData = {
  //     ...formJson,
  //     material: formData.getAll('material'), // For multi-select
  //     // Add other transformations
  //   };

  //   // Return data to parent component
  //   if (onSubmitSuccess) {
  //     onSubmitSuccess(cleanedData);
  //   }
  // };

  const fields = [
    // { label: "Bill Of Landing", name: "BillOfLanding", type: "text", permission: "BL", options: [] },
    { label: "Container No", name: "container_no", type: "text", permission: "ContainerNo", required: true },
    { label: "Container Type", name: "type", type: "addSelect", options: type, permission: "ContainerType", api: "container-types", refreshVal:"type"},
    // { label: "Arrival Date", name: "arrival_on_port", type: "datetime-local", permission: "ArrivalDate" },
    { label: "PO No", name: "PONo", type: "text", permission: "PoNo" },

    // { label: "Supplier", name: "supplier", type: "addSelect", options: suppliers, permission: "Supplier", refreshVal: "suppliers", api: "setSupplier"},
    // { label: "Consignee", name: "consignee", type: "addSelect", options: consignees, permission: "Consignee", api:"setConsignee", refreshVal:"consignees"},
    // { label: "Shipping Type", name: "shippingType", type: "addSelect", options: shipping, permission: "Shipping", api:"setShippingDocument", refreshVal:"shipping" },
    // { label: "Vessal", name: "vessal", type: "addSelect", permission: "Vessal", options: vesselList, api:"setVessal", refreshVal:"vessal" },
    // { label: "Tax", name: "tax", type: "checkbox", permission: "Tax" },
    { label: "Material", name: "material", type: "tagselect", permission: "Material", options: materialOptions},

    { label: "Status", name: "status", type: "select", options: statusOptions, permission: "Status", api: "", refreshVal:"" },
    { label: "In Bound", name: "in_bound", type: "datetime-local", permission: "InBound" },
    { label: "Empty Date", name: "empty_date", type: "date", permission: "EmptyDate" },
    { label: "Out Bound", name: "out_bound", type: "datetime-local", permission: "OutBound" },
    { label: "Unloaded at Port", name: "unloaded_at_port", type: "date", permission: "UnloadedAtDock" },
    { label: "Empty At", name: "emptied_at", type: "addSelect", options: emptyLocations, permission: "EmptyAt", api:"setUnloadVenue", refreshVal:"emptyLocations" },
    { label: "Free Days (Override)", name: "FreeDays", type: "number", permission: "Demurrage" },
  ];

  const renderFieldInput = ({ label, name, type, options, permission, api, refreshVal, required }) => (
    <div key={name} className={name === "material" ? "col-span-full" : "col-span-1"}>
      <label htmlFor={name} className={`block mb-1.5 text-xs font-semibold uppercase tracking-wider ${theme.text}`}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === "select" ? (
        <TypableSelect
          options={options}
          value={formData[name]}
          onChange={(val) => {
            if (hasEditPermission(permission)) {
              setFormData(prev => ({ ...prev, [name]: val }));
            }
          }}
          placeholder={`Select ${label}`}
          disabled={!hasEditPermission(permission) || options.length === 0}
        />
      ) : type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={formData[name] || ''}
          onChange={handleChange}
          rows={3}
          className={`w-full border rounded-xl px-3 py-2 resize-none text-sm font-medium ${theme.border} ${theme.surface || theme.background} ${theme.text} placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs`}
          disabled={!hasEditPermission(permission)}
        />
      ) : type === "checkbox" ? (
        <div className="flex items-center gap-2 pt-2">
          <input
            id={name}
            type="checkbox"
            name={name}
            checked={!!formData[name]}
            onChange={(e) => {
              if (hasEditPermission(permission)) {
                setFormData(prev => ({
                  ...prev,
                  [name]: e.target.checked ? 1 : 0
                }));
              }
            }}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            disabled={!hasEditPermission(permission)}
          />
          <span className="text-xs text-gray-500 font-medium">Enable</span>
        </div>
      ) : type === "addSelect" ? ( 
        <GenericSelector
          value={formData[name] || null}
          onChange={(val) =>
            setFormData((prev) => ({
              ...prev,
              [name]: val,
            }))
          }
          placeholder={label || ""}
          options={options}
          labelKey="name"
          valueKey="id"
          onAddNew={() => refresh(refreshVal)}
          addApi={api}
        />
      ) : type === "tagselect" ? (
        <MaterialTagSelector
          value={formData[name] || []}
          onChange={(val) => {
            if (hasEditPermission(permission)) {
              setFormData((prev) => ({ ...prev, [name]: val }));
            }
          }}
          options={options?.map((opt) => opt)}
          disabled={!hasEditPermission(permission)}
          onNewMaterialCreated={() => refresh("material")}
        />
      ) : (
        <input
          id={name}
          type={type}
          name={name}
          value={formData[name] || ''}
          onChange={handleChange}
          onFocus={(e) => {
            if (type === "date" && e.target.showPicker) e.target.showPicker();
          }}
          className={`w-full border rounded-xl px-3 py-2 text-sm font-medium ${theme.border} ${theme.surface || theme.background} ${theme.text} placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs`}
          disabled={!hasEditPermission(permission)}
        />
      )}
    </div>
  );

  const identificationFields = fields.filter(f => ['container_no', 'type', 'PONo'].includes(f.name) && hasViewPermission(f.permission));
  const milestoneFields = fields.filter(f => ['status', 'unloaded_at_port', 'in_bound', 'empty_date', 'emptied_at', 'out_bound'].includes(f.name) && hasViewPermission(f.permission));
  const cargoFields = fields.filter(f => ['material', 'FreeDays'].includes(f.name) && hasViewPermission(f.permission));

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-5 p-2 ${theme.background}`}>
      {/* Section 1: Identification */}
      <div className={`p-4 rounded-xl border ${theme.border} ${theme.surface || 'bg-white'} shadow-xs`}>
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-slate-800">
          <Box size={16} className="text-blue-600 dark:text-blue-400" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Container Identification</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {identificationFields.map(renderFieldInput)}
        </div>
      </div>

      {/* Section 2: Terminal Milestones */}
      {milestoneFields.length > 0 && (
        <div className={`p-4 rounded-xl border ${theme.border} ${theme.surface || 'bg-white'} shadow-xs`}>
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Terminal Milestones & Logistics Movement</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {milestoneFields.map(renderFieldInput)}
          </div>
        </div>
      )}

      {/* Section 3: Cargo & Rules */}
      {cargoFields.length > 0 && (
        <div className={`p-4 rounded-xl border ${theme.border} ${theme.surface || 'bg-white'} shadow-xs`}>
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-gray-100 dark:border-slate-800">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Cargo Specification & D&D Rules</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {cargoFields.map(renderFieldInput)}
          </div>
        </div>
      )}

      {/* Section 4: Personal Note */}
      {hasViewPermission("PersonalNote") && (
        <div className={`p-4 rounded-xl border ${theme.border} ${theme.surface || 'bg-white'} shadow-xs`}>
          <label htmlFor="note" className={`block mb-1.5 text-xs font-semibold uppercase tracking-wider ${theme.text}`}>Personal Note</label>
          <textarea
            id="note"
            name="note"
            value={formData.note || ''}
            onChange={handleChange}
            placeholder="Add operational notes or special handling instructions..."
            className={`w-full border rounded-xl px-3 py-2 text-sm font-medium ${theme.border} ${theme.surface || theme.background} ${theme.text} placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-xs`}
            rows={2}
            disabled={!hasEditPermission("PersonalNote")}
          />
        </div>
      )}

      {/* Section 5: Documents & Proof Attachments */}
      <div className={`p-4 rounded-xl border ${theme.border} ${theme.surface || 'bg-white'} shadow-xs flex flex-col gap-4`}>
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-slate-800">
          <FileText size={16} className="text-purple-600 dark:text-purple-400" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Documents & Photographic Proofs</h3>
        </div>

        {/* Documents */}
        {hasViewPermission("Document") && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>Official Documents</label>
              {hasEditPermission("Document") && (
                <button
                  type="button"
                  onClick={triggerFilePicker}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Plus size={14} /> Add Document
                </button>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,image/*"
              onChange={handleAddNewFile}
              className="hidden"
            />

            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {documents.map((doc, idx) => (
                  <div key={idx} className={`border rounded-xl p-3 relative flex items-center justify-between gap-2 ${theme.mutedBg || 'bg-gray-50 dark:bg-slate-800/60'} border-gray-200 dark:border-slate-700 shadow-xs`}>
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={16} className="text-blue-500 flex-shrink-0" />
                      <a
                        href={
                          doc.isExisting
                            ? `${process.env.REACT_APP_NETWORK}/getDocument/${doc.id}`
                            : URL.createObjectURL(doc.file)
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs font-semibold text-blue-600 hover:underline"
                        title="Click to view document"
                      >
                        {doc.isExisting ? doc.file_path.split(/[\\/]/).pop() : doc.file.name}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocumentInput(idx)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No documents attached.</p>
            )}
          </div>
        )}

        {/* Inbound Images */}
        {formData.in_bound && (
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>Inbound Proof Photos</label>
              <button
                type="button"
                onClick={() => inboundInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Inbound Image
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleInboundImageUpload}
              className="hidden"
              capture="environment"
              ref={inboundInputRef}
            />
            {inboundImages?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {inboundImages.map((doc, idx) => (
                  <div key={idx} className={`border rounded-xl p-3 relative flex items-center justify-between gap-2 ${theme.mutedBg || 'bg-gray-50 dark:bg-slate-800/60'} border-gray-200 dark:border-slate-700 shadow-xs`}>
                    <div className="flex items-center gap-2 truncate">
                      <ImageIcon size={16} className="text-emerald-500 flex-shrink-0" />
                      <a
                        href={doc.isExisting ? `${process.env.REACT_APP_NETWORK}/getDocument/${doc.id}` : URL.createObjectURL(doc.file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        {doc.isExisting ? doc.file_path.split(/[\\/]/).pop() : doc.file.name}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeInboundImageInput(idx)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty Images */}
        {formData.empty_date && (
          <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <label className={`text-xs font-semibold uppercase tracking-wider ${theme.text}`}>Empty Return Verification Photos</label>
              <button
                type="button"
                onClick={() => emptyInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Empty Image
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleEmptyImageUpload}
              className="hidden"
              capture="environment"
              ref={emptyInputRef}
            />
            {emptyImages?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {emptyImages.map((img, idx) => {
                  const fileName = img.isExisting ? img.file_path.split(/[\\/]/).pop() : img.file?.name;
                  const fileUrl = img.isExisting ? `${process.env.REACT_APP_NETWORK}/getEmptyImage/${img.id}` : URL.createObjectURL(img.file);
                  return (
                    <div key={idx} className={`border rounded-xl p-3 relative flex items-center justify-between gap-2 ${theme.mutedBg || 'bg-gray-50 dark:bg-slate-800/60'} border-gray-200 dark:border-slate-700 shadow-xs`}>
                      <div className="flex items-center gap-2 truncate">
                        <ImageIcon size={16} className="text-purple-500 flex-shrink-0" />
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="truncate text-xs font-semibold text-purple-600 hover:underline">
                          {fileName}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEmptyImageInput(idx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
        <div>
          {mode === "edit" && handleDeleteFunction && (
            <button
              type="button"
              onClick={() => handleDeleteFunction(editData?.Container_ID || editData?.container_id)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 rounded-xl transition-all border border-red-200 dark:border-red-900/60"
            >
              <Trash2 size={14} />
              Delete Container
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm hover:shadow transition-all"
          >
            {mode === "add" ? "Add to Container List" : "Update Container"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default ContainerEntryForm;
