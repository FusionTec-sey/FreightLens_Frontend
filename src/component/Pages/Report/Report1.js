
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TableDisplay from '../../TableDisplay/TableDisplay';
// import ContainerEntryForm from './ContainerForm';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { formatDateTime12hr } from '../../../utils/DateFormater';
import { getMaterialNames } from '../../../utils/reSolveMaterial';
import { useOptions } from "../../../hooks/useOptions";
import { X, Pencil, Trash, FileText } from 'lucide-react';
import FilterForm from '../../../utils/FilterForm';
// import Select from 'react-select/base';
// import { Mail } from 'lucide-react';
import ReportForm from './ReportForm';

import { useTheme } from '../../../context/ThemeContext';
import { div } from 'framer-motion/m';
const CLIENT_PAGE_SIZE = 100;
const SERVER_PAGE_SIZE = 500;


export default function ContainerForReport1() {
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [currentServerPage, setCurrentServerPage] = useState(1);
  const [loadedServerPages, setLoadedServerPages] = useState(new Set());
  const [filterData, setFilterData] = useState({});
  const { isDark, theme } = useTheme();
  const { permissions } = useAuth();
  const [isAddDataPopupOpen, setIsAddDataPopupOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);  // <- track which row is being edited

  
  const {
    material: materialOptions,
    status,
    refresh,
    loading: optionsLoading,
  } = useOptions();
  
  // async function fetchData(    offset = 0,
  //   limit = SERVER_PAGE_SIZE,
  //   filters = filterData) {
  //   try {
  //     const response = await axios.get(`${process.env.REACT_APP_NETWORK}/getContainerReports`, {
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem('token')}`
  //       }
  //     });
  //     let data = response.data;
  //     if (typeof data === 'string') {
  //       data = JSON.parse(data);
  //     }
  //     setRows(data);
  //     // return data;
  //   } catch (error) {
  //     console.error("Failed to fetch inventory:", error);
  //     return null;
  //   }
  // }

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
        // status: 4,
        offset,
        limit,
      };
      // console.log(filters)
      // if (filters.Container) params.container_no = filters.Container;
      // if (filters.Supplier) params.SupplierName = filters.Supplier;
      // if (filters.Consignee) params.ConsigneeName = filters.Consignee;
      //  params.status = (filters.Status) ? getIdByName(filters.Status) : 4;
      // if (filters.Material) params.material = filters.Material;

      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/getDamageReport`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const { data, total_count } = response.data;
      // const transformedData = transformData(data);
      const transformedData = data;

      if (totalItems !== total_count) {
        setTotalItems(total_count);
      }
      console.log(data);
      setRows(prev => {
        const newRows = [...prev];
        for (let i = 0; i < transformedData.length; i++) {
          newRows[offset + i] = transformedData[i];
        }
        return newRows;
      });
      setIsEditFormOpen(false);
      setLoadedServerPages(prev => new Set(prev).add(pageNum));
    } catch (error) {
      console.error("Failed to fetch containers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [ totalItems, loadedServerPages]);

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
  

  const columns = useMemo(() => [
      { key: "ContainerId", label: "Container Id", sortable: true },
      { key: "ReportId", label: "Report Id", sortable: true, filterable: true, type: "text" },   
      { key: "ContainerNo", label: "Container No", sortable: true, filterable: true, type: "text" },
      
    ])


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

  const handleEditClick = async (row) => {
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_NETWORK}/getDamageReportById/${row.ReportId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      let data = response.data;
      console.log("Fetched data for edit:", data);
      if (typeof data === "string") data = JSON.parse(data);

      setEditRow(data);  // Send full API-fetched data to the form
      setIsEditFormOpen(true);
    } catch (error) {
      console.error("Failed to fetch container details:", error);
      alert("Could not load container details");
    }
  };

  const handleDeleteClick = async (row) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;

    try {
      const response = await axios.delete(`${process.env.REACT_APP_NETWORK}/deleteDamagedReport/${row.ReportId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (response.status === 200) {
        // getContainerData();
        fetchData();
        // onDataChange();
        alert("Row deleted successfully");

        // if (typeof onDataChange === "function") {
        //   // onDataChange();
        // }
        // Optionally, refresh the data or remove the row from state
      } else {
        alert("Failed to delete row");
      }
    } catch (error) {
      console.error("Failed to delete row:", error);
      alert("Error deleting row");
    }
  }

  const handleGenerateReport = async (row) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/${row.ReportId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          responseType: "blob", // Important to receive PDF file
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `Damage_Report_${row.reportId}.pdf`;
      link.click();
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Could not generate PDF report");
    }
  };  
  
    const actionColumn = useMemo(() => ({
      render: (row) => (
        <div className="flex justify-center">
          {permissions.includes('Edit_Report') && (
            <button
              onClick={() => handleEditClick(row)}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded p-1"
              title="Edit container"
            >
              <Pencil size={18} />
            </button>
          )}

                    {permissions.includes('Generate_Report') && (
            <button
              onClick={() => handleGenerateReport(row)}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded p-1"
              title="Gererate"
            >
              <FileText size={18} />
            </button>
          )}

                    {permissions.includes('Delete_Report') && (
            <button
              onClick={() => handleDeleteClick(row)}
              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded p-1"
              title="Delete Container"
            >
              <Trash size={18} />
            </button>
          )}
          
        </div>
      )
    }), [permissions]);

  return (
    <div className={`flex items-stretch flex-col w-full max-h-screen ${theme.background}`}>
      <TableDisplay
        key="ContainerReport"
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
        addDataComponent={
          <ReportForm
              editData={null}
              onSubmitSuccess={fetchData}
              // onCancel={handleEditFormClose}
              permissions={permissions}
              // handleDeleteFunction={handleDelete}

          /> 
        }
        addButtonText="Create Report"
        addButtonPermission="Add_Report"
        
        // onRowClick={(row) => {permissions.includes('Edit_Report') && handleEditClick(row)}}
        actionColumn={actionColumn}
        title="ContainerNo"
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
                onClick={() => setIsEditFormOpen(!isEditFormOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ReportForm
              editData={editRow}
              onSubmitSuccess={fetchData}
              // onCancel={handleEditFormClose}
              permissions={permissions}
              // handleDeleteFunction={handleDelete}

            />
          </div>
        </div>
      )}
    </div>

      
  );
}