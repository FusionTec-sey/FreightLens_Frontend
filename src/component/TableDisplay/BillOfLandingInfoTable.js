import "./TableDispla.css"
import axios from "axios";
import { useNavigate } from "react-router-dom";
import React, { useState, useMemo } from "react";
import { Pencil, Trash, Settings, Filter, X, Plus, FileText } from "lucide-react";
import CollapsibleCard from '../UI/CollapsibleCard';
import { useTheme } from "../../context/ThemeContext";

const InvoiceTable = ({ columns, rows, addDataComponent = false, title, onDataChange, permissions, newBl  }) => {
  // console.log(rows, "row")
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [isAddDataPopupOpen, setIsAddDataPopupOpen] = useState(false);
  const [filterColumn, setFilterColumn] = useState(columns[0]?.key || "");
  const [filterValue, setFilterValue] = useState("");
  const [tempVisibleColumns, setTempVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [editRow, setEditRow] = useState(null);  // <- track which row is being edited
  const [currentBlState, setCurrentBlState] = useState(newBl);
  const [visibleColumns, setVisibleColumns] = useState(tempVisibleColumns);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleColumnToggle = (key) => {
    setTempVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = () => {
    setVisibleColumns(tempVisibleColumns);
    setIsSettingsPopupOpen(false);
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };
  // console.log(currentBlState !== "new", "oigu")
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return rows;
    return [...rows].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [sortConfig, rows]);

  const filteredData = useMemo(() => {
    return sortedData.filter((row) =>
      row[filterColumn]?.toString().toLowerCase().includes(filterValue.toLowerCase())
    );
  }, [filterColumn, filterValue, sortedData]);

  const handleEditClick = async (row) => {
    
    // console.log(row, "Row");
    setEditRow(row);
    

  };

  const handleDeleteClick = async (row) => {
    if (!window.confirm("Are you sure you want to delete this row?")) return;

    try {
      const response = await axios.delete(`${process.env.REACT_APP_NETWORK}/deleteBl/${row.BillOfLanding}`, {
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


  
  const hasPermission = (field) => permissions.includes(`${field}`);

  const renderMobileCardView = () => (
    <div className="space-y-2">
      {filteredData.map((row, index) => (
        <CollapsibleCard
          key={index}
          title={`Container: ${row.Container || row.containerNumber || row.ContainerNumber || row.BillOfLanding || `#${index + 1}`}`}
          theme={theme}
          className="mb-2"
        >
          <div className="p-4 space-y-3">
            {columns.map(col => (
              <div key={col.key} className="flex justify-between items-start">
                <span className="font-medium text-sm text-gray-500 dark:text-gray-400">{col.label}:</span>
                <span className="text-right text-sm flex-1 ml-2">
                  {row[col.key]}
                </span>
              </div>
            ))}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end">
                {currentBlState !== "new" && (
                  <button
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    onClick={() => {
                      handleEditClick(row);
                      setIsAddDataPopupOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CollapsibleCard>
      ))}
    </div>
  );

  return (

    <div className=" relative " disabled={true}>
      <div className="flex justify-between mb-2 pr-2">
        <div className="sapce-x-1 flex items-center">
          {false && (
          <button className="p-2 border rounded bg-black text-white flex items-center" 
            onClick={() => {
              setIsAddDataPopupOpen(!isAddDataPopupOpen)
            //   navigate(`/BillOfLanding/new`)
              }}>
            <Plus className="w-5 h-5 mr-1" /> Add Data
          </button>)}
        </div>

        <div className="flex space-x-2">
          <button className="p-2 border rounded" onClick={() => setIsFilterPopupOpen(!isFilterPopupOpen)}>
            <Filter className="w-5 h-5" />
          </button>
          <button className="p-2 border rounded " onClick={() => setIsSettingsPopupOpen(!isSettingsPopupOpen)}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isFilterPopupOpen && (
        <div className={`absolute right-0 mr-2  p-4 shadow-md z-50 w-64 rounded max-h-[70vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Filter</h3>
            <button onClick={() => setIsFilterPopupOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          <hr/>
          <select className={`w-full p-2 mb-2 border-2 rounded ${theme.border}`} value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)}>
            {columns.map(col => <option key={col.key} value={col.key}>{col.label}</option>)}
          </select>
          <input
            type="text"
            className={`w-full p-2 mb-2 border-2 rounded ${theme.border}`}
            placeholder="Filter value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        </div>
      )}

      {isSettingsPopupOpen && (
        <div className={`absolute right-0 mr-2  p-4 shadow-md z-50 w-48 rounded max-h-[70vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold"> Visibility</h3>
            <button onClick={() => setIsSettingsPopupOpen(false)}><X className="w-5 h-5 " /></button>
          </div>
          <hr/>
          {columns.map(col => (
            <label key={col.key} className="flex items-center space-x-1 mb-1">
              <input
                type="checkbox"
                checked={tempVisibleColumns[col.key]}
                onChange={() => handleColumnToggle(col.key)}
              />
              <span>{col.label}</span>
            </label>
          ))}
          <button className={`w-full p-2 mt-2 rounded border-2 ${theme.button} ${theme.border}`} onClick={handleSaveSettings}>Save</button>
        </div>
      )}

      {isAddDataPopupOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          
          <div className={`rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ${theme.background}`}>

           
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">{title}</h2>
                <button
                  onClick={() => {
                    setIsAddDataPopupOpen(false);
                    setEditRow(null); // <-- clears edit state
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
            </div>


          <div className="overflow-y-auto p-4 flex-1">
            {addDataComponent
              ? React.createElement(addDataComponent, { editData: editRow,       onFormSubmit: () => {
                  setIsAddDataPopupOpen(false);
                  setEditRow(null);
                  // if (typeof onDataChange === "function") onDataChange(); // optional: refresh parent data
                }
              })
              : null}
          </div>

            
          </div>
        </div> 
      )}

      {/* Mobile Cards */}
      <div className="md:hidden">
        {renderMobileCardView()}
      </div>

      {/* Desktop Table */}
      <div className={`customParentTableClass TableClass relative max-h-[calc(88vh)] overflow-auto border mb-1 ${theme.border} hidden md:block`}>
        <table className="w-full table-auto border-collapse max-h-full">
          <thead className={`sticky top-0 z-0 text-center border-b ${theme.tableHeader} ${theme.border}`}>
            <tr>
              {columns
              // .filter(col => 
              // !col.hidden && 
              // visibleColumns[col.key])
              .map(col => (
                <th key={col.key} className="px-4 py-2 cursor-pointer" onClick={() => handleSort(col.key)}>
                  {col.label}
                </th>
              ))}
              {
              // (hasPermission("Edit_Container") || hasPermission("Delete_Container") ) 
              true
              && 
              <th className="px-4 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-100">
                {columns
                // .filter(col => !col.hidden && visibleColumns[col.key])
                .map(col => (
                  <td key={col.key} className="px-4 py-2 text-center">{row[col.key]}</td>
                ))}
                {
                // (hasPermission("Edit_Container") || hasPermission("Delete_Container") )
                true
                &&  
                <td className="px-4 py-2 flex justify-center">
                  {/* { hasPermission("Edit_Container") && */}
                  { currentBlState !== "new" &&
                    <button
                      className="p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      onClick={() => {
                        handleEditClick(row) // Set selected row for editing
                        setIsAddDataPopupOpen(true); // Open modal
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button> 
                   }
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="h-12"></div> {/* Spacer to add bottom margin */}
      </div>
 

      
    </div>
    
  );
};

export default InvoiceTable;