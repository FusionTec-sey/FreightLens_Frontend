import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import TableDisplay from '../../TableDisplay/TableDisplay';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import FilterForm from '../../../utils/FilterForm';
import { useConfirm } from '../../../context/ConfirmContext';

const CLIENT_PAGE_SIZE = 15;
const SERVER_PAGE_SIZE = 50;

export default function BillOfLanding() {
    const navigate = useNavigate();
    const { permissions, logout } = useAuth();
    const { theme } = useTheme();
    const { confirm } = useConfirm();
    
    // Consolidated state
    const [state, setState] = useState({
        rows: [],
        totalItems: 0,
        isLoading: false,
        loadedPages: new Set(),
        currentPage: 1,
        filterData: {}
    });

    // Column configuration
    const columns = useMemo(() => [
        { 
            key: "BillOfLanding", 
            label: "Bill of Landing ID", 
            sortable: true,
            filterable: true,
            render: (value) => value || 'N/A'
        },
        { 
            key: "vessel_name", 
            label: "Vessel Name", 
            sortable: true,
            render: (value) => value || 'N/A'
        },
        { 
            key: "consignee_name", 
            label: "Consignee", 
            filterable: true,
            render: (value) => value || 'N/A'
        },
        { 
            key: "arrivalDate", 
            label: "Arrival Date", 
            sortable: true,
            render: (value) => formatDateTime12hr(value) || 'N/A'
        }
    ], []);

    // Main fetch data function
    const fetchData = useCallback(async (
        rawOffset = 0, 
        rawLimit = SERVER_PAGE_SIZE, 
        filters = state.filterData
    ) => {
        const safeOffset = Math.max(0, Math.floor(Number(rawOffset) || 0));
        const safeLimit = Math.max(1, Math.floor(Number(rawLimit) || SERVER_PAGE_SIZE));
        const pageNum = Math.floor(safeOffset / safeLimit) + 1;
        
        if (state.loadedPages.has(pageNum)) return;

        setState(prev => ({ ...prev, isLoading: true }));

        try {
            const params = {
                offset: safeOffset,
                limit: safeLimit,
                ...(filters.search && { search: filters.search }),
                ...(filters.BillOfLanding && { BillOfLanding: filters.BillOfLanding }),
                ...(filters.consignee_name && { ConsigneeName: filters.consignee_name })
            };

            const response = await axios.get(
                `${process.env.REACT_APP_NETWORK}/bill-of-landing`, 
                { 
                    params,
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true" 
                    }
                }
            );

            const { data, total_count } = response.data || {};

            if (!data) {
                throw new Error("No data received");
            }
            
            const formattedData = (data || []).map(item => ({
                ...item,
                arrivalDate: item.ArrivalDate
            }));

            setState(prev => {
                const newRows = [...prev.rows, ...formattedData];
                const uniqueRows = Array.from(
                    new Map(newRows.map(row => [row.BillOfLanding, row])).values()
                );
                return {
                    ...prev,
                    rows: uniqueRows.filter(Boolean),
                    totalItems: total_count || 0,
                    loadedPages: new Set(prev.loadedPages).add(pageNum)
                };
            });
            
        } catch (error) {
            console.error("Fetch error:", error);
            if (error.response?.status === 401) {
                toast.warn("Session expired. Logging in again...");
                logout();
            }
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [state.loadedPages, state.filterData, logout]);

    // Initial fetch
    useEffect(() => {
        fetchData(0, SERVER_PAGE_SIZE);
    }, []);

    // Pagination handler
    const handlePageChange = useCallback((offsetOrPage, pageSize) => {
        let targetOffset = 0;
        if (typeof offsetOrPage === "number") {
            targetOffset = Math.max(0, Math.floor(offsetOrPage));
        }
        fetchData(targetOffset, SERVER_PAGE_SIZE);
    }, [fetchData]);

    // Filter handler
    const handleFilterSubmit = useCallback((col, val) => {
        const newFilters = { [col]: val };
        setState(prev => ({
            ...prev,
            filterData: newFilters,
            loadedPages: new Set(),
            rows: []
        }));
        fetchData(0, SERVER_PAGE_SIZE, newFilters);
    }, [fetchData]);

    const handleSearch = useCallback((query) => {
        const trimmed = (query || '').trim();
        setState(prev => {
            const updated = { ...prev.filterData };
            if (trimmed) {
                updated.search = trimmed;
            } else {
                delete updated.search;
            }
            return {
                ...prev,
                filterData: updated,
                loadedPages: new Set(),
                rows: []
            };
        });
        fetchData(0, SERVER_PAGE_SIZE, {
            ...state.filterData,
            search: trimmed || undefined
        });
    }, [fetchData, state.filterData]);

    const handleDelete = useCallback(async (id) => {
        const isConfirmed = await confirm("Delete this bill of landing?");
        if (!isConfirmed) return;

        try {
            await axios.delete(
                `${process.env.REACT_APP_NETWORK}/bill-of-landing/${id}`,
                { 
                    headers: { 
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true" 
                    }
                }
            );

            toast.success("Deleted successfully");
            setState(prev => ({
                ...prev,
                rows: prev.rows.filter(row => row.BillOfLanding !== id),
                totalItems: prev.totalItems - 1
            }));
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete bill of landing");
        }
    }, [confirm]);

    const handleEdit = useCallback((rowOrId) => {
        const blId = typeof rowOrId === 'string' ? rowOrId : (rowOrId?.BillOfLanding || rowOrId);
        const rowData = typeof rowOrId === 'object' && rowOrId !== null ? rowOrId : state.rows.find(r => r.BillOfLanding === blId);
        navigate('/bill-of-landing-info', { 
            state: { mode: 'edit', billOfLandingId: blId, data: rowData } 
        });
    }, [navigate, state.rows]);

    const handleAdd = useCallback(() => {
        navigate('/bill-of-landing-info', { 
            state: { mode: 'create' } 
        });
    }, [navigate]);

    // Action column
    const actionColumn = useMemo(() => ({
        key: "actions",
        label: "Actions",
        render: (_, row) => (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {(permissions.includes("Delete_BillOfLanding") || permissions.includes("BillOfLanding")) && (
                    <button
                        onClick={() => handleDelete(row.BillOfLanding)}
                        className="p-1 text-red-600 hover:text-red-800 transition"
                        title="Delete Bill of Landing"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        )
    }), [permissions, handleDelete]);

    const allColumns = useMemo(() => 
        [...columns, actionColumn], 
        [columns, actionColumn]
    );

    const filterPopup = (
        <FilterForm
            columns={columns}
            userPermissions={permissions}
            handleFilterChange={handleFilterSubmit}
        />
    );

    return (
        <div className="space-y-3 flex flex-col h-full flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between">
                <h1 className={`text-lg font-bold ${theme.text}`}>Bills of Lading Master</h1>
                {(permissions.includes("Add_BillOfLanding") || permissions.includes("BillOfLanding")) && (
                    <button
                        onClick={handleAdd}
                        className={`flex items-center gap-2 px-3 py-1.5 font-semibold rounded-lg text-xs transition ${theme.button}`}
                    >
                        <Plus size={15} />
                        <span>Add Bill of Lading</span>
                    </button>
                )}
            </div>

            <TableDisplay
                data={state.rows}
                columns={allColumns}
                totalItems={state.totalItems}
                pageSize={CLIENT_PAGE_SIZE}
                isLoading={state.isLoading}
                onPageChange={handlePageChange}
                FilterForm={filterPopup}
                onSearch={handleSearch}
                searchPlaceholder="Search B/L ID, Vessel, Consignee..."
                onRowClick={handleEdit}
            />
        </div>
    );
}