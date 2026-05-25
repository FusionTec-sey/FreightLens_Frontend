import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../../context/ThemeContext';

// const allPermissions = [
//   { name: 'View_Report', description: 'Can view reports' },
//   { name: 'Edit_Report', description: 'Can edit reports' },
//   { name: 'View_Container', description: 'Can view containers' },
//   { name: 'Delete_Container', description: 'Can delete containers' },
//   { name: 'Access_Settings', description: 'Can access system settings' }
// ];

// const initialUsers = [
//   { id: 1, name: 'Alice', role: 'viewer' },
//   { id: 2, name: 'Bob', role: 'editor' },
//   { id: 3, name: 'Charlie', role: 'admin' },
// ];

// const initialRoles = ['admin', 'editor', 'viewer'];

// async function getContainerData() {
//   try {
//     const response = await axios.get(`${process.env.REACT_APP_NETWORK}/containerDetaiils`, {
//       headers: {
//         Authorization: `Bearer ${localStorage.getItem('token')}`
//       }
//     });
//     let data = response.data;
//     if (typeof data === 'string') {
//       data = JSON.parse(data);
//     }
//     // console.log("Fetched API data:", data);
//     return data;
//   } catch (error) {
//     console.error("Failed to fetch inventory:", error);
//     return null;
//   }
// }

