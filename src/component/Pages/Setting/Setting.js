import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
    const [editingRoleId, setEditingRoleId] = useState(null);
    
    // Check if the current user has permission to edit settings
    // In this app, admins can edit or we check permissions
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
        setNewUser({ 
            name: user.username, 
            password: '', 
            roles: user.roles?.map(r => {
                // Find role ID from role name since user.roles is an array of strings like ["admin", "editor"]
                const roleObj = roles.find(roleObj => roleObj.name === r);
                return roleObj ? roleObj.id : null;
            }).filter(Boolean) || [] 
        });
        setShowAddUserModal(true);
    };

    async function handleUpdateUser() {
        if (!newUser.name || !newUser.roles?.length) return;

        try {
            const response = await axios.put(
                `${process.env.REACT_APP_NETWORK}/updateUser/${editingUserId}`,
                {
                    username: newUser.name,
                    password: newUser.password || "",
                    roles: newUser.roles
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true",
                    },
                }
            );
            
            const updatedUser = response.data;
            setUsers(users.map(u => (u.id === editingUserId ? updatedUser : u)));
            setShowAddUserModal(false);
            setEditingUserId(null);
            setNewUser({ name: '', password: '', roles: [] });
        } catch (error) {
            console.error("Failed to update user:", error);
            alert("Failed to update user");
        }
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

    const startEditRole = (role) => {
        setEditingRoleId(role.id);
        setNewRoleName(role.name);
        setNewRolePermissions(role.permissions || []);
        setShowRoleModal(true);
    };

    async function handleUpdateRole() {
        const name = newRoleName.trim();
        if (!name) return;

        try {
            const response = await axios.put(
                `${process.env.REACT_APP_NETWORK}/updateRole/${editingRoleId}`,
                {
                    name: name,
                    permissions: newRolePermissions
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        "skip_zrok_interstitial": "true",
                    },
                }
            );

            const updatedRole = response.data;
            // update the role in state, but wait, updatedRole might not have `permissions` mapped as an array of IDs if we didn't format it.
            // Actually our backend updateRole returns permissions as [{"id": 1, "name": "foo"}...]. 
            // We need to map it back to IDs for the frontend state.
            const formattedRole = {
                ...updatedRole,
                permissions: updatedRole.permissions.map(p => p.id)
            };
            
            setRoles(roles.map(r => (r.id === editingRoleId ? formattedRole : r)));
            
            setShowRoleModal(false);
            setEditingRoleId(null);
            setNewRoleName('');
            setNewRolePermissions([]);
        } catch (error) {
            console.error("Failed to update role:", error);
            alert("Failed to update role.");
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
        
        getUser();
        getRole();
        getPermission();
    
    }, []);

  
    return (
        <div className={`max-w-5xl mx-auto p-6 space-y-6 rounded shadow justify-center ${theme.background}`}>
        <h1 className={`text-2xl font-bold ${theme.text}`}>Users & Roles</h1>

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
                            if (!newUser.name || (!editingUserId && !newUser.password) || !newUser.roles?.length) return;

                            if (editingUserId) {
                                handleUpdateUser();
                            } else {
                                handleAddUser(newUser.name, newUser.password, newUser.roles);
                                setShowAddUserModal(false);
                                setNewUser({ name: '', password: '', roles: [] });
                            }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                      {editingUserId ? "Update User" : "Save User"}
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
                            <button onClick={() => startEditUser(user)} className="text-blue-600 hover:text-blue-800">
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
                        <button onClick={() => startEditRole(role)} className="text-blue-600 hover:text-blue-800">
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
                    onClick={() => {
                        if (editingRoleId) {
                            handleUpdateRole();
                        } else {
                            handleAddRole();
                        }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    {editingRoleId ? "Update Role" : "Save Role"}
                </button>
                </div>
            </div>
            </div>
        )}
        </div>
  );
}

export default Setting;
