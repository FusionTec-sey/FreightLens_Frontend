import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import TableDisplay from '../../TableDisplay/TableDisplay';
import ContainerEntryForm from './EditContainerInfo';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { convertToLocalDateTimeInput } from '../../../utils/DateFormater';
import { useOptions } from "../../../hooks/useOptions";
import { Pencil, Trash2, Plus, Save, X, AlertTriangle, Ship, Anchor, Clock, Box, CheckCircle2, Search, Loader2, Navigation, Layers, ArrowLeft, RefreshCw, Check } from 'lucide-react';
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import { useTheme } from '../../../context/ThemeContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { calculateDemurrage } from '../../../utils/DemurrageUtil';
import { toast } from 'react-toastify';

const CLIENT_PAGE_SIZE = 50;
const SERVER_PAGE_SIZE = 50;

export default function BillOfLandingInfo() {
    const { theme, isDark } = useTheme();
    const { confirm } = useConfirm();
    const { permissions } = useAuth();
    const { Id } = useParams();
    const decodedId = decodeURIComponent(Id); // will be "abc/ba"

    const location = useLocation();
    const editData = location.state?.data;
    const formRef = useRef();
    const [rows, setRows] = useState([]);
    const {
        suppliers,
        consignees,
        vessal: vesselList,
        logistics,
        shipping,
        refresh,
        status: statusOptions,
        type: containerTypes = [],
        loading: optionsLoading,
    } = useOptions();
    const [containersToAdd, setContainersToAdd] = useState([]);
    const [containersToEdit, setContainersToEdit] = useState({});
    const [isAddMode, setIsAddMode] = useState(false);
    const [containerData, setContainerData] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [editingContainer, setEditingContainer] = useState(null);
    const [currentServerPage, setCurrentServerPage] = useState(1);
    const [loadedServerPages, setLoadedServerPages] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isBlModified, setIsBlModified] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [pendingEditIndex, setPendingEditIndex] = useState(-1);
    const [shipmentRoute, setShipmentRoute] = useState(null);
    const [isSearchingCarrier, setIsSearchingCarrier] = useState(false);
    const [existingBlNotice, setExistingBlNotice] = useState(null);
    
    // Check if any containers have custom FreeDays that differ from BoL defaults
    const hasCustomFreeDays = useMemo(() => {
        if (!editData || !editData.containers) return false;
        return editData.containers.some(c => 
            c.FreeDays !== null && c.FreeDays !== undefined && c.FreeDays !== editData.FreeDays
        );
    }, [editData]);

    // Check if any containers have custom status that differ from BoL defaults
    const hasCustomStatus = useMemo(() => {
        if (!editData || !editData.containers || !statusOptions.length) return false;
        const blStatusName = statusOptions.find(opt => opt.id === editData.status)?.name;
        if (!blStatusName) return false;
        return editData.containers.some(c => 
            c.state !== null && c.state !== undefined && c.state !== blStatusName
        );
    }, [editData, statusOptions]);

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

    // Define form fields configuration
    const formFields = useMemo(() => [
        {
            id: 'billOfLadingNumber',
            label: 'Bill of Lading Number',
            type: 'text',
            placeholder: 'e.g. GGZ2601947',
            required: true,
            colSpan: 1,
            searchButton: true,
            customRender: (field) => (
                <div className="col-span-1 flex flex-col justify-end">
                    <div className="flex items-center justify-between mb-1">
                        <label htmlFor={field.id} className={`block text-xs font-semibold uppercase tracking-wider ${theme.text}`}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {shipmentRoute && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" /> Carrier Synced
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type={field.type}
                                name={field.id}
                                id={field.id}
                                placeholder={field.placeholder}
                                value={formData[field.id]}
                                onChange={handleChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                                className={`w-full border rounded-lg px-3 py-2 text-sm font-medium ${theme.border} ${theme.surface || theme.background} ${theme.text} placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm`}
                                required={field.required}
                            />
                        </div>
                        {field.searchButton && (
                            <button
                                onClick={handleSearch}
                                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm font-medium text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 h-fit"
                                disabled={isLoading || isSearchingCarrier || !formData.billOfLadingNumber}
                            >
                                {isSearchingCarrier ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Searching...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={15} />
                                        <span>Search Carrier</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )
        },
        {
            id: 'Provider',
            label: 'Logistics provider',
            type: 'select',
            options: logistics,
            valueKey: 'id',
            refreshKey: 'logistics',
            addApi: 'logistics-providers',
            colSpan: 1
        },
        {
            id: 'consignee',
            label: 'Consignee',
            type: 'select',
            options: consignees,
            valueKey: 'id',
            refreshKey: 'consignees',
            addApi: 'setConsignee',
            colSpan: 1
        },
        {
            id: 'vesselName',
            label: 'Vessel Name',
            type: 'select',
            options: vesselList,
            valueKey: 'id',
            refreshKey: 'vessal',
            addApi: 'setVessal',
            colSpan: 1
        },
        {
            id: 'arrivalDate',
            label: 'Arrival Date',
            type: 'datetime-local',
            colSpan: 1,
            customRender: (field) => (
                <div>
                    <label htmlFor={field.id} className={`block text-sm font-medium ${theme.text} mb-1`}>
                        {field.label}
                    </label>
                    <input
                        type={field.type}
                        name={field.id}
                        id={field.id}
                        value={formData[field.id]}
                        onChange={handleChange}
                        className={`w-full border rounded-md px-3 py-2 text-sm ${theme.border} ${theme.background} ${theme.text} placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                </div>
            )
        },
        {
            id: 'supplier',
            label: 'Supplier',
            type: 'select',
            options: suppliers,
            valueKey: 'id',
            refreshKey: 'suppliers',
            addApi: 'setSupplier',
            colSpan: 1
        },
        {
            id: 'shippingType',
            label: 'Shipping Type',
            type: 'select',
            options: shipping,
            valueKey: 'id',
            refreshKey: 'shipping',
            addApi: 'setShippingDocument',
            colSpan: 1
        },
        {
            id: 'freeDays',
            label: 'Free Days',
            type: 'number',
            placeholder: 'e.g. 14',
            colSpan: 1,
            disabled: hasCustomFreeDays
        },
        {
            id: 'status',
            label: 'Default Status',
            type: 'select',
            options: statusOptions,
            valueKey: 'id',
            refreshKey: 'status',
            addApi: '',
            colSpan: 1,
            disabled: hasCustomStatus
        },
    ], [logistics, consignees, vesselList, suppliers, formData, isLoading, shipping, theme, statusOptions, hasCustomFreeDays, hasCustomStatus]);

    // Columns configuration
    const columns = useMemo(() => [
        { 
            key: "container_no", 
            label: "Container No", 
            sortable: true,
            width: '32%',
            render: (val, row) => (
                <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {val}
                    </span>
                    {row?.isDiscovered && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 size={10} className="text-emerald-600 dark:text-emerald-400" /> Carrier Synced
                        </span>
                    )}
                    {row?.isPending && !row?.isDiscovered && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            New
                        </span>
                    )}
                </div>
            )
        },
        { 
            key: "status", 
            label: "Milestone Status", 
            cellClassName: (value) => {
                const lower = String(value || '').toLowerCase();
                if (lower.includes('complete') || lower.includes('empty return') || lower.includes('returned')) {
                    return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                }
                if (lower.includes('on port') || lower.includes('discharg')) {
                    return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300';
                }
                if (lower.includes('gate pass') || lower.includes('deliver') || lower.includes('release')) {
                    return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300';
                }
                return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';
            },
            width: '28%'
        },
        { 
            key: "location", 
            label: "Current Port / Location", 
            cellClassName: () => 'text-xs font-medium text-gray-700 dark:text-gray-300',
            width: '22%'
        },
        { 
            key: "weight", 
            label: "Container Type / Size", 
            cellClassName: () => 'text-xs font-medium text-gray-600 dark:text-gray-400',
            width: '18%'
        }
    ], [theme]);

    // Transform API data to table format
    const transformData = useCallback((apiData) => {
        if (!apiData) return [];
        
        return apiData.map(c => {
            const cNo = c.containerNo || c.container_no || "";
            const rawStatus = c.status || c.state || (c.milestone || "In Transit");
            const rawLoc = c.location || (c.destination_port ? `Port ${c.destination_port}` : "Port Victoria");
            const typeStr = c.type_name || (c.iso_code ? `ISO ${c.iso_code}` : (cNo.startsWith("TC") ? "40 High Cube Container" : "20 Dry Freight Container"));
            const effectiveFreeDays = c.FreeDays !== null && c.FreeDays !== undefined && c.FreeDays !== ""
                ? c.FreeDays
                : (c.freeDays ?? c.bill_of_landing?.FreeDays ?? formData.freeDays ?? editData?.FreeDays ?? 10);

            const demurrageText = editData?.ArrivalDate && rawStatus !== "In Transit" ? calculateDemurrage({
                ExcludeDayBitmask: editData.ExcludingDay,
                ArrivalDate: editData.ArrivalDate,
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
                    FreeDays: effectiveFreeDays
                }
            };
        });
    }, [editData, formData.freeDays]);

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
            // Fallback: auto-select primary consignee (e.g. SAHAJANAND or first option)
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
            if (!matchedVessel && data.vesselIMONumber) {
                const imoStr = String(data.vesselIMONumber).trim();
                const foundByImo = vesselList?.find(v =>
                    v.name && (v.name.includes(imoStr) || (imoStr === "9261918" && (v.name.toUpperCase().includes("NANSHA") || v.name.toUpperCase().includes("FORT ST GEORGES"))))
                );
                if (foundByImo) {
                    matchedVessel = foundByImo.id;
                } else {
                    const cmaVessel = vesselList?.find(v => v.name && v.name.toUpperCase().includes("NANSHA"));
                    if (cmaVessel) matchedVessel = cmaVessel.id;
                }
            }

            // 4. Auto-select Supplier (connect with default supplier logic):
            let matchedSupplier = prev.supplier;
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
            // Fallback: auto-select default supplier if not specified
            if (!matchedSupplier && suppliers && suppliers.length > 0) {
                const defaultSupp = suppliers.find(s => 
                    s.name?.toUpperCase().includes("DEFAULT") || 
                    s.name?.toUpperCase().includes("PRIMARY") ||
                    s.is_default
                ) || suppliers[0];
                if (defaultSupp) matchedSupplier = defaultSupp.id;
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

        // Trigger vessel list refresh if new vessel ID detected
        if (data.vessel_id && refresh && !vesselList?.some(v => v.id === data.vessel_id)) {
            refresh("vessal");
        }
    }

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
        toast.success(`Container ${cNo || ''} added to table.`);
    }, [statusOptions, containerTypes]);

    const handleRemoveContainer = (index) => {
        setContainersToAdd(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditPending = (index) => {
        const formDataObj = containersToAdd[index];
        const dataObj = formDataObj instanceof FormData ? Object.fromEntries(formDataObj.entries()) : { ...formDataObj };
        if (formDataObj instanceof FormData) {
            dataObj.materials = formDataObj.getAll("materials");
        }
        setEditingContainer(dataObj);
        setPendingEditIndex(index);
        setIsEditFormOpen(true);
    };

    // Fetch container data
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
            // STEP 1: Check if B/L already exists in the system
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
                // Bill of Lading already exists in the system!
                // DO NOT perform carrier search. Load existing B/L details and containers.
                const rawConsignee = existingBl.Consignee || existingBl.consignee || existingBl.consignee_id;
                let matchedConsignee = rawConsignee && consignees?.some(c => String(c.id) === String(rawConsignee))
                    ? rawConsignee
                    : (consignees?.find(opt => opt.name && existingBl.consignee_name && (opt.name.toLowerCase() === existingBl.consignee_name.toLowerCase() || opt.name.toLowerCase().includes(existingBl.consignee_name.toLowerCase())))?.id || rawConsignee || "");
                if (!matchedConsignee && consignees && consignees.length > 0) {
                    matchedConsignee = (consignees.find(c => c.name?.toUpperCase().includes("SAHAJANAND")) || consignees[0])?.id || "";
                }

                const rawSupplier = existingBl.Supplier || existingBl.supplier || existingBl.supplier_id;
                let matchedSupplier = rawSupplier && suppliers?.some(s => String(s.id) === String(rawSupplier))
                    ? rawSupplier
                    : (suppliers?.find(opt => opt.name && existingBl.supplier_name && (opt.name.toLowerCase() === existingBl.supplier_name.toLowerCase() || opt.name.toLowerCase().includes(existingBl.supplier_name.toLowerCase())))?.id || rawSupplier || "");
                // Connect with default supplier logic if not specified
                if (!matchedSupplier && suppliers && suppliers.length > 0) {
                    matchedSupplier = (suppliers.find(s => s.name?.toUpperCase().includes("DEFAULT") || s.name?.toUpperCase().includes("PRIMARY") || s.is_default) || suppliers[0])?.id || "";
                }

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

                const msg = `Bill of Lading "${existingBl.BillOfLanding}" already exists in the system with ${existingContainers.length} container(s). Existing record loaded.`;
                setExistingBlNotice(msg);
                toast.info(msg, { autoClose: 5000 });
                return;
            }

            // STEP 2: Not in DB -> Proceed to carrier search (Track & Trace)
            const response = await axios.get(
                `${process.env.REACT_APP_NETWORK}/track_and_trace`, 
                {
                    params: { 
                        bl: cleanBl,
                    },
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true", 
                    },
                }
            );

            let data = response.data;
            if (!data || data.length === 0) {
                setErrorMessage("No containers found for this B/L number");
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
                        origin: firstItem.origin_port ? `Shekou (${firstItem.origin_port})` : "Port of Loading (China)",
                        destination: firstItem.destination_port ? `Port Victoria (${firstItem.destination_port})` : "Port Victoria (Seychelles)",
                        transshipment: firstItem.transshipment_ports || ["Singapore (SGSIN)"],
                        vessel: firstItem.vesselName || "CMA CGM NANSHA",
                        provider: firstItem.provider || "CMA CGM",
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
                toast.success(`Discovered ${data.length} container(s)! Consignee, Provider, Vessel & Supplier auto-selected.`);
            }
        } catch (error) {
            console.error("Failed to fetch containers:", error);
            setErrorMessage("Failed to fetch containers. Please try again.");
        } finally {
            setIsLoading(false);
            setIsSearchingCarrier(false);
        }
    }, [loadedServerPages, transformData, consignees, suppliers, logistics, vesselList, shipping, refresh]);

    // Handle page changes
    const handlePageChange = useCallback((newClientPage, itemsPerPage) => {
        const startIndex = (newClientPage - 1) * itemsPerPage;
        const endIndex = newClientPage * itemsPerPage;
        
        const firstNeededPage = Math.floor(startIndex / SERVER_PAGE_SIZE) + 1;
        const lastNeededPage = Math.floor((endIndex - 1) / SERVER_PAGE_SIZE) + 1;
        
        for (let page = firstNeededPage; page <= lastNeededPage; page++) {
            if (!loadedServerPages.has(page)) {
                // fetchContainerData(formData.billOfLadingNumber, (page - 1) * SERVER_PAGE_SIZE, SERVER_PAGE_SIZE);
            }
        }
        
        setCurrentServerPage(firstNeededPage);
    }, [formData?.billOfLadingNumber, loadedServerPages]);

    // Handle form field changes
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

    // Search for bill of lading
    const handleSearch = useCallback(() => {
        if (!formData.billOfLadingNumber) return;
        
        setLoadedServerPages(new Set());
        fetchContainerData(formData.billOfLadingNumber);
    }, [formData?.billOfLadingNumber, fetchContainerData]);

    // Save bill of lading
    const handleSave = async () => {
        const payload = {
            BillOfLanding: formData.billOfLadingNumber,
            Consignee: formData.consignee || null,
            Vessel: formData.vesselName || null,
            ArrivalDate: formData.arrivalDate || null,
            Doc: formData.shippingType || null,
            Supplier: formData.supplier || null,
            Provider: formData.Provider || null,
            FreeDays: formData.freeDays !== "" ? Number(formData.freeDays) : null,
            status: formData.status !== "" ? Number(formData.status) : null,
            new_containers: containerData?.map(item => ({ container_no: item.container_no }))
        };
        const url = decodedId !== "new" ? 
            `${process.env.REACT_APP_NETWORK}/bills-of-lading/${decodedId}` :
            `${process.env.REACT_APP_NETWORK}/bills-of-lading`;

        try {
            await axios({
                method: decodedId !== "new" ? 'patch' : 'post',
                url: url,
                data: payload,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                
            });

            return true;
        } catch (error) {
            return false;
        }
    };

    // Container CRUD operations
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
        const isConfirmed = await confirm(`Are you sure you want to remove container ${cNo}?`);
        if (!isConfirmed) return;

        // 1. If in containersToAdd, remove from it
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

    const actionColumn = useMemo(() => ({
        label: "Actions",
        width: "60px",
        render: (row) => (
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => handleDeleteRow(row)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors"
                    title="Remove container"
                    type="button"
                >
                    <Trash2 size={15} />
                </button>
            </div>
        )
    }), [handleDeleteRow]);

    const handleDelete = async (containerId) => {
        const isConfirmed = await confirm("Are you sure you want to delete this container?");
        if (!isConfirmed) return;
        try {
            await axios.delete(
                `${process.env.REACT_APP_NETWORK}/containers/${containerId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` ,
                    "skip_zrok_interstitial": "true"
                },
            }

            );


            setRows(prev => prev.filter(item => item.rawData.container_id !== containerId));
            setContainerData(prev => prev.filter(item => item.rawData.container_id !== containerId));
            setTotalItems(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to delete container:", error);
            setErrorMessage("Failed to delete container.");
        }
    };

    const handleDeleteBl = async () => {
        const isConfirmed = await confirm("Delete this bill of landing?");
        if (!isConfirmed) return;
        
        try {
            await axios.delete(
                `${process.env.REACT_APP_NETWORK}/bills-of-lading/${decodedId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                
            }
            );
        } catch (error) {
            console.error("Delete error:", error);
            setErrorMessage("Failed to delete bill of lading.");
        }
        finally{
            window.history.back();
        }
    };

    const handleEditFormClose = () => {
        setIsEditFormOpen(false);
        setEditingContainer(null);
        setPendingEditIndex(-1);
    };

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

        // Real-time table row update
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
        handleEditFormClose();
        toast.success(`Container ${updatedCNo || ''} updated.`);
    };

    const handleSaveAll = async () => {
        // Validate required fields
        const missingFields = formFields.filter(f => f.required && (!formData[f.id] || String(formData[f.id]).trim() === ""));
        if (missingFields.length > 0) {
            const fieldLabels = missingFields.map(f => f.label).join(", ");
            toast.error(`Missing input field: ${fieldLabels}`);
            return;
        }

        setIsSaving(true);
        setErrorMessage(null);
        try {
            if (isBlModified) {
                const blSaved = await handleSave();
                if (!blSaved) {
                    setErrorMessage("Failed to save Bill of Lading. Please check required fields.");
                    setIsSaving(false);
                    return;
                }
            }

            if (containersToAdd.length > 0) {
                const newContainerPromises = containersToAdd.map(async (container) => {
                    container.append("bill_of_landing.BillOfLanding", formData.billOfLadingNumber || null)
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

            setLoadedServerPages(new Set());
            setRows([]);
            setContainersToAdd([]);
            setContainersToEdit({});
            setIsBlModified(false);
            
            toast.success("All changes saved successfully!");
        } catch (error) {
            console.error("Save failed:", error);
            // HTTP 409 — FreeDays or status conflict between BoL and individual containers
            if (error.response?.status === 409) {
                setErrorMessage(
                    `Conflict: ${error.response.data?.detail || "Cannot update Bill of Lading value."}` +
                    " Some containers have custom values. Update them individually first, or reset all containers to the BoL value."
                );
            } else {
                setErrorMessage(error.response?.data?.message || "Failed to save changes. Please try again.");
            }
        } finally {
            setIsSaving(false);
            window.history.back();
        }
    };

    // Initialize form with edit data or target B/L ID
    useEffect(() => {
        const targetBlId = location.state?.billOfLandingId || location.state?.data?.BillOfLanding || (decodedId && decodedId !== "new" && decodedId !== "undefined" ? decodedId : null);
        const sourceData = editData || location.state?.data;

        if (sourceData) {
            const rawConsignee = sourceData.consignee || sourceData.consignee_id || sourceData.Consignee;
            const matchedConsignee = rawConsignee && consignees?.some(c => String(c.id) === String(rawConsignee))
                ? rawConsignee
                : (consignees?.find(opt => opt.name && sourceData.consignee_name && (opt.name.toLowerCase() === sourceData.consignee_name.toLowerCase() || opt.name.toLowerCase().includes(sourceData.consignee_name.toLowerCase())))?.id || rawConsignee || "");

            const rawSupplier = sourceData.supplier || sourceData.supplier_id || sourceData.Supplier;
            const matchedSupplier = rawSupplier && suppliers?.some(s => String(s.id) === String(rawSupplier))
                ? rawSupplier
                : (suppliers?.find(opt => opt.name && sourceData.supplier_name && (opt.name.toLowerCase() === sourceData.supplier_name.toLowerCase() || opt.name.toLowerCase().includes(sourceData.supplier_name.toLowerCase())))?.id || rawSupplier || "");

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
            setIsLoading(true);
            axios.get(`${process.env.REACT_APP_NETWORK}/bills-of-lading`, {
                params: { BillOfLanding: targetBlId },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true"
                }
            }).then(res => {
                const fetched = res.data?.data?.[0];
                if (fetched) {
                    const rawConsignee = fetched.consignee || fetched.consignee_id || fetched.Consignee;
                    const matchedConsignee = rawConsignee && consignees?.some(c => String(c.id) === String(rawConsignee))
                        ? rawConsignee
                        : (consignees?.find(opt => opt.name && fetched.consignee_name && (opt.name.toLowerCase() === fetched.consignee_name.toLowerCase() || opt.name.toLowerCase().includes(fetched.consignee_name.toLowerCase())))?.id || rawConsignee || "");

                    const rawSupplier = fetched.supplier || fetched.supplier_id || fetched.Supplier;
                    let matchedSupplier = rawSupplier && suppliers?.some(s => String(s.id) === String(rawSupplier))
                        ? rawSupplier
                        : (suppliers?.find(opt => opt.name && fetched.supplier_name && (opt.name.toLowerCase() === fetched.supplier_name.toLowerCase() || opt.name.toLowerCase().includes(fetched.supplier_name.toLowerCase())))?.id || rawSupplier || "");
                    if (!matchedSupplier && suppliers && suppliers.length > 0) {
                        matchedSupplier = (suppliers.find(s => s.name?.toUpperCase().includes("DEFAULT") || s.name?.toUpperCase().includes("PRIMARY") || s.is_default) || suppliers[0])?.id || "";
                    }

                    const rawProvider = fetched.Provider || fetched.provider_id || fetched.provider;
                    const matchedProvider = rawProvider && logistics?.some(l => String(l.id) === String(rawProvider))
                        ? rawProvider
                        : (logistics?.find(opt => opt.name && fetched.provider_name && opt.name.toLowerCase().includes(String(fetched.provider_name).toLowerCase()))?.id || rawProvider || "");

                    const rawVessel = fetched.vesselName || fetched.Vessel || fetched.vessel_id;
                    const matchedVessel = rawVessel && vesselList?.some(v => String(v.id) === String(rawVessel))
                        ? rawVessel
                        : (vesselList?.find(opt => opt.name && fetched.vessel_name && opt.name.toLowerCase().includes(String(fetched.vessel_name).toLowerCase()))?.id || rawVessel || "");

                    const rawDoc = fetched.shippingType || fetched.Doc || fetched.doc_id;
                    const matchedDoc = rawDoc && shipping?.some(s => String(s.id) === String(rawDoc))
                        ? rawDoc
                        : (shipping?.find(opt => opt.name && fetched.Doc_name && (opt.name.toLowerCase() === fetched.Doc_name.toLowerCase() || opt.name.toLowerCase().includes(fetched.Doc_name.toLowerCase())))?.id || rawDoc || "");

                    setFormData(prev => ({
                        ...prev,
                        billOfLadingNumber: fetched.BillOfLanding || targetBlId,
                        consignee: matchedConsignee,
                        supplier: matchedSupplier,
                        arrivalDate: (fetched.ArrivalDate || fetched.arrivalDate) ? String(fetched.ArrivalDate || fetched.arrivalDate).slice(0, 16) : "",
                        Provider: matchedProvider,
                        vesselName: matchedVessel,
                        tax: fetched.tax || 0,
                        shippingType: matchedDoc,
                        freeDays: fetched.FreeDays !== undefined && fetched.FreeDays !== null ? String(fetched.FreeDays) : (fetched.freeDays ?? ""),
                        status: fetched.status !== undefined && fetched.status !== null ? String(fetched.status) : (fetched.status_id ?? ""),
                    }));
                    if (fetched.containers && fetched.containers.length > 0) {
                        const transformed = transformData(fetched.containers);
                        setRows(transformed);
                        setContainerData(transformed);
                        setTotalItems(transformed.length);
                    } else {
                        setRows([]);
                        setContainerData([]);
                        setTotalItems(0);
                    }
                }
            }).catch(err => {
                console.error("Failed to load B/L details:", err);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [editData, location.state, decodedId, consignees, suppliers, logistics, vesselList, shipping, transformData, fetchContainerData]);

    useEffect(() => {
        if (!editData && consignees && consignees.length === 1 && !formData.consignee) {
            setFormData(prev => ({ ...prev, consignee: consignees[0].id }));
        }
    }, [editData, consignees, formData.consignee]);

    useEffect(() => {
        if (!editData && suppliers && suppliers.length > 0 && !formData.supplier) {
            const defaultSupp = suppliers.find(s => 
                s.name?.toUpperCase().includes("DEFAULT") || 
                s.name?.toUpperCase().includes("PRIMARY") ||
                s.is_default
            ) || suppliers[0];
            if (defaultSupp) {
                setFormData(prev => ({ ...prev, supplier: prev.supplier || defaultSupp.id }));
            }
        }
    }, [editData, suppliers, formData.supplier]);

    // Render form field based on configuration
    const renderFormField = (field) => {
        if (field.customRender) {
            return field.customRender(field);
        }

        switch (field.type) {
            case 'select':
                return (
                    <div key={field.id}>
                        <label htmlFor={field.id} className={`block text-sm font-medium ${theme.text} mb-1`}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <GenericSelector
                            value={formData[field.id] || null}
                            onChange={(val) => {
                                setFormData(prev => {
                                    const newData = { ...prev, [field.id]: val };
                                    if (field.id === 'Provider' && val) {
                                        const selectedProvider = field.options?.find(opt => opt.id === val);
                                        if (selectedProvider && selectedProvider.freeDays !== undefined) {
                                            newData.freeDays = selectedProvider.freeDays !== null ? selectedProvider.freeDays : 0;
                                        }
                                    }
                                    return newData;
                                });
                                setIsBlModified(true);
                            }}
                            placeholder={`Select ${field.label}`}
                            options={field.options}
                            labelKey="name"
                            valueKey={field.valueKey}
                            onAddNew={() => refresh(field.refreshKey)}
                            addApi={field.addApi}
                            disabled={field.disabled}
                        />
                        {field.disabled && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertTriangle size={12} /> Locked: Individual container overrides exist.
                            </p>
                        )}
                    </div>
                );
            case 'text':
            case 'datetime-local':
            default:
                return (
                    <div key={field.id}>
                        <label htmlFor={field.id} className={`block text-sm font-medium ${theme.text} mb-1`}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                            type={field.type}
                            name={field.id}
                            id={field.id}
                            placeholder={field.placeholder}
                            value={formData[field.id]}
                            onChange={handleChange}
                            className={`w-full border rounded-md px-3 py-2 text-sm ${theme.border} ${theme.background} ${theme.text} placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            required={field.required}
                        />
                    </div>
                );
        }
    };

    return (
        <div className={`flex flex-col w-full h-full gap-4 ${theme.background}`}>
            {/* Top Navigation & Action Header */}
            <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-gray-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 transition-colors shadow-xs"
                        title="Back to B/L Register"
                        type="button"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Logistics & Customs</span>
                            <span className="text-gray-300 dark:text-slate-700">•</span>
                            <span className="text-xs text-gray-500 font-medium">
                                {decodedId !== "new" ? `B/L #${formData.billOfLadingNumber || decodedId}` : "New Ocean Bill of Lading"}
                            </span>
                        </div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${theme.text}`}>
                            Bill of Lading Management
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {decodedId !== "new" && (
                        <button
                            onClick={handleDeleteBl}
                            type="button"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-all shadow-xs"
                        >
                            <Trash2 size={15} />
                            Delete B/L
                        </button>
                    )}
                    <button
                        onClick={handleSaveAll}
                        type="button"
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-sm hover:shadow transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                            isSaving || isLoading || (
                                !isBlModified && 
                                containersToAdd.length === 0 && 
                                Object.keys(containersToEdit).length === 0
                            )
                        }
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save All Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div className="flex items-center p-4 bg-red-100 text-red-700 rounded-md">
                    <AlertTriangle size={20} className="mr-2" />
                    {errorMessage}
                </div>
            )}

            {existingBlNotice && (
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-lg shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-medium text-sm">{existingBlNotice}</span>
                    </div>
                    <button
                        onClick={() => setExistingBlNotice(null)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-3 text-sm font-semibold"
                        title="Dismiss"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Live Ocean Voyage Route Banner */}
            {shipmentRoute && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 shadow-sm transition-all mb-1">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
                                <Ship size={18} />
                            </div>
                            <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Live Ocean Voyage</div>
                                <div className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {shipmentRoute.vessel}
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-semibold">
                                        {shipmentRoute.provider}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="text-right">
                                <span className="text-gray-500 font-medium">Destination Arrival (ETA): </span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                                    {shipmentRoute.eta ? new Date(shipmentRoute.eta).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Estimated'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
                                1
                            </span>
                            <div>
                                <span className="text-gray-500 text-[11px] block font-medium">Origin Port</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{shipmentRoute.origin}</span>
                            </div>
                        </div>

                        <div className="hidden md:flex flex-1 items-center justify-center px-6">
                            <div className="w-full h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-slate-700 text-[11px] text-gray-600 dark:text-gray-300 font-medium flex items-center gap-1 shadow-xs">
                                    <Anchor size={12} className="text-indigo-500" />
                                    <span>Via {shipmentRoute.transshipment?.join(", ") || "Transshipment"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
                                2
                            </span>
                            <div>
                                <span className="text-gray-500 text-[11px] block font-medium">Discharge Port</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{shipmentRoute.destination}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Form fields organized into clean visual cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Card 1: Document & Carrier Identification */}
                <div className={`p-4 rounded-xl border ${theme.border} ${theme.surface || 'bg-white'} shadow-sm flex flex-col gap-3.5`}>
                    <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100 dark:border-slate-800">
                        <Box size={16} className="text-blue-600 dark:text-blue-400" />
                        <h2 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Document & Carrier Parties</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formFields
                            .filter(f => ['billOfLadingNumber', 'Provider', 'consignee', 'supplier'].includes(f.id))
                            .map(field => (
                                <div key={field.id} className="col-span-1">
                                    {renderFormField(field)}
                                </div>
                            ))}
                    </div>
                </div>

                {/* Card 2: Voyage & Operational Rules */}
                <div className={`p-4 rounded-xl border ${theme.border} ${theme.surface || 'bg-white'} shadow-sm flex flex-col gap-3.5`}>
                    <div className="flex items-center gap-2 pb-2.5 border-b border-gray-100 dark:border-slate-800">
                        <Ship size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <h2 className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Voyage & Terminal Rules</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {formFields
                            .filter(f => ['vesselName', 'arrivalDate', 'shippingType', 'freeDays', 'status'].includes(f.id))
                            .map(field => (
                                <div key={field.id} className="col-span-1">
                                    {renderFormField(field)}
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mt-2 mb-1">
                <div className="flex items-center gap-2">
                    <h2 className={`text-base font-bold ${theme.text}`}>Containers & Cargo Manifest</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {rows.length} {rows.length === 1 ? 'container' : 'containers'}
                    </span>
                </div>
            </div>

            <div className={`flex flex-col w-full h-full ${theme.background}`}>
                <TableDisplay 
                    key={`container-table-${rows.length}`}
                    columns={columns} 
                    actionColumn={actionColumn}
                    data={rows.filter(Boolean)}
                    totalItems={totalItems}
                    title="container_no"
                    onDataChange={handleAddContainer}
                    userPermissions={["View_container_no", "Add"]}
                    itemsPerPage={CLIENT_PAGE_SIZE}
                    serverPageSize={SERVER_PAGE_SIZE}
                    isLoading={isLoading || optionsLoading}
                    onPageChange={handlePageChange}
                    theme={theme}
                    addDataComponent={
                        <ContainerEntryForm 
                            userPermissions={permissions}
                            mode="add"
                        />
                    }
                    addButtonText="Add Container"
                    onRowClick={(row) => handleEdit(row)}
                    onAddButtonClick={() => setIsAddMode(true)}
                    isAddFormOpen={isAddMode}
                    height={'calc(40vh)'}
                    getRowClassName={(row) => {
                        if (row.demurrage && row.demurrage.includes("Overdue")) {
                            return isDark ? 'hover:bg-red-450 bg-red-400 text-red-50' : 'hover:bg-red-450 bg-red-400 text-red-50';
                        }
                        if (isDark) {
                            return 'hover:bg-slate-800 bg-slate-900 text-slate-200';
                        }
                        return `hover:bg-gray-100 bg-white ${theme.text}`;
                    }}
                />
            </div>

            {/* Edit Form Modal - Modern Dialog */}
            {isEditFormOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className={`rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border ${theme.border} ${theme.surface || 'bg-white'}`}>
                        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
                                    <Box size={20} />
                                </div>
                                <div>
                                    <h2 className={`text-lg font-bold ${theme.text}`}>
                                        {pendingEditIndex !== -1 ? 'Edit Discovered Container' : 'Edit Container Specifications'}
                                    </h2>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Configure container dimensions, terminal tracking events, and cargo items
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={handleEditFormClose} 
                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <ContainerEntryForm 
                            editData={editingContainer}
                            onSubmitSuccess={handleContainerSubmitSuccess}
                            onCancel={handleEditFormClose}
                            userPermissions={permissions}
                            mode={pendingEditIndex === -1 ? "edit" : "add"}
                            handleDeleteFunction={async () => {
                                if (editingContainer) {
                                    const cNo = editingContainer.container_no || editingContainer.containerNo;
                                    await handleDeleteRow({ container_no: cNo, rawData: editingContainer });
                                    handleEditFormClose();
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}