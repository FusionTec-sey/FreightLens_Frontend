import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TableDisplay from '../../TableDisplay/TableDisplay';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { X, Pencil, Trash, FileText } from 'lucide-react';
import FilterForm from '../../../utils/FilterForm';
import { useTheme } from "../../../context/ThemeContext.js";
import { toast } from 'react-toastify';
import ReportForm from './ReportForm';
import { useConfirm } from '../../../context/ConfirmContext';
import { useOptions } from "../../../hooks/useOptions";

const CLIENT_PAGE_SIZE = 15;
const SERVER_PAGE_SIZE = 50;

export default function ContainerForReport1() {
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [loadedServerPages, setLoadedServerPages] = useState(new Set());
  const [filterData, setFilterData] = useState({});
  const { isDark, theme } = useTheme();
  const { confirm } = useConfirm();
  const { permissions } = useAuth();
  const [editRow, setEditRow] = useState(null);

  const {
    status,
    loading: optionsLoading,
  } = useOptions();

  const fetchData = useCallback(async (
    offset = 0,
    limit = SERVER_PAGE_SIZE,
    filters = filterData,
    forceRefresh = false
  ) => {
    const pageNum = Math.floor(offset / limit) + 1;
    if (!forceRefresh && loadedServerPages.has(pageNum)) return;

    setIsLoading(true);
    try {
      const params = {
        offset,
        limit,
      };

      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/damage-reports`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            "skip_zrok_interstitial": "true",
          },
        }
      );

      const { data, total_count } = response.data || {};
      const transformedData = data || [];

      if (totalItems !== (total_count || 0)) {
        setTotalItems(total_count || 0);
      }

      setRows(prev => {
        if (forceRefresh || offset === 0) {
          return transformedData;
        }
        const newRows = [...prev];
        for (let i = 0; i < transformedData.length; i++) {
          newRows[offset + i] = transformedData[i];
        }
        return newRows.filter(Boolean);
      });

      setIsEditFormOpen(false);
      setLoadedServerPages(prev => {
        const nextSet = forceRefresh ? new Set() : new Set(prev);
        nextSet.add(pageNum);
        return nextSet;
      });
    } catch (error) {
      console.error("Failed to fetch damage reports:", error);
      toast.error("Failed to fetch damage reports");
    } finally {
      setIsLoading(false);
    }
  }, [totalItems, loadedServerPages, filterData]);

  const handleRefresh = useCallback(() => {
    setLoadedServerPages(new Set());
    setRows([]);
    fetchData(0, SERVER_PAGE_SIZE, filterData, true);
  }, [fetchData, filterData]);

  useEffect(() => {
    fetchData(0, SERVER_PAGE_SIZE, filterData, true);
  }, []);

  const columns = useMemo(() => [
    { key: "ReportId", label: "Report Id", sortable: true, filterable: true, type: "text", width: "110px" },
    { key: "ContainerNo", label: "Container No", sortable: true, filterable: true, type: "text", width: "200px" },
  ], []);

  function handleFilterSubmit(col, val) {
    const newFilters = { [col]: val };
    setFilterData(newFilters);
    setLoadedServerPages(new Set());
    setRows([]);
    fetchData(0, SERVER_PAGE_SIZE, newFilters, true);
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
      const response = await axios.get(`${process.env.REACT_APP_NETWORK}/damage-reports/${row.ReportId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "skip_zrok_interstitial": "true",
        },
      });

      let data = response.data;
      if (typeof data === "string") data = JSON.parse(data);

      setEditRow(data);
      setIsEditFormOpen(true);
    } catch (error) {
      console.error("Failed to fetch damage report details:", error);
      toast.error("Could not load damage report details");
    }
  };

  const handleDeleteClick = async (row) => {
    const isConfirmed = await confirm("Are you sure you want to delete this report?");
    if (!isConfirmed) return;

    try {
      const response = await axios.delete(`${process.env.REACT_APP_NETWORK}/damage-reports/${row.ReportId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "skip_zrok_interstitial": "true",
        },
      });

      if (response.status === 200 || response.status === 204) {
        toast.success("Report deleted successfully");
        handleRefresh();
      } else {
        toast.error("Failed to delete report");
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
      toast.error("Error deleting report");
    }
  };

  const handleGenerateReport = async (row) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_NETWORK}/reports/${row.ReportId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "skip_zrok_interstitial": "true",
          },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `Damage_Report_${row.ReportId}.pdf`;
      link.click();
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Could not generate PDF report");
    }
  };

  const actionColumn = useMemo(() => ({
    key: "actions",
    label: "",
    width: "120px",
    render: (_, row) => (
      <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
        {permissions.includes('Edit_Report') && (
          <button
            onClick={() => handleEditClick(row)}
            className="p-1 text-blue-600 hover:text-blue-800 transition"
            title="Edit Report"
          >
            <Pencil size={16} />
          </button>
        )}

        {permissions.includes('Generate_Report') && (
          <button
            onClick={() => handleGenerateReport(row)}
            className="p-1 text-emerald-600 hover:text-emerald-800 transition"
            title="Generate PDF Report"
          >
            <FileText size={16} />
          </button>
        )}

        {permissions.includes('Delete_Report') && (
          <button
            onClick={() => handleDeleteClick(row)}
            className="p-1 text-red-600 hover:text-red-800 transition"
            title="Delete Report"
          >
            <Trash size={16} />
          </button>
        )}
      </div>
    )
  }), [permissions, confirm]);

  return (
    <div className="space-y-3 flex flex-col h-full flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className={`text-lg font-bold ${theme.text}`}>Damage Product Reports</h1>
      </div>

      <TableDisplay
        key="ContainerReport"
        columns={columns}
        data={rows}
        totalItems={totalItems}
        pageSize={CLIENT_PAGE_SIZE}
        serverPageSize={SERVER_PAGE_SIZE}
        isLoading={isLoading || optionsLoading}
        onPageChange={(offset) => fetchData(offset, SERVER_PAGE_SIZE, filterData)}
        theme={theme}
        onDataChange={handleRefresh}
        primaryKey="ReportId"
        onRowClick={(row) => permissions.includes('Edit_Report') && handleEditClick(row)}
        addDataComponent={
          <ReportForm
            editData={null}
            onSubmitSuccess={handleRefresh}
            permissions={permissions}
          />
        }
        addButtonText="Create Report"
        addButtonPermission="Add_Report"
        actionColumn={actionColumn}
        title="ContainerNo"
        userPermissions={permissions}
        filterPopup={filterPopup}
      />

      {isEditFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col border-2 ${theme.background} ${theme.border} shadow-2xl overflow-hidden`}>
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold">{editRow ? "Edit Damage Report" : "New Damage Report"}</h2>
              <button
                onClick={() => setIsEditFormOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className={`overflow-y-auto ${theme.scrollbar}`} style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <ReportForm
                editData={editRow}
                onSubmitSuccess={() => {
                  setIsEditFormOpen(false);
                  handleRefresh();
                }}
                onCancel={() => setIsEditFormOpen(false)}
                permissions={permissions}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
