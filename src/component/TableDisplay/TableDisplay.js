import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, Settings, X, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import CollapsibleCard from '../UI/CollapsibleCard';
import { useTheme } from '../../context/ThemeContext';

const TableDisplay = ({
  theme: propTheme,
  columns,
  data,
  totalItems,
  title,
  onDataChange,
  userPermissions = [],
  customActions = [],
  actionColumn = null,
  itemsPerPage = 15,
  serverPageSize = 50,
  isLoading = false,
  onPageChange,
  addDataComponent,
  addDataHandler,
  getRowClassName = () => "",
  addButtonText = 'Add New',
  addButtonPermission = 'Add',
  height,
  filterPopup = null,
  FilterForm = null,
  searchPlaceholder = 'Search records...',
  onSearch = null,
  searchable = true,
  extraButton = null,
  onRowClick = null,
  primaryKey = 'Container',
  showCollapsibleCards = true
}) => {
  const { theme: contextTheme } = useTheme();
  const theme = propTheme || contextTheme;
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
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef(null);

  const effectiveFilterPopup = filterPopup || FilterForm;

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
    if (onSearch) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(val);
      }, 350);
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const isColAllowed = (col) => {
    if (!col.permission) return true;
    const basicPerms = ["ContainerNo", "Status", "ContainerType", "ArrivalDate", "EmptyDate", "EmptyAt", "UnloadedAtDock", "InBound", "OutBound", "Material", "BL", "View_ContainerId", "View_ReportId", "View_container_no", "View_status", "View_arrivalDate", "View_location", "View_weight"];
    if (basicPerms.includes(col.permission)) return true;
    if (!userPermissions || userPermissions.length === 0) return true;
    return userPermissions.includes(col.permission);
  };

  const hasPermission = (perm) => {
    if (!perm) return true;
    if (!userPermissions || userPermissions.length === 0) return true;
    return userPermissions.includes(perm);
  };

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

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data || [];
    const q = searchQuery.toLowerCase().trim();
    return (data || []).filter(row => {
      if (!row) return false;
      return Object.entries(row).some(([k, v]) => {
        if (k === 'rawData' || typeof v === 'function' || React.isValidElement(v)) return false;
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(q);
      });
    });
  }, [data, searchQuery]);

  const effectiveTotalItems = onSearch ? (totalItems || 0) : filteredData.length;
  const totalClientPages = Math.ceil((effectiveTotalItems || 0) / itemsPerPage);

  useEffect(() => {
    const offset = (currentServerPage - 1) * serverPageSize;
    onPageChange && onPageChange(offset, serverPageSize);
  }, [currentServerPage, serverPageSize, onPageChange]);

  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return (filteredData || []).slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

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

  const activeColumns = useMemo(() => {
    return columns.filter(col => visibleColumns[col.key] !== false && isColAllowed(col));
  }, [columns, visibleColumns, userPermissions]);

  const renderPagination = () => (
    <div className="flex items-center justify-between pt-2.5 flex-col md:flex-row gap-2 shrink-0">
      <div className={`text-xs w-full md:w-auto text-center md:text-left ${theme.tableMutedText}`}>
        Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
        {Math.min(currentPage * itemsPerPage, filteredData.length)} of {effectiveTotalItems}
      </div>
      <div className="flex items-center justify-center md:justify-end w-full md:w-auto space-x-2">
        <button
          disabled={currentPage === 1}
          onClick={() => handleClientPageChange(currentPage - 1)}
          className="px-2.5 py-1.5 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        ><ChevronLeft size={16} /></button>
        <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-100 text-xs flex items-center">Page {currentPage} of {totalClientPages || 1}</span>
        <button
          disabled={currentPage === totalClientPages || totalClientPages === 0}
          onClick={() => handleClientPageChange(currentPage + 1)}
          className="px-2.5 py-1.5 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        ><ChevronRight size={16} /></button>
      </div>
    </div>
  );

  const renderMobileCardView = () => (
    <div className="space-y-2 overflow-y-auto flex-1">
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : processedData.length === 0 ? (
        <div className="text-center py-8">No records found</div>
      ) : processedData.map((row, i) => {
        const cardTitle = row[primaryKey] || row.Container || row.container_no || row.BillOfLanding || row[title] || `Item ${i + 1}`;
        return (
          <CollapsibleCard
            key={i}
            title={cardTitle}
            theme={theme }
            getCustomtheam={getRowClassName(row)}
            className="mb-2"
          >
            <div className="p-4 space-y-3" onClick={() => onRowClick && onRowClick(row)}>
              {activeColumns.map(col => (
                <div key={col.key} className="flex justify-between items-start">
                  <span className="font-medium text-sm text-gray-500 dark:text-gray-400">{col.label}:</span>
                  <span className="text-right text-sm flex-1 ml-2">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </div>
              ))}
              {actionColumn && (
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-end">
                    {actionColumn.render(row)}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleCard>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 overflow-hidden relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pr-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          {showAddButton && (
            <button onClick={handleAddClick} className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all duration-200 touch-manipulation text-xs font-semibold shrink-0">
              <Plus size={16} /><span className="font-medium">{addButtonText}</span>
            </button>
          )}
          {customActions.map((action, i) =>
            hasPermission(action.permission) && (
              <button key={i} onClick={action.handler} className={`px-3 py-2 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 touch-manipulation shrink-0 ${action.className || ''}`} title={action.tooltip}>
                {action.icon || action.label}
              </button>
            )
          )}
          {searchable && (
            <div className="relative flex-1 min-w-[170px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border ${theme.border} ${theme.surface || theme.background} ${theme.text} placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-xs`}
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => handleSearchChange('')} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {extraButton && (
            <div className="relative">
              <button 
                onClick={() => setExtraButtonPopupVisible(!extraButtonPopupVisible)} 
                className="p-2 border rounded text-xs"
              >
                {extraButton.button || "Extra"}
              </button>
              {extraButtonPopupVisible && (
                <div className={`absolute right-0 mt-1 border-2 p-4 shadow-md z-50 w-64 rounded max-h-[70vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
                  <div className="flex justify-between mb-2">
                    <h3 className="text-lg font-semibold">{extraButton.title || "Options"}</h3>
                    <button onClick={() => setExtraButtonPopupVisible(false)}><X /></button>
                  </div>
                  <hr className="mb-2" />
                  {extraButton.content}
                </div>
              )}
            </div>
          )}
          {effectiveFilterPopup && (
            <button 
              onClick={() => setIsFilterPopupOpen(!isFilterPopupOpen)} 
              className={`px-2.5 py-1.5 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 touch-manipulation ${isFilterPopupOpen ? 'bg-blue-50 border-blue-400 text-blue-600' : ''}`}
              title="Filter Records"
            >
              <Filter size={16} />
            </button>
          )}
          <button 
            onClick={() => setIsSettingsPopupOpen(!isSettingsPopupOpen)} 
            className="px-2.5 py-1.5 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all duration-200 touch-manipulation"
            title="Configure Columns"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddForm && addDataComponent && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 `}>
          <div className={`rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col border-2 ${theme.background} ${theme.border} shadow-lg overflow-hidden`}>
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
      {isFilterPopupOpen && effectiveFilterPopup && (
        <div className={`absolute right-0 mr-2 border-2 p-4 shadow-md z-50 w-64 rounded max-h-[70vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
          <div className="flex justify-between mb-2">
            <h3 className="text-lg font-semibold">Filter</h3>
            <button onClick={() => setIsFilterPopupOpen(false)}><X /></button>
          </div>
          <hr className="mb-2" />
          {effectiveFilterPopup}
        </div>
      )}

      {/* Settings Popup */}
      {isSettingsPopupOpen && (
        <div className={`absolute right-0 mr-2 border-2 p-4 shadow-md z-50 w-48 rounded max-h-[70vh] overflow-y-auto ${theme.border} ${theme.background} ${theme.shadow}`}>
          <div className="flex justify-between mb-2">
            <h3 className="text-lg font-semibold">Columns</h3>
            <button onClick={() => setIsSettingsPopupOpen(false)}><X /></button>
          </div>
          <hr className='mb-2'/>
          {columns.filter(isColAllowed).map(col => (
            <label key={col.key} className="flex items-center mb-1 text-xs">
              <input type="checkbox" checked={tempVisibleColumns[col.key] !== false} onChange={() => handleColumnToggle(col.key)} className="mr-2" />
              {col.label}
            </label>
          ))}
          <button onClick={handleSaveSettings} className={`w-full p-1.5 border-2 mt-2 rounded text-xs ${theme.button} ${theme.border}`}>Save</button>
        </div>
      )}

      {/* Mobile Cards */}
      {showCollapsibleCards && (
        <div className="md:hidden flex-1 overflow-hidden flex flex-col">
          {renderMobileCardView()}
        </div>
      )}

      {/* Sticky bottom pagination for mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className={`border-t ${theme.border} ${theme.surface} p-2`}>
          <div className={`${theme.text}`}>{renderPagination()}</div>
        </div>
      </div>

      {/* Desktop Table Container */}
      <div className={`relative rounded-lg shadow-sm ${theme.surface} overflow-hidden ${theme.border} hidden md:flex flex-col flex-1 min-h-0`}>
        <div className={`overflow-auto flex-1 min-h-0 rounded-lg ${theme.scrollbar} border-2 ${theme.border}`}>
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {activeColumns.map(col => (
                <col key={col.key} style={{ width: columnWidths[col.key] ? `${columnWidths[col.key]}px` : col.width || 'auto' }} />
              ))}
              {actionColumn && <col style={{ width: actionColumn.width || '55px' }} />}
            </colgroup>
            <thead className={`sticky top-0 ${theme.tableHeader} z-10 border-b ${theme.border}`}>
              <tr>
                {activeColumns.map(col => (
                  <th key={col.key} className="relative px-3 py-2.5 cursor-pointer select-none text-xs">
                    <div className="flex items-center justify-between" onClick={() => handleSort(col.key)}>
                      <span className='overflow-hidden font-semibold'>{col.label}</span>
                      {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </div>
                    <div
                      onMouseDown={(e) => startResize(e, col.key)}
                      className="absolute top-1/4 right-0 h-1/2 w-0.5 bg-gray-400 hover:bg-blue-500 cursor-col-resize"
                      title="Drag to resize"
                    />
                  </th>
                ))}
                {actionColumn && <th className="px-2 py-2.5 text-xs font-semibold text-center">{actionColumn.label ?? ''}</th>}
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.border}`}>
              {isLoading ? (
                <tr><td colSpan={activeColumns.length + (actionColumn ? 1 : 0)} className={`text-center py-8 text-xs ${theme.tableText}`}>Loading...</td></tr>
              ) : processedData.length === 0 ? (
                <tr><td colSpan={activeColumns.length + (actionColumn ? 1 : 0)} className={`text-center py-8 text-xs ${theme.tableText}`}>No records found</td></tr>
              ) : processedData.map((row, i) => (
                <tr
                  key={i}
                  className={`cursor-pointer ${theme.tableRow} ${getRowClassName(row)}`}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {activeColumns.map(col => (
                    <td key={col.key} className={`px-3 py-2 truncate text-xs ${theme.tableText} ${col.cellClassName ? col.cellClassName(row[col.key], row) : ''}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actionColumn && <td className={`px-3 py-2 text-xs ${theme.tableText}`}>{actionColumn.render(row)}</td>}
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