function Setting({ currentUser }) {
    const { theme } = useTheme();

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);

    const [newUser, setNewUser] = useState({
    name: '',
    password: '',
    roles: [],
        });

    const [editingUserId, setEditingUserId] = useState(null);

    const [showAddUserModal, setShowAddUserModal] = useState(false);
    //   const [newUser, setNewUser] = useState({ name: '', role: roles[0] });
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRolePermissions, setNewRolePermissions] = useState([]);

    // Tab and Logistics State
    const [activeTab, setActiveTab] = useState('users');
    const [logisticsProviders, setLogisticsProviders] = useState([]);
    const [demurrageDays, setDemurrageDays] = useState({});
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);
    const [providerFormData, setProviderFormData] = useState({ FreeDays: 0, ExcludingDaysList: [] });

    const canEdit = currentUser?.role === 'admin';

    // User management
    async function handleAddUser (username, password, roles) {
            // console.log("Adding user:", username, "with roles:", roles);
            try {
                const response = await axios.post(`${process.env.REACT_APP_NETWORK}/addUser`,
                {
                     username: username,
                     password: password,
                     roles: roles
                },
                
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true",
                    },
                    
                });
                let data = response.data;
                if (typeof data === 'string') {
                data = JSON.parse(data);
                }
                console.log("Fetched API data:", data);
                setUsers(prevUsers => [...prevUsers, data]);  // ✅ Correct
                // return data;
            } catch (error) {
                console.error("Failed to fetch inventory:", error);
                return null;
            }
        
    };

    const startEditUser = (user) => {
        setEditingUserId(user.id);
        setNewUser({ name: user.name, role: user.role });
    };

    const handleUpdateUser = () => {
        setUsers(users.map(u => (u.id === editingUserId ? { ...u, ...newUser } : u)));
        setEditingUserId(null);
        setNewUser({ name: '', role: roles[0] });
    };

    async function handleDeleteUser(id){
        try {
            await axios.delete(`${process.env.REACT_APP_NETWORK}/deleteUser/${id}`,

            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                
            });

        } catch (error) {
            console.error("Failed to fetch inventory:", error);
            return null;
        }
        setUsers(users.filter(u => u.id !== id));
    };

    // Role modal and permission logic
    const togglePermission = (permName) => {
        setNewRolePermissions((prev) =>
        prev.includes(permName)
            ? prev.filter(p => p !== permName)
            : [...prev, permName]
        );
    };

    async function handleAddRole() {
        const name = newRoleName.trim();
        if (!name || roles.includes(name)) return;
        // print(rolePermissions)
        // console.log("Adding role:", name, "with permissions:", newRolePermissions);
        try {
                const response = await axios.post(`${process.env.REACT_APP_NETWORK}/addPermission`,
                {
                     name: name,
                    //  password: password,
                     permissions: newRolePermissions
                },
                
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true",
                    },
                    
                });
                let data = response.data;
                if (typeof data === 'string') {
                data = JSON.parse(data);
                }
                console.log("Fetched API data:", data);
                setRoles(prevUsers => [...prevUsers, data]);  // ✅ Correct
                // return data;
            } catch (error) {
                console.error("Failed to fetch inventory:", error);
                return null;
            }

        setRoles([...roles, name]);
        // setRolePermissions(prev => ({ ...prev, [name]: newRolePermissions }));

        // Reset modal state
        setShowRoleModal(false);
        setNewRoleName('');
        setNewRolePermissions([]);
    };

    async function handleDeleteRole(roleId) {
        // Check if the role is assigned to any user
        const isAssigned = users.some(user =>
            Array.isArray(user.roles) && user.roles.includes(roleId)
        );

        if (isAssigned) {
            alert('Cannot delete a role assigned to users.');
            return;
        }

        try {
            await axios.delete(`${process.env.REACT_APP_NETWORK}/deleteRole/${roleId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                
            });

            // Remove role from state if successful
            setRoles(prev => prev.filter(r => r.id !== roleId));
            setRolePermissions(prev => {
                const updated = { ...prev };
                delete updated[roleId];
                return updated;
            });

        } catch (error) {
            console.error("Failed to delete role:", error);
            alert("An error occurred while deleting the role.");
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
        } catch (error) {
            console.error("Failed to update provider:", error);
            alert("Failed to save provider settings.");
        }
    }

    useEffect(() => {
        
        async function getUser() {
            try {
                const response = await axios.get(`${process.env.REACT_APP_NETWORK}/getUser`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                
                });
                let data = response.data;
                if (typeof data === 'string') {
                data = JSON.parse(data);
                }
                console.log("Fetched API data:", data);
                setUsers(data);
                // return data;
            } catch (error) {
                console.error("Failed to fetch inventory:", error);
                return null;
            }
        }

        async function getRole() {
            try {
                const response = await axios.get(`${process.env.REACT_APP_NETWORK}/getRole`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                
                });
                let data = response.data;
                if (typeof data === 'string') {
                data = JSON.parse(data);
                }
                // console.log("Fetched API data:", data);
                setRoles(data);
                // return data;
            } catch (error) {
                console.error("Failed to fetch inventory:", error);
                return null;
            }
        }

        async function getPermission() {
            try {
                const response = await axios.get(`${process.env.REACT_APP_NETWORK}/getPermission`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    "skip_zrok_interstitial": "true",
                },
                
                });
                let data = response.data;
                if (typeof data === 'string') {
                data = JSON.parse(data);
                }
                // console.log("Fetched API data:", data);
                setRolePermissions(data);
                // return data;
            } catch (error) {
                console.error("Failed to fetch inventory:", error);
                return null;
            }
        }
        
        async function getDemurrageDays() {
            try {
                const response = await axios.get(`${process.env.REACT_APP_NETWORK}/settings/demurrage-days`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
                setDemurrageDays(response.data);
            } catch (error) { console.error("Failed to fetch demurrage days:", error); }
        }
        
        async function getLogisticsProviders() {
            try {
                const response = await axios.get(`${process.env.REACT_APP_NETWORK}/settings/logistics-providers`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
                setLogisticsProviders(response.data);
            } catch (error) { console.error("Failed to fetch logistics providers:", error); }
        }

        getUser();
        getRole();
        getPermission();
        getDemurrageDays();
        getLogisticsProviders();
    
    }, []);

  
    return (
        <div className={`max-w-5xl mx-auto p-6 space-y-6 rounded shadow justify-center ${theme.background}`}>
        <h1 className={`text-2xl font-bold ${theme.text}`}>Settings</h1>

        {/* Tab Navigation */}
        <div className={`flex space-x-4 border-b ${theme.border} mb-6`}>
            <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-4 font-medium transition-colors ${
                    activeTab === 'users'
                        ? `border-b-2 border-blue-500 text-blue-600 dark:text-blue-400`
                        : `${theme.profileText} hover:text-blue-500`
                }`}
            >
                User Roles
            </button>
            <button
                onClick={() => setActiveTab('logistics')}
                className={`py-2 px-4 font-medium transition-colors ${
                    activeTab === 'logistics'
                        ? `border-b-2 border-blue-500 text-blue-600 dark:text-blue-400`
                        : `${theme.profileText} hover:text-blue-500`
                }`}
            >
                Logistics & Demurrage
            </button>
        </div>

        {activeTab === 'users' && (
            <div className="space-y-10">
                {/* USERS */}
                <section className="space-y-4">
            <h2 className={`text-lg font-semibold ${theme.text}`}>Users</h2>
            {canEdit && (
                <button
                    onClick={() => setShowAddUserModal(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
                >
                    <Plus size={16} /> Add User

                </button>
            )}

            {showAddUserModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className={`rounded shadow-lg p-6 w-full max-w-lg space-y-6 border ${theme.surface} ${theme.border} ${theme.text}`}>
                <h3 className={`text-xl font-semibold ${theme.text}`}>Add New User</h3>

                {/* User Name */}
                <input
                    type="text"
                    placeholder="Username"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className={`w-full border px-3 py-2 rounded ${theme.border} ${theme.background} ${theme.text}`}
                />

                {/* Password */}
                <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password || ""}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className={`w-full border px-3 py-2 rounded ${theme.border} ${theme.background} ${theme.text}`}
                />

                {/* Role Selection Table */}
                <div>
                    <p className={`text-sm font-medium mb-2 ${theme.text}`}>Assign Roles:</p>
                    <table className={`w-full text-sm border ${theme.border}`}>
                        <thead className={`${theme.mutedBg}`}>
                            <tr>
                            <th className={`p-2 text-left ${theme.profileText}`}>Role</th>
                            <th className={`p-2 text-center ${theme.profileText}`}>Include</th>
                            </tr>
                        </thead>
                        <tbody className={`${theme.text}`}>
                            {roles.map((role) => (
                            <tr key={role.id} className={`border-t ${theme.border}`}>
                                <td className="p-2 capitalize">{role.name}</td>
                                <td className="p-2 text-center">
                                <input
                                    type="checkbox"
                                    checked={newUser.roles?.includes(role.id)}
                                    onChange={() => {
                                    const updatedRoles = newUser.roles?.includes(role.id)
                                        ? newUser.roles.filter((r) => r !== role.id)
                                        : [...(newUser.roles || []), role.id];
                                    setNewUser({ ...newUser, roles: updatedRoles });
                                    }}
                                />
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setShowAddUserModal(false)}
                        className={`px-4 py-2 border rounded hover:bg-gray-100 ${theme.border}`}
                     >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            
                            if (!newUser.name || !newUser.password || !newUser.roles?.length) return;

                            handleAddUser(newUser.name, newUser.password, newUser.roles);

                            setShowAddUserModal(false);
                            // console.log("New user added:", newUser, "ID:", setUsers);
                            newUser({ name: '', password: '', roles: [] });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                      Save User
                    </button>
                </div>
                </div>
            </div>
            )}
            
            <table className={`w-full text-sm border ${theme.border}`}>
                <thead className={`${theme.mutedBg}`}>
                    <tr>
                    <th className={`p-2 text-left ${theme.profileText}`}>Name</th>
                    <th className={`p-2 text-left ${theme.profileText}`}>Role</th>
                    {canEdit && <th className={`p-2 text-center ${theme.profileText}`}>Actions</th>}
                    </tr>
                </thead>
                <tbody className={`${theme.text}`}>
                    {users.map(user => (
                    <tr key={user.id} className={`border-t ${theme.tableRow} ${theme.border}`}>
                        <td className="p-2">{user.username}</td>
                        <td className="p-2 capitalize">
                            {user.roles?.join(", ")}
                        </td>
                        {canEdit && (
                        <td className="p-2 flex justify-center gap-2">
                            <button onClick={() => startEditUser(user.id)} className="text-blue-600 hover:text-blue-800">
                            <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 size={16} />
                            </button>
                        </td>
                        )}
                    </tr>
                    ))}
                </tbody>
            </table>
        </section>

        {/* ROLES */}
        <section className="space-y-4">
            <div className="flex justify-between items-center">
            <h2 className={`text-lg font-semibold ${theme.text}`}>Roles</h2>
            {canEdit && (
                <button
                onClick={() => setShowRoleModal(true)}
                className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                <Plus size={16} /> Add Role
                </button>
            )}
            </div>

            <table className={`w-full text-sm border ${theme.border}`}>
            <thead className={`${theme.mutedBg}`}>
                <tr>
                <th className={`p-2 text-left ${theme.profileText}`}>Role Name</th>
                {canEdit && <th className={`p-2 text-center ${theme.profileText}`}>Actions</th>}
                </tr>
            </thead>
            <tbody className={`${theme.text}`}>
                {roles.map(role => (
                <tr key={role.id} className={`border-t ${theme.tableRow} ${theme.border}`}>
                    <td className="p-2 capitalize">{role.name}</td>
                    {canEdit && (
                    <td className="p-2 flex justify-center gap-2">
                        <button className="text-blue-600 hover:text-blue-800">
                            <Pencil size={16} />
                        </button>
                        <button
                            onClick={() => handleDeleteRole(role.id)}
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
        </section>
        </div>
        )}

        {/* ================== ADD ROLE MODAL ================== */}
        {showRoleModal && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className={`rounded shadow-lg p-6 w-full max-w-2xl space-y-4 relative overflow-y-auto max-h-[80vh] border ${theme.surface} ${theme.border} ${theme.text}`}>
                <h3 className={`text-xl font-semibold ${theme.text}`}>Add New Role</h3>

                <input
                type="text"
                placeholder="Role name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className={`w-full border px-3 py-2 rounded ${theme.border} ${theme.background} ${theme.text}`}
                />

                <table className={`w-full text-sm border mt-4 ${theme.border}`}>
                <thead className={`${theme.mutedBg}`}>
                    <tr>
                    <th className={`p-2 text-left ${theme.profileText}`}>Permission</th>
                    <th className={`p-2 text-left ${theme.profileText}`}>Description</th>
                    <th className={`p-2 text-center ${theme.profileText}`}>Include</th>
                    </tr>
                </thead>
                <tbody className={`${theme.text}`}>
                    {rolePermissions.map((perm) => (
                    <tr key={perm.name} className={`border-t ${theme.border}`}>
                        <td className="p-2">{perm.name}</td>
                        <td className="p-2">{perm.description}</td>
                        <td className="p-2 text-center">
                        <input
                            type="checkbox"
                            checked={newRolePermissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                        />
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>

                <div className="flex justify-end gap-2 pt-4">
                <button
                    onClick={() => setShowRoleModal(false)}
                    className={`px-4 py-2 border rounded hover:bg-gray-100 ${theme.border}`}
                >
                    Cancel
                </button>
                <button
                    onClick={handleAddRole}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Save Role
                </button>
                </div>
            </div>
            </div>
        )}

        {/* ================== LOGISTICS DEMURRAGE TAB ================== */}
        {activeTab === 'logistics' && (
            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className={`text-lg font-semibold ${theme.text}`}>Logistics Providers</h2>
                </div>

                <table className={`w-full text-sm border ${theme.border}`}>
                    <thead className={`${theme.mutedBg}`}>
                        <tr>
                            <th className={`p-2 text-left ${theme.profileText}`}>Provider Name</th>
                            <th className={`p-2 text-center ${theme.profileText}`}>Free Days</th>
                            <th className={`p-2 text-left ${theme.profileText}`}>Excluded Days</th>
                            {canEdit && <th className={`p-2 text-center ${theme.profileText}`}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody className={`${theme.text}`}>
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
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
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
                        <label className={`block text-sm font-medium mb-2 ${theme.text}`}>Excluded Days</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(demurrageDays).map(day => (
                                <label key={day} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={providerFormData.ExcludingDaysList.includes(day)}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setProviderFormData(prev => ({
                                                ...prev,
                                                ExcludingDaysList: checked 
                                                    ? [...prev.ExcludingDaysList, day]
                                                    : prev.ExcludingDaysList.filter(d => d !== day)
                                            }));
                                        }}
                                        className="rounded"
                                    />
                                    <span className={`text-sm ${theme.text}`}>{day}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={`flex justify-end gap-3 pt-4 border-t ${theme.border}`}>
                        <button
                            onClick={() => setShowProviderModal(false)}
                            className={`px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${theme.border}`}
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

export default Setting;
