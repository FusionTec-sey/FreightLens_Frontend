
import React, { useMemo, useCallback } from 'react';
// import InvoiceTable from '../../TableDisplay/ReportTable';
import TableDisplay from '../../TableDisplay/TableDisplay.js';
// import VehicleCU from './VehicleCU.js'
import { useState,useEffect } from 'react';
// import ContainerEntryForm from './ContainerForm.js';
import ReportForm from './ReportForm';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext.js';
// import { render } from '@testing-library/react';
import { Pencil, Trash2, FileText } from 'lucide-react';

async function getContainerReportData() {
  try {
    const response = await axios.get(`http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/getContainerReports`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    let data = response.data;
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    // console.log("Fetched API data:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return null;
  }
}



export default function ContainerForReport() {
    const [editingReport, setEditingReport] = useState(null);
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const { permissions } = useAuth();
    
    const handleEditClick = async (row) => {
        try {
        const response = await axios.get(`http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/getDamageReportById/${row.reportId}`, {
            headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        let data = response.data;
        console.log("Fetched data for edit:", data.documents);
        if (typeof data === "string") data = JSON.parse(data);

        setEditRow(data);  // Send full API-fetched data to the form
        setIsAddDataPopupOpen(true);
        } catch (error) {
        console.error("Failed to fetch container details:", error);
        alert("Could not load container details");
        }
    };

    const handleDeleteClick = async (row) => {
        if (!window.confirm("Are you sure you want to delete this row?")) return;

        try {
        const response = await axios.delete(`http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/deleteDamagedReport/${row.reportId}`, {
            headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.status === 200) {
            // getContainerData();
            // onDataChange();
            alert("Row deleted successfully");

            if (typeof onDataChange === "function") {
            onDataChange();
            }
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
            `http://${process.env.REACT_APP_NETWORK}:${process.env.REACT_APP_PORT}/reports/${row.reportId}`,
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
  

    async function fetchData() {
          const result = await getContainerReportData();
          if (!result || !result.column || !result.data) return;
          
          const productColumns = result.column.map(label => {
            const key = label
              .toLowerCase()
              .split(' ')
              .map((word, index) =>
                index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
              )
              .join('');

            const isHidden = key === "container_id"
            
            return { key, label, hidden: isHidden};
          });
          
          const dataRows = result.data.map(row => {
            const obj = {};
            productColumns.forEach((col, index) => {
              obj[col.key] = row[index];
            });
            return obj;
          });
          
          // console.log("Mapped columns:", productColumns);
          // console.log("Mapped rows:", dataRows);
          //
          setColumns(productColumns);
          setRows(dataRows);
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
    }, [fetchData, loadedServerPages, filterData]);

    useEffect(() => {
        fetchData();
    }, []);

    const actionColumn = useMemo(() => ({
        render: (row) =>(
            <div className="flex justify-center space-x-2">
                      <div className="flex justify-center space-x-2">
                        {permissions.includes('Edit_Report') && (
                          <button
                            onClick={() => handleEditClick(row)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit container"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                        {permissions.includes('Delete_Report') && (
                            <button
                                onClick={() => handleDeleteClick(row.ContainerId)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete container"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        {permissions.includes('Generate_Report') && (
                            <button className="p-1 text-green-600" onClick={() => handleGenerateReport(row)} title="Generate Report">
                                <FileText className="w-4 h-4" />
                            </button>
                        )}
                      </div>
            </div>
        )
    }) )
    return(
        <div className='flex items-stretch p-4 overflow-hidden flex-col w-full max-h-screen'>

        <TableDisplay
            key="Report"
            columns={columns}
            data={rows}
            userPermissions={permissions}
            actionColumn={actionColumn}
        />
        
        {/* 
            <InvoiceTable 
                key={JSON.stringify(columns) + JSON.stringify(rows)}
                columns={columns} 
                rows={rows} 
                  addDataComponent={(props) => (
                    <ReportForm {...props} onSubmitSuccess={fetchData}
                    permissions={permissions}
                    />
                   
                  )}
                title="Add Container"
                onDataChange={fetchData}
                permissions={permissions}
            /> */
        }

        </div>

    );

}


