import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import TableDisplay from '../../TableDisplay/TableDisplay';
import ContainerEntryForm from './ContainerForm';
import ContainerContextPanel from './ContainerContextPanel';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { getMaterialNames } from '../../../utils/reSolveMaterial';
import { useOptions } from "../../../hooks/useOptions";
import { Trash2, X } from 'lucide-react';
import FilterForm from '../../../utils/FilterForm';
import { useTheme } from '../../../context/ThemeContext';
import { useConfirm } from '../../../context/ConfirmContext';

const CLIENT_PAGE_SIZE = 15;
const SERVER_PAGE_SIZE = 50;

export default function CompleteContainer() {
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [currentServerPage, setCurrentServerPage] = useState(1);
  const [loadedServerPages, setLoadedServerPages] = useState(new Set());
  const [filterData, setFilterData] = useState({});
  const { isDark, theme } = useTheme();
  const { confirm } = useConfirm();
  const { permissions, logout } = useAuth();
  const {
    material: materialOptions,
    status,
    loading: optionsLoading,
  } = useOptions();

  const columns = useMemo(() => [
    { key: "ContainerId", label: "Container Id", sortable: true, width: "95px" },
    { key: "Container", label: "Container No", sortable: true, filterable: true, type: "text", width: "135px" },
    { key: "Supplier", label: "Supplier", filterable: true, type: "text", width: "140px" },
    { key: "ArrivalDate", label: "Arrival Date", sortable: true, width: "145px" },
    { key: "EmptyAt", label: "Empty At", width: "110px" },
    { key: "Demurrage", label: "Free Days / D&D", width: "135px" },
    { key: "Status", label: "Status", filterable: true, type: "select", options: (status || []).map(item => item.name), width: "110px" },
    { key: "Material", label: "Materials", filterable: true, type: "text", width: "150px" },
    { key: "Consignee", label: "Consignee", type: "text", width: "150px" }
  ], [status]);

  const transformData = useCallback((apiData) => {
    return (apiData || []).map(c => {
      const freeDaysVal = c.FreeDays !== null && c.FreeDays !== undefined ? c.FreeDays : (c.bill_of_landing?.FreeDays ?? 10);
      return {
        ContainerId: c.Container_ID,
        Container: c.container_no || "",
        Consignee: c.bill_of_landing?.consignee_name || "",
        Supplier: c.bill_of_landing?.supplier_name || "",
        ArrivalDate: c.bill_of_landing?.ArrivalDate
          ? formatDateTime12hr(c.bill_of_landing.ArrivalDate.slice(0, 16))
          : "",
        EmptyAt: c.location || "",
        Demurrage: `${freeDaysVal} Free Days`,
        Status: c.state || "",
        Material: getMaterialNames(c.materials, materialOptions),
        created_at: c.created_at ? formatDateTime12hr(c.created_at.slice(0, 16)) : "",
        updated_at: c.updated_at ? formatDateTime12hr(c.updated_at.slice(0, 16)) : "",
        created_by_name: c.created_by_name || "System",
        updated_by_name: c.updated_by_name || "System",
        rawData: c
      };
    });
  }, [materialOptions]);
 
  const getIdByName = (name) => {
    const found = (status || []).find(item => item.name === name);
    return found ? found.id : null;
  };

  const fetchData = useCallback(async (
    rawOffset = 0,
    rawLimit = SERVER_PAGE_SIZE,
    filters = filterData
  ) => {
    const safeOffset = Math.max(0, Math.floor(Number(rawOffset) || 0));
    const safeLimit = Math.max(1, Math.floor(Number(rawLimit) || SERVER_PAGE_SIZE));
    const pageNum = Math.floor(safeOffset / safeLimit) + 1;

    if (loadedServerPages.has(pageNum)) return;

    setIsLoading(true);
    try {
      const params = {
        status: 4,
        offset: safeOffset,
        limit: safeLimit,
      };

      if (filters.search) params.search = filters.search;
      if (filters.Container) params.container_no = filters.Container;
      if (filters.Supplier) params.SupplierName = filters.Supplier;
      if (filters.Consignee) params.ConsigneeName = filters.Consignee;
      if (filters.Status) params.status = getIdByName(filters.Status);
      if (filters.Material) params.material = filters.Material;

      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/containers`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            skip_zrok_interstitial: "true"
          },
        }
      );

      const { data, total_count } = response.data || {};
      const transformedData = transformData(data || []);

      if (totalItems !== (total_count || 0)) {
        setTotalItems(total_count || 0);
      }

      setRows(prev => {
        const newRows = [...prev];
        for (let i = 0; i < transformedData.length; i++) {
          newRows[safeOffset + i] = transformedData[i];
        }
        return newRows.filter(Boolean);
      });

      setLoadedServerPages(prev => new Set(prev).add(pageNum));
    } catch (error) {
      console.error("Failed to fetch containers:", error);
      if (error.response?.status === 401) {
        toast.warn("Session expired. Logging in again...");
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [transformData, totalItems, loadedServerPages, filterData, status, logout]);

  const handlePageChange = useCallback((offsetOrPage, pageSize) => {
    let targetOffset = 0;
    if (typeof offsetOrPage === "number") {
      targetOffset = Math.max(0, Math.floor(offsetOrPage));
    }
    fetchData(targetOffset, SERVER_PAGE_SIZE);
  }, [fetchData]);

  const handleEdit = useCallback((row) => {
    const containerData = row?.rawData || row;
    setEditingContainer(containerData);
    setIsEditFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (containerId) => {
    const isConfirmed = await confirm("Are you sure you want to delete this container?");
    if (!isConfirmed) return;
    
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/containers/${containerId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            skip_zrok_interstitial: "true"
          },
        }
      );

      toast.success("Container deleted successfully");
      setLoadedServerPages(new Set());
      setRows([]);
      fetchData(0, SERVER_PAGE_SIZE, filterData);
    } catch (error) {
      console.error("Failed to delete container:", error);
      toast.error("Failed to delete container");
    }
  }, [fetchData, filterData, confirm]);

  const handleEditFormClose = useCallback(() => {
    setIsEditFormOpen(false);
    setEditingContainer(null);
  }, []);

  const handleEditFormSubmitSuccess = useCallback(() => {
    setLoadedServerPages(new Set());
    setRows([]);
    fetchData(0, SERVER_PAGE_SIZE, filterData);
    handleEditFormClose();
  }, [fetchData, handleEditFormClose, filterData]);

  useEffect(() => {
    if (!optionsLoading) {
      fetchData(0, SERVER_PAGE_SIZE);
    }
  }, [optionsLoading]);

  function handleFilterSubmit(col, val) {
    const newFilters = { [col]: val };
    setFilterData(newFilters);
    setLoadedServerPages(new Set());
    setRows([]);
    fetchData(0, SERVER_PAGE_SIZE, newFilters);
  }

  const handleSearch = useCallback((query) => {
    const trimmed = (query || '').trim();
    const newFilters = { ...filterData };
    if (trimmed) {
      newFilters.search = trimmed;
    } else {
      delete newFilters.search;
    }
    setFilterData(newFilters);
    setLoadedServerPages(new Set());
    setRows([]);
    fetchData(0, SERVER_PAGE_SIZE, newFilters);
  }, [filterData, fetchData]);

  const filterPopup = (
    <FilterForm
      columns={columns}
      userPermissions={permissions}
      handleFilterChange={handleFilterSubmit}
    />
  );

  const actionColumn = useMemo(() => {
    return {
      key: "actions",
      label: "",
      width: "48px",
      render: (_, row) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleDelete(row.ContainerId)}
            className="p-1 text-red-600 hover:text-red-800 transition"
            title="Delete Container"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    };
  }, [handleDelete]);

  const allColumns = useMemo(() => {
    return [...columns, actionColumn];
  }, [columns, actionColumn]);

  const getRowClassName = useCallback((row) => {
    const isOverdue = row.Demurrage && String(row.Demurrage).includes("Overdue");
    if (isDark) {
        if (isOverdue) {
            return 'hover:bg-red-450 bg-red-400 text-red-50';
        } else {
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
        }
    } else {
        if (isOverdue) {
            return 'hover:bg-red-450 bg-red-400 text-red-50';
        } else {
            switch (row.Status) {
                case 'Unloaded':
                    return 'hover:bg-yellow-50 bg-yellow-200 text-yellow-900';
                case 'In Transit':
                    return `hover:bg-gray-100 bg-white ${theme.text}`;
                case 'On port':
                    return 'hover:bg-blue-50 bg-blue-200 text-blue-900';
                case 'Gate Pass':
                    return 'hover:bg-green-50 bg-green-200 text-green-900';
                case 'Arrived':
                    return 'hover:bg-indigo-50 bg-indigo-200 text-indigo-900';
                default:
                    return `hover:bg-gray-100 bg-white ${theme.text}`;
            }
        }
    }
  }, [isDark, theme]);

  return (
    <div className="space-y-3 flex flex-col h-full flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className={`text-lg font-bold ${theme.text}`}>View Complete Containers</h1>
      </div>

      <TableDisplay
        data={rows}
        columns={allColumns}
        totalItems={totalItems}
        pageSize={CLIENT_PAGE_SIZE}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        FilterForm={filterPopup}
        getRowClassName={getRowClassName}
        onRowClick={handleEdit}
        primaryKey="Container"
        onSearch={handleSearch}
        searchPlaceholder="Search Container No, Supplier, Consignee..."
      />

      {isEditFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg w-full max-w-5xl max-h-[92vh] flex flex-col border-2 ${theme.background} ${theme.border} shadow-2xl overflow-hidden`}>
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold">Edit Completed Container</h3>
                {editingContainer && (
                  <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                    {editingContainer.container_no || editingContainer.Container}
                  </span>
                )}
              </div>
              <button onClick={handleEditFormClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                <X size={20} />
              </button>
            </div>
            <div className={`overflow-y-auto p-4 ${theme.scrollbar}`} style={{ maxHeight: 'calc(92vh - 64px)' }}>
              <ContainerEntryForm
                isOpen={isEditFormOpen}
                userPermissions={permissions}
                onClose={handleEditFormClose}
                editData={editingContainer}
                onSubmitSuccess={handleEditFormSubmitSuccess}
              />

              {/* Cross-Module Operations & Context Panel */}
              {editingContainer && (
                <ContainerContextPanel
                  containerId={editingContainer.Container_ID || editingContainer.ContainerId}
                  containerNo={editingContainer.container_no || editingContainer.Container}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
