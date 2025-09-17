import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import TableDisplay from '../../TableDisplay/TableDisplay';
import ContainerEntryForm from './EditContainerInfo';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { convertToLocalDateTimeInput } from '../../../utils/DateFormater';
import { useOptions } from "../../../hooks/useOptions";
import { Pencil, Trash2 } from 'lucide-react';
import GenericSelector from "../../UI/UXComponent/GenericSelector";
import { useTheme } from '../../../context/ThemeContext';
const CLIENT_PAGE_SIZE = 50;
const SERVER_PAGE_SIZE = 200;

export default function BillOfLandingInfo() {
    const {theme } = useTheme();
    const { permissions } = useAuth();
    const { Id } = useParams();
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
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                        </label>
                        <input
                            type={field.type}
                            name={field.id}
                            id={field.id}
                            placeholder={field.placeholder}
                            value={formData[field.id]}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            required={field.required}
                        />
                    </div>
                    {field.searchButton && (
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-blue-600 text-sm text-white rounded hover:bg-blue-700 h-fit"
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
            // labelKey: 'name',
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
            // labelKey: 'consignee_name',
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
            // labelKey: 'VessalNo',
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
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                    </label>
                    <input
                        type={field.type}
                        name={field.id}
                        id={field.id}
                        value={formData[field.id]}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                </div>
            )
        },
        {
            id: 'supplier',
            label: 'Supplier',
            type: 'select',
            options: suppliers,
            // labelKey: 'name',
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
            // labelKey: 'type',
            valueKey: 'id',
            refreshKey: 'shipping',
            addApi: 'setShippingDocument',
            colSpan: 1
        },
        // {
        //     id: 'tax',
        //     label: 'TAX',
        //     type: 'checkbox',
        //     colSpan: 1,
        //     customRender: (field) => (
        //         <div className="flex items-center">
        //             <input
        //                 type="checkbox"
        //                 name={field.id}
        //                 id={field.id}
        //                 checked={formData[field.id] === 1}
        //                 onChange={(e) => {
        //                     setFormData(prev => ({ 
        //                         ...prev, 
        //                         [field.id]: e.target.checked ? 1 : 0 
        //                     }));
        //                     setIsBlModified(true);
        //                 }}
        //                 className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        //             />
        //             <label htmlFor={field.id} className="ml-2 block text-sm text-gray-700">
        //                 {field.label}
        //             </label>
        //         </div>
        //     )
        // }
    ], [logistics, consignees, vesselList, suppliers, formData, isLoading, shipping]);

    // Columns configuration
    const columns = useMemo(() => [
        { 
            key: "container_no", 
            label: "Container No", 
            sortable: true,
            width: '150px'
        },
        { 
            key: "status", 
            label: "Status",
            cellClassName: (value) => 
                value === "On port" ? 'bg-blue-100' : 
                value === "Gate Pass" ? 'bg-green-100' : '',
            width: '120px'
        },
        { 
            key: "location", 
            label: "Location",
            width: '150px'
        },
        { 
            key: "weight", 
            label: "Weight",
            width: '120px'
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
        console.log(convertToLocalDateTimeInput(data.eventDateTime));
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


    // Fetch container data
    const fetchContainerData = useCallback(async (blNumber, offset = 0, limit = SERVER_PAGE_SIZE) => {
        const pageNum = Math.floor(offset / limit) + 1;
        if (loadedServerPages.has(pageNum)) return;
        
        setIsLoading(true);
        try {
            const response = await axios.get(
                `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/track_and_trace`, 
                {
                    params: { 
                        bl: blNumber,
            
                    },
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('token')}` 
                    }
                }
            );
            
            let data = response.data;
            console.log(data, "fetched container data")
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error("Failed to parse response data:", e);
                    data = [];
                }
            }
            setFormData()
            // Transform the data before setting it
            const transformedData = transformData(data);
            // console.log(transformedData)
            if (data.length > 0){
                setFormDataOfBl(data[0]);
            }
           
            setRows(prev => {
                const newData = [...prev];
                for (let i = 0; i < transformedData.length; i++) {
                    newData[offset + i] = transformedData[i];
                }
                return newData;
            });
            
            setTotalItems(data.length || 0);
            setLoadedServerPages(prev => new Set(prev).add(pageNum));
        } catch (error) {
            console.error("Failed to fetch containers:", error);
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
            //    fetchContainerData(formData.billOfLadingNumber, (page - 1) * SERVER_PAGE_SIZE, SERVER_PAGE_SIZE);
            }
        }
        
        setCurrentServerPage(firstNeededPage);
    }, [ formData.billOfLadingNumber, loadedServerPages]);

    // Handle form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        setIsBlModified(true); // Mark BL form as modified
    };

    // Search for bill of lading
    const handleSearch = useCallback(() => {
        if (!formData.billOfLadingNumber) return;
        
        setLoadedServerPages(new Set());
        setRows([]);
        fetchContainerData(formData.billOfLadingNumber);
    }, [formData.billOfLadingNumber]);

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
            // tax: formData.tax || 0,

            new_containers: containerData?.map(item => ({ container_no: item.container_no }))
        };
        
        const url = Id !== "new" ? 
            `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/updateBl/${Id}` :
            `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/addBl`;

        try {
            await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
        } catch (error) {
            //  console.error("Error posting data:", error); // ✅ Log full error
            return false;
        }
    };

    // Container CRUD operations
    const handleEdit = useCallback((row) => {  
        setEditingContainer(row.rawData);
        setIsEditFormOpen(true);
    }, []);

    const handleDelete = async (containerId) => {
        if (!window.confirm("Are you sure you want to delete this container?")) return;
        try {
            await axios.delete(
                `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/deleteContainerDetails/${containerId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setRows(prev => prev.filter(item => item.rawData.container_id !== containerId));
        } catch (error) {
            console.error("Failed to delete container:", error);
        }
    };

    const handleEditFormClose = () => {
        setIsEditFormOpen(false);
        setEditingContainer(null);
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            // 1. First save the bill of lading info if modified
            if (isBlModified) {
                const blSaved = await handleSave();
                if (!blSaved) {
                    alert("Failed to save Bill of Lading. Please entered BL number and date ?");
                    return;
                }
            }

            // 2. Process new containers with file uploads
            if (containersToAdd.length > 0) {
                const newContainerPromises = containersToAdd.map(async (container) => {
                    container.append("bill_of_landing.BillOfLanding", formData.billOfLadingNumber || null)
                    return axios.post(
                        `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/createContainer`,
                        container,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                });

                await Promise.all(newContainerPromises);
            }

            // 3. Process edited containers with file uploads
            if (Object.keys(containersToEdit).length > 0) {
                const editPromises = Object.entries(containersToEdit).map(async ([id, container]) => {
                    for (const [key, value] of container.entries()) {
                        console.log(`${key}: ${value}`);
                    }
                    return axios.post(
                        `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/updateContainer/${id}`,
                        container,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                });

                await Promise.all(editPromises);
            }

            // 4. Refresh data and reset states
            setLoadedServerPages(new Set());
            setRows([]);
            // await fetchContainerData(formData.billOfLadingNumber, 0, SERVER_PAGE_SIZE);
            
            setContainersToAdd([]);
            setContainersToEdit({});
            setIsBlModified(false);
            
            alert("All changes saved successfully!");
        } catch (error) {
            console.error("Save failed:", error);
            alert(error.response?.data?.message || "Failed to save changes");
        } finally {
            setIsSaving(false);
            window.history.back();
        }
    };

    // Action column configuration
    const actionColumn = useMemo(() => ({
        render: (row) => (
            <div className="flex justify-center space-x-2">
                {permissions.includes('Edit_Container') && (
                    <button 
                        onClick={() => handleEdit(row)} 
                        className="text-blue-500 hover:text-blue-700"
                        title="Edit container"
                    >
                        <Pencil size={18} />
                    </button>
                )}
                {permissions.includes('Delete_Container') && (
                    <button 
                        onClick={() => handleDelete(row.rawData.Container_ID)} 
                        className="text-red-500 hover:text-red-700"
                        title="Delete container"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        )
    }), [handleDelete, handleEdit, permissions]);

    // Initialize form with edit data if available
    useEffect(() => {
        if (editData) {
            console.log(editData, "sdfsv")
            setFormData({
                        billOfLadingNumber: editData.BillOfLanding,
                        consignee: consignees.find((opt) => opt.name === editData.consignee_name)?.id || "",
                        supplier: suppliers.find((opt) => opt.name === editData.supplier_name)?.id || "",
                        arrivalDate: editData.ArrivalDate?.slice(0, 16) || "",
                        Provider: logistics.find((opt) => opt.name === editData.provider_name)?.id || "",
                        vesselName: vesselList.find((opt) => opt.name === editData.vessel_name)?.id || "",
                        tax: editData.tax || 0, // Initialize tax field
                        shippingType: shipping.find((opt) => opt.name === editData.Doc_name)?.id || ""
                    });
            
            if (editData.containers) {
                const transformed = transformData(editData.containers);
                setRows(transformed);
                setContainerData(transformed);
            }
        }
    }, [editData, consignees, suppliers, logistics, vesselList, transformData]);

    // Render form field based on configuration
    const renderFormField = (field) => {
        if (field.customRender) {
            return field.customRender(field);
        }

        switch (field.type) {
            case 'select':
                return (
                    <div key={field.id}>
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                        </label>
                        <GenericSelector
                            value={formData[field.id] || null}
                            onChange={(val) => {
                                setFormData(prev => ({ ...prev, [field.id]: val }));
                                setIsBlModified(true);
                            }}
                            placeholder={`Enter ${field.label}`}
                            options={field.options}
                            labelKey="name"
                            valueKey={field.valueKey}
                            onAddNew={() => refresh(field.refreshKey)}
                            addApi={field.addApi}
                        />
                    </div>
                );
            case 'checkbox':
                return (
                <input
                  id={field.id}
                  type="checkbox"
                  name={field.label}
                  checked={!!formData[field.id]}
                  onChange={(e) => {
                    {
                      setFormData(prev => ({
                        ...prev,
                        [field.id]: e.target.checked ? 1 : 0
                      }));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  
                />);
            case 'text':
            case 'datetime-local':
            default:
                return (
                    <div key={field.id}>
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
                            {field.label}
                        </label>
                        <input
                            type={field.type}
                            name={field.id}
                            id={field.id}
                            placeholder={field.placeholder}
                            value={formData[field.id]}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                            required={field.required}
                        />
                    </div>
                );
        }
    };

    return (
        <div className='flex flex-col w-full h-full p-4 space-y-4'>
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold">Container Management</h1>
                <button
                    onClick={handleSaveAll}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    disabled={
                        isSaving || isLoading || (
                            !isBlModified && 
                            containersToAdd.length === 0 && 
                            Object.keys(containersToEdit).length === 0
                        )
                    }
                >
                    {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            {/* Pending additions section */}
            {containersToAdd.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-blue-800 mb-2">
                        Containers to be added ({containersToAdd.length})
                    </h3>
                    {containersToAdd.map((container, index) => (
                        <div key={`pending-${index}`} className="flex items-center justify-between bg-white p-2 rounded mb-1">
                            <span>{container.container_no || `New Container ${index + 1}`}</span>
                            <button 
                                onClick={() => handleRemoveContainer(index)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Form fields rendered from configuration */}
            <div className="grid grid-cols-2 gap-4 mb-2">
                {formFields.map(field => (
                    <div key={field.id} className={`col-span-${field.colSpan || 1}`}>
                        {renderFormField(field)}
                    </div>
                ))}
            </div>

            <h3 className="text-md font-semibold mb-2">Container Information</h3>
            <TableDisplay 
                key={`container-table-${rows.length}`}
                columns={columns} 
                data={rows.filter(Boolean)}
                totalItems={totalItems}
                title="Container Management"
                onDataChange={() => {
                    setLoadedServerPages(new Set());
                    fetchContainerData(formData.billOfLadingNumber, 0, SERVER_PAGE_SIZE);
                }}
                userPermissions={["View_container_no", "Add"]}
                actionColumn={actionColumn}
                itemsPerPage={CLIENT_PAGE_SIZE}
                serverPageSize={SERVER_PAGE_SIZE}
                isLoading={isLoading || optionsLoading}
                onPageChange={handlePageChange}
                theme={theme}
                addDataComponent={
                    <ContainerEntryForm 
                        onSubmitSuccess={handleAddContainer}
                        onCancel={() => setIsAddMode(false)}
                        userPermissions={permissions}
                        mode="add"
                    />
                }
                showAddButton={permissions.includes('Add_Container')}
                addButtonText="Add Container"
                onAddButtonClick={() => setIsAddMode(true)}
                isAddFormOpen={isAddMode}
                height='calc(36vh)'
            />

            {/* Edit Form Modal */}
            {isEditFormOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Edit Container</h2>
                        </div>
                        <ContainerEntryForm 
                            editData={editingContainer}
                            onSubmitSuccess={(data) => {
                                setContainersToEdit(prev => ({
                                    ...prev,
                                    [editingContainer.Container_ID]: data
                                }));
                                handleEditFormClose();
                            }}
                            onCancel={() => handleEditFormClose()}
                            userPermissions={permissions}
                            mode="edit"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}