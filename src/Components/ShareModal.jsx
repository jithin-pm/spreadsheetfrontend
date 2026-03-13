import { useState, useEffect, useRef } from "react";
import { FiX, FiTrash2, FiSearch, FiChevronDown, FiCheck, FiColumns } from "react-icons/fi";
import apiClient from "../api/apiClient";

export default function ShareModal({ isOpen, onClose, sheetId }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [role, setRole] = useState("viewer");
    const [members, setMembers] = useState([]);
    const [columnPermissions, setColumnPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState("");

    // Search state
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const searchTimeoutRef = useRef(null);
    const dropdownRef = useRef(null);

    // Columns state
    const [columns, setColumns] = useState([]);
    const [selectedColumnIds, setSelectedColumnIds] = useState([]);
    const [showColumnSection, setShowColumnSection] = useState(false);

    // Edit column permissions for existing members
    const [editingMemberColPerms, setEditingMemberColPerms] = useState(null); // { userId, allowedColumnIds }

    useEffect(() => {
        if (isOpen && sheetId) {
            fetchMembers();
            fetchColumns();
        }
        if (!isOpen) {
            setSearchQuery("");
            setSearchResults([]);
            setSelectedUser(null);
            setShowDropdown(false);
            setSelectedColumnIds([]);
            setShowColumnSection(false);
            setEditingMemberColPerms(null);
        }
    }, [isOpen, sheetId]);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search users as they type
    useEffect(() => {
        if (!searchQuery.trim() || selectedUser) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const response = await apiClient.get(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`);
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const results = (response.data.data || []).filter(u => u.id !== currentUser.id);
                setSearchResults(results);
                setShowDropdown(results.length > 0);
            } catch (err) {
                console.error("Error searching users:", err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchQuery, selectedUser]);

    const fetchColumns = async () => {
        try {
            const response = await apiClient.get(`/admin/sheets/${sheetId}`);
            const cols = response.data.data.columns || [];
            setColumns(cols);
            // Default: select all columns
            setSelectedColumnIds(cols.map(c => c.id));
        } catch (err) {
            console.error("Error fetching columns:", err);
        }
    };

    const fetchMembers = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await apiClient.get(`/admin/sheets/${sheetId}/permissions`);
            setMembers(response.data.data.sheetPermissions || []);
            setColumnPermissions(response.data.data.columnPermissions || []);
        } catch (err) {
            console.error("Error fetching permissions:", err);
            setError("Failed to load members.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setSearchQuery(user.name + " (" + user.email + ")");
        setShowDropdown(false);
        setSearchResults([]);
        // Show column section when user is selected
        setShowColumnSection(true);
        // Default: all columns selected
        setSelectedColumnIds(columns.map(c => c.id));
    };

    const toggleColumn = (colId) => {
        setSelectedColumnIds(prev =>
            prev.includes(colId)
                ? prev.filter(id => id !== colId)
                : [...prev, colId]
        );
    };

    const toggleAllColumns = () => {
        if (selectedColumnIds.length === columns.length) {
            setSelectedColumnIds([]);
        } else {
            setSelectedColumnIds(columns.map(c => c.id));
        }
    };

    const handleShare = async () => {
        const email = selectedUser ? selectedUser.email : searchQuery.trim();
        if (!email) return;
        setSharing(true);
        setError("");
        try {
            await apiClient.post(`/admin/sheets/${sheetId}/share`, {
                email,
                role,
                allowedColumnIds: selectedColumnIds.length === columns.length ? undefined : selectedColumnIds
            });
            setSearchQuery("");
            setSelectedUser(null);
            setShowColumnSection(false);
            setSelectedColumnIds(columns.map(c => c.id));
            fetchMembers();
        } catch (err) {
            console.error("Error sharing sheet:", err);
            setError(err.response?.data?.message || "Failed to share document.");
        } finally {
            setSharing(false);
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await apiClient.put(`/admin/sheets/${sheetId}/permissions/${userId}`, { role: newRole });
            fetchMembers();
        } catch (err) {
            console.error("Error updating role:", err);
            setError("Failed to update role.");
        }
    };

    const handleRemove = async (userId) => {
        try {
            await apiClient.delete(`/admin/sheets/${sheetId}/permissions/${userId}`);
            fetchMembers();
        } catch (err) {
            console.error("Error removing access:", err);
            setError("Failed to remove access.");
        }
    };

    const handleEditMemberColumns = (userId) => {
        const existing = columnPermissions.find(cp => cp.userId === userId);
        const allowed = existing?.allowedColumnIds || columns.map(c => c.id);
        setEditingMemberColPerms({ userId, allowedColumnIds: Array.isArray(allowed) ? allowed : columns.map(c => c.id) });
    };

    const toggleMemberColumn = (colId) => {
        if (!editingMemberColPerms) return;
        setEditingMemberColPerms(prev => ({
            ...prev,
            allowedColumnIds: prev.allowedColumnIds.includes(colId)
                ? prev.allowedColumnIds.filter(id => id !== colId)
                : [...prev.allowedColumnIds, colId]
        }));
    };

    const toggleAllMemberColumns = () => {
        if (!editingMemberColPerms) return;
        if (editingMemberColPerms.allowedColumnIds.length === columns.length) {
            setEditingMemberColPerms(prev => ({ ...prev, allowedColumnIds: [] }));
        } else {
            setEditingMemberColPerms(prev => ({ ...prev, allowedColumnIds: columns.map(c => c.id) }));
        }
    };

    const saveMemberColumnPermissions = async () => {
        if (!editingMemberColPerms) return;
        try {
            // Find the member's email to re-share with updated column permissions
            const member = members.find(m => m.userId === editingMemberColPerms.userId);
            if (!member) return;
            await apiClient.post(`/admin/sheets/${sheetId}/share`, {
                email: member.User?.email,
                role: member.role,
                allowedColumnIds: editingMemberColPerms.allowedColumnIds
            });
            setEditingMemberColPerms(null);
            fetchMembers();
        } catch (err) {
            console.error("Error updating column permissions:", err);
            setError("Failed to update column permissions.");
        }
    };

    const getMemberColumnCount = (userId) => {
        const cp = columnPermissions.find(p => p.userId === userId);
        if (!cp || !cp.allowedColumnIds || !Array.isArray(cp.allowedColumnIds) || cp.allowedColumnIds.length === 0) {
            return columns.length; // All columns (no restriction)
        }
        return cp.allowedColumnIds.length;
    };

    if (!isOpen) return null;

    const roleOptions = [
        { value: "admin", label: "Admin" },
        { value: "editor", label: "Can edit" },
        { value: "viewer", label: "Can view" }
    ];

    const allColumnsSelected = selectedColumnIds.length === columns.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-xl font-semibold text-gray-800">Share this document</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Invite Section */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add or Invite Members
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1" ref={dropdownRef}>
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedUser) {
                                            setSelectedUser(null);
                                            setShowColumnSection(false);
                                        }
                                    }}
                                    placeholder="Search by name or email..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    onKeyDown={(e) => { if (e.key === "Enter" && selectedUser) handleShare(); }}
                                    onFocus={() => {
                                        if (searchResults.length > 0 && !selectedUser) setShowDropdown(true);
                                    }}
                                />

                                {/* Search Results Dropdown */}
                                {showDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                        {searchResults.map((user) => (
                                            <div
                                                key={user.id}
                                                onClick={() => handleSelectUser(user)}
                                                className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                                            >
                                                {user.avatar ? (
                                                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                        {user.name?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                </div>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-medium shrink-0">{user.role}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            <div className="relative group shrink-0">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                    {roleOptions.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Column Permission Section (shown when a user is selected) */}
                    {showColumnSection && selectedUser && columns.length > 0 && (
                        <div className="mb-5 border border-blue-100 rounded-xl bg-blue-50/30 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FiColumns className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-sm font-semibold text-gray-800">Column Access</h4>
                                </div>
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                                    {selectedColumnIds.length}/{columns.length} selected
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">
                                Select which columns <strong>{selectedUser.name}</strong> can access:
                            </p>

                            {/* Select All */}
                            <div
                                onClick={toggleAllColumns}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors mb-1 border-b border-blue-100 pb-2"
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                                    allColumnsSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                }`}>
                                    {allColumnsSelected && <FiCheck className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className="text-sm font-semibold text-gray-700">Select All Columns</span>
                            </div>

                            {/* Column List */}
                            <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                                {columns.map((col) => {
                                    const isSelected = selectedColumnIds.includes(col.id);
                                    return (
                                        <div
                                            key={col.id}
                                            onClick={() => toggleColumn(col.id)}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                                isSelected ? 'bg-blue-50 hover:bg-blue-100/70' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                            }`}>
                                                {isSelected && <FiCheck className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className="text-sm text-gray-800 truncate">{col.name}</span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-medium shrink-0">{col.type}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Members List */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center justify-between">
                            <span>Members with Access</span>
                            <span className="bg-gray-100 text-gray-600 text-xs py-0.5 px-2 rounded-full">
                                {members.length}
                            </span>
                        </h3>

                        {loading ? (
                            <div className="py-8 text-center text-sm text-gray-500">Loading members...</div>
                        ) : members.length === 0 ? (
                            <div className="py-6 text-center text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                                No members added yet.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {members.map((member) => {
                                    const colCount = getMemberColumnCount(member.userId);
                                    const isEditingCols = editingMemberColPerms?.userId === member.userId;

                                    return (
                                        <div key={member.id} className="rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                            <div className="flex items-center justify-between p-3 group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {member.User?.avatar ? (
                                                        <img src={member.User.avatar} alt={member.User.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                            {member.User?.name?.charAt(0).toUpperCase() || "U"}
                                                        </div>
                                                    )}
                                                    <div className="truncate">
                                                        <div className="font-medium text-sm text-gray-800 truncate">{member.User?.name || "Unknown"}</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 truncate">{member.User?.email}</span>
                                                            <button
                                                                onClick={() => isEditingCols ? setEditingMemberColPerms(null) : handleEditMemberColumns(member.userId)}
                                                                className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded font-medium transition-colors flex items-center gap-0.5 shrink-0"
                                                                title="Edit column access"
                                                            >
                                                                <FiColumns className="w-3 h-3" />
                                                                {colCount}/{columns.length} cols
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="relative">
                                                        <select
                                                            value={member.role}
                                                            onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                                                            className="appearance-none pl-2 pr-6 py-1 bg-transparent hover:bg-white border hover:border-gray-200 border-transparent rounded text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                                        >
                                                            {roleOptions.map(o => (
                                                                <option key={o.value} value={o.value}>{o.label}</option>
                                                            ))}
                                                        </select>
                                                        <FiChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemove(member.userId)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Remove access"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inline column permissions editor for this member */}
                                            {isEditingCols && (
                                                <div className="px-3 pb-3 pt-1 border-t border-gray-50">
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-semibold text-gray-600">Column Access</span>
                                                            <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full font-medium">
                                                                {editingMemberColPerms.allowedColumnIds.length}/{columns.length}
                                                            </span>
                                                        </div>

                                                        {/* Select All */}
                                                        <div
                                                            onClick={toggleAllMemberColumns}
                                                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white cursor-pointer transition-colors mb-1"
                                                        >
                                                            <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                                                                editingMemberColPerms.allowedColumnIds.length === columns.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                                            }`}>
                                                                {editingMemberColPerms.allowedColumnIds.length === columns.length && <FiCheck className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-600">All</span>
                                                        </div>

                                                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                                            {columns.map(col => {
                                                                const checked = editingMemberColPerms.allowedColumnIds.includes(col.id);
                                                                return (
                                                                    <div
                                                                        key={col.id}
                                                                        onClick={() => toggleMemberColumn(col.id)}
                                                                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                                                                            checked ? 'bg-blue-50 hover:bg-blue-100/70' : 'hover:bg-white'
                                                                        }`}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                                                                            checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                                                        }`}>
                                                                            {checked && <FiCheck className="w-3 h-3 text-white" />}
                                                                        </div>
                                                                        <span className="text-xs text-gray-700 truncate">{col.name}</span>
                                                                        <span className="text-[9px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded ml-auto shrink-0">{col.type}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200">
                                                            <button
                                                                onClick={() => setEditingMemberColPerms(null)}
                                                                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={saveMemberColumnPermissions}
                                                                className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-2xl shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={sharing || !selectedUser}
                        className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                            sharing || !selectedUser ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {sharing ? "Sharing..." : "Share"}
                    </button>
                </div>
            </div>
        </div>
    );
}
