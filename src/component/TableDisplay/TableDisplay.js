import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Settings, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const TableDisplay = ({
  columns,
  data,
  totalItems,
  title,
  onDataChange,
  userPermissions = [],
  customActions = [],
  actionColumn = null,
  itemsPerPage = 10,
  serverPageSize = 500,
  isLoading = false,
  onPageChange,
  addDataComponent,
  addDataHandler,
  getRowClassName = () => "",
  addButtonText = 'Add New',
  addButtonPermission = 'Add',
  height = 'calc(82vh)',
  filterPopup = null,
  extraButton = null,
            // 🔄 passed JSX or null
}) => {
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [tempVisibleColumns, setTempVisibleColumns] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentServerPage, setCurrentServerPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  // const [extraButtonPopupVisible, setExtraButtonPopupVissible] = useState(false);
    const [extraButtonPopupVisible, setExtraButtonPopupVisible] = useState(false);
  const hasPermission = (perm) => userPermissions.includes(perm);
  const showAddButton = (addDataComponent || addDataHandler) && hasPermission(addButtonPermission);

  useEffect(() => {
    const vis = {};
    columns.forEach(col => vis[col.key] = true);
    setVisibleColumns(vis);
    setTempVisibleColumns(vis);
  }, [columns]);

  const handleAddClick = () => {
    if (addDataHandler) addDataHandler();
    else setShowAddForm(true);
  };

  const handleColumnToggle = (key) => {
    setTempVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const handleSaveSettings = () => {
    setVisibleColumns(tempVisibleColumns);
    setIsSettingsPopupOpen(false);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const totalClientPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    const offset = (currentServerPage - 1) * serverPageSize;
    onPageChange && onPageChange(offset, serverPageSize);
  }, [currentServerPage, serverPageSize, onPageChange]);

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  const processedData = useMemo(() => {
    let result = [...currentData];
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [currentData, sortConfig]);

  const handleClientPageChange = (newPage) => {
    const newStart = (newPage - 1) * itemsPerPage;
    const newServerPage = Math.floor(newStart / serverPageSize) + 1;
    if (newServerPage !== currentServerPage) setCurrentServerPage(newServerPage);
    setCurrentPage(newPage);
  };

  const renderPagination = () => (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-600">
        Showing {(currentPage - 1) * itemsPerPage + 1}-
        {Math.min(currentPage * itemsPerPage, data.length)} of {totalItems}
      </div>
      <div className="flex items-center space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => handleClientPageChange(currentPage - 1)}
          className="p-2 border rounded disabled:opacity-50"
        ><ChevronLeft /></button>
        <span className="px-3 py-1 bg-gray-100 rounded">Page {currentPage} of {totalClientPages}</span>
        <button
          disabled={currentPage === totalClientPages}
          onClick={() => handleClientPageChange(currentPage + 1)}
          className="p-2 border rounded disabled:opacity-50"
        ><ChevronRight /></button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-[50vh]">
      <div className="flex justify-between mb-2 pr-2">
        <div className="flex items-center space-x-2">
          {showAddButton && (
            <button onClick={handleAddClick} className="flex items-center gap-1 p-2 border rounded bg-black text-white hover:bg-blue-600">
              <Plus /><span>{addButtonText}</span>
            </button>
          )}
          {customActions.map((action, i) =>
            hasPermission(action.permission) && (
              <button key={i} onClick={action.handler} className={`p-2 border rounded ${action.className || ''}`} title={action.tooltip}>
                {action.icon || action.label}
              </button>
            )
          )}
        </div>
        <div className="flex space-x-2">

        {extraButton && (
          <div className="relative">
            <button 
              onClick={() => setExtraButtonPopupVisible(!extraButtonPopupVisible)} 
              className="p-2 border rounded"
            >
              {extraButton.button || "Extra"}
            </button>
            {extraButtonPopupVisible && (
              <div className="absolute right-0 mt-1 bg-white border p-4 shadow-md z-50 w-64 rounded max-h-[70vh] overflow-y-auto">
                <div className="flex justify-between mb-2">
                  <h3 className="text-lg font-semibold">{extraButton.title || "Options"}</h3>
                  <button onClick={() => setExtraButtonPopupVisible(false)}><X size={16} /></button>
                </div>
                <hr className="mb-2" />
                {extraButton.content}
              </div>
            )}
          </div>
        )}
          {filterPopup && (
            <button onClick={() => setIsFilterPopupOpen(!isFilterPopupOpen)} className="p-2 border rounded"><Filter /></button>
          )}
          <button onClick={() => setIsSettingsPopupOpen(!isSettingsPopupOpen)} className="p-2 border rounded"><Settings /></button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddForm && addDataComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Item</h3>
              <button onClick={() => setShowAddForm(false)}><X /></button>
            </div>
            <div className="overflow-y-auto p-4">
              {React.cloneElement(addDataComponent, {
                onSubmitSuccess: (d) => { onDataChange && onDataChange(d); setShowAddForm(false); },
                onCancel: () => setShowAddForm(false)
              })}
            </div>
          </div>
        </div>
      )}


      {/* Filter Popup (external JSX from parent) */}
      {isFilterPopupOpen && filterPopup && (
        <div className="absolute right-0 mr-2 bg-white border p-4 shadow-md z-50 w-64 rounded max-h-[70vh] overflow-y-auto">
          <div className="flex justify-between mb-2">
            <h3 className="text-lg font-semibold">Filter</h3>
            <button onClick={() => setIsFilterPopupOpen(false)}><X /></button>
          </div>
          <hr className="mb-2" />
          {filterPopup}
        </div>
      )}

      {/* Settings Popup */}
      {isSettingsPopupOpen && (
        <div className="absolute right-0 mr-2 bg-white border p-4 shadow-md z-50 w-48 rounded max-h-[70vh] overflow-y-auto">
          <div className="flex justify-between mb-2"><h3 className="text-lg font-semibold">Columns</h3><button onClick={() => setIsSettingsPopupOpen(false)}><X /></button></div>
          <hr />
          {columns.filter(col => hasPermission(`View_${col.key}`)).map(col => (
            <label key={col.key} className="flex items-center mb-1">
              <input type="checkbox" checked={tempVisibleColumns[col.key]} onChange={() => handleColumnToggle(col.key)} className="mr-2" />
              {col.label}
            </label>
          ))}
          <button onClick={handleSaveSettings} className="w-full p-2 bg-black text-white mt-2 rounded">Save</button>
        </div>
      )}

      {/* Table */}
      <div className="relative border border-gray-300 rounded-lg shadow-sm bg-white" style={{ height }}>
        <div className="overflow-auto h-full">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {columns.filter(col => visibleColumns[col.key] && hasPermission(`View_${col.key}`)).map(col => (
                <col key={col.key} style={{ width: col.width || 'auto' }} />
              ))}
              {actionColumn && <col style={{ width: '120px' }} />}
            </colgroup>
            <thead className="sticky top-0 bg-gray-800 text-white">
              <tr>
                {columns.filter(col => visibleColumns[col.key] && hasPermission(`View_${col.key}`)).map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)} className="px-4 py-3 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span>{col.label}</span>
                      {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </div>
                  </th>
                ))}
                {actionColumn && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={columns.length + (actionColumn ? 1 : 0)} className="text-center py-8">Loading...</td></tr>
              ) : processedData.length === 0 ? (
                <tr><td colSpan={columns.length + (actionColumn ? 1 : 0)} className="text-center py-8">No records found</td></tr>
              ) : processedData.map((row, i) => (
                <tr key={i}  className={` ${getRowClassName(row)}`}>
                  {columns.filter(col => visibleColumns[col.key] && hasPermission(`View_${col.key}`)).map(col => (
                    <td key={col.key} className="px-4 py-3 truncate">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actionColumn && <td className="px-4 py-3">{actionColumn.render(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {renderPagination()}
    </div>
  );
};

export default TableDisplay;
