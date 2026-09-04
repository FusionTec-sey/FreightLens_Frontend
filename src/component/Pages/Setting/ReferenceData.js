import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';

function ReferenceData({ currentUser }) {
    const { theme } = useTheme();
    const canEdit = true;

    const tabs = [
        { id: 'suppliers', label: 'Suppliers', endpoint: '/suppliers' },
        { id: 'venues', label: 'Venues', endpoint: '/unload-venues' },
        { id: 'materials', label: 'Materials', endpoint: '/materials' },
        { id: 'container-types', label: 'Container Types', endpoint: '/container-types' },
        { id: 'consignees', label: 'Consignees', endpoint: '/consignees' },
        { id: 'vessels', label: 'Vessels', endpoint: '/vessels' },
        { id: 'docs', label: 'Shipping Docs', endpoint: '/shipping-documents' },
        { id: 'order-statuses', label: 'Order Workflow Stages', endpoint: '/order-statuses' },
    ];

    const [activeTab, setActiveTab] = useState(tabs[0].id);
    const [dataList, setDataList] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');

    const [editingItem, setEditingItem] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItemName, setEditItemName] = useState('');

    const [itemToDelete, setItemToDelete] = useState(null);
    const [showDeleteWarning, setShowDeleteWarning] = useState(false);

    const currentTab = tabs.find(t => t.id === activeTab);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    async function fetchData() {
        if (!currentTab) return;
        try {
            const response = await axios.get(`${process.env.REACT_APP_NETWORK}${currentTab.endpoint}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            let data = response.data;
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (data.data) {
                // Info.py returns { "data": [[id, "name"], ...] }
                setDataList(data.data.map(item => ({ id: item[0], name: item[1] })));
            }
        } catch (error) {
            console.error(`Failed to fetch ${currentTab.label}:`, error);
        }
    }

    async function handleAddItem() {
        if (!newItemName.trim() || !currentTab) return;
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_NETWORK}${currentTab.endpoint}`,
                { name: newItemName.trim() },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            
            // Re-fetch data to be safe, or just append it if API returns the id
            await fetchData();
            setShowAddModal(false);
            setNewItemName('');
            toast.success(`${currentTab.label} added successfully!`);
        } catch (error) {
            console.error(`Failed to add ${currentTab.label}:`, error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error(`Failed to add ${currentTab.label}.`);
            }
        }
    }

    async function handleEditItem() {
        if (!editItemName.trim() || !editingItem || !currentTab) return;
        try {
            await axios.put(
                `${process.env.REACT_APP_NETWORK}${currentTab.endpoint}/${editingItem.id}`,
                { name: editItemName.trim() },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            await fetchData();
            setShowEditModal(false);
            setEditingItem(null);
            toast.success(`${currentTab.label} updated successfully!`);
        } catch (error) {
            console.error(`Failed to edit ${currentTab.label}:`, error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error(`Failed to save changes.`);
            }
        }
    }

    async function handleDeleteItem() {
        if (!itemToDelete || !currentTab) return;
        try {
            await axios.delete(
                `${process.env.REACT_APP_NETWORK}${currentTab.endpoint}/${itemToDelete.id}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            await fetchData();
            setShowDeleteWarning(false);
            setItemToDelete(null);
            toast.success(`${currentTab.label} deleted successfully!`);
        } catch (error) {
            console.error(`Failed to delete ${currentTab.label}:`, error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error(`Failed to delete item.`);
            }
        }
    }

    return (
        <div className={`max-w-5xl mx-auto p-6 space-y-6 rounded shadow justify-center ${theme.background}`}>
            <h1 className={`text-2xl font-bold ${theme.text}`}>Reference Data</h1>

            {/* TOP TABS */}
            <div className="flex flex-wrap gap-2 border-b">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-4 font-medium transition-colors ${
                            activeTab === tab.id
                                ? `border-b-2 border-blue-500 text-blue-600 dark:text-blue-400`
                                : `${theme.profileText} hover:text-blue-500`
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className={`text-lg font-semibold ${theme.text}`}>{currentTab?.label}</h2>
                    {canEdit && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                            <Plus size={16} /> Add {currentTab?.label}
                        </button>
                    )}
                </div>

                <div className={`border rounded ${theme.border} overflow-hidden max-h-[60vh] overflow-y-auto`}>
                    <table className="w-full text-sm relative">
                        <thead className={`${theme.mutedBg} sticky top-0 z-10 shadow-sm`}>
                            <tr>
                                <th className={`p-3 text-left font-semibold ${theme.text}`}>ID</th>
                                <th className={`p-3 text-left font-semibold ${theme.text}`}>Name / Value</th>
                                {canEdit && <th className={`p-3 text-center font-semibold ${theme.text}`}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.border}`}>
                            {dataList.length > 0 ? (
                                dataList.map(item => (
                                    <tr key={item.id} className={`${theme.hover} transition-colors`}>
                                        <td className={`p-3 ${theme.profileText}`}>{item.id}</td>
                                        <td className={`p-3 font-medium ${theme.text}`}>{item.name}</td>
                                        {canEdit && (
                                            <td className="p-3 flex justify-center gap-4">
                                                <button
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setEditItemName(item.name);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700 transition"
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setItemToDelete(item);
                                                        setShowDeleteWarning(true);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={canEdit ? 3 : 2} className={`p-6 text-center italic ${theme.profileText}`}>
                                        No {currentTab?.label.toLowerCase()} found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ADD ITEM MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className={`rounded shadow-lg p-6 w-full max-w-md space-y-4 border ${theme.surface} ${theme.border} ${theme.text}`}>
                        <h3 className={`text-xl font-semibold ${theme.text}`}>Add {currentTab?.label}</h3>
                        <input
                            type="text"
                            placeholder="Enter Name or Value"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className={`w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.border} ${theme.background} ${theme.text}`}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewItemName('');
                                }}
                                className={`px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${theme.border}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddItem}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* EDIT ITEM MODAL */}
            {showEditModal && editingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className={`rounded shadow-lg p-6 w-full max-w-md space-y-4 border ${theme.surface} ${theme.border} ${theme.text}`}>
                        <h3 className={`text-xl font-semibold ${theme.text}`}>Edit {currentTab?.label}</h3>
                        <input
                            type="text"
                            placeholder="Enter Name or Value"
                            value={editItemName}
                            onChange={(e) => setEditItemName(e.target.value)}
                            className={`w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.border} ${theme.background} ${theme.text}`}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingItem(null);
                                }}
                                className={`px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${theme.border}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEditItem}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE WARNING MODAL */}
            {showDeleteWarning && itemToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className={`rounded shadow-lg p-6 w-full max-w-md space-y-4 border ${theme.surface} ${theme.border} ${theme.text}`}>
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle size={24} />
                            <h3 className={`text-xl font-semibold ${theme.text}`}>Delete {currentTab?.label}?</h3>
                        </div>
                        <p className={`${theme.profileText}`}>
                            Are you sure you want to delete <strong>{itemToDelete.name}</strong>? This action cannot be undone and may affect containers currently using this reference data.
                        </p>
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                onClick={() => {
                                    setShowDeleteWarning(false);
                                    setItemToDelete(null);
                                }}
                                className={`px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${theme.border}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteItem}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReferenceData;
