import { useState, useEffect } from "react";
import { FiX, FiTrash2, FiSearch, FiChevronDown } from "react-icons/fi";
import apiClient from "../api/apiClient";

export default function ShareModal({ isOpen, onClose, sheetId }) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("viewer");
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && sheetId) {
            fetchMembers();
        }
    }, [isOpen, sheetId]);

    const fetchMembers = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await apiClient.get(`/admin/sheets/${sheetId}/permissions`);
            // List permissions returns { sheetPermissions: [...], columnPermissions: [...] }
            setMembers(response.data.data.sheetPermissions || []);
        } catch (err) {
            console.error("Error fetching permissions:", err);
            setError("Failed to load members.");
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!email.trim()) return;
        setSharing(true);
        setError("");
        try {
            await apiClient.post(`/admin/sheets/${sheetId}/share`, { email, role });
            setEmail("");
            fetchMembers(); // refresh list
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

    if (!isOpen) return null;

    const roleOptions = [
        { value: "admin", label: "Admin" },
        { value: "editor", label: "Can edit" },
        { value: "viewer", label: "Can view" }
    ];

    const getRoleLabel = (roleValue) => {
        const option = roleOptions.find(o => o.value === roleValue);
        return option ? option.label : "Can view";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">Share this document</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Invite Section */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add or Invite Members
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email address..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    onKeyDown={(e) => { if (e.key === "Enter") handleShare(); }}
                                />
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
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {member.User?.avatar ? (
                                                <img src={member.User.avatar} alt={member.User.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {member.User?.name?.charAt(0).toUpperCase() || "U"}
                                                </div>
                                            )}
                                            <div className="truncate">
                                                <div className="font-medium text-sm text-gray-800 truncate">{member.User?.name || "Unknown User"}</div>
                                                <div className="text-xs text-gray-500 truncate">{member.User?.email}</div>
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
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={sharing || !email.trim()}
                        className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                            sharing || !email.trim() ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {sharing ? "Sharing..." : "Share"}
                    </button>
                </div>
            </div>
        </div>
    );
}
