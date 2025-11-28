import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import TableDisplay from '../../TableDisplay/TableDisplay';
import ContainerEntryForm from './EditContainerInfo';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { convertToLocalDateTimeInput } from '../../../utils/DateFormater';
import { useOptions } from "../../../hooks/useOptions";
import { Pencil, Trash2, Plus, Save, X, AlertTriangle } from 'lucide-react';
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import { useTheme } from '../../../context/ThemeContext';

const CLIENT_PAGE_SIZE = 50;
const SERVER_PAGE_SIZE = 200;

export default function BillOfLandingInfo() {
    const { theme } = useTheme();
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
    const [showPendingSection, setShowPendingSection] = useState(true);
    const [errorMessage, setErrorMessage] = useState(null);
    const [pendingEditIndex, setPendingEditIndex] = useState(-1);
    
    const [formData, setFormData] = useState({
        billOfLadingNumber: "",
        consignee: "",
        vesselName: "",
        arrivalDate: "",
        supplier: "",
        Provider: "",
        shippingType: null,
        tax: 0
    });

    // Define form fields configuration
    const formFields = useMemo(() => [
        {
            id: 'billOfLadingNumber',
            label: 'Bill of Lading Number',
            type: 'text',
            placeholder: 'Enter B/L Number',
            required: true,
            colSpan: 1,
            searchButton: true,
            customRender: (field) => (
                <div className="col-span-1 flex items-end gap-2">
                    <div className="flex-1">
                        <label htmlFor={field.id} className={`block text-sm font-medium ${theme.text} mb-1`}>
                            {field.label}
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
                    {field.searchButton && (
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-sm text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 h-fit"
                            disabled={isLoading || !formData.billOfLadingNumber}
                        >
                            Search
                        </button>
                    )}
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
            addApi: 'setProvider',
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
    ], [logistics, consignees, vesselList, suppliers, formData, isLoading, shipping, theme]);

    // Columns configuration
    const columns = useMemo(() => [
        { 
            key: "container_no", 
            label: "Container No", 
            sortable: true,
            width: '30%'
        },
        { 
            key: "status", 
            label: "Status",
            cellClassName: (value) => 
                value === "On port" ? 'bg-blue-100 text-blue-800' : 
                value === "Gate Pass" ? 'bg-green-100 text-green-800' : '',
            width: '20%'
        },
        { 
            key: "location", 
            label: "Location",
            width: '30%'
        },
        { 
            key: "weight", 
            label: "Weight",
            width: '20%'
        }
    ], []);

    // Transform API data to table format
    const transformData = useCallback((apiData) => {
        if (!apiData) return [];
        
        return apiData.map(c => ({
            container_no: c.containerNo || c.container_no || "",
            status: c.state || c.status || "",
            location: c.location || "",
            weight: c.weight || "",
            rawData: c // Store raw data for editing
        }));
    }, []);

    function setFormDataOfBl(data){
        setFormData(prev => ({
            ...prev,
            arrivalDate: convertToLocalDateTimeInput(data.eventDateTime)
        }));
    }

    const handleAddContainer = useCallback((data) => {
        setContainersToAdd(prev => [...prev, data]);
        setIsAddMode(false);
    }, []);

    const handleRemoveContainer = (index) => {
        setContainersToAdd(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditPending = (index) => {
        const formData = containersToAdd[index];
        const dataObj = Object.fromEntries(formData.entries());
        setEditingContainer(dataObj);
        setPendingEditIndex(index);
        setIsEditFormOpen(true);
    };

    // Fetch container data
    const fetchContainerData = useCallback(async (blNumber, offset = 0, limit = SERVER_PAGE_SIZE) => {
        const pageNum = Math.floor(offset / limit) + 1;
        if (loadedServerPages.has(pageNum)) return;
        
        setIsLoading(true);
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_NETWORK}/track_and_trace`, 
                {
                    params: { 
                        bl: blNumber,
                    },
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true", 
                    },
                    withCredentials: true, 
                }
            );



            let data = response.data;
            if (data.length === 0) {
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
                setFormData({
                    billOfLadingNumber: blNumber,
                })
                const transformedData = transformData(data);

                if (data.length > 0){
                    setFormDataOfBl(data[0]);
                }
            
                setTotalItems(data.length || 0);
                setLoadedServerPages(prev => new Set(prev).add(pageNum));

                setContainersToAdd([]);
                const containerIds = [];
                transformedData.forEach(item => {
                    const newContainer = new FormData();
                    newContainer.append("bill_of_landing.BillOfLanding", blNumber || null)
                    newContainer.append("container_no", item.container_no || null)
                    containerIds.push(newContainer);
                });
                setContainersToAdd(containerIds);
            }
        } catch (error) {
            console.error("Failed to fetch containers:", error);
            setErrorMessage("Failed to fetch containers. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [loadedServerPages, transformData]);

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
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        setIsBlModified(true);
    };

    // Search for bill of lading
    const handleSearch = useCallback(() => {
        if (!formData.billOfLadingNumber) return;
        
        setLoadedServerPages(new Set());
        // setRows([]);
        fetchContainerData(formData.billOfLadingNumber);
        setShowPendingSection(true);
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

            new_containers: containerData?.map(item => ({ container_no: item.container_no }))
        };
        const url = decodedId !== "new" ? 
            `${process.env.REACT_APP_NETWORK}/updateBl/${decodedId}` :
            `${process.env.REACT_APP_NETWORK}/addBl`;

        try {
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                withCredentials: true,
            });

            return true;
        } catch (error) {
            return false;
        }
    };

    // Container CRUD operations
    const handleEdit = useCallback((row) => {  
        setEditingContainer(row.rawData);
        setPendingEditIndex(-1);
        setIsEditFormOpen(true);
    }, []);

    const handleDelete = async (containerId) => {
        if (!window.confirm("Are you sure you want to delete this container?")) return;
        try {
            await axios.delete(
                `${process.env.REACT_APP_NETWORK}/deleteContainerDetails/${containerId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` ,
                    "skip_zrok_interstitial": "true"
                },
            withCredentials: true,}

            );


            setRows(prev => prev.filter(item => item.rawData.container_id !== containerId));
        } catch (error) {
            console.error("Failed to delete container:", error);
            setErrorMessage("Failed to delete container.");
        }
    };

    const handleDeleteBl = async () => {
        if (!window.confirm("Delete this bill of landing?")) return;
        
        try {
            await axios.delete(
                `${process.env.REACT_APP_NETWORK}/deleteBl/${decodedId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                withCredentials: true,
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

    const handleSaveAll = async () => {
        setIsSaving(true);
        setErrorMessage(null);
        try {
            if (isBlModified) {
                const blSaved = await handleSave();
                if (!blSaved) {
                    setErrorMessage("Failed to save Bill of Lading. Please check required fields.");
                    return;
                }
            }

            if (containersToAdd.length > 0) {
                const newContainerPromises = containersToAdd.map(async (container) => {
                    container.append("bill_of_landing.BillOfLanding", formData.billOfLadingNumber || null)
                    return axios.post(
                        `${process.env.REACT_APP_NETWORK}/createContainer`,
                        container,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                                'Content-Type': 'multipart/form-data',
                                "skip_zrok_interstitial": "true",
                            },
                            withCredentials: true,
                        }
                    );
                });

                await Promise.all(newContainerPromises);
            }

            if (Object.keys(containersToEdit).length > 0) {
                const editPromises = Object.entries(containersToEdit).map(async ([id, container]) => {
                    return axios.post(
                        `${process.env.REACT_APP_NETWORK}/updateContainer/${id}`,
                        container,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                                'Content-Type': 'multipart/form-data',
                                "skip_zrok_interstitial": "true",
                            },
                             withCredentials: true,
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
            
            alert("All changes saved successfully!");
        } catch (error) {
            console.error("Save failed:", error);
            setErrorMessage(error.response?.data?.message || "Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
            window.history.back();
        }
    };

    // Initialize form with edit data if available
    useEffect(() => {
        if (editData) {
            setFormData({
                billOfLadingNumber: editData.BillOfLanding,
                consignee: consignees.find((opt) => opt.name === editData.consignee_name)?.id || "",
                supplier: suppliers.find((opt) => opt.name === editData.supplier_name)?.id || "",
                arrivalDate: editData.ArrivalDate?.slice(0, 16) || "",
                Provider: logistics.find((opt) => opt.name === editData.provider_name)?.id || "",
                vesselName: vesselList.find((opt) => opt.name === editData.vessel_name)?.id || "",
                tax: editData.tax || 0,
                shippingType: shipping.find((opt) => opt.name === editData.Doc_name)?.id || ""
            });
            
            if (editData.containers) {
                const transformed = transformData(editData.containers);
                setRows(transformed);
                setContainerData(transformed);
            }
        }
    }, [editData, consignees, suppliers, logistics, vesselList, shipping, transformData]);

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
                        </label>
                        <GenericSelector
                            value={formData[field.id] || null}
                            onChange={(val) => {
                                setFormData(prev => ({ ...prev, [field.id]: val }));
                                setIsBlModified(true);
                            }}
                            placeholder={`Select ${field.label}`}
                            options={field.options}
                            labelKey="name"
                            valueKey={field.valueKey}
                            onAddNew={() => refresh(field.refreshKey)}
                            addApi={field.addApi}
                        />
                    </div>
                );
            case 'text':
            case 'datetime-local':
            default:
                return (
                    <div key={field.id}>
                        <label htmlFor={field.id} className={`block text-sm font-medium ${theme.text} mb-1`}>
                            {field.label}
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
        <div className={`flex flex-col w-full h-full  ${theme.background} `}>
            <div className="flex justify-between items-center">
                <h1 className={`text-2xl font-bold ${theme.text}`}>Bill of Lading Management</h1>
                <div className="flex gap-1">
                    <button
                        onClick={handleSaveAll}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                        disabled={
                            isSaving || isLoading || (
                                !isBlModified && 
                                containersToAdd.length === 0 && 
                                Object.keys(containersToEdit).length === 0
                            )
                        }
                    >
                        <Save size={16} className="mr-2" />
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                    {decodedId !== "new" && (
                        <button
                            onClick={handleDeleteBl}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        >
                            <Trash2 size={16} className="mr-2" />
                            Delete B/L
                        </button>
                    )}
                </div>
            </div>

            {errorMessage && (
                <div className="flex items-center p-4 bg-red-100 text-red-700 rounded-md">
                    <AlertTriangle size={20} className="mr-2" />
                    {errorMessage}
                </div>
            )}

            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {formFields.map(field => (
                    <div key={field.id} className={`col-span-${field.colSpan || 1}`}>
                        {renderFormField(field)}
                    </div>
                ))}
            </div>

            {/* Pending additions section - Simplified with toggle */}
            {containersToAdd.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-blue-800">
                            Pending Containers to Add ({containersToAdd.length})
                        </h3>
                        <button 
                            onClick={() => setShowPendingSection(!showPendingSection)}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            {showPendingSection ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    {showPendingSection && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {containersToAdd.map((container, index) => (
                                <div 
                                    key={`pending-${index}`} 
                                    className="flex items-center justify-between bg-white p-2 rounded-md shadow-sm border border-blue-200"
                                >
                                    <span className="font-medium">{container.get("container_no")}</span>
                                    <div className="flex gap-2">
                                        {/* <button 
                                            onClick={() => handleEditPending(index)}
                                            className="text-blue-500 hover:text-blue-700"
                                        >
                                            <Pencil size={16} />
                                        </button> */}
                                        <button 
                                            onClick={() => handleRemoveContainer(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <h3 className={`text-lg font-semibold ${theme.text} mb-1`}>Containers</h3>
            <div className={`flex flex-col w-full h-full  ${
        theme.background
      }`}>
                <TableDisplay 
                    key={`container-table-${rows.length}`}
                    columns={columns} 
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
                    onRowClick={(row) => { permissions.includes('Edit_Container') && handleEdit(row)}}
                    onAddButtonClick={() => setIsAddMode(true)}
                    isAddFormOpen={isAddMode}
                    height={'calc(40vh)'}
                />
            </div>

            {/* Edit Form Modal - Improved with better styling */}
            {isEditFormOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{pendingEditIndex !== -1 ? 'Edit Pending Container' : 'Edit Container'}</h2>
                            <button onClick={handleEditFormClose} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <ContainerEntryForm 
                            editData={pendingEditIndex === -1 ? editingContainer : null}
                            initialData={pendingEditIndex !== -1 ? editingContainer : null}
                            onSubmitSuccess={(data) => {
                                if (pendingEditIndex !== -1) {
                                    setContainersToAdd(prev => {
                                        const newArr = [...prev];
                                        newArr[pendingEditIndex] = data;
                                        return newArr;
                                    });
                                    setPendingEditIndex(-1);
                                } else {
                                    setContainersToEdit(prev => ({
                                        ...prev,
                                        [editingContainer.Container_ID]: data
                                    }));
                                }
                                handleEditFormClose();
                            }}
                            onCancel={handleEditFormClose}
                            userPermissions={permissions}
                            mode={pendingEditIndex === -1 ? "edit" : "add"}
                            handleDeleteFunction={pendingEditIndex === -1 ? handleDelete : null}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}