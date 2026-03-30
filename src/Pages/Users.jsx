import { useState, useEffect, useCallback } from "react";
import { FiMenu, FiEdit2, FiTrash2, FiSearch, FiUserPlus, FiX, FiUser, FiMail, FiLock, FiPhone, FiShield, FiEye, FiEyeOff } from "react-icons/fi";
import apiClient from "../api/apiClient";

export default function Users({ setMobileOpen }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false); // add/edit modal
    const [editingUser, setEditingUser] = useState(null); // null = add mode, object = edit mode
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', role: 'staff' });
    const [formError, setFormError] = useState('');
    const [formLoading, setFormLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // ── Fetch Users ──────────────────────────────────────────────────────────────
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await apiClient.get('/user', { params: { limit: 100 } });
            setUsers(resp.data.data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // ── Search Filter ────────────────────────────────────────────────────────────
    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Add/Edit Modal ───────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', phone: '', role: 'staff' });
        setFormError('');
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({ name: user.name || '', email: user.email || '', password: '', phone: user.phone || '', role: user.role || 'staff' });
        setFormError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', password: '', phone: '', role: 'staff' });
        setFormError('');
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormLoading(true);

        try {
            if (editingUser) {
                // Edit mode
                const payload = { name: formData.name, email: formData.email, phone: formData.phone, role: formData.role };
                if (formData.password) payload.password = formData.password;
                await apiClient.put(`/user/${editingUser.id}`, payload);
            } else {
                // Add mode
                if (!formData.password || formData.password.length < 6) {
                    setFormError('Password must be at least 6 characters');
                    setFormLoading(false);
                    return;
                }
                await apiClient.post('/user/register', {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    role: formData.role
                });
            }
            closeModal();
            fetchUsers();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Operation failed. Please try again.');
        } finally {
            setFormLoading(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────────
    const handleDelete = async (userId) => {
        setDeleteLoading(true);
        try {
            await apiClient.delete(`/user/${userId}`);
            setDeleteConfirm(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to delete user:', err);
            alert(err.response?.data?.message || 'Failed to delete user.');
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Role Badge ───────────────────────────────────────────────────────────────
    const getRoleBadge = (role) => {
        const styles = {
            superadmin: 'bg-red-100 text-red-800',
            admin: 'bg-purple-100 text-purple-800',
            staff: 'bg-blue-100 text-blue-800'
        };
        const labels = { superadmin: 'Super Admin', admin: 'Admin', staff: 'Staff' };
        return (
            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[role] || styles.staff}`}>
                {labels[role] || role}
            </span>
        );
    };

    return (
        <main className="flex-1 min-h-screen bg-gray-50/50">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-2">
                        <button
                            className="lg:hidden p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
                            onClick={() => setMobileOpen(true)}
                        >
                            <FiMenu className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64 bg-white transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 bg-[#1A56DB] hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                        >
                            <FiUserPlus className="w-4 h-4" />
                            Add User
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center">
                                            <div className="flex justify-center items-center">
                                                <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="ml-3 text-gray-500">Loading users...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                                                        {(user.name || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getRoleBadge(user.role)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                                    {user.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <FiEdit2 className="w-4 h-4" />
                                                    </button>
                                                    {user.id !== currentUser?.id && user.role !== 'superadmin' && (
                                                        <button
                                                            onClick={() => setDeleteConfirm(user)}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <FiSearch className="h-10 w-10 text-gray-300 mb-3" />
                                                <h3 className="text-base font-medium text-gray-900 mb-1">No users found</h3>
                                                <p className="text-sm text-gray-500">Try adjusting your search query.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Add/Edit User Modal ──────────────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-70 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                                <FiUser className="text-indigo-500 w-5 h-5" />
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
                                    {formError}
                                </div>
                            )}

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                <div className="relative">
                                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Password {editingUser && <span className="text-gray-400 font-normal">(leave empty to keep current)</span>}
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                                        className="block w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                                        placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                                        required={!editingUser}
                                        minLength={editingUser ? 0 : 6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                                <div className="relative">
                                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
                                        placeholder="+91 9876543210"
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                                <div className="relative">
                                    <FiShield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData(f => ({ ...f, role: e.target.value }))}
                                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all appearance-none bg-white"
                                    >
                                        <option value="staff">Staff</option>
                                        <option value="admin">Admin</option>
                                        {currentUser?.role === 'superadmin' && (
                                            <option value="superadmin">Super Admin</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {formLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        editingUser ? 'Save Changes' : 'Add User'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ────────────────────────────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-70 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <FiTrash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to deactivate <strong>{deleteConfirm.name}</strong>? This will revoke their access.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm.id)}
                                    disabled={deleteLoading}
                                    className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
