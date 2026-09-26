import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Ship,
  Anchor,
  Search,
  Plus,
  Save,
  Trash2,
  X,
  AlertTriangle,
  Clock,
  Box,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Lock,
  Layers,
  Calendar,
  Building,
  FilterX,
  Pencil,
  FileText
} from 'lucide-react';

import ContainerEntryForm from './EditContainerInfo';
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useOptions } from "../../../hooks/useOptions";
import { convertToLocalDateTimeInput, formatDateTime12hr } from '../../../utils/DateFormater';
import { calculateDemurrage } from '../../../utils/DemurrageUtil';
import { toast } from 'react-toastify';

const SERVER_PAGE_SIZE = 50;

export default function BillOfLandingInfo() {
  const { theme, isDark } = useTheme();
  const { confirm } = useConfirm();
  const { permissions, isRoot } = useAuth();
  const navigate = useNavigate();

  const { Id } = useParams();
  const decodedId = Id ? decodeURIComponent(Id) : "new";

  const location = useLocation();
  const editData = location.state?.data;

  const {
    suppliers,
    consignees,
    vessal: vesselList,
    logistics,
    shipping,
    refresh,
    status: statusOptions = [],
    type: containerTypes = [],
    loading: optionsLoading,
  } = useOptions();

  // ── Permissions ────────────────────────────────────────────────────────────
  const canViewSupplier = useMemo(() => {
    return isRoot || (Array.isArray(permissions) && (
      permissions.includes("View_Supplier") ||
      permissions.includes("Supplier") ||
      permissions.includes("Edit_Supplier") ||
      permissions.includes("Add_Supplier")
    ));
  }, [permissions, isRoot]);

  const canDeleteBl = useMemo(() => {
    return isRoot || (Array.isArray(permissions) && (
      permissions.includes("Delete_BillOfLanding") ||
      permissions.includes("BillOfLanding") ||
      permissions.includes("Administrator")
    ));
  }, [permissions, isRoot]);

  // ── Form State ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    billOfLadingNumber: "",
    consignee: "",
    vesselName: "",
    arrivalDate: "",
    supplier: "",
    Provider: "",
    shippingType: null,
    tax: 0,
    freeDays: "",   // BoL-level FreeDays
    status: "",     // BoL-level default status
  });

  // ── Container & Manifest State ─────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [containerData, setContainerData] = useState([]);
  const [containersToAdd, setContainersToAdd] = useState([]);
  const [containersToEdit, setContainersToEdit] = useState({});
  const [totalItems, setTotalItems] = useState(0);

  // Filter & Search inside container grid
  const [containerSearch, setContainerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Operational Flags
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingCarrier, setIsSearchingCarrier] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBlModified, setIsBlModified] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [existingBlNotice, setExistingBlNotice] = useState(null);
  const [shipmentRoute, setShipmentRoute] = useState(null);
  const [loadedServerPages, setLoadedServerPages] = useState(new Set());

  // Modal Dialogs
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [pendingEditIndex, setPendingEditIndex] = useState(-1);

  // ── Free Days & Status Lock Detection ──────────────────────────────────────
  // Check if any containers have custom FreeDays that differ from BoL defaults
  const hasCustomFreeDays = useMemo(() => {
    if (!rows || rows.length === 0) return false;
    const bolFreeDays = formData.freeDays !== "" && formData.freeDays !== undefined && formData.freeDays !== null 
      ? Number(formData.freeDays) 
      : (editData?.FreeDays ?? null);
    if (bolFreeDays === null) return false;
    return rows.some(r => {
      const cFd = r.rawData?.FreeDays ?? r.FreeDays;
      return cFd !== null && cFd !== undefined && cFd !== "" && Number(cFd) !== Number(bolFreeDays);
    });
  }, [rows, formData.freeDays, editData]);

  // Helper to resolve human-readable milestone status text
  const resolveStatusName = useCallback((c) => {
    if (!c) return "In Transit";

    // 1. If explicit non-numeric text string is provided in state, status_name, milestone, or status:
    const textCandidates = [
      c.state,
      c.status_name,
      c.milestone,
      c.latest_milestone,
      c.status
    ];

    for (const cand of textCandidates) {
      if (cand !== null && cand !== undefined && cand !== "") {
        const str = String(cand).trim();
        // If it's not a pure number (like "1" or "2"), return it directly
        if (isNaN(Number(str))) {
          return str;
        }
      }
    }

    // 2. If status or status_id is numeric, lookup in statusOptions:
    const numId = (c.status !== null && c.status !== undefined && c.status !== "")
      ? c.status
      : (c.status_id ?? (c.state && !isNaN(Number(c.state)) ? c.state : null));

    if (numId !== null && numId !== undefined && statusOptions && statusOptions.length > 0) {
      const matched = statusOptions.find(s => String(s.id) === String(numId));
      if (matched?.name) return matched.name;
    }

    // 3. Fallback: if state is string
    if (c.state && typeof c.state === 'string' && isNaN(Number(c.state))) {
      return c.state;
    }

    return "In Transit";
  }, [statusOptions]);

  // Keep rows updated with human-readable status names once statusOptions loads
  useEffect(() => {
    if (!statusOptions || statusOptions.length === 0) return;
    setRows(prevRows => {
      let changed = false;
      const updated = prevRows.map(r => {
        const resolved = resolveStatusName(r.rawData || r);
        if (resolved && resolved !== r.status) {
          changed = true;
          return {
            ...r,
            status: resolved
          };
        }
        return r;
      });
      return changed ? updated : prevRows;
    });
  }, [statusOptions, resolveStatusName]);

  // Check if any containers have custom status that differ from BoL defaults
  const hasCustomStatus = useMemo(() => {
    if (!rows || rows.length === 0 || !statusOptions.length) return false;
    const bolStatusId = formData.status !== "" && formData.status !== undefined && formData.status !== null
      ? String(formData.status)
      : (editData?.status ? String(editData.status) : null);
    if (!bolStatusId) return false;
    const bolStatusName = statusOptions.find(opt => String(opt.id) === bolStatusId)?.name;
    if (!bolStatusName) return false;
    return rows.some(r => {
      const cState = resolveStatusName(r.rawData || r) || r.status;
      return cState && String(cState).toLowerCase() !== bolStatusName.toLowerCase();
    });
  }, [rows, formData.status, editData, statusOptions, resolveStatusName]);

  // Transform raw container objects to manifest row format
  const transformData = useCallback((apiData) => {
    if (!apiData) return [];
    
    return apiData.map(c => {
      const cNo = c.containerNo || c.container_no || "";
      const rawStatus = resolveStatusName(c);
      const rawLoc = c.location || (c.destination_port ? `Port ${c.destination_port}` : "Port Victoria");
      const typeStr = c.type_name || (c.iso_code ? `ISO ${c.iso_code}` : (cNo.startsWith("TC") ? "40 High Cube" : "20 Dry"));
      const effectiveFreeDays = c.FreeDays !== null && c.FreeDays !== undefined && c.FreeDays !== ""
        ? c.FreeDays
        : (c.freeDays ?? c.bill_of_landing?.FreeDays ?? formData.freeDays ?? editData?.FreeDays ?? 10);

      const arrivalForDemurrage = editData?.ArrivalDate || formData.arrivalDate;
      const demurrageText = arrivalForDemurrage && rawStatus !== "In Transit" ? calculateDemurrage({
        ExcludeDayBitmask: editData?.ExcludingDay,
        ArrivalDate: arrivalForDemurrage,
        FreeDay: effectiveFreeDays
      }) : `${effectiveFreeDays} Free Days`;

      return {
        container_no: cNo,
        status: rawStatus,
        location: rawLoc,
        weight: c.weight ? `${c.weight} kg` : typeStr,
        demurrage: demurrageText,
        isDiscovered: Boolean(c.isDiscovered || c.provider || c.created || c.eventDateTime),
        rawData: {
          ...c,
          FreeDays: effectiveFreeDays,
          state: rawStatus
        }
      };
    });
  }, [editData, formData.arrivalDate, formData.freeDays, resolveStatusName]);

  // Auto-populate BoL fields when carrier discovery data arrives
  function setFormDataOfBl(data) {
    setFormData(prev => {
      // 1. Auto-select Consignee:
      let matchedConsignee = prev.consignee;
      if (data.consignee_id) {
        matchedConsignee = data.consignee_id;
      } else if (data.consignee_name) {
        const found = consignees?.find(c =>
          c.name && data.consignee_name &&
          (c.name.toLowerCase().includes(data.consignee_name.toLowerCase()) ||
           data.consignee_name.toLowerCase().includes(c.name.toLowerCase()))
        );
        if (found) matchedConsignee = found.id;
      }
      if (!matchedConsignee && consignees && consignees.length > 0) {
        const primary = consignees.find(c => c.name?.toUpperCase().includes("SAHAJANAND")) || consignees[0];
        matchedConsignee = primary.id;
      }

      // 2. Auto-select Logistics Provider:
      let matchedProvider = prev.Provider;
      if (data.provider_id) {
        matchedProvider = data.provider_id;
      } else if (data.provider) {
        const foundProv = logistics?.find(
          (opt) => opt.name && opt.name.toLowerCase().includes(data.provider.toLowerCase())
        );
        if (foundProv) matchedProvider = foundProv.id;
      }

      // 3. Auto-select Vessel:
      let matchedVessel = prev.vesselName;
      if (data.vessel_id) {
        matchedVessel = data.vessel_id;
      } else if (data.vesselName) {
        const foundVessel = vesselList?.find(
          (v) => v.name && (v.name.toLowerCase().trim() === data.vesselName.toLowerCase().trim() ||
                            v.name.toLowerCase().includes(data.vesselName.toLowerCase().trim()) ||
                            data.vesselName.toLowerCase().includes(v.name.toLowerCase().trim()))
        );
        if (foundVessel) matchedVessel = foundVessel.id;
      }

      // 4. Auto-select Supplier (if permitted):
      let matchedSupplier = prev.supplier;
      if (canViewSupplier) {
        if (data.supplier_id || data.Supplier) {
          matchedSupplier = data.supplier_id || data.Supplier;
        } else if (data.supplier_name || data.supplier) {
          const suppQuery = String(data.supplier_name || data.supplier).trim().toLowerCase();
          const foundSupp = suppliers?.find(s =>
            s.name && (
              s.name.toLowerCase() === suppQuery ||
              s.name.toLowerCase().includes(suppQuery) ||
              suppQuery.includes(s.name.toLowerCase())
            )
          );
          if (foundSupp) matchedSupplier = foundSupp.id;
        }
        if (!matchedSupplier && suppliers && suppliers.length > 0) {
          const defaultSupp = suppliers.find(s => 
            s.name?.toUpperCase().includes("DEFAULT") || 
            s.name?.toUpperCase().includes("PRIMARY") ||
            s.is_default
          ) || suppliers[0];
          if (defaultSupp) matchedSupplier = defaultSupp.id;
        }
      }

      // 5. Auto-populate Arrival Date:
      const formattedArrival = data.eventDateTime ? convertToLocalDateTimeInput(data.eventDateTime) : prev.arrivalDate;

      // 6. Auto-populate Free Days:
      let detectedFreeDays = data.FreeDays ?? data.free_days ?? data.freeDays ?? data.dnd_report?.free_days;
      if (detectedFreeDays === undefined || detectedFreeDays === null || detectedFreeDays === "") {
        if (matchedProvider) {
          const foundProv = logistics?.find(l => String(l.id) === String(matchedProvider));
          if (foundProv && foundProv.freeDays !== undefined && foundProv.freeDays !== null) {
            detectedFreeDays = foundProv.freeDays;
          }
        }
      }
      if (detectedFreeDays === undefined || detectedFreeDays === null || detectedFreeDays === "") {
        detectedFreeDays = 10;
      }

      return {
        ...prev,
        consignee: matchedConsignee || prev.consignee,
        supplier: matchedSupplier || prev.supplier,
        Provider: matchedProvider || prev.Provider,
        vesselName: matchedVessel || prev.vesselName,
        arrivalDate: formattedArrival,
        freeDays: (prev.freeDays !== undefined && prev.freeDays !== null && prev.freeDays !== "") ? prev.freeDays : String(detectedFreeDays),
      };
    });

    if (data.vessel_id && refresh && !vesselList?.some(v => v.id === data.vessel_id)) {
      refresh("vessal");
    }
  }

  // ── Fetch & Search Containers ──────────────────────────────────────────────
  const fetchContainerData = useCallback(async (blNumber, offset = 0, limit = SERVER_PAGE_SIZE) => {
    const pageNum = Math.floor(offset / limit) + 1;
    if (loadedServerPages.has(pageNum)) return;
    
    const cleanBl = String(blNumber || "").trim();
    if (!cleanBl) return;

    setIsLoading(true);
    setIsSearchingCarrier(true);
    setErrorMessage(null);
    setExistingBlNotice(null);

    try {
      // STEP 1: Check if B/L already exists in database
      const checkRes = await axios.get(`${process.env.REACT_APP_NETWORK}/bills-of-lading`, {
        params: { BillOfLanding: cleanBl },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          "skip_zrok_interstitial": "true"
        }
      });

      const existingBl = checkRes.data?.data?.find(
        b => b.BillOfLanding && b.BillOfLanding.trim().toLowerCase() === cleanBl.toLowerCase()
      );

      if (existingBl) {
        // Load existing database record
        const rawConsignee = existingBl.Consignee || existingBl.consignee || existingBl.consignee_id;
        let matchedConsignee = rawConsignee && consignees?.some(c => String(c.id) === String(rawConsignee))
          ? rawConsignee
          : (consignees?.find(opt => opt.name && existingBl.consignee_name && (opt.name.toLowerCase() === existingBl.consignee_name.toLowerCase() || opt.name.toLowerCase().includes(existingBl.consignee_name.toLowerCase())))?.id || rawConsignee || "");

        const rawSupplier = existingBl.Supplier || existingBl.supplier || existingBl.supplier_id;
        let matchedSupplier = (canViewSupplier && rawSupplier && suppliers?.some(s => String(s.id) === String(rawSupplier)))
          ? rawSupplier
          : (canViewSupplier ? suppliers?.find(opt => opt.name && existingBl.supplier_name && (opt.name.toLowerCase() === existingBl.supplier_name.toLowerCase() || opt.name.toLowerCase().includes(existingBl.supplier_name.toLowerCase())))?.id || rawSupplier || "" : "");

        const rawProvider = existingBl.Provider || existingBl.provider_id || existingBl.provider;
        const matchedProvider = rawProvider && logistics?.some(l => String(l.id) === String(rawProvider))
          ? rawProvider
          : (logistics?.find(opt => opt.name && existingBl.provider_name && opt.name.toLowerCase().includes(String(existingBl.provider_name).toLowerCase()))?.id || rawProvider || "");

        const rawVessel = existingBl.Vessel || existingBl.vesselName || existingBl.vessel_id;
        const matchedVessel = rawVessel && vesselList?.some(v => String(v.id) === String(rawVessel))
          ? rawVessel
          : (vesselList?.find(opt => opt.name && existingBl.vessel_name && opt.name.toLowerCase().includes(String(existingBl.vessel_name).toLowerCase()))?.id || rawVessel || "");

        const rawDoc = existingBl.Doc || existingBl.shippingType || existingBl.doc_id;
        const matchedDoc = rawDoc && shipping?.some(s => String(s.id) === String(rawDoc))
          ? rawDoc
          : (shipping?.find(opt => opt.name && existingBl.Doc_name && (opt.name.toLowerCase() === existingBl.Doc_name.toLowerCase() || opt.name.toLowerCase().includes(existingBl.Doc_name.toLowerCase())))?.id || rawDoc || "");

        setFormData(prev => ({
          ...prev,
          billOfLadingNumber: existingBl.BillOfLanding || cleanBl,
          consignee: matchedConsignee,
          supplier: matchedSupplier,
          arrivalDate: (existingBl.ArrivalDate || existingBl.arrivalDate) ? String(existingBl.ArrivalDate || existingBl.arrivalDate).slice(0, 16) : "",
          Provider: matchedProvider,
          vesselName: matchedVessel,
          tax: existingBl.tax || 0,
          shippingType: matchedDoc,
          freeDays: existingBl.FreeDays !== undefined && existingBl.FreeDays !== null ? String(existingBl.FreeDays) : (existingBl.freeDays ?? "10"),
          status: existingBl.status !== undefined && existingBl.status !== null ? String(existingBl.status) : (existingBl.status_id ?? ""),
        }));

        const existingContainers = existingBl.containers || [];
        const transformed = transformData(existingContainers);
        setRows(transformed);
        setContainerData(transformed);
        setTotalItems(transformed.length);
        setContainersToAdd([]);
        setIsBlModified(false);
        setLoadedServerPages(prev => new Set(prev).add(pageNum));

        if (existingBl.origin_port || existingBl.destination_port || existingBl.vessel_name || existingBl.provider_name) {
          setShipmentRoute({
            origin: existingBl.origin_port ? `Port (${existingBl.origin_port})` : "Port of Loading",
            destination: existingBl.destination_port ? `Port Victoria (${existingBl.destination_port})` : "Port Victoria (Seychelles)",
            transshipment: existingBl.transshipment_ports || [],
            vessel: existingBl.vessel_name || "Vessel",
            provider: existingBl.provider_name || existingBl.carrier_name || "Carrier",
            eta: existingBl.ArrivalDate,
            totalContainers: existingContainers.length
          });
        }

        const msg = `Bill of Lading "${existingBl.BillOfLanding}" loaded with ${existingContainers.length} container(s).`;
        setExistingBlNotice(msg);
        toast.info(msg);
        return;
      }

      // STEP 2: Not in DB -> Track & Trace Carrier Search
      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/track_and_trace`, 
        {
          params: { bl: cleanBl },
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "skip_zrok_interstitial": "true", 
          },
        }
      );

      let data = response.data;
      if (!data || data.length === 0) {
        setErrorMessage("No containers found for this B/L number with carrier.");
      } else {
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            console.error("Failed to parse response data:", e);
            data = [];
          }
        }
        setFormData(prev => ({
          ...prev,
          billOfLadingNumber: cleanBl,
        }));
        const transformedData = transformData(data);

        if (data.length > 0) {
          const firstItem = data[0];
          setShipmentRoute({
            origin: firstItem.origin_port ? `Shekou (${firstItem.origin_port})` : "Port of Loading",
            destination: firstItem.destination_port ? `Port Victoria (${firstItem.destination_port})` : "Port Victoria (Seychelles)",
            transshipment: firstItem.transshipment_ports || ["Singapore (SGSIN)"],
            vessel: firstItem.vesselName || "Carrier Vessel",
            provider: firstItem.provider || "Maritime Carrier",
            eta: firstItem.eventDateTime,
            totalContainers: data.length
          });
          setFormDataOfBl(firstItem);
        }
    
        setTotalItems(data.length || 0);
        setLoadedServerPages(prev => new Set(prev).add(pageNum));

        setContainersToAdd([]);
        const containerIds = [];
        transformedData.forEach(item => {
          const newContainer = new FormData();
          newContainer.append("bill_of_landing.BillOfLanding", cleanBl || null);
          newContainer.append("container_no", item.container_no || null);
          if (item.rawData?.type_id) {
            newContainer.append("type", item.rawData.type_id);
          }
          if (item.rawData?.type_name) {
            newContainer.append("type_name", item.rawData.type_name);
          }
          containerIds.push(newContainer);
        });
        setContainersToAdd(containerIds);
        setRows(transformedData);
        setContainerData(transformedData);
        setIsBlModified(true);
        toast.success(`Discovered ${data.length} container(s)! Manifest auto-populated.`);
      }
    } catch (error) {
      console.error("Failed to fetch containers:", error);
      setErrorMessage("Failed to fetch containers. Please verify the B/L number.");
    } finally {
      setIsLoading(false);
      setIsSearchingCarrier(false);
    }
  }, [loadedServerPages, transformData, consignees, suppliers, logistics, vesselList, shipping, refresh, canViewSupplier]);

  // Initial load
  useEffect(() => {
    const targetBlId = location.state?.billOfLandingId || location.state?.data?.BillOfLanding || (decodedId && decodedId !== "new" && decodedId !== "undefined" ? decodedId : null);
    const sourceData = editData || location.state?.data;

    if (sourceData) {
      const rawConsignee = sourceData.consignee || sourceData.consignee_id || sourceData.Consignee;
      const matchedConsignee = rawConsignee && consignees?.some(c => String(c.id) === String(rawConsignee))
        ? rawConsignee
        : (consignees?.find(opt => opt.name && sourceData.consignee_name && (opt.name.toLowerCase() === sourceData.consignee_name.toLowerCase() || opt.name.toLowerCase().includes(sourceData.consignee_name.toLowerCase())))?.id || rawConsignee || "");

      const rawSupplier = sourceData.supplier || sourceData.supplier_id || sourceData.Supplier;
      const matchedSupplier = (canViewSupplier && rawSupplier && suppliers?.some(s => String(s.id) === String(rawSupplier)))
        ? rawSupplier
        : (canViewSupplier ? suppliers?.find(opt => opt.name && sourceData.supplier_name && (opt.name.toLowerCase() === sourceData.supplier_name.toLowerCase() || opt.name.toLowerCase().includes(sourceData.supplier_name.toLowerCase())))?.id || rawSupplier || "" : "");

      const rawProvider = sourceData.Provider || sourceData.provider_id || sourceData.provider;
      const matchedProvider = rawProvider && logistics?.some(l => String(l.id) === String(rawProvider))
        ? rawProvider
        : (logistics?.find(opt => opt.name && (sourceData.provider_name || sourceData.provider) && opt.name.toLowerCase().includes(String(sourceData.provider_name || sourceData.provider).toLowerCase()))?.id || rawProvider || "");

      const rawVessel = sourceData.vesselName || sourceData.Vessel || sourceData.vessel_id;
      const matchedVessel = rawVessel && vesselList?.some(v => String(v.id) === String(rawVessel))
        ? rawVessel
        : (vesselList?.find(opt => opt.name && (sourceData.vessel_name || sourceData.vesselName) && opt.name.toLowerCase().includes(String(sourceData.vessel_name || sourceData.vesselName).toLowerCase()))?.id || rawVessel || "");

      const rawDoc = sourceData.shippingType || sourceData.Doc || sourceData.doc_id;
      const matchedDoc = rawDoc && shipping?.some(s => String(s.id) === String(rawDoc))
        ? rawDoc
        : (shipping?.find(opt => opt.name && sourceData.Doc_name && (opt.name.toLowerCase() === sourceData.Doc_name.toLowerCase() || opt.name.toLowerCase().includes(sourceData.Doc_name.toLowerCase())))?.id || rawDoc || "");

      setFormData(prev => ({
        ...prev,
        billOfLadingNumber: sourceData.BillOfLanding || targetBlId || prev.billOfLadingNumber,
        consignee: matchedConsignee,
        supplier: matchedSupplier,
        arrivalDate: (sourceData.ArrivalDate || sourceData.arrivalDate) ? String(sourceData.ArrivalDate || sourceData.arrivalDate).slice(0, 16) : prev.arrivalDate,
        Provider: matchedProvider,
        vesselName: matchedVessel,
        tax: sourceData.tax || 0,
        shippingType: matchedDoc,
        freeDays: sourceData.FreeDays !== undefined && sourceData.FreeDays !== null ? String(sourceData.FreeDays) : (sourceData.freeDays ?? prev.freeDays ?? ""),
        status: sourceData.status !== undefined && sourceData.status !== null ? String(sourceData.status) : (sourceData.status_id ?? prev.status ?? ""),
      }));
      
      if (sourceData.containers && sourceData.containers.length > 0) {
        const transformed = transformData(sourceData.containers);
        setRows(transformed);
        setContainerData(transformed);
        setTotalItems(transformed.length);
      } else if (targetBlId && (!rows || rows.length === 0)) {
        fetchContainerData(targetBlId);
      }
    } else if (targetBlId) {
      fetchContainerData(targetBlId);
    }
  }, [editData, location.state, decodedId, consignees, suppliers, logistics, vesselList, shipping, transformData, fetchContainerData, canViewSupplier]);

  // Form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'billOfLadingNumber' && existingBlNotice) {
      setExistingBlNotice(null);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setIsBlModified(true);

    if (name === 'freeDays') {
      const num = value !== "" ? Number(value) : 10;
      setRows(prevRows => prevRows.map(r => {
        const hasCustom = r.rawData?.FreeDays !== undefined && r.rawData?.FreeDays !== null && r.rawData?.FreeDays !== "";
        if (hasCustom) return r;
        return {
          ...r,
          demurrage: `${num} Free Days`
        };
      }));
      setContainerData(prevData => prevData.map(r => {
        const hasCustom = r.rawData?.FreeDays !== undefined && r.rawData?.FreeDays !== null && r.rawData?.FreeDays !== "";
        if (hasCustom) return r;
        return {
          ...r,
          demurrage: `${num} Free Days`
        };
      }));
    }
  };

  // ── Container Manifest Actions ─────────────────────────────────────────────
  const handleAddContainer = useCallback((data) => {
    setContainersToAdd(prev => [...prev, data]);
    setIsAddMode(false);
    setIsBlModified(true);

    const cNo = data instanceof FormData ? data.get("container_no") : data.container_no;
    const statusVal = data instanceof FormData ? data.get("status") : data.status;
    const typeVal = data instanceof FormData ? data.get("type") : data.type;
    const freeDaysVal = (data instanceof FormData ? data.get("FreeDays") : data.FreeDays) || formData.freeDays || 10;
    const statusName = statusOptions.find(s => String(s.id) === String(statusVal))?.name || "In Transit";
    const typeName = containerTypes.find(t => String(t.id) === String(typeVal))?.name || containerTypes.find(t => String(t.id) === String(typeVal))?.type || "Standard Container";

    const newRow = {
      container_no: cNo || "New Container",
      status: statusName,
      location: "Seychelles Terminal",
      weight: typeName,
      demurrage: `${freeDaysVal} Free Days`,
      isPending: true,
      rawData: {
        ...(data instanceof FormData ? Object.fromEntries(data.entries()) : data),
        FreeDays: freeDaysVal
      }
    };

    setRows(prev => [...prev, newRow]);
    setContainerData(prev => [...prev, newRow]);
    setTotalItems(prev => prev + 1);
    toast.success(`Container ${cNo || ''} added to manifest.`);
  }, [statusOptions, containerTypes, formData.freeDays]);

  const handleEdit = useCallback((row) => {  
    const cNo = row.container_no || row.rawData?.container_no || row.rawData?.containerNo;
    const pendingIdx = containersToAdd.findIndex(item => {
      const itemNo = item instanceof FormData ? item.get("container_no") : item.container_no;
      return itemNo === cNo;
    });

    let baseData = { ...(row.rawData || {}), ...row };
    baseData.container_no = cNo;
    baseData.containerNo = cNo;
    if (!baseData.FreeDays && (formData.freeDays || editData?.FreeDays)) {
      baseData.FreeDays = formData.freeDays || editData?.FreeDays;
    }

    if (pendingIdx !== -1) {
      const formDataObj = containersToAdd[pendingIdx];
      let dataObj = formDataObj instanceof FormData ? Object.fromEntries(formDataObj.entries()) : { ...formDataObj };
      if (formDataObj instanceof FormData) {
        dataObj.materials = formDataObj.getAll("materials");
      }
      const merged = { ...baseData, ...dataObj, container_no: cNo, containerNo: cNo };
      setEditingContainer(merged);
      setPendingEditIndex(pendingIdx);
      setIsEditFormOpen(true);
    } else {
      setEditingContainer(baseData);
      setPendingEditIndex(-1);
      setIsEditFormOpen(true);
    }
  }, [containersToAdd, formData.freeDays, editData]);

  const handleDeleteRow = useCallback(async (row) => {
    const cNo = row.container_no;
    const isConfirmed = await confirm(`Are you sure you want to remove container ${cNo} from this manifest?`);
    if (!isConfirmed) return;

    // 1. If in containersToAdd, remove it
    const pendingIdx = containersToAdd.findIndex(item => {
      const itemNo = item instanceof FormData ? item.get("container_no") : item.container_no;
      return itemNo === cNo;
    });

    if (pendingIdx !== -1) {
      setContainersToAdd(prev => prev.filter((_, i) => i !== pendingIdx));
    }

    // 2. If it's a persisted container in database, call delete API
    const cId = row.rawData?.Container_ID || row.rawData?.container_id;
    if (cId && pendingIdx === -1) {
      try {
        await axios.delete(
          `${process.env.REACT_APP_NETWORK}/containers/${cId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              "skip_zrok_interstitial": "true"
            },
          }
        );
      } catch (error) {
        console.error("Failed to delete container from database:", error);
      }
    }

    // 3. Remove from UI table state
    setRows(prev => prev.filter(item => item.container_no !== cNo));
    setContainerData(prev => prev.filter(item => item.container_no !== cNo));
    setTotalItems(prev => Math.max(0, prev - 1));
    setIsBlModified(true);
    toast.info(`Container ${cNo} removed.`);
  }, [containersToAdd, confirm]);

  const handleContainerSubmitSuccess = (data) => {
    const updatedCNo = data instanceof FormData ? data.get("container_no") : data.container_no;
    const updatedStatusVal = data instanceof FormData ? data.get("status") : data.status;
    const updatedTypeVal = data instanceof FormData ? data.get("type") : data.type;
    const statusName = statusOptions.find(s => String(s.id) === String(updatedStatusVal))?.name || "In Transit";
    const typeName = containerTypes.find(t => String(t.id) === String(updatedTypeVal))?.name || containerTypes.find(t => String(t.id) === String(updatedTypeVal))?.type || "";

    if (pendingEditIndex !== -1) {
      setContainersToAdd(prev => {
        const newArr = [...prev];
        newArr[pendingEditIndex] = data;
        return newArr;
      });
      setPendingEditIndex(-1);
    } else if (editingContainer?.Container_ID) {
      setContainersToEdit(prev => ({
        ...prev,
        [editingContainer.Container_ID]: data
      }));
    }

    const updatedFreeDays = data instanceof FormData ? data.get("FreeDays") : data.FreeDays;
    const freeDaysVal = updatedFreeDays !== null && updatedFreeDays !== undefined && updatedFreeDays !== ""
      ? updatedFreeDays
      : (formData.freeDays || editData?.FreeDays || 10);
    const demurrageStr = `${freeDaysVal} Free Days`;

    const currentCNo = editingContainer?.container_no || editingContainer?.containerNo;
    setRows(prevRows => prevRows.map(r => {
      if (r.container_no === currentCNo || r.container_no === updatedCNo) {
        return {
          ...r,
          container_no: updatedCNo || r.container_no,
          status: statusName || r.status,
          weight: typeName || r.weight,
          demurrage: demurrageStr,
          rawData: {
            ...r.rawData,
            ...(data instanceof FormData ? Object.fromEntries(data.entries()) : data),
            container_no: updatedCNo || r.container_no,
            containerNo: updatedCNo || r.container_no,
            status: statusName || r.rawData?.status,
            state: statusName || r.rawData?.state,
            type_name: typeName || r.rawData?.type_name,
            FreeDays: freeDaysVal
          }
        };
      }
      return r;
    }));

    setContainerData(prevData => prevData.map(r => {
      if (r.container_no === currentCNo || r.container_no === updatedCNo) {
        return {
          ...r,
          container_no: updatedCNo || r.container_no,
          status: statusName || r.status,
          weight: typeName || r.weight,
          demurrage: demurrageStr,
        };
      }
      return r;
    }));

    setIsBlModified(true);
    setIsEditFormOpen(false);
    setEditingContainer(null);
    setPendingEditIndex(-1);
    toast.success(`Container ${updatedCNo || ''} updated.`);
  };

  // ── Save All Master Changes ────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (!formData.billOfLadingNumber || String(formData.billOfLadingNumber).trim() === "") {
      toast.error("Bill of Lading Number is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isBlModified) {
        const payload = {
          BillOfLanding: formData.billOfLadingNumber,
          Consignee: formData.consignee || null,
          Vessel: formData.vesselName || null,
          ArrivalDate: formData.arrivalDate || null,
          Doc: formData.shippingType || null,
          Supplier: canViewSupplier ? (formData.supplier || null) : undefined,
          Provider: formData.Provider || null,
          FreeDays: formData.freeDays !== "" ? Number(formData.freeDays) : null,
          status: formData.status !== "" ? Number(formData.status) : null,
          new_containers: containerData?.map(item => ({ container_no: item.container_no }))
        };
        const url = decodedId !== "new" && decodedId !== "undefined"
          ? `${process.env.REACT_APP_NETWORK}/bills-of-lading/${decodedId}`
          : `${process.env.REACT_APP_NETWORK}/bills-of-lading`;

        await axios({
          method: (decodedId !== "new" && decodedId !== "undefined") ? 'patch' : 'post',
          url: url,
          data: payload,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "skip_zrok_interstitial": "true",
          },
        });
      }

      if (containersToAdd.length > 0) {
        const newContainerPromises = containersToAdd.map(async (container) => {
          container.append("bill_of_landing.BillOfLanding", formData.billOfLadingNumber || null);
          return axios.post(
            `${process.env.REACT_APP_NETWORK}/containers`,
            container,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'multipart/form-data',
                "skip_zrok_interstitial": "true",
              },
            }
          );
        });
        await Promise.all(newContainerPromises);
      }

      if (Object.keys(containersToEdit).length > 0) {
        const editPromises = Object.entries(containersToEdit).map(async ([id, container]) => {
          return axios.patch(
            `${process.env.REACT_APP_NETWORK}/containers/${id}/status`,
            container,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'multipart/form-data',
                "skip_zrok_interstitial": "true",
              },
            }
          );
        });
        await Promise.all(editPromises);
      }

      setContainersToAdd([]);
      setContainersToEdit({});
      setIsBlModified(false);
      
      toast.success("All manifest changes saved successfully!");
      navigate("/BillOfLanding");
    } catch (error) {
      console.error("Save failed:", error);
      if (error.response?.status === 409) {
        setErrorMessage(
          `Conflict: ${error.response.data?.detail || "Cannot update Bill of Lading value."}` +
          " Some containers have custom values. Update them individually first, or reset all containers to the BoL value."
        );
      } else {
        setErrorMessage(error.response?.data?.detail || error.response?.data?.message || "Failed to save changes. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBl = async () => {
    const isConfirmed = await confirm(`Permanently delete Bill of Lading "${formData.billOfLadingNumber || decodedId}"? All container linkages will be affected.`);
    if (!isConfirmed) return;
    
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/bills-of-lading/${decodedId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "skip_zrok_interstitial": "true",
          },
        }
      );
      toast.success("Bill of Lading deleted successfully.");
      navigate("/BillOfLanding");
    } catch (error) {
      console.error("Delete error:", error);
      setErrorMessage(error.response?.data?.detail || "Failed to delete bill of lading.");
    }
  };

  // ── Filtered Rows inside Container Manifest Table ──────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const q = containerSearch.trim().toLowerCase();
      const matchesSearch = !q || (
        (r.container_no && r.container_no.toLowerCase().includes(q)) ||
        (r.weight && r.weight.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q))
      );

      const rStatus = resolveStatusName(r.rawData || r) || r.status || "";
      const matchesStatus = statusFilter === "ALL" || (
        rStatus.toLowerCase().includes(statusFilter.toLowerCase())
      );

      return matchesSearch && matchesStatus;
    });
  }, [rows, containerSearch, statusFilter, resolveStatusName]);

  const hasUnsavedChanges = isBlModified || containersToAdd.length > 0 || Object.keys(containersToEdit).length > 0;

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full flex-1 min-h-0 overflow-hidden space-y-3">
      {/* ── Top App Workspace Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/BillOfLanding")}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            title="Back to B/L Register"
            type="button"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Logistics & Customs Workspace
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 font-mono font-semibold">
                {decodedId !== "new" && decodedId !== "undefined" ? `B/L #${formData.billOfLadingNumber || decodedId}` : "New Ocean B/L"}
              </span>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Unsaved Changes
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formData.billOfLadingNumber ? `Manifest ${formData.billOfLadingNumber}` : "Bill of Lading Manifest"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {decodedId !== "new" && decodedId !== "undefined" && canDeleteBl && (
            <button
              onClick={handleDeleteBl}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition"
            >
              <Trash2 size={14} />
              <span>Delete B/L</span>
            </button>
          )}

          <button
            onClick={handleSaveAll}
            type="button"
            disabled={isSaving || isLoading || !hasUnsavedChanges}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl shadow-xs hover:shadow text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Saving Manifest...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Banners: Error & Notice ────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-rose-950 dark:hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {existingBlNotice && (
        <div className="p-3 text-xs rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-sky-800 dark:text-sky-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
            <span>{existingBlNotice}</span>
          </div>
          <button onClick={() => setExistingBlNotice(null)} className="p-1 hover:text-sky-950 dark:hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Side-By-Side Split Workspace ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        
        {/* ── Left Column: Master B/L Manifest Configuration (410px wide) ─── */}
        <div className={`w-full lg:w-[420px] xl:w-[450px] shrink-0 flex flex-col min-h-0 rounded-2xl border transition-all ${
          isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200/90 shadow-xs"
        } overflow-hidden`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-inherit flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-600/10 text-sky-600 dark:text-sky-400">
                <Box size={16} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Master Manifest Parameters
              </h3>
            </div>
            {shipmentRoute && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 size={11} className="text-emerald-600" /> Carrier Synced
              </span>
            )}
          </div>

          {/* Form Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* B/L Number & Carrier Search Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Bill of Lading Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="billOfLadingNumber"
                    value={formData.billOfLadingNumber}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchContainerData(formData.billOfLadingNumber);
                      }
                    }}
                    placeholder="e.g. GGZ2601947"
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                      isDark
                        ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchContainerData(formData.billOfLadingNumber)}
                  disabled={isLoading || isSearchingCarrier || !formData.billOfLadingNumber}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  title="Discover containers from Maritime Carrier API"
                >
                  {isSearchingCarrier ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  <span>Trace</span>
                </button>
              </div>
            </div>

            {/* Live Ocean Voyage Ribbon */}
            {shipmentRoute && (
              <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Ship size={14} className="text-sky-600" />
                    <span>{shipmentRoute.vessel}</span>
                    <span className="px-2 py-0.2 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-semibold text-[10px]">
                      {shipmentRoute.provider}
                    </span>
                  </div>
                  {shipmentRoute.eta && (
                    <div className="text-slate-500">
                      ETA: <strong className="text-slate-700 dark:text-slate-300">{new Date(shipmentRoute.eta).toLocaleDateString()}</strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-sky-100 dark:border-sky-900/40">
                  <span className="truncate max-w-[120px]" title={shipmentRoute.origin}>{shipmentRoute.origin}</span>
                  <span className="text-sky-600 font-bold">➔</span>
                  <span className="truncate max-w-[120px]" title={shipmentRoute.destination}>{shipmentRoute.destination}</span>
                </div>
              </div>
            )}

            {/* Section 1: Carrier & Parties */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Logistics Parties
              </h4>

              {/* Logistics Provider */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                  Logistics Provider
                </label>
                <GenericSelector
                  value={formData.Provider || null}
                  onChange={(val) => {
                    setFormData(prev => {
                      const newData = { ...prev, Provider: val };
                      if (val) {
                        const selectedProvider = logistics?.find(opt => opt.id === val);
                        if (selectedProvider && selectedProvider.freeDays !== undefined) {
                          newData.freeDays = selectedProvider.freeDays !== null ? selectedProvider.freeDays : 0;
                        }
                      }
                      return newData;
                    });
                    setIsBlModified(true);
                  }}
                  placeholder="Select Shipping Provider"
                  options={logistics}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh("logistics")}
                  addApi="logistics-providers"
                />
              </div>

              {/* Consignee */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                  Consignee
                </label>
                <GenericSelector
                  value={formData.consignee || null}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, consignee: val }));
                    setIsBlModified(true);
                  }}
                  placeholder="Select Consignee"
                  options={consignees}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh("consignees")}
                  addApi="setConsignee"
                />
              </div>

              {/* Supplier (Only rendered if user has Supplier permission) */}
              {canViewSupplier && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                    Supplier / Shipper
                  </label>
                  <GenericSelector
                    value={formData.supplier || null}
                    onChange={(val) => {
                      setFormData(prev => ({ ...prev, supplier: val }));
                      setIsBlModified(true);
                    }}
                    placeholder="Select Supplier"
                    options={suppliers}
                    labelKey="name"
                    valueKey="id"
                    onAddNew={() => refresh("suppliers")}
                    addApi="setSupplier"
                  />
                </div>
              )}
            </div>

            {/* Section 2: Voyage & Terminal Policies */}
            <div className="space-y-3 pt-3 border-t border-inherit">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Voyage & Terminal Rules
              </h4>

              {/* Vessel Name */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                  Vessel Name
                </label>
                <GenericSelector
                  value={formData.vesselName || null}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, vesselName: val }));
                    setIsBlModified(true);
                  }}
                  placeholder="Select Vessel"
                  options={vesselList}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh("vessal")}
                  addApi="setVessal"
                />
              </div>

              {/* Arrival Date */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                  Port Arrival Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 transition ${
                    isDark
                      ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Shipping Type */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold mb-1">
                  Shipping Document Type
                </label>
                <GenericSelector
                  value={formData.shippingType || null}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, shippingType: val }));
                    setIsBlModified(true);
                  }}
                  placeholder="Select Shipping Type"
                  options={shipping}
                  labelKey="name"
                  valueKey="id"
                  onAddNew={() => refresh("shipping")}
                  addApi="setShippingDocument"
                />
              </div>

              {/* Free Days (Locked if individual overrides exist) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                    Free Days (Terminal Policy)
                  </label>
                  {hasCustomFreeDays && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <Lock size={11} /> Overridden
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  name="freeDays"
                  value={formData.freeDays}
                  onChange={handleChange}
                  disabled={hasCustomFreeDays}
                  placeholder="e.g. 14"
                  className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                    hasCustomFreeDays
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 cursor-not-allowed"
                      : isDark
                      ? "bg-slate-800/80 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
                {hasCustomFreeDays && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertTriangle size={11} /> Locked: Individual container overrides exist in manifest.
                  </p>
                )}
              </div>

              {/* Default Status (Locked if containers have conflicting custom status) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                    Default Milestone Status
                  </label>
                  {hasCustomStatus && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <Lock size={11} /> Distinct States
                    </span>
                  )}
                </div>
                <GenericSelector
                  value={formData.status || null}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, status: val }));
                    setIsBlModified(true);
                  }}
                  placeholder="Select Default Status"
                  options={statusOptions}
                  labelKey="name"
                  valueKey="id"
                  disabled={hasCustomStatus}
                />
                {hasCustomStatus && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                    <AlertTriangle size={11} /> Locked: Containers currently hold different milestone statuses.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Container Manifest & Operations Grid ───────────── */}
        <div className={`flex-1 flex flex-col min-h-0 min-w-0 rounded-2xl border transition-all ${
          isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200/90 shadow-xs"
        } overflow-hidden`}>
          {/* Manifest Toolbar */}
          <div className="p-3 border-b border-inherit bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-600/10 text-sky-600 dark:text-sky-400">
                <Layers size={16} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Container Manifest
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                {rows.length} {rows.length === 1 ? 'container' : 'containers'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Search Container No */}
              <div className="relative min-w-[160px] max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={containerSearch}
                  onChange={(e) => setContainerSearch(e.target.value)}
                  placeholder="Filter containers..."
                  className={`w-full pl-8 pr-2.5 py-1 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-1 focus:ring-sky-500 transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-2 py-1 text-xs font-semibold rounded-xl border focus:outline-none transition cursor-pointer ${
                  statusFilter !== "ALL"
                    ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"
                    : isDark
                    ? "bg-slate-800 text-slate-300 border-slate-700"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <option value="ALL">Status: All</option>
                {statusOptions.map(opt => (
                  <option key={opt.id} value={opt.name}>{opt.name}</option>
                ))}
              </select>

              {/* Add Container Trigger */}
              <button
                type="button"
                onClick={() => setIsAddMode(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Container</span>
              </button>
            </div>
          </div>

          {/* Manifest Table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 z-10 border-b backdrop-blur-md ${
                isDark
                  ? "bg-slate-900/95 border-slate-800 text-slate-400"
                  : "bg-slate-50/95 border-slate-200 text-slate-500"
              } text-[11px] font-bold uppercase tracking-wider`}>
                <tr>
                  <th className="py-2.5 px-4 w-44">Container No</th>
                  <th className="py-2.5 px-4 w-36">Type / Equipment</th>
                  <th className="py-2.5 px-4 w-36">Milestone Status</th>
                  <th className="py-2.5 px-4 w-36">Free Days / Demurrage</th>
                  <th className="py-2.5 px-4">Current Terminal</th>
                  <th className="py-2.5 px-4 w-20 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-sky-600 dark:text-sky-400" />
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading containers...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <Box size={24} className="opacity-60" />
                        </div>
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Containers Registered</p>
                        <p className="text-xs text-slate-400">
                          {containerSearch || statusFilter !== "ALL"
                            ? "No containers match your filter criteria."
                            : "Click '+ Add Container' above or 'Trace' from Carrier to populate maritime containers."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isOverdue = row.demurrage && row.demurrage.includes("Overdue");
                    return (
                      <tr
                        key={row.container_no}
                        onClick={() => handleEdit(row)}
                        className={`transition cursor-pointer group ${
                          isDark
                            ? "hover:bg-slate-800/60 text-slate-300"
                            : "hover:bg-sky-50/40 text-slate-700"
                        }`}
                      >
                        {/* Container No */}
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                          <div className="flex items-center gap-2">
                            <span>{row.container_no}</span>
                            {row.isDiscovered && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Synced
                              </span>
                            )}
                            {row.isPending && !row.isDiscovered && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                New
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type / Size */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {row.weight || "Standard Container"}
                        </td>

                        {/* Milestone Status */}
                        <td className="py-3 px-4">
                          {(() => {
                            const displayStatus = resolveStatusName(row.rawData || row) || row.status || "In Transit";
                            const statusLower = String(displayStatus).toLowerCase();
                            const isCompleted = statusLower.includes('complete') || statusLower.includes('empty');
                            const isPort = statusLower.includes('port') || statusLower.includes('discharg');
                            const isGate = statusLower.includes('gate') || statusLower.includes('deliver');

                            return (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : isPort
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : isGate
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}>
                                {displayStatus}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Demurrage & Free Days */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isOverdue
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {row.demurrage}
                          </span>
                        </td>

                        {/* Terminal Location */}
                        <td className="py-3 px-4 text-slate-500 font-medium truncate max-w-xs">
                          {row.location || "Port Victoria"}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(row)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition"
                              title="Edit Container"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                              title="Remove Container"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Manifest Footer */}
          <div className="p-2.5 px-4 border-t border-inherit bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <div>
              Showing <strong className="text-slate-700 dark:text-slate-300">{filteredRows.length}</strong> of <strong className="text-slate-700 dark:text-slate-300">{rows.length}</strong> containers
            </div>
            {containersToAdd.length > 0 && (
              <span className="text-sky-600 font-semibold">
                +{containersToAdd.length} pending addition
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Container Modal Dialog ────────────────────────────────────── */}
      {isAddMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-inherit">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs">
                  <Box size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Add Container to Manifest
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure container dimensions, terminal tracking events, and cargo items
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddMode(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <ContainerEntryForm 
              onSubmitSuccess={handleAddContainer}
              onCancel={() => setIsAddMode(false)}
              userPermissions={permissions}
              mode="add"
              defaultFreeDays={formData.freeDays}
            />
          </div>
        </div>
      )}

      {/* ── Edit Container Modal Dialog ───────────────────────────────────── */}
      {isEditFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-inherit">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs">
                  <Box size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {pendingEditIndex !== -1 ? 'Edit Discovered Container' : 'Edit Container Specifications'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure container dimensions, terminal tracking events, and cargo items
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsEditFormOpen(false);
                  setEditingContainer(null);
                  setPendingEditIndex(-1);
                }} 
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <ContainerEntryForm 
              editData={editingContainer}
              onSubmitSuccess={handleContainerSubmitSuccess}
              onCancel={() => {
                setIsEditFormOpen(false);
                setEditingContainer(null);
                setPendingEditIndex(-1);
              }}
              userPermissions={permissions}
              mode={pendingEditIndex === -1 ? "edit" : "add"}
              handleDeleteFunction={async () => {
                if (editingContainer) {
                  const cNo = editingContainer.container_no || editingContainer.containerNo;
                  await handleDeleteRow({ container_no: cNo, rawData: editingContainer });
                  setIsEditFormOpen(false);
                  setEditingContainer(null);
                  setPendingEditIndex(-1);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}