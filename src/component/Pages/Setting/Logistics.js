import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Truck, X } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../../context/ThemeContext';
import { toast } from 'react-toastify';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function Logistics({ currentUser }) {
    const { isDark } = useTheme();

    const [logisticsProviders, setLogisticsProviders] = useState([]);
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [showAddProviderModal, setShowAddProviderModal] = useState(false);
    
    const [newProviderData, setNewProviderData] = useState({
        Name: '',
        FreeDays: 7,
        ExcludingDaysList: ['Saturday', 'Sunday']
    });

    const [editingProvider, setEditingProvider] = useState(null);
    const [providerFormData, setProviderFormData] = useState({
        Name: '',
        FreeDays: 0,
        ExcludingDaysList: []
    });

    const canEdit = true;

    async function getLogisticsProviders() {
        try {
            const response = await axios.get(`${process.env.REACT_APP_NETWORK}/settings/logistics-providers`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            setLogisticsProviders(response.data || []);
        } catch (error) { 
            console.error("Failed to fetch logistics providers:", error); 
        }
    }

    useEffect(() => {
        getLogisticsProviders();
    }, []);

    async function handleAddProvider(e) {
        if (e) e.preventDefault();
        if (!newProviderData.Name.trim()) {
            toast.error("Please enter provider name.");
            return;
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_NETWORK}/logistics-providers`,
                {
                    Name: newProviderData.Name.trim(),
                    FreeDays: Number(newProviderData.FreeDays) || 0,
                    ExcludingDaysList: newProviderData.ExcludingDaysList
                },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            
            const added = response.data;
            const newProvider = {
                Id: added.Id || added.id,
                Name: added.Name || added.name,
                FreeDays: added.FreeDays ?? newProviderData.FreeDays,
                ExcludingDaysList: added.ExcludingDaysList || newProviderData.ExcludingDaysList
            };

            setLogisticsProviders(prev => [...prev, newProvider]);
            setShowAddProviderModal(false);
            setNewProviderData({ Name: '', FreeDays: 7, ExcludingDaysList: ['Saturday', 'Sunday'] });
            toast.success("Logistics Provider added successfully!");
            getLogisticsProviders();
        } catch (error) {
            console.error("Failed to add provider:", error);
            toast.error(error.response?.data?.detail || "Failed to add provider.");
        }
    }

    async function handleUpdateProvider(e) {
        if (e) e.preventDefault();
        if (!editingProvider) return;
        if (!providerFormData.Name.trim()) {
            toast.error("Provider name cannot be empty.");
            return;
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_NETWORK}/settings/logistics-providers/${editingProvider.Id}`,
                {
                    Name: providerFormData.Name.trim(),
                    FreeDays: Number(providerFormData.FreeDays) || 0,
                    ExcludingDaysList: providerFormData.ExcludingDaysList
                },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                }
            );
            
            setLogisticsProviders(prev => prev.map(p => p.Id === editingProvider.Id ? response.data : p));
            setShowProviderModal(false);
            setEditingProvider(null);
            toast.success("Provider settings updated!");
            getLogisticsProviders();
        } catch (error) {
            console.error("Failed to update provider:", error);
            toast.error(error.response?.data?.detail || "Failed to save provider settings.");
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
            toast.error(error.response?.data?.detail || "Failed to delete provider.");
        }
    }

    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6 bg-white text-gray-900">
            {/* SECTION HEADER */}
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Logistics & Demurrage Settings</h1>
                    <p className="text-xs text-gray-500 mt-1 font-normal">Configure shipping lines, free days limits, and weekend demurrage exclusion rules.</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => {
                            setNewProviderData({ Name: '', FreeDays: 7, ExcludingDaysList: ['Saturday', 'Sunday'] });
                            setShowAddProviderModal(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-xs font-semibold shadow-xs"
                    >
                        <Plus size={16} /> Add Provider
                    </button>
                )}
            </div>

            {/* LOGISTICS PROVIDERS TABLE */}
            <section className="rounded-xl border border-gray-200 p-5 shadow-sm space-y-4 bg-white text-gray-900">
                <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                        <Truck size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Shipping Lines & Logistics Providers</h2>
                        <p className="text-xs text-gray-500 font-normal">Demurrage free days allowance and excluded non-working days.</p>
                    </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs text-left border-collapse bg-white text-gray-900">
                        <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
                            <tr>
                                <th className="p-3 font-semibold w-12 text-center text-gray-700">ID</th>
                                <th className="p-3 font-semibold text-gray-900">Provider Name</th>
                                <th className="p-3 font-semibold text-center w-28 text-gray-800">Free Days</th>
                                <th className="p-3 font-semibold text-gray-700">Excluded Days</th>
                                {canEdit && <th className="p-3 font-semibold text-center w-20 text-gray-700">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white text-gray-900">
                            {logisticsProviders.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500 font-normal">No logistics providers configured</td></tr>
                            ) : logisticsProviders.map(provider => (
                                <tr key={provider.Id} className="hover:bg-gray-50 transition">
                                    <td className="p-3 text-center font-mono font-medium text-gray-500">{provider.Id}</td>
                                    <td className="p-3 font-semibold text-xs text-gray-900">{provider.Name}</td>
                                    <td className="p-3 text-center font-medium text-xs text-gray-800">
                                        {provider.FreeDays || 0} Days
                                    </td>
                                    <td className="p-3 text-xs font-normal text-gray-600">
                                        {provider.ExcludingDaysList && provider.ExcludingDaysList.length > 0 
                                            ? provider.ExcludingDaysList.join(', ') 
                                            : <span className="text-gray-400 italic font-normal">None</span>}
                                    </td>
                                    {canEdit && (
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-1.5">
                                                <button 
                                                    onClick={() => {
                                                        setEditingProvider(provider);
                                                        setProviderFormData({
                                                            Name: provider.Name || '',
                                                            FreeDays: provider.FreeDays || 0,
                                                            ExcludingDaysList: provider.ExcludingDaysList || []
                                                        });
                                                        setShowProviderModal(true);
                                                    }} 
                                                    className="p-1 text-blue-600 hover:text-blue-800 transition"
                                                    title="Edit Provider"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteProvider(provider.Id)}
                                                    className="p-1 text-red-600 hover:text-red-800 transition"
                                                    title="Delete Provider"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ADD LOGISTICS PROVIDER MODAL */}
            {showAddProviderModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="rounded-xl border border-gray-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col bg-white text-gray-900">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <Truck size={18} className="text-blue-600" />
                                <h3 className="text-base font-semibold text-gray-900">Add Logistics Provider</h3>
                            </div>
                            <button onClick={() => setShowAddProviderModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddProvider} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-gray-800">Logistics Provider Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newProviderData.Name}
                                    onChange={(e) => setNewProviderData({ ...newProviderData, Name: e.target.value })}
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                                    placeholder="e.g. MSC, Maersk, CMA CGM"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-gray-800">Demurrage Free Days Allowance *</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={newProviderData.FreeDays}
                                    onChange={(e) => setNewProviderData({ ...newProviderData, FreeDays: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Number of free days"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-gray-800">Excluded Non-Working Days (Do Not Count Demurrage)</label>
                                <p className="text-[11px] text-gray-500 mb-2 font-normal">Select days that should not be counted during demurrage calculation.</p>
                                <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-lg bg-gray-50">
                                    {DAYS_OF_WEEK.map(day => {
                                        const isChecked = newProviderData.ExcludingDaysList.includes(day);
                                        return (
                                            <label key={day} className={`flex items-center space-x-2.5 p-2 rounded-lg text-xs cursor-pointer transition ${isChecked ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'hover:bg-white text-gray-700'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const list = newProviderData.ExcludingDaysList;
                                                        setNewProviderData({
                                                            ...newProviderData,
                                                            ExcludingDaysList: e.target.checked
                                                                ? [...list, day]
                                                                : list.filter(d => d !== day)
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="font-medium text-gray-800">{day}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <button type="button" onClick={() => setShowAddProviderModal(false)} className="px-4 py-2 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition shadow-xs">
                                    Save Provider
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT LOGISTICS PROVIDER MODAL */}
            {showProviderModal && editingProvider && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="rounded-xl border border-gray-200 shadow-xl w-full max-w-lg overflow-hidden flex flex-col bg-white text-gray-900">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <Truck size={18} className="text-blue-600" />
                                <h3 className="text-base font-semibold text-gray-900">Edit Provider Settings</h3>
                            </div>
                            <button onClick={() => setShowProviderModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProvider} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-gray-800">Provider Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={providerFormData.Name}
                                    onChange={(e) => setProviderFormData({ ...providerFormData, Name: e.target.value })}
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Provider name"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-gray-800">Demurrage Free Days Allowance *</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    value={providerFormData.FreeDays}
                                    onChange={(e) => setProviderFormData({ ...providerFormData, FreeDays: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-gray-800">Excluded Non-Working Days (Do Not Count Demurrage)</label>
                                <p className="text-[11px] text-gray-500 mb-2 font-normal">Select days that should not be counted during demurrage calculation.</p>
                                <div className="grid grid-cols-2 gap-2 border border-gray-200 p-3 rounded-lg bg-gray-50">
                                    {DAYS_OF_WEEK.map(day => {
                                        const isChecked = providerFormData.ExcludingDaysList.includes(day);
                                        return (
                                            <label key={day} className={`flex items-center space-x-2.5 p-2 rounded-lg text-xs cursor-pointer transition ${isChecked ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'hover:bg-white text-gray-700'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const list = providerFormData.ExcludingDaysList;
                                                        setProviderFormData({
                                                            ...providerFormData,
                                                            ExcludingDaysList: e.target.checked
                                                                ? [...list, day]
                                                                : list.filter(d => d !== day)
                                                        });
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="font-medium text-gray-800">{day}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <button type="button" onClick={() => setShowProviderModal(false)} className="px-4 py-2 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 active:scale-95 transition shadow-xs">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Logistics;
