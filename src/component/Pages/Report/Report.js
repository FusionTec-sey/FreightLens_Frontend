
import React from 'react';
import InvoiceTable from '../../TableDisplay/ReportTable';
import TableDisplay from '../../TableDisplay/TableDisplay.js';
// import VehicleCU from './VehicleCU.js'
import { useState,useEffect } from 'react';
// import ContainerEntryForm from './ContainerForm.js';
import ReportForm from './ReportForm';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext.js';

async function getContainerReportData() {
  try {
    const response = await axios.get(`${process.env.REACT_APP_NETWORK}/getContainerReports`, {
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

    useEffect(() => {
        fetchData();
    }, []);

    return(
        <div className='flex items-stretch p-4 overflow-hidden flex-col w-full max-h-screen'>


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
            />

        </div>

    );

}


