
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TableDisplay from '../../TableDisplay/TableDisplay';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';

const CLIENT_PAGE_SIZE = 100;
const SERVER_PAGE_SIZE = 300;

export default function BillOfLanding() {
    const navigate = useNavigate();
    const { permissions } = useAuth();
    // const [loadedServerPages, setLoadedServerPages] = useState(new Set());
    
    
    // Consolidated state
    const [state, setState] = useState({
        rows: [],
        totalItems: 0,
        isLoading: false,
        loadedPages: new Set(),
        currentPage: 1
    });

    // Column configuration
    const columns = useMemo(() => [
        { 
            key: "BillOfLanding", 
            label: "Bill of Landing ID", 
            sortable: true,
            // width: '220px',
            render: (value) => value || 'N/A'
        },
        { 
            key: "vessel_name", 
            label: "Vessel Name", 
            sortable: true,
            // width: '200px',
            render: (value) => value || 'N/A'
        },
        { 
            key: "consignee_name", 
            label: "Consignee", 
            filterable: true,
            // width: '250px',
            render: (value) => value || 'N/A'
        },
        { 
            key: "arrivalDate", 
            label: "Arrival Date", 
            sortable: true,
            // width: '180px',
            render: (value) => formatDateTime12hr(value) || 'N/A'
        }
    ], []);

    // Data fetching with error handling
    const fetchData = useCallback(async (offset = 0, limit = SERVER_PAGE_SIZE) => {
        const pageNum = Math.floor(offset / limit) + 1;
        
        // Skip if already loaded
        if (state.loadedPages.has(pageNum)) return;
        
        setState(prev => ({ ...prev, isLoading: true }));
        
        try {
            const response = await axios.get(
                `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/getBl`,
                {
                    params: { offset, limit },
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                       
                    }
                }
            );
            
            const { data, total_count } = response.data;
            
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            console.log(data)
            const formattedData = data.map(item => ({
                ...item,
                arrivalDate: item.ArrivalDate // Map API field to expected column key
            }));

            setState(prev => {
                const newRows = [...prev.rows, ...formattedData];

                // Optional: deduplicate by some unique key like BillOfLanding
                const uniqueRows = Array.from(
                    new Map(newRows.map(row => [row.BillOfLanding, row])).values()
                );
                return{...prev,
                rows: uniqueRows,
                totalItems: total_count || 0,
                loadedPages: new Set(prev.loadedPages).add(pageNum)
                
        }});
            
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Failed to load data");
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [state.loadedPages, state.totalItems]);

    // Pagination handler
    const handlePageChange = useCallback((newClientPage, itemsPerPage) => {
        const startIndex = (newClientPage - 1) * itemsPerPage;
        const endIndex = newClientPage * itemsPerPage;

        const firstNeededPage = Math.floor(startIndex / SERVER_PAGE_SIZE) + 1;
        const lastNeededPage = Math.floor((endIndex - 1) / SERVER_PAGE_SIZE) + 1;

        for (let page = firstNeededPage; page <= lastNeededPage; page++) {
            // const limit = (page - 1) * SERVER_PAGE_SIZE; // ✅ FIXED
            if (!state.loadedPages.has(page)) {
                fetchData(page, SERVER_PAGE_SIZE);
            }
        }

        setState(prev => ({ ...prev, currentPage: newClientPage }));
    }, [fetchData, state.loadedPages]);



    const handleDelete = useCallback(async (id) => {
        if (!window.confirm("Delete this bill of landing?")) return;
        
        try {
            await axios.delete(
                `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/deleteBl/${id}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            toast.success("Deleted successfully");
            setState(prev => ({
                ...prev,
                loadedPages: new Set(),
                rows: []
            }));
            fetchData(0, SERVER_PAGE_SIZE);
        } catch (error) {
            toast.error("Delete failed");
            console.error("Delete error:", error);
        }
    }, [fetchData]);

    const handleEdit = useCallback((row) => {
        console.log(row)
        navigate(`/BillOfLanding/${row.BillOfLanding}`, {state: {data: row}})
    }, [navigate]);

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

    // Initial load
    useEffect(() => {
        fetchData(0, SERVER_PAGE_SIZE);
    }, [fetchData]);

    return (
        <div className="flex flex-col h-full p-4 space-y-4 bg-gray-50 rounded-lg">
            <TableDisplay
                key="bill-of-landing-table"
                columns={columns}
                data={state.rows}
                totalItems={state.totalItems}
                title="Bill of Landing Management"
                onDataChange={() => {
                    setState(prev => ({ ...prev, loadedPages: new Set(), rows: [] }));
                    fetchData(0, SERVER_PAGE_SIZE);
                }}
                userPermissions={[
                    "Add_BillOfLanding", 
                    "Edit_BillOfLanding", 
                    "Delete_BillOfLanding", 
                    "View_BillOfLanding",
                    "View_vessel_name",
                    "View_consignee_name",
                    "View_arrivalDate"]}
                actionColumn={actionColumn}
                itemsPerPage={CLIENT_PAGE_SIZE}
                serverPageSize={SERVER_PAGE_SIZE}
                isLoading={state.isLoading }
                onPageChange={handlePageChange}

                addButtonText="Add BL"
                addButtonPermission="Add_BillOfLanding"
                addDataHandler={() => navigate('/BillOfLanding/new')}
                addButtonIcon={<Plus size={18} className="mr-1" />}
                customActions={[

                ]}
                emptyStateComponent={
                    <div className="py-12 text-center">
                        <p className="text-gray-500 text-lg mb-4">No bills of landing found</p>
                        {permissions.includes('Add_BillOfLanding') && (
                            <button
                                onClick={() => navigate('/BillOfLanding/new')}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Create New Bill of Landing
                            </button>
                        )}
                    </div>
                }
            />
        </div>
    );
}