import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TableDisplay from '../../TableDisplay/TableDisplay';
import ContainerEntryForm from './ContainerForm';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { getMaterialNames } from '../../../utils/reSolveMaterial';
import { useOptions } from "../../../hooks/useOptions";
import { Pencil } from 'lucide-react';
import FilterForm from '../../../utils/FilterForm';
// import { X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useConfirm } from '../../../context/ConfirmContext';
const CLIENT_PAGE_SIZE = 50;
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
  const { permissions } = useAuth();
  const {
    material: materialOptions,
    status,
    refresh,
    loading: optionsLoading,
  } = useOptions();

  const columns = useMemo(() => [
    { key: "ContainerId", label: "Container Id", sortable: true },
    { key: "Container", label: "Container No", sortable: true, filterable: true, type: "text" },
    { key: "Supplier", label: "Supplier", filterable: true, type: "text" },
    { key: "ArrivalDate", label: "Arrival Date", sortable: true },
    { key: "EmptyAt", label: "Empty At" },
    {
      key: "Status",
      label: "Status",
      filterable: true,
      type: "select",
      options: status.map(item => item.name)
    },
    { key: "Material", label: "Materials", filterable: true, type: "text" },
    { key: "Consignee", label: "Consignee",  type: "text" }
  ], [status]);

  const transformData = useCallback((apiData) => {
    console.log(apiData)
    return (apiData || []).map(c => ({
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
      created_at: c.created_at ? formatDateTime12hr(c.created_at.slice(0, 16)) : "",
      updated_at: c.updated_at ? formatDateTime12hr(c.updated_at.slice(0, 16)) : "",
      created_by_name: c.created_by_name || "System",
      updated_by_name: c.updated_by_name || "System",
      // vessal: vesselList.find((opt) => opt.name === bill?.vessal)?.id || null,
      rawData: c
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

    setIsLoading(true);
    try {
      const params = {
        status: 4,
        offset,
        limit,
      };
      console.log(filters)
      if (filters.Container) params.container_no = filters.Container;
      if (filters.Supplier) params.SupplierName = filters.Supplier;
      if (filters.Consignee) params.ConsigneeName = filters.Consignee;
       params.status = (filters.Status) ? getIdByName(filters.Status) : 4;
      if (filters.Material) params.material = filters.Material;

      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/containers`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            
            
          },
          
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
  }, [fetchData, loadedServerPages, filterData]);

  const handleEdit = useCallback((row) => {
    setEditingContainer(row.rawData);
    setIsEditFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (containerId) => {
    const isConfirmed = await confirm("Are you sure you want to delete this container?");
    if (!isConfirmed) return;
    
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/containers/${containerId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}`,
            "skip_zrok_interstitial": "true"
         },
        
      }
      );

      setLoadedServerPages(new Set());
      setRows([]);
      fetchData(0, SERVER_PAGE_SIZE, filterData);
    } catch (error) {
      console.error("Failed to delete container:", error);
      toast.error("Failed to delete container");
    }
  }, [fetchData, filterData]);

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
    if (!optionsLoading && materialOptions.length > 0) {
      fetchData(0, SERVER_PAGE_SIZE);
    }
  }, [optionsLoading, materialOptions, fetchData]);
    
  function handleFilterSubmit(col, val) {
        const newFilters = { [col]: val };

        // console.log("Applied Filters:", newFilters);

        setFilterData(newFilters);
        setLoadedServerPages(new Set());
        setRows([]);
        fetchData(0, SERVER_PAGE_SIZE, newFilters);
  }



  const filterPopup = (
    <FilterForm
      columns={columns}
      userPermissions={permissions}
      handleFilterChange={handleFilterSubmit}
    />
  );

  const actionColumn = useMemo(() => ({
    render: (row) => (
      <div className="flex justify-center">
        {permissions.includes('Edit_Container') && (
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded p-1"
            title="Edit container"
          >
            <Pencil size={18} />
          </button>
        )}
      </div>
    )
  }), [permissions]);

  return (
    <div className={`flex items-stretch flex-col w-full max-h-screen ${theme.background}`}>
      <TableDisplay
        key="container-table"
        columns={columns}
        data={rows}
        totalItems={totalItems}
        itemsPerPage={CLIENT_PAGE_SIZE}
        serverPageSize={SERVER_PAGE_SIZE}
        isLoading={isLoading || optionsLoading}
        onPageChange={handlePageChange}
        theme={theme}
        onDataChange={() => {
          setLoadedServerPages(new Set());
          fetchData(0, SERVER_PAGE_SIZE, filterData);
        }}
        onRowClick={(row) => {permissions.includes('Edit_Container') && handleEdit(row)}}
        // actionColumn={actionColumn}
        title="Container"
        userPermissions={permissions}
        filterPopup={filterPopup}
        getRowClassName={(row) => {
                if (isDark) {
                  return 'hover:bg-slate-800 bg-slate-900 text-slate-200';
                }
                return `hover:bg-gray-100 bg-white ${theme.text}`}}
      />

      {isEditFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto ${theme.background}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editingContainer ? "Edit Container" : "Add New Item"}</h2>
              <button
                onClick={handleEditFormClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ContainerEntryForm
              editData={editingContainer}
              onSubmitSuccess={handleEditFormSubmitSuccess}
              onCancel={handleEditFormClose}
              userPermissions={permissions}
              handleDeleteFunction={handleDelete}

            />
          </div>
        </div>
      )}
    </div>
  );
}
