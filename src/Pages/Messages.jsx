import { FiMenu, FiSearch, FiEdit, FiMic, FiImage, FiFileText } from "react-icons/fi";
import { useState, useEffect, useRef } from "react";
import { io as socketIO } from "socket.io-client";
import ChatWindow from "../Components/ChatWindow";
import NewChatModal from "../Components/NewChatModal";
import apiClient from "../api/apiClient";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:6041';

export default function Messages({ setMobileOpen }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState(new Set());

    const socketRef = useRef(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('accessToken'); // Fixed: changed 'token' to 'accessToken'

    // ── Socket.IO connection for online/offline tracking ─────────────────────
    useEffect(() => {
        if (!token) {
            console.warn("No accessToken found in localStorage, socket won't connect.");
            return;
        }

        console.log("Connecting to Socket at:", SOCKET_URL);
        const socket = socketIO(SOCKET_URL, {
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
        });

        // Receive full list of online users on connect
        socket.on("online_users", (userIds) => {
            console.log("Online users received:", userIds);
            // Handle both array of strings and array of objects {userId: ...}
            const ids = userIds.map(id => typeof id === 'object' && id !== null ? String(id.userId || id.id).toLowerCase() : String(id).toLowerCase());
            setOnlineUserIds(new Set(ids));
        });

        // Real-time status updates
        socket.on("user_status", ({ userId, status }) => {
            console.log(`User ${userId} is now ${status}`);
            const sId = String(userId).toLowerCase();
            setOnlineUserIds(prev => {
                const next = new Set(prev);
                if (status === "online") {
                    next.add(sId);
                } else {
                    next.delete(sId);
                }
                return next;
            });
        });

        // Real-time new DM → refresh inbox
        socket.on("direct_message", () => {
            fetchInbox();
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]);

    const fetchInbox = async () => {
        try {
            const response = await apiClient.get('/dm/inbox');
            const data = response.data.data;
            
            const mappedConversations = data.map(msg => {
                const partner = msg.senderId === currentUser.id ? msg.receiver : msg.sender;
                
                const d = new Date(msg.createdAt);
                const isToday = d.toDateString() === new Date().toDateString();
                const timeStr = isToday 
                    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });

                return {
                    id: partner.id,
                    name: partner.name,
                    avatar: partner.avatar,
                    lastMessage: msg.message,
                    fileUrl: msg.fileUrl,
                    fileType: msg.fileType,
                    time: timeStr,
                    unread: msg.unreadCount,
                    isOnline: false, // will be updated below
                    hasConversation: true
                };
            });
            setConversations(mappedConversations);
        } catch (error) {
            console.error("Failed to fetch inbox:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInbox();
    }, []);

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
                        {/* Search Bar & New Chat */}
                        <div className="p-4 border-b border-gray-50 space-y-3">
                            <button
                                onClick={() => setIsNewChatModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                            >
                                <FiEdit className="w-4 h-4" />
                                Start a New Conversation
                            </button>
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
                                                {conv.avatar ? (
                                                    <img src={conv.avatar} alt={conv.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg ring-2 ring-white">
                                                        {conv.name?.charAt(0) || "U"}
                                                    </div>
                                                )}
                                                {onlineUserIds.has(String(conv.id).toLowerCase()) && (
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
                                                    <div className={`text-sm truncate flex items-center gap-1.5 ${conv.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                                        {conv.hasConversation ? (
                                                            <>
                                                                {conv.fileUrl && (
                                                                    <>
                                                                        {conv.fileType === 'audio' && <FiMic className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                                                                        {conv.fileType === 'image' && <FiImage className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                                                                        {(conv.fileType === 'file' || conv.fileType === 'text') && conv.fileUrl && !conv.lastMessage && <FiFileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />}
                                                                    </>
                                                                )}
                                                                <span className="truncate">
                                                                    {conv.fileUrl && !conv.lastMessage 
                                                                        ? (conv.fileType === 'audio' ? 'Audio Message' 
                                                                           : conv.fileType === 'image' ? 'Image' 
                                                                           : 'Document') 
                                                                        : conv.lastMessage}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-indigo-500 hover:text-indigo-600 font-medium">Start new conversation</span>
                                                        )}
                                                    </div>
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
                                    <p className="text-sm font-medium text-gray-900">
                                        {isLoading ? "Loading..." : "No conversations found"}
                                    </p>
                                    {!isLoading && <p className="text-xs text-gray-500 mt-1">Try adjusting your search or starting a new conversation.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Chat Area */}
                    {selectedUser && (() => {
                        console.log("DEBUG: Checking selectedUser online status.", {
                            selectedUserId: selectedUser.id,
                            onlineSet: Array.from(onlineUserIds),
                            isMatch: onlineUserIds.has(String(selectedUser.id).toLowerCase())
                        });
                        return (
                            <ChatWindow
                                socket={socketRef.current}
                                selectedUser={{...selectedUser, isOnline: onlineUserIds.has(String(selectedUser.id).toLowerCase())}}
                                setSelectedUser={setSelectedUser}
                                onMessageSent={fetchInbox}
                            />
                        );
                    })()}
                </div>
            </div>

            <NewChatModal 
                isOpen={isNewChatModalOpen} 
                onClose={() => setIsNewChatModalOpen(false)} 
                onSelectUser={(user) => {
                    setSelectedUser(user);
                    // Add an optimistic entry to the inbox if it doesn't exist
                    if (!conversations.find(c => c.id === user.id)) {
                        setConversations(prev => [{
                           ...user,
                           lastMessage: "Start new conversation",
                           time: "Just now",
                           unread: 0,
                           hasConversation: false
                        }, ...prev]);
                    }
                }} 
            />
        </main>
    );
}
