import { FiMenu, FiSearch } from "react-icons/fi";
import { useState } from "react";
import ChatWindow from "../Components/ChatWindow";

export default function Messages({ setMobileOpen }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    // Dummy user list with recent messages
    const [conversations] = useState([
        {
            id: 1,
            name: "Sarah Connor",
            lastMessage: "Are the new designs ready for review?",
            time: "10:24 AM",
            unread: 2,
            isOnline: true,
            hasConversation: true
        },
        {
            id: 2,
            name: "John Doe",
            lastMessage: "I've uploaded the Q1 reports to the shared folder.",
            time: "Yesterday",
            unread: 0,
            isOnline: false,
            hasConversation: true
        },
        {
            id: 3,
            name: "Emily Davis",
            lastMessage: "Sounds good, thanks!",
            time: "Monday",
            unread: 0,
            isOnline: true,
            hasConversation: true
        },
        {
            id: 4,
            name: "Mike Johnson",
            lastMessage: "",
            time: "",
            unread: 0,
            isOnline: false,
            hasConversation: false
        },
        {
            id: 5,
            name: "Alex Turing",
            lastMessage: "",
            time: "",
            unread: 0,
            isOnline: true,
            hasConversation: false
        }
    ]);

    const filteredConversations = conversations.filter(conv =>
        conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="flex-1 min-h-screen bg-gray-50/30">
            <div className="h-screen flex flex-col">
                {/* Header - Only hide header if we're on mobile AND a user is selected */}
                <div className={`flex-none p-4 sm:px-6 lg:px-8 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${selectedUser ? 'hidden sm:flex' : 'flex'}`}>
                    <div className="flex items-center gap-2">
                        <button
                            className="lg:hidden p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
                            onClick={() => setMobileOpen(true)}
                        >
                            <FiMenu className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
                    </div>


                </div>

                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar / List Area */}
                    <div className={`w-full bg-white border-r border-gray-100 flex flex-col mx-auto sm:mx-0 sm:ml-0 lg:ml-2 ${selectedUser ? 'hidden' : 'flex'}`}>
                        {/* Search Bar */}
                        <div className="p-4 border-b border-gray-50">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search messages..."
                                    className="pl-9 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full transition-all"
                                />
                            </div>
                        </div>

                        {/* User List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredConversations.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredConversations.map((conv) => (
                                        <div
                                            key={conv.id}
                                            onClick={() => setSelectedUser(conv)}
                                            className={`group relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${selectedUser?.id === conv.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                        >
                                            {/* Avatar */}
                                            <div className="relative shrink-0">
                                                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg ring-2 ring-white">
                                                    {conv.name.charAt(0)}
                                                </div>
                                                {conv.isOnline && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                                        {conv.name}
                                                    </h3>
                                                    {conv.hasConversation && (
                                                        <span className="text-xs text-gray-400 shrink-0 ml-2">{conv.time}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-sm truncate ${conv.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                                        {conv.hasConversation ? conv.lastMessage : (
                                                            <span className="text-indigo-500 hover:text-indigo-600 font-medium">Start new conversation</span>
                                                        )}
                                                    </p>
                                                    {conv.unread > 0 && (
                                                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 ml-2">
                                                            {conv.unread}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-sm font-medium text-gray-900">No conversations found</p>
                                    <p className="text-xs text-gray-500 mt-1">Try adjusting your search.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Chat Area */}
                    {selectedUser && (
                        <ChatWindow
                            selectedUser={selectedUser}
                            setSelectedUser={setSelectedUser}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}
