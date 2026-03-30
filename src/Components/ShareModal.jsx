import { useState, useEffect, useRef } from "react";
import { FiX, FiTrash2, FiSearch, FiChevronDown, FiCheck, FiColumns, FiEye, FiEdit2, FiLock, FiUnlock } from "react-icons/fi";
import apiClient from "../api/apiClient";
const Toggle = ({ checked, onChange, disabled }) => (
    <div
        onClick={() => !disabled && onChange(!checked)}
        className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-all ${disabled ? 'bg-gray-200 cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
        title={checked ? "Revoke Edit Access" : "Grant Edit Access"}
    >
        <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
);

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
    const [columnAccess, setColumnAccess] = useState({}); // { [colId]: 'view' | 'edit' }
    const [showColumnSection, setShowColumnSection] = useState(false);

    // Edit column permissions for existing members
    const [editingMemberColPerms, setEditingMemberColPerms] = useState(null); // { userId, columnAccess }

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
            setColumnAccess({});
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
            const response = await apiClient.get(`/sheets/${sheetId}`);
            const cols = response.data.data.columns || [];
            setColumns(cols);
            // Default: all columns set to 'edit'
            const initialAccess = {};
            cols.forEach(c => initialAccess[c.id] = 'edit');
            setColumnAccess(initialAccess);
        } catch (err) {
            console.error("Error fetching columns:", err);
        }
    };

    const fetchMembers = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await apiClient.get(`/sheets/${sheetId}/permissions`);
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
        setSearchQuery("");
        setShowDropdown(false);
        setSearchResults([]);
        setShowColumnSection(true);
        const initialAccess = {};
        columns.forEach(c => initialAccess[c.id] = 'edit');
        setColumnAccess(initialAccess);
    };

    const setColPermission = (colId, p) => {
        setColumnAccess(prev => ({ ...prev, [colId]: p }));
    };

    const setAllColPermissions = (p) => {
        const next = {};
        columns.forEach(c => next[c.id] = p);
        setColumnAccess(next);
    };

    const handleShare = async () => {
        const email = selectedUser ? selectedUser.email : searchQuery.trim();
        if (!email) return;
        setSharing(true);
        setError("");
        try {
            // Filter out null/undefined permissions before sending
            const filteredAccess = {};
            Object.entries(columnAccess).forEach(([id, val]) => {
                if (val) filteredAccess[id] = val;
            });

            await apiClient.post(`/sheets/${sheetId}/share`, {
                email,
                role,
                columnAccess: filteredAccess
            });
            setSearchQuery("");
            setSelectedUser(null);
            setShowColumnSection(false);
            fetchMembers();
        } catch (err) {
            console.error("Error sharing sheet:", err);
            setError(err.response?.data?.message || "Failed to share document.");
        } finally {
            setSharing(false);
        }
    };



    const handleRemove = async (userId) => {
        try {
            await apiClient.delete(`/sheets/${sheetId}/permissions/${userId}`);
            fetchMembers();
        } catch (err) {
            console.error("Error removing access:", err);
            setError("Failed to remove access.");
        }
    };

    const handleEditMemberColumns = (userId) => {
        const existing = columnPermissions.find(cp => cp.userId === userId);
        let access = existing?.columnAccess;
        if (!access || typeof access !== 'object') {
            access = {};
            columns.forEach(c => access[c.id] = 'edit');
        }
        setEditingMemberColPerms({ userId, columnAccess: access });
    };

    const setMemberColPermission = (colId, p) => {
        if (!editingMemberColPerms) return;
        setEditingMemberColPerms(prev => ({
            ...prev,
            columnAccess: { ...prev.columnAccess, [colId]: p }
        }));
    };

    const setAllMemberColPermissions = (p) => {
        if (!editingMemberColPerms) return;
        const next = {};
        columns.forEach(c => next[c.id] = p);
        setEditingMemberColPerms(prev => ({ ...prev, columnAccess: next }));
    };

    const saveMemberColumnPermissions = async () => {
        if (!editingMemberColPerms) return;
        try {
            const member = members.find(m => m.userId === editingMemberColPerms.userId);
            if (!member) return;
            // Filter out null/undefined permissions
            const filteredAccess = {};
            Object.entries(editingMemberColPerms.columnAccess).forEach(([id, val]) => {
                if (val) filteredAccess[id] = val;
            });

            await apiClient.post(`/sheets/${sheetId}/share`, {
                email: member.User?.email,
                role: member.role,
                columnAccess: filteredAccess
            });
            setEditingMemberColPerms(null);
            fetchMembers();
        } catch (err) {
            console.error("Error updating column permissions:", err);
            setError("Failed to update column permissions.");
        }
    };

    const getMemberColumnStatus = (userId) => {
        const existing = columnPermissions.find(cp => cp.userId === userId);
        const access = existing?.columnAccess || {};
        const editCount = Object.values(access).filter(v => v === 'edit').length;
        const viewCount = Object.values(access).filter(v => v === 'view').length;
        if (editCount === columns.length) return "Full Edit";
        if (viewCount === columns.length) return "Read Only";
        return `${editCount} Edit, ${viewCount} View`;
    };

    if (!isOpen) return null;



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
                                {selectedUser ? (
                                    <div className="flex items-center gap-2.5 pl-2 pr-1 py-1 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                                        {selectedUser.avatar ? (
                                            <img src={selectedUser.avatar} alt={selectedUser.name} className="w-6 h-6 rounded-full object-cover shrink-0 shadow-sm" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm">
                                                {selectedUser.name?.charAt(0).toUpperCase() || "U"}
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-2 min-w-0">
                                            <span className="text-sm font-semibold text-blue-900 truncate">{selectedUser.name}</span>
                                            <span className="text-[11px] text-blue-600/70 truncate hidden sm:block">({selectedUser.email})</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedUser(null);
                                                setShowColumnSection(false);
                                                setSearchQuery("");
                                            }}
                                            className="ml-auto p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                            title="Remove selection"
                                        >
                                            <FiX className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
                                )}

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

                        </div>
                    </div>

                    {/* Column Permission Section (shown when a user is selected) */}
                    {showColumnSection && selectedUser && columns.length > 0 && (
                        <div className="mb-5 border border-blue-100 rounded-xl bg-blue-50/30 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FiColumns className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-sm font-semibold text-gray-800">Column Granular Access</h4>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setAllColPermissions('view')} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100">All View</button>
                                    <button onClick={() => setAllColPermissions('edit')} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100">All Edit</button>
                                </div>
                            </div>

                            {/* Column List with Toggle */}
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                {columns.map((col) => {
                                    const p = columnAccess[col.id] || null;
                                    const isViewChecked = p !== null;
                                    const isEditToggled = p === 'edit';

                                    return (
                                        <div key={col.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-white rounded-lg border border-gray-100 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <input
                                                    type="checkbox"
                                                    checked={isViewChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setColPermission(col.id, 'view');
                                                        } else {
                                                            setColPermission(col.id, null);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-sm ${isViewChecked ? 'text-gray-800' : 'text-gray-400'} truncate`}>{col.name}</span>
                                                    <span className="text-[9px] text-gray-400 uppercase font-medium">{col.type}</span>
                                                </div>
                                            </div>
                                            
                                            {isViewChecked && (
                                                <div className="flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-right-2 duration-200">
                                                    <span className="text-[10px] text-gray-400 font-medium">Can Edit</span>
                                                    <Toggle
                                                        checked={isEditToggled}
                                                        onChange={(val) => setColPermission(col.id, val ? 'edit' : 'view')}
                                                    />
                                                </div>
                                            )}
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
                                    const statusLabel = getMemberColumnStatus(member.userId);
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
                                                                {statusLabel}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleRemove(member.userId)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Remove access"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inline column permissions editor */}
                                            {isEditingCols && (
                                                <div className="px-3 pb-3 pt-1 border-t border-gray-50">
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-semibold text-gray-600">Edit Column Access</span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => setAllMemberColPermissions('view')} className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded">All View</button>
                                                                <button onClick={() => setAllMemberColPermissions('edit')} className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded">All Edit</button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1 max-h-32 overflow-y-auto mt-2">
                                                            {columns.map(col => {
                                                                const p = editingMemberColPerms.columnAccess[col.id] || null;
                                                                const isViewChecked = p !== null;
                                                                const isEditToggled = p === 'edit';

                                                                return (
                                                                    <div key={col.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white rounded border border-gray-100 transition-colors">
                                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isViewChecked}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setMemberColPermission(col.id, 'view');
                                                                                    } else {
                                                                                        setMemberColPermission(col.id, null);
                                                                                    }
                                                                                }}
                                                                                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                            />
                                                                            <span className={`text-xs ${isViewChecked ? 'text-gray-700' : 'text-gray-400'} truncate flex-1`}>{col.name}</span>
                                                                        </div>

                                                                        {isViewChecked && (
                                                                            <div className="flex items-center gap-1.5 shrink-0 animate-in fade-in slide-in-from-right-1 duration-200">
                                                                                <span className="text-[9px] text-gray-400">Edit</span>
                                                                                <Toggle
                                                                                    checked={isEditToggled}
                                                                                    onChange={(val) => setMemberColPermission(col.id, val ? 'edit' : 'view')}
                                                                                />
                                                                            </div>
                                                                        )}
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
