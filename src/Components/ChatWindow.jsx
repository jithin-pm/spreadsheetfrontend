import { FiPaperclip, FiMic, FiImage, FiVideo, FiMoreVertical, FiPhone, FiVideo as FiVideoCall, FiArrowLeft, FiSend, FiSearch, FiTrash2, FiSquare, FiFile, FiDownload, FiPlay, FiPause } from "react-icons/fi";
import { useState, useRef, useEffect } from "react";
import { PiPaperPlaneTiltBold } from "react-icons/pi";

import apiClient from "../api/apiClient";
import Swal from "sweetalert2";

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:6041';

const formatDateSeparator = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    
    // exact 2 days ago check
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);
    if (isSameDay(date, twoDaysAgo)) return '2 days ago';

    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

// ── WhatsApp-style Voice Player ──────────────────────────────────────────────
function VoiceMessage({ src, isMine }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) { audio.pause(); } else { audio.play(); }
    };

    const formatSec = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Static waveform bar heights (decorative)
    const bars = [3,5,8,6,10,7,4,9,6,5,8,4,7,10,5,8,6,4,9,7,5,8,6,10,4,7,5,9,6,8];

    const barColor = isMine ? 'bg-indigo-300' : 'bg-sky-300';
    const barActiveColor = isMine ? 'bg-white' : 'bg-indigo-500';

    return (
        <div className="flex items-center gap-2.5 w-64">
            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setProgress(0); setCurrentTime(0); }}
                onTimeUpdate={(e) => {
                    const t = e.target;
                    setCurrentTime(t.currentTime);
                    setProgress(t.duration ? t.currentTime / t.duration : 0);
                }}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
            />
            {/* Play/Pause button */}
            <button
                onClick={togglePlay}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isMine ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-sky-400 hover:bg-sky-500'
                }`}
            >
                {isPlaying
                    ? <FiPause className="w-4 h-4 text-white" />
                    : <FiPlay className="w-4 h-4 text-white ml-0.5" />}
            </button>

            {/* Waveform + time */}
            <div className="flex-1 flex items-center gap-2">
                <div className="flex items-center gap-[2px] h-8 flex-1">
                    {bars.map((h, i) => {
                        const filled = progress > 0 && i / bars.length < progress;
                        return (
                            <div
                                key={i}
                                className={`rounded-full w-1 transition-colors ${filled ? barActiveColor : barColor}`}
                                style={{ height: `${h * 2.5}px` }}
                            />
                        );
                    })}
                </div>
                <span className={`text-[10px] font-semibold shrink-0 ${isMine ? 'text-indigo-700' : 'text-sky-700'}`}>
                    {formatSec(currentTime > 0 ? currentTime : duration)}
                </span>
            </div>
        </div>
    );
}


export default function ChatWindow({ selectedUser, setSelectedUser, onMessageSent, socket }) {
    const [messageInput, setMessageInput] = useState("");
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Auto-grow textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`; // max-h-32 = 128px
        }
    }, [messageInput]);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // File upload state
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const [chatMessages, setChatMessages] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        if (!selectedUser) return;
        try {
            const res = await apiClient.get(`/dm/${selectedUser.id}`);
            const data = res.data.data.map(msg => {
                const isMine = String(msg.senderId) === String(currentUser.id);
                const d = new Date(msg.createdAt);
                return {
                    id: msg.id,
                    senderId: msg.senderId,
                    text: msg.message || "",
                    audioUrl: msg.fileType === 'audio' && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                    imageUrl: msg.fileType === 'image' && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                    fileUrl: msg.fileType === 'file' && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                    fileType: msg.fileType,
                    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMine,
                    rawDate: d.toISOString()
                };
            });
            setChatMessages(data);
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    useEffect(() => {
        if (selectedUser?.id) {
            fetchMessages();
        }
    }, [selectedUser?.id]);

    // ── Real-time message listener ───────────────────────────────────────────
    useEffect(() => {
        if (!socket || !selectedUser) return;

        const handleNewMessage = (msg) => {
            const isFromSelected = String(msg.senderId).toLowerCase() === String(selectedUser.id).toLowerCase();
            const isToSelected = String(msg.receiverId).toLowerCase() === String(selectedUser.id).toLowerCase();
            
            if (isFromSelected || isToSelected) {
                setChatMessages(prev => {
                    // Avoid duplicates (e.g. if we already added it optimistically)
                    if (prev.find(m => String(m.id) === String(msg.id))) return prev;

                    const d = msg.createdAt ? new Date(msg.createdAt) : new Date();
                    const mapped = {
                        id: msg.id,
                        senderId: msg.senderId,
                        text: msg.message || "",
                        audioUrl: msg.fileType === 'audio' && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                        imageUrl: msg.fileType === 'image' && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                        fileUrl: msg.fileType === 'file' && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                        fileType: msg.fileType,
                        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isMine: String(msg.senderId) === String(currentUser.id),
                        rawDate: d.toISOString()
                    };
                    return [...prev, mapped];
                });
            }
        };

        socket.on("direct_message", handleNewMessage);
        return () => socket.off("direct_message", handleNewMessage);
    }, [socket, selectedUser, currentUser.id]);

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!messageInput.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await apiClient.post(`/dm/${selectedUser.id}`, { message: messageInput });
            const msg = res.data.data;
            const d = msg.createdAt ? new Date(msg.createdAt) : new Date();
            
            const newMessage = {
                id: msg.id,
                senderId: msg.senderId,
                text: msg.message,
                time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMine: true,
                rawDate: d.toISOString()
            };

            setChatMessages(prev => {
                if (prev.find(m => String(m.id) === String(newMessage.id))) return prev;
                return [...prev, newMessage];
            });
            setMessageInput("");
            
            if (onMessageSent) onMessageSent();
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsSending(false);
        }
    };

    // ── Delete Message ───────────────────────────────────────────────────────
    const handleDeleteMessage = async (messageId) => {
        const result = await Swal.fire({
            title: 'Delete message?',
            text: 'This message will be removed from the conversation.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-xl px-5',
                cancelButton: 'rounded-xl px-5'
            }
        });
        if (!result.isConfirmed) return;
        setDeletingId(messageId);
        try {
            await apiClient.delete(`/dm/messages/${messageId}`);
            setChatMessages(prev => prev.filter(m => m.id !== messageId));
            if (onMessageSent) onMessageSent();
            Swal.fire({ icon: 'success', title: 'Deleted', text: 'Message removed.', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } });
        } catch (error) {
            console.error('Failed to delete message:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete message.', customClass: { popup: 'rounded-2xl' } });
        } finally {
            setDeletingId(null);
        }
    };

    // ── File/Image Upload ────────────────────────────────────────────────────
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (50MB = 50 * 1024 * 1024 bytes)
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            Swal.fire({ 
                icon: 'warning', 
                title: 'File Too Large', 
                text: 'Please select a file smaller than 50MB.', 
                confirmButtonColor: '#6366f1',
                customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl px-5' } 
            });
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await apiClient.post(`/dm/${selectedUser.id}/file`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const msg = res.data.data;
            const d = new Date(msg.createdAt);
            const isImage = msg.fileType === 'image';

            const newMessage = {
                id: msg.id,
                senderId: msg.senderId,
                text: msg.message || file.name,
                imageUrl: isImage && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                fileUrl: !isImage && msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                fileType: msg.fileType,
                time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMine: true,
                rawDate: d.toISOString()
            };

            setChatMessages(prev => {
                if (prev.find(m => String(m.id) === String(newMessage.id))) return prev;
                return [...prev, newMessage];
            });
            if (onMessageSent) onMessageSent();
        } catch (error) {
            console.error("Failed to upload file:", error);
            Swal.fire({ icon: 'error', title: 'Upload failed', text: 'Max size: 50MB. Allowed: JPG, PNG, GIF, WebP, PDF.', customClass: { popup: 'rounded-2xl' } });
        } finally {
            setIsUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    // Recording Functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // Upload to backend
                setIsSending(true);
                try {
                    const formData = new FormData();
                    // Append blob as a file named "audio.webm"
                    formData.append('audio', audioBlob, 'voice-message.webm');
                    formData.append('duration', recordingTime);

                    const res = await apiClient.post(`/dm/${selectedUser.id}/audio`, formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });

                    const msg = res.data.data;
                    const d = new Date(msg.createdAt);
                    
                    const newMessage = {
                        id: msg.id,
                        senderId: msg.senderId,
                        text: "",
                        audioUrl: msg.fileUrl ? `${BACKEND_URL}${msg.fileUrl}` : null,
                        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isMine: true,
                        rawDate: d.toISOString()
                    };

                    setChatMessages(prev => {
                        if (prev.find(m => String(m.id) === String(newMessage.id))) return prev;
                        return [...prev, newMessage];
                    });
                    if (onMessageSent) onMessageSent();

                } catch (error) {
                    console.error("Failed to upload audio:", error);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to send audio message.', customClass: { popup: 'rounded-2xl' } });
                } finally {
                    setIsSending(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            Swal.fire({ icon: 'error', title: 'Microphone Error', text: 'Could not access the microphone. Please check your permissions.', customClass: { popup: 'rounded-2xl' } });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            clearInterval(timerRef.current);
            audioChunksRef.current = []; // Discard chunks
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!selectedUser) {
        return (
            <div className="flex-1 flex flex-col bg-gray-50/30 sm:flex items-center justify-center p-8">
                <div className="w-24 h-24 rounded-full border-2 border-gray-200 flex items-center justify-center mb-4 bg-white/50">
                    <PiPaperPlaneTiltBold className="w-8 h-8 text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Select a thread</h2>
                <p className="text-sm text-gray-500 text-center max-w-sm">
                    Choose a conversation from the list to view your messages or start a new conversation.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50/30">
            {/* Chat Header */}
            <div className="h-16 px-4 sm:px-6 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm z-10 w-full">
                <div className="flex items-center gap-3">
                    <button
                        className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        onClick={() => setSelectedUser(null)}
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm ring-2 ring-white">
                            {selectedUser.name.charAt(0)}
                        </div>
                        {selectedUser.isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                        )}
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900 text-sm sm:text-base">{selectedUser.name}</h2>
                        <p className={`text-xs font-medium ${selectedUser.isOnline ? 'text-emerald-500' : 'text-gray-400'}`}>
                            {selectedUser.isOnline ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>


            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {chatMessages.map((msg, index) => {
                    const currentGroup = formatDateSeparator(msg.rawDate);
                    const prevGroup = index > 0 ? formatDateSeparator(chatMessages[index - 1].rawDate) : null;
                    const showSeparator = currentGroup !== prevGroup;

                    return (
                        <div key={msg.id} className="space-y-6">
                            {showSeparator && (
                                <div className="flex items-center justify-center my-6 opacity-75">
                                    <div className="flex-1 border-t border-gray-200"></div>
                                    <span className="mx-4 text-[11px] font-semibold text-gray-500 uppercase tracking-widest bg-transparent">
                                        {currentGroup}
                                    </span>
                                    <div className="flex-1 border-t border-gray-200"></div>
                                </div>
                            )}
                            <div className={`group/msg flex max-w-3xl ${msg.isMine ? 'ml-auto justify-end' : ''}`}>
                        {!msg.isMine && (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 sm:flex items-center justify-center font-bold text-xs shrink-0 mr-3 mt-auto hidden">
                                {selectedUser.name.charAt(0)}
                            </div>
                        )}

                        <div className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-1">
                                {/* Delete button — shows on hover, before bubble for own messages */}
                                {msg.isMine && (
                                    <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        disabled={deletingId === msg.id}
                                        className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 shrink-0"
                                        title="Delete message"
                                    >
                                        {deletingId === msg.id 
                                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                            : <FiTrash2 className="w-3.5 h-3.5" />
                                        }
                                    </button>
                                )}
                                <div className={`rounded-2xl max-w-[85%] sm:max-w-md wrap-break-word ${msg.imageUrl
                                    ? 'p-0 overflow-hidden'
                                    : msg.audioUrl
                                    ? `px-3 py-2 ${msg.isMine ? 'bg-indigo-100 rounded-br-sm shadow-sm' : 'bg-sky-50 rounded-bl-sm shadow-sm border border-sky-100'}`
                                    : `px-4 py-2.5 ${msg.isMine
                                        ? 'bg-indigo-100 text-gray-800 rounded-br-sm shadow-sm'
                                        : 'bg-sky-50 text-gray-800 rounded-bl-sm shadow-sm border border-sky-100'
                                    }`
                                    }`}>
                                    {msg.imageUrl ? (
                                        /* ── Image Message ── */
                                        <a href={msg.imageUrl} target="_blank" rel="noreferrer" className="block">
                                            <img 
                                                src={msg.imageUrl} 
                                                alt={msg.text || 'Image'} 
                                                className="rounded-xl max-w-full max-h-64 object-cover cursor-pointer shadow-sm border border-black/5 hover:opacity-90 transition-opacity"
                                                loading="lazy"
                                            />
                                            {msg.text && !msg.text.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                                                <p className="text-sm mt-2 opacity-80">{msg.text}</p>
                                            )}
                                        </a>
                                    ) : msg.fileUrl ? (
                                        /* ── PDF/File Message ── */
                                        <a 
                                            href={msg.fileUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className={`flex items-center gap-3 rounded-xl transition-opacity p-1 -m-1 hover:opacity-80`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                                msg.isMine ? 'bg-indigo-500' : 'bg-sky-100'
                                            }`}>
                                                <FiFile className={`w-5 h-5 ${msg.isMine ? 'text-white' : 'text-sky-600'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate text-gray-800">
                                                    {msg.text || 'Document'}
                                                </p>
                                                <p className={`text-xs ${msg.isMine ? 'text-indigo-600' : 'text-sky-600'}`}>
                                                    PDF Document
                                                </p>
                                            </div>
                                            <FiDownload className={`w-4 h-4 shrink-0 ${msg.isMine ? 'text-indigo-600' : 'text-sky-600'}`} />
                                        </a>
                                    ) : msg.audioUrl ? (
                                        <VoiceMessage src={msg.audioUrl} isMine={msg.isMine} />
                                    ) : (
                                        <p className="text-sm shadow-black shrink-0 whitespace-pre-wrap">{msg.text}</p>
                                    )}
                                </div>
                                {/* Delete button — shows on hover, after bubble for received messages */}
                                {!msg.isMine && (
                                    <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        disabled={deletingId === msg.id}
                                        className="opacity-0 group-hover/msg:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 shrink-0"
                                        title="Delete message"
                                    >
                                        {deletingId === msg.id 
                                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                            : <FiTrash2 className="w-3.5 h-3.5" />
                                        }
                                    </button>
                                )}
                            </div>
                            <span className="text-[10px] font-semibold text-gray-600 mt-1 mx-1">
                                {msg.time}
                            </span>
                        </div>
                    </div>
                </div>
                )})}
                <div ref={messagesEndRef} />
            </div>

            {/* Hidden file inputs */}
            <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf" 
                className="hidden" 
                onChange={handleFileUpload}
            />
            <input 
                ref={imageInputRef}
                type="file" 
                accept="image/*,.jpg,.jpeg,.png,.gif,.webp" 
                className="hidden" 
                onChange={handleFileUpload}
            />

            {/* Input Area */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-100">
                {/* Upload progress indicator */}
                {isUploading && (
                    <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm text-indigo-600 font-medium">Uploading file...</span>
                    </div>
                )}

                <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2 bg-gray-50/80 border border-gray-200/80 rounded-2xl p-2 transition-colors focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10"
                >
                    {!isRecording ? (
                        <>
                            <div className="flex items-center gap-1 sm:gap-2 pb-1 shrink-0 px-1">
                                <button 
                                    type="button" 
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center group" 
                                    title="Attach file (PDF, Image)"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <FiPaperclip className="w-5 h-5 group-active:scale-95 transition-transform" />
                                </button>
                                <button 
                                    type="button" 
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors sm:flex items-center justify-center group hidden" 
                                    title="Send image"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <FiImage className="w-5 h-5 group-active:scale-95 transition-transform" />
                                </button>
                            </div>

                            <textarea
                                ref={textareaRef}
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="w-full bg-transparent border-none focus:outline-none resize-none px-2 py-2 max-h-32 min-h-[40px] text-sm text-gray-700 custom-scrollbar overscroll-contain"
                                rows="1"
                            />

                            <div className="flex items-center gap-1 sm:gap-2 pb-1 shrink-0 px-1">
                                {messageInput.trim() ? (
                                    <button
                                        type="submit"
                                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors flex items-center justify-center group shadow-sm"
                                    >
                                        <FiSend className="w-4 h-4 -ml-0.5 group-active:scale-95 transition-transform" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center group"
                                        title="Voice message"
                                        onClick={startRecording}
                                    >
                                        <FiMic className="w-5 h-5 group-active:scale-95 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-between w-full px-4 py-2 bg-red-50/50 rounded-xl border border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                <span className="text-red-600 font-medium text-sm w-12 tracking-wider">
                                    {formatTime(recordingTime)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={cancelRecording}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                    title="Cancel"
                                >
                                    <FiTrash2 className="w-5 h-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="p-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-full transition-all shadow-sm flex items-center justify-center"
                                    title="Send Voice Message"
                                >
                                    <FiSend className="w-4 h-4 -ml-0.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </form>
                <div className="text-center mt-2 hidden sm:block">
                    <p className="text-[10px] text-gray-400">Press <span className="font-semibold bg-gray-100 px-1 py-0.5 rounded">Enter</span> to send, <span className="font-semibold bg-gray-100 px-1 py-0.5 rounded">Shift + Enter</span> for new line</p>
                </div>
            </div>
        </div>
    );
}
