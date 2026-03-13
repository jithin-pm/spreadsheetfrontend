import { useState, useEffect } from "react";
import { FiX, FiSearch } from "react-icons/fi";
import apiClient from "../api/apiClient";

export default function NewChatModal({ isOpen, onClose, onSelectUser }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Fetch all available users to chat with
    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;
            setIsLoading(true);
            try {
                // Note: using /admin/users to fetch available users. 
                // In a production app, this might be a more restricted endpoint for non-admins,
                // but for this enterprise app users can see other users.
                const response = await apiClient.get('/user/search');
                const allUsers = response.data.data;
                // Exclude the current user from the list
                setUsers(allUsers.filter(u => u.id !== currentUser.id));
            } catch (error) {
                console.error("Failed to fetch users for new chat:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 sm:p-6"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">New Message</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Header */}
                <div className="p-4 sm:p-5 px-4 pb-2 border-b border-gray-50 bg-gray-50/50">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {/* List Items */}
                    <div className="space-y-1">
                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin mb-3"></div>
                                <p className="text-sm font-medium text-gray-500">Loading contacts...</p>
                            </div>
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => {
                                        onSelectUser({
                                            id: user.id,
                                            name: user.name,
                                            avatar: user.avatar,
                                            isOnline: true // Demo purposes
                                        });
                                        onClose();
                                    }}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm ring-2 ring-white">
                                                {user.name?.charAt(0) || "U"}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-sm font-medium text-gray-900">No users found</p>
                                <p className="text-xs text-gray-500 mt-1">Try a different search term.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
