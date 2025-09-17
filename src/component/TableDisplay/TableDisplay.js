import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Settings, X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { th } from 'framer-motion/m';

const TableDisplay = ({
  theme ,
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
  height = 'calc(78vh)',
  filterPopup = null,
  extraButton = null,
  onRowClick = null // ✅ New prop for row click action
}) => {
  const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [tempVisibleColumns, setTempVisibleColumns] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentServerPage, setCurrentServerPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [extraButtonPopupVisible, setExtraButtonPopupVisible] = useState(false);
  const [resizingColumn, setResizingColumn] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});

  const hasPermission = (perm) => userPermissions.includes(perm);
  const showAddButton = (addDataComponent || addDataHandler) && hasPermission(addButtonPermission);

  // Initialize column visibility
  useEffect(() => {
    const vis = {};
    columns.forEach(col => vis[col.key] = true);
    setVisibleColumns(vis);
    setTempVisibleColumns(vis);
  }, [columns]);

  // Initialize column widths
  useEffect(() => {
    const widths = {};
    columns.forEach(col => {
      widths[col.key] = col.width || 150;
    });
    setColumnWidths(widths);
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

  const onMouseMove = (e) => {
    if (!resizingColumn) return;
    const { colKey, startX, startWidth } = resizingColumn;
    const newWidth = Math.max(50, startWidth + (e.clientX - startX));
    setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
  };

  const onMouseUp = () => {
    setResizingColumn(null);
  };

  useEffect(() => {
    if (resizingColumn) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingColumn]);

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

  const startResize = (e, colKey) => {
    e.preventDefault();
    setResizingColumn({ colKey, startX: e.clientX, startWidth: columnWidths[colKey] });
  };

  const renderPagination = () => (
    <div className={`flex items-center justify-between mt-4 flex-col md:flex-row gap-3`}>
      <div className={`text-sm w-full md:w-auto text-center md:text-left ${theme.tableMutedText}`}>
        Showing {(currentPage - 1) * itemsPerPage + 1}-
        {Math.min(currentPage * itemsPerPage, data.length)} of {totalItems}
      </div>
      <div className="flex items-center justify-center md:justify-end w-full md:w-auto space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => handleClientPageChange(currentPage - 1)}
          className="px-3 py-2 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
        ><ChevronLeft size={18} /></button>
        <span className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 min-h-[44px] flex items-center">Page {currentPage} of {totalClientPages}</span>
        <button
          disabled={currentPage === totalClientPages}
          onClick={() => handleClientPageChange(currentPage + 1)}
          className="px-3 py-2 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
        ><ChevronRight size={18} /></button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-[50vh]">
      <div className="flex justify-between mb-2 pr-2">
        <div className="flex items-center space-x-2">
          {showAddButton && (
            <button onClick={handleAddClick} className="flex items-center gap-2 px-4 py-3 border rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all duration-200 min-h-[44px] touch-manipulation">
              <Plus size={18} /><span className="font-medium">{addButtonText}</span>
            </button>
          )}
          {customActions.map((action, i) =>
            hasPermission(action.permission) && (
              <button key={i} onClick={action.handler} className={`px-3 py-2 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 min-h-[44px] touch-manipulation ${action.className || ''}`} title={action.tooltip}>
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
                <div className={`absolute right-0 mt-1  border-2 p-4 shadow-md z-50 w-64 rounded max-h-[70vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
                  <div className="flex justify-between mb-2">
                    <h3 className="text-lg font-semibold">{extraButton.title || "Options"}</h3>
                    <button onClick={() => setExtraButtonPopupVisible(false)}><X  /></button>
                  </div>
                  <hr className="mb-2" />
                  {extraButton.content}
                </div>
              )}
            </div>
          )}
          {filterPopup && (
            <button onClick={() => setIsFilterPopupOpen(!isFilterPopupOpen)} className="px-3 py-2 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 min-h-[44px] touch-manipulation"><Filter size={18} /></button>
          )}
          <button onClick={() => setIsSettingsPopupOpen(!isSettingsPopupOpen)} className="px-3 py-2 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 min-h-[44px] touch-manipulation"><Settings size={18} /></button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddForm && addDataComponent && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 `}>
          <div className={`rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col border-2 ${
              theme.background
              // theme.border
            } ${theme.border} shadow-lg overflow-hidden`}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Item</h3>
              <button onClick={() => setShowAddForm(false)}><X /></button>
            </div>
            <div className={`overflow-y-auto px-4 pt-4 pb-0 ${theme.scrollbar}`} style={{ maxHeight: 'calc(90vh - 64px)' }}>
              {React.cloneElement(addDataComponent, {
                onSubmitSuccess: (d) => { onDataChange && onDataChange(d); setShowAddForm(false); },
                onCancel: () => setShowAddForm(false)
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter Popup */}
      {isFilterPopupOpen && filterPopup && (
        <div className={`absolute right-0 mr-2  border-2 p-4 shadow-md z-50 w-64 rounded max-h-[70vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
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
         <div className={`absolute right-0 mr-2  border-2 p-4 shadow-md z-50 w-48 rounded max-h-[70vh] md:max-h-[70vh] max-h-[80vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
          <div className="flex justify-between mb-2">
            <h3 className="text-lg font-semibold">Columns</h3>
            <button onClick={() => setIsSettingsPopupOpen(false)}><X /></button></div>
          <hr className='mb-2'/>
          {columns.filter(col => hasPermission(`View_${col.key}`)).map(col => (
            <label key={col.key} className="flex items-center mb-1">
              <input type="checkbox" checked={tempVisibleColumns[col.key]} onChange={() => handleColumnToggle(col.key)} className="mr-2" />
              {col.label}
            </label>
          ))}
          <button onClick={handleSaveSettings} className={`w-full p-2 border-2  mt-2 rounded ${theme.button} ${theme.border}`}>Save</button>
        </div>
      )}

      {/* Mobile Cards */}
      <div className={`md:hidden space-y-3 pb-16`}>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : processedData.length === 0 ? (
          <div className="text-center py-8">No records found</div>
        ) : processedData.map((row, i) => (
          <div
            key={i}
            className={`rounded-lg border ${theme.border} ${theme.surface} p-3 shadow-sm ${getRowClassName(row)}`}
            onClick={() => onRowClick && onRowClick(row)}
          >
            <div className="grid grid-cols-1 gap-2">
              {columns
                .filter(col => visibleColumns[col.key] && hasPermission(`View_${col.key}`))
                .map(col => (
                  <div key={col.key} className="flex justify-between gap-3">
                    <div className="text-xs text-gray-500 whitespace-nowrap">{col.label}</div>
                    <div className="text-sm font-medium text-right break-words">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </div>
                  </div>
                ))}
            </div>
            {actionColumn && (
              <div className="mt-3 pt-2 border-t flex justify-end">
                {actionColumn.render(row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky bottom pagination for mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className={`border-t ${theme.border} ${theme.surface} p-2`}>
          <div className={`${theme.text}`}>{renderPagination()}</div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className={`relative rounded-lg shadow-sm ${theme.surface} overflow-hidden ${theme.border} hidden md:block`} style={{ height }}>
        <div className={`overflow-auto h-full rounded-lg ${theme.scrollbar} border-2 ${theme.border}`}>
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {columns.filter(col => visibleColumns[col.key] && hasPermission(`View_${col.key}`)).map(col => (
                <col key={col.key} style={{ width: columnWidths[col.key] ? `${columnWidths[col.key]}px` : col.width || 'auto' }} />
              ))}
              {actionColumn && <col style={{ width: '120px' }} />}
            </colgroup>
            <thead className={`sticky top-0 ${theme.tableHeader} z-10 border-b ${theme.border}`}>
              <tr>
                {columns.filter(col => visibleColumns[col.key] && hasPermission(`View_${col.key}`)).map(col => (
                  <th key={col.key} className="relative px-4 py-3 cursor-pointer select-none">
                    <div className="flex items-center justify-between" onClick={() => handleSort(col.key)}>
                      <span className='overflow-hidden'>{col.label}</span>
                      {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </div>
                    <div
                      onMouseDown={(e) => startResize(e, col.key)}
                      className="absolute top-1/4 right-0 h-1/2 w-0.5 bg-gray-400 hover:bg-blue-500 cursor-col-resize"
                      title="Drag to resize"
                    />
                  </th>
                ))}
                {actionColumn && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.border}`}>
              {isLoading ? (
                <tr><td colSpan={columns.length + (actionColumn ? 1 : 0)} className={`text-center py-8 ${theme.tableText}`}>Loading...</td></tr>
              ) : processedData.length === 0 ? (
                <tr><td colSpan={columns.length + (actionColumn ? 1 : 0)} className={`text-center py-8 ${theme.tableText}`}>No records found</td></tr>
              ) : processedData.map((row, i) => (
                <tr
                  key={i}
                  className={`cursor-pointer ${theme.tableRow} ${getRowClassName(row)}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.filter(col => visibleColumns[col.key] && hasPermission(`View_${col.key}`)).map(col => (
                    <td key={col.key} className={`px-4 py-3 truncate ${theme.tableText}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actionColumn && <td className={`px-4 py-3 ${theme.tableText}`}>{actionColumn.render(row)}</td>}
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

