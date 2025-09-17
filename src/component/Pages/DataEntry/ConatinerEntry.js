
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TableDisplay from '../../TableDisplay/TableDisplay';
import ContainerEntryForm from './ContainerForm';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { getMaterialNames } from '../../../utils/reSolveMaterial';
import { useOptions } from "../../../hooks/useOptions";
import { Trash2, X } from 'lucide-react';
import FilterForm from '../../../utils/FilterForm';
// import Select from 'react-select/base';
import { Mail } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
const CLIENT_PAGE_SIZE = 100;
const SERVER_PAGE_SIZE = 500;

export default function ContainerEntry() {
    const { isDark, theme } = useTheme();
    const [rows, setRows] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [editingContainer, setEditingContainer] = useState(null);
    const [currentServerPage, setCurrentServerPage] = useState(1);
    const [loadedServerPages, setLoadedServerPages] = useState(new Set());
    const { permissions } = useAuth();
    const [filterData, setFilterData] = useState({});
    
    const {
      material: materialOptions,
      status,
      refresh,
      loading: optionsLoading
    } = useOptions();
    const [showAddForm, setShowAddForm] = useState(false);
    const columns = useMemo(() => [
        { key: "ContainerId", label: "Container Id", sortable: true },
        { key: "Container", label: "Container No", sortable: true, filterable: true },
        { key: "Supplier", label: "Supplier" },
        { key: "ArrivalDate", label: "Arrival Date", sortable: true },
        { key: "EmptyAt", label: "Empty At" },
        { 
            key: "Status", 
            label: "Status",
            type: "select",
            filterable: true ,
            options: status.map(item => item.name),
            cellClassName: (value) => 
                value === "On port" ? 'bg-blue-500' : 
                value === "Gate Pass" ? 'bg-green-500' : ''
        },
        { key: "Material", label: "Materials", filterable: true},
        { key: "Consignee", label: "Consignee" }
    ], [status]);
    // console.log(status)
    useEffect(() => {
    if (materialOptions.length > 0 && rows.length) 
        {
            setRows(prev =>
            prev.map(r => ({
                ...r,
                Material: getMaterialNames(r.rawData.materials, materialOptions)
            }))
            );
        }
    }, [materialOptions]);

    const transformData = useCallback((apiData) => {
        if (!apiData) return [];
        // console.log(apiData);
        
        return apiData.map(c => ({
            ContainerId: c.Container_ID,
            Container: c.container_no || "",
            Consignee: c.bill_of_landing?.consignee_name || "",
            Supplier: c.bill_of_landing?.supplier_name || "",
            ArrivalDate: c.bill_of_landing?.ArrivalDate 
                ? formatDateTime12hr(c.bill_of_landing.ArrivalDate.slice(0, 16)) 
                : "",
            EmptyAt: c.location || "",
            Status: c.state || "",
            Material: getMaterialNames(c.materials, materialOptions),
            vessal: null,
            rawData: c // Store raw data for editing
        }));
    }, [materialOptions]);

    const getIdByName = (name) => {
        const found = status.find(item => item.name === name);
        return found ? found.id : null;
    };
    const fetchData = useCallback(async (
        offset = 0,
        limit = SERVER_PAGE_SIZE,
        filters = filterData
        ) => {
        const pageNum = Math.floor(offset / limit) + 1;
        if (loadedServerPages.has(pageNum)) return;

        const statusOrder = [7, 6, 3, 2, 1, 8];


        
        try {
            const searchParams = new URLSearchParams();

            searchParams.append("offset", offset);
            searchParams.append("limit", limit);

            if (filters.Container) searchParams.append("container_no", filters.Container);
            if (filters.Supplier) searchParams.append("SupplierName", filters.Supplier);
            if (filters.Consignee) searchParams.append("ConsigneeName", filters.Consignee);
            if (filters.Status) {
            searchParams.append("status", getIdByName(filters.Status));
            } else {
            searchParams.append("excStatus", 4);
            }
            if (filters.Material) searchParams.append("material", filters.Material);

            if (statusOrder?.length) {
            statusOrder.forEach(id => searchParams.append("status_order", id)); // ✅ Repeats key without []
            }
            searchParams.append("order_by_arrival", false);
        setIsLoading(true);
        const response = await axios.get(
            `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/getContainerDetails?${searchParams.toString()}`,
            {
            
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
            }
        );

        const { data, total_count } = response.data;
        
        const transformedData = transformData(data);

        if (totalItems !== total_count) {
            setTotalItems(total_count);
        }

        setRows(prev => {
            const newRows = [...prev];
            for (let i = 0; i < transformedData.length; i++) {
            newRows[offset + i] = transformedData[i];
            }
            return newRows;
        });

        setLoadedServerPages(prev => new Set(prev).add(pageNum));
        } catch (error) {
        console.error("Failed to fetch containers:", error);
        } finally {
        setIsLoading(false);
        }
    }, [transformData, totalItems, loadedServerPages]);
    
    function handleFilterSubmit(col, val) {
        const newFilters = { [col]: val };

        // console.log("Applied Filters:", newFilters);

        setFilterData(newFilters);
        setLoadedServerPages(new Set());
        setRows([]);
        fetchData(0, SERVER_PAGE_SIZE, newFilters);
    }
    
    const handlePageChange = useCallback((newClientPage, itemsPerPage) => {
        const startIndex = (newClientPage - 1) * itemsPerPage;
        const endIndex = newClientPage * itemsPerPage;
        
        // Calculate which server pages we need
        const firstNeededPage = Math.floor(startIndex / SERVER_PAGE_SIZE) + 1;
        const lastNeededPage = Math.floor((endIndex - 1) / SERVER_PAGE_SIZE) + 1;
        
        // Fetch any missing pages
        for (let page = firstNeededPage; page <= lastNeededPage; page++) {
            if (!loadedServerPages.has(page)) {
               fetchData(page, SERVER_PAGE_SIZE);
            }
        }
        
        setCurrentServerPage(firstNeededPage);
        console.log("Page change")
    }, [fetchData, loadedServerPages]);


    const handleEdit = useCallback((row) => {
        setEditingContainer(row.rawData);
        setIsEditFormOpen(true);
    }, []);

    const handleDelete = useCallback(async (containerId) => {
        if (!window.confirm("Are you sure you want to delete this container?")) return;
        
        try {
            await axios.delete(
                `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/deleteContainerDetails/${containerId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            
            // Invalidate cache and reload
            setLoadedServerPages(new Set());
            setRows([]);
            fetchData(0, SERVER_PAGE_SIZE);
        } catch (error) {
            console.error("Failed to delete container:", error);
            alert("Failed to delete container");
        }
    }, [fetchData]);

    const handleEditFormClose = useCallback(() => {
        setIsEditFormOpen(false);
        setEditingContainer(null);
    }, []);

    const handleEditFormSubmitSuccess = useCallback(() => {
        setLoadedServerPages(new Set());
        setRows([]);
        fetchData(0, SERVER_PAGE_SIZE);
        handleEditFormClose();
     }, [fetchData, handleEditFormClose]);

   
     const actionColumn = useMemo(() => ({
        render: (row) => (
            <div className="flex justify-center space-x-2">
                {/* {permissions.includes('Edit_Container') && (
                    <button 
                        onClick={() => handleEdit(row)} 
                        className="text-blue-500 hover:text-blue-700"
                        title="Edit container"
                    >
                        <Pencil size={18} />
                    </button>
                )} */}
                {permissions.includes('Delete_Container') && (
                    <button 
                        onClick={() => handleDelete(row.ContainerId)} 
                        className="text-red-500 hover:text-red-700"
                        title="Delete container"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>
        )
    }), [handleDelete, handleEdit, permissions]);



    const handlePickupEmail = async () => {


        try {
        const response = await axios.get(`http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/toPickup`, {
            headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
            }
            // 👈 pass as query parameter
        });

        const containers = response.data;

        if (!containers.length) {
            alert("No arrived containers found.");
            return;
        }

        const subject = "Pickup Request for Arrived Containers";
        let body = "Please arrange pickup for the following containers:\n\n";

        containers.forEach((c, i) => {

                body += `${i + 1}. Container: ${c.container_no}\n   Location: ${c.venue}\n   Arrival: ${c.emptyDate}\n\n`;

        });

        const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;

        } catch (err) {
        console.error("Failed to fetch container data:", err);
        alert("Error fetching container data.");
        }
    };
    
    const handleDropoffEmail = async () => {


        try {
        const response = await axios.get(`http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/arrived`, {
            headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
            }, // 👈 pass as query parameter
        });

        const containers = response.data;

        if (!containers.length) {
            alert("No containers found to drop.");
            return;
        }

        const subject = "DropOff Request for Arrived Containers";
        let body = "Please arrange pickup for the following containers:\n\n";

        containers.forEach((c, i) => {
            body += `${i + 1}. Container: ${c.container_no}\n   Location: ${c.venue}\n   Arrival: ${c.arrival_on_port}\n\n`;
        });

        const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;

        } catch (err) {
        console.error("Failed to fetch container data:", err);
        alert("Error fetching container data.");
        }

    };
    
    useEffect(() => {
        // console.log("Material",materialOptions);
        if (!optionsLoading && materialOptions.length > 0) {
             fetchData(0, SERVER_PAGE_SIZE);
        }
    }, [optionsLoading, materialOptions, fetchData]);
    
    const filterPopup = (
        
        <FilterForm
        columns={columns}
        userPermissions={permissions}
        handleFilterChange={handleFilterSubmit}
        />
    );

   return (
        <div className={`flex flex-col w-full h-full  ${
        theme.background
      }`}>
            <TableDisplay 
                key="container-table"
                columns={columns} 
                data={rows}
                totalItems={totalItems}
                title="Container Management"
                onDataChange={() => {
                    setLoadedServerPages(new Set());
                    fetchData(0, SERVER_PAGE_SIZE);
                }}
                userPermissions={permissions}
                actionColumn={actionColumn}
                itemsPerPage={CLIENT_PAGE_SIZE}
                serverPageSize={SERVER_PAGE_SIZE}
                isLoading={isLoading || optionsLoading}
                onPageChange={handlePageChange}
                addDataComponent={
                    <ContainerEntryForm                        
                        userPermissions={permissions}
                    />
                }
                addButtonText="Add Container"
                theme={theme}
                onRowClick={(row) => {permissions.includes('Edit_Container') && handleEdit(row)}}
                addButtonPermission="Add_Container"
                filterPopup={filterPopup}
                emptyStateComponent={
                    <div className="py-8 text-center">
                        <p className="text-gray-500 dark:text-slate-300">No containers found</p>
                        {permissions.includes('Add_Container') && (
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                            >
                                Add New Container
                            </button>
                        )}
                    </div>
                }

                getRowClassName={(row) => {
                    if (isDark) {
                        switch (row.Status) {
                            case 'Unloaded':
                                return 'hover:bg-yellow-800 bg-yellow-900 text-yellow-100';
                            case 'In Transit':
                                return 'hover:bg-slate-800 bg-slate-900 text-slate-200';
                            case 'On port':
                                return 'hover:bg-blue-800 bg-blue-900 text-blue-100';
                            case 'Gate Pass':
                                return 'hover:bg-green-800 bg-green-900 text-green-100';
                            case 'Arrived':
                                return 'hover:bg-indigo-800 bg-indigo-900 text-indigo-100';
                            default:
                                return 'hover:bg-slate-800 bg-slate-900 text-slate-200';
                        }
                    } else {
                        switch (row.Status) {
                            case 'Unloaded':
                                return 'hover:bg-yellow-50 bg-yellow-200 text-yellow-900';
                            case 'In Transit':
                                return 'hover:bg-gray-100 bg-white text-gray-900';
                            case 'On port':
                                return 'hover:bg-blue-50 bg-blue-200 text-blue-900';
                            case 'Gate Pass':
                                return 'hover:bg-green-50 bg-green-200 text-green-900';
                            case 'Arrived':
                                return 'hover:bg-indigo-50 bg-indigo-200 text-indigo-900';
                            default:
                                return 'hover:bg-gray-100 bg-white text-gray-900';
                        }
                    }
                }}

                extraButton={{
                    button: <div className="flex items-center gap-1"><Mail/> </div>,
                    title: "Mail",
                    content: (
                        <>
                        
                            <button
                                onClick={handlePickupEmail}
                                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-2"
                            >
                                Pick Up
                            </button>
                            <button
                                onClick={handleDropoffEmail}
                                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                Drop Off
                            </button>
                        </>
                    )
                }}

            />

            {/* Edit Form Modal */}
            {isEditFormOpen && (
                // <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                //     <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                //         <div className="flex justify-between items-center mb-4">
                //             <h2 className="text-xl font-semibold">Edit Container</h2>
                //             <button 
                //                 onClick={handleEditFormClose}
                //                 className="text-gray-500 hover:text-gray-700 transition-colors"
                //                 aria-label="Close modal"
                //             >
                //                 ✕
                //             </button>
                //         </div>
                //         <ContainerEntryForm 
                //             editData={editingContainer}
                //             onSubmitSuccess={handleEditFormSubmitSuccess}
                //             onCancel={handleEditFormClose}
                //             userPermissions={permissions}
                //         />
                //     </div>
                // </div>
                <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 `}>
                    <div className={`rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col border-2 ${
                        theme.background
                        // theme.border
                        } ${theme.border} shadow-lg overflow-hidden`}>
                        <div className="flex justify-between items-center p-4 border-b">
                        <h3 className="text-lg font-semibold">Add New Item</h3>
                        <button onClick={handleEditFormClose}><X /></button>
                        </div>
                        <div className={`overflow-y-auto p-4 ${theme.scrollbar}`} style={{ maxHeight: 'calc(90vh - 64px)' }}>
                         <ContainerEntryForm 
                             editData={editingContainer}
                             onSubmitSuccess={handleEditFormSubmitSuccess}
                             onCancel={handleEditFormClose}
                             userPermissions={permissions}
                         />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}