import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';

function Logistics({ currentUser }) {
    const { theme } = useTheme();

    const [logisticsProviders, setLogisticsProviders] = useState([]);
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [showAddProviderModal, setShowAddProviderModal] = useState(false);
    const [newProviderName, setNewProviderName] = useState('');
    const [editingProvider, setEditingProvider] = useState(null);
    const [providerFormData, setProviderFormData] = useState({ FreeDays: 0, ExcludingDaysList: [] });

    // The backend hasn't implemented fine-grained permissions yet for Logistics,
    // so we'll just base it on 'admin' role for now, as it was in Setting.js
    const canEdit = currentUser?.role === 'admin';

    useEffect(() => {
        async function getLogisticsProviders() {
            try {
                const response = await axios.get(`${process.env.REACT_APP_NETWORK}/settings/logistics-providers`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
                setLogisticsProviders(response.data);
            } catch (error) { console.error("Failed to fetch logistics providers:", error); }
        }

        getLogisticsProviders();
    }, []);

    async function handleAddProvider() {
        if (!newProviderName.trim()) return;
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_NETWORK}/logistics-providers`,
                { name: newProviderName.trim() },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            
            // Format to match the structure that getLogisticsProviders returns
            const newProvider = { Id: response.data.id, Name: response.data.name, FreeDays: 0, ExcludingDaysList: [] };
            setLogisticsProviders(prev => [...prev, newProvider]);
            setShowAddProviderModal(false);
            setNewProviderName('');
            toast.success("Provider added successfully!");
        } catch (error) {
            console.error("Failed to add provider:", error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Failed to add provider.");
            }
        }
    }

    async function handleUpdateProvider() {
        if (!editingProvider) return;
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_NETWORK}/settings/logistics-providers/${editingProvider.Id}`,
                providerFormData,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            
            setLogisticsProviders(prev => prev.map(p => p.Id === editingProvider.Id ? response.data : p));
            setShowProviderModal(false);
            setEditingProvider(null);
            toast.success("Provider settings saved!");
        } catch (error) {
            console.error("Failed to update provider:", error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Failed to save provider settings.");
            }
        }
    }

    async function handleDeleteProvider(providerId) {
        if (!window.confirm("Are you sure you want to delete this provider?")) return;
        try {
            await axios.delete(
                `${process.env.REACT_APP_NETWORK}/logistics-providers/${providerId}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            setLogisticsProviders(prev => prev.filter(p => p.Id !== providerId));
            toast.success("Provider deleted successfully!");
        } catch (error) {
            console.error("Failed to delete provider:", error);
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error("Failed to delete provider.");
            }
        }
    }

    return (
        <div className={`max-w-5xl mx-auto p-6 space-y-6 rounded shadow justify-center ${theme.background}`}>
            <h1 className={`text-2xl font-bold ${theme.text}`}>Logistics & Demurrage</h1>
            
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className={`text-lg font-semibold ${theme.text}`}>Logistics Providers</h2>
                    {canEdit && (
                        <button
                            onClick={() => setShowAddProviderModal(true)}
                            className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                            <Plus size={16} /> Add Provider
                        </button>
                    )}
                </div>

                <div className={`overflow-x-auto max-h-[60vh] overflow-y-auto border rounded ${theme.border}`}>
                    <table className={`w-full text-sm relative`}>
                        <thead className={`${theme.mutedBg} sticky top-0 z-10 shadow-sm`}>
                            <tr>
                                <th className={`p-2 text-left font-semibold ${theme.text}`}>Provider Name</th>
                                <th className={`p-2 text-center font-semibold ${theme.text}`}>Free Days</th>
                                <th className={`p-2 text-left font-semibold ${theme.text}`}>Excluded Days</th>
                                {canEdit && <th className={`p-2 text-center font-semibold ${theme.text}`}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.border}`}>
                            {logisticsProviders.map(provider => (
                            <tr key={provider.Id} className={`border-t ${theme.tableRow} ${theme.border}`}>
                                <td className="p-2 font-medium">{provider.Name}</td>
                                <td className="p-2 text-center">{provider.FreeDays || 0}</td>
                                <td className="p-2">
                                    {provider.ExcludingDaysList && provider.ExcludingDaysList.length > 0 
                                        ? provider.ExcludingDaysList.join(', ') 
                                        : <span className="text-gray-400 italic">None</span>}
                                </td>
                                {canEdit && (
                                    <td className="p-2 flex justify-center gap-2">
                                        <button 
                                            onClick={() => {
                                                setEditingProvider(provider);
                                                setProviderFormData({
                                                    FreeDays: provider.FreeDays || 0,
                                                    ExcludingDaysList: provider.ExcludingDaysList || []
                                                });
                                                setShowProviderModal(true);
                                            }} 
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteProvider(provider.Id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ADD PROVIDER MODAL */}
            {showAddProviderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className={`rounded shadow-lg p-6 w-full max-w-md space-y-4 border ${theme.surface} ${theme.border} ${theme.text}`}>
                        <h3 className={`text-xl font-semibold ${theme.text}`}>Add Logistics Provider</h3>
                        <input
                            type="text"
                            placeholder="Provider Name"
                            value={newProviderName}
                            onChange={(e) => setNewProviderName(e.target.value)}
                            className={`w-full border px-3 py-2 rounded ${theme.border} ${theme.background} ${theme.text}`}
                        />
                        <div className="flex justify-end gap-2 pt-4">
                            <button
                                onClick={() => setShowAddProviderModal(false)}
                                className={`px-4 py-2 border rounded hover:bg-gray-100 ${theme.border}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddProvider}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save Provider
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROVIDER EDIT MODAL */}
            {showProviderModal && editingProvider && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className={`rounded shadow-lg p-6 w-full max-w-lg space-y-6 border ${theme.surface} ${theme.border} ${theme.text}`}>
                        <h3 className={`text-xl font-semibold ${theme.text}`}>Edit Provider: {editingProvider.Name}</h3>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.text}`}>Free Days</label>
                            <input
                                type="number"
                                min="0"
                                value={providerFormData.FreeDays}
                                onChange={(e) => setProviderFormData({ ...providerFormData, FreeDays: parseInt(e.target.value) || 0 })}
                                className={`w-full border px-3 py-2 rounded ${theme.border} ${theme.background} ${theme.text}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.text}`}>Excluded Days</label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <label key={day} className={`flex items-center gap-2 text-sm ${theme.text}`}>
                                        <input
                                            type="checkbox"
                                            checked={providerFormData.ExcludingDaysList.includes(day)}
                                            onChange={(e) => {
                                                const list = providerFormData.ExcludingDaysList;
                                                setProviderFormData({
                                                    ...providerFormData,
                                                    ExcludingDaysList: e.target.checked
                                                        ? [...list, day]
                                                        : list.filter(d => d !== day)
                                                });
                                            }}
                                        />
                                        {day}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setShowProviderModal(false);
                                    setEditingProvider(null);
                                }}
                                className={`px-4 py-2 border rounded hover:bg-gray-100 ${theme.border}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateProvider}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Logistics;
