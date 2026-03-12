import { FiPaperclip, FiMic, FiImage, FiVideo, FiMoreVertical, FiPhone, FiVideo as FiVideoCall, FiArrowLeft, FiSend, FiSearch, FiTrash2, FiSquare } from "react-icons/fi";
import { useState, useRef, useEffect } from "react";
import { PiPaperPlaneTiltBold } from "react-icons/pi";

export default function ChatWindow({ selectedUser, setSelectedUser }) {
    const [messageInput, setMessageInput] = useState("");
    const messagesEndRef = useRef(null);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const [chatMessages, setChatMessages] = useState([
        { id: 1, senderId: 1, text: "Hey! Just checking in on the designs.", time: "10:20 AM", isMine: false },
        { id: 2, senderId: 'me', text: "Yes, they are almost ready. Give me 10 mins.", time: "10:22 AM", isMine: true },
        { id: 3, senderId: 1, text: "Are the new designs ready for review?", time: "10:24 AM", isMine: false },
    ]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedUser) {
            scrollToBottom();
        }
    }, [chatMessages, selectedUser]);

    const handleSendMessage = (e) => {
        if (e) e.preventDefault();
        if (!messageInput.trim()) return;

        const newMessage = {
            id: Date.now(),
            senderId: 'me',
            text: messageInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMine: true
        };

        setChatMessages([...chatMessages, newMessage]);
        setMessageInput("");
    };

    const handleSendAudioMessage = (audioUrl) => {
        const newMessage = {
            id: Date.now(),
            senderId: 'me',
            text: "",
            audioUrl: audioUrl,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMine: true
        };

        setChatMessages([...chatMessages, newMessage]);
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

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                handleSendAudioMessage(audioUrl);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Could not access the microphone. Please check your permissions.");
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
                        <p className="text-xs text-emerald-500 font-medium">{selectedUser.isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                </div>


            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="text-center">
                    <span className="text-xs font-medium text-gray-400 bg-gray-100/50 px-3 py-1 rounded-full">
                        Today
                    </span>
                </div>

                {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex max-w-3xl ${msg.isMine ? 'ml-auto justify-end' : ''}`}>
                        {!msg.isMine && (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 sm:flex items-center justify-center font-bold text-xs shrink-0 mr-3 mt-auto hidden">
                                {selectedUser.name.charAt(0)}
                            </div>
                        )}

                        <div className={`flex flex-col ${msg.isMine ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-md wrap-break-word ${msg.isMine
                                ? 'bg-indigo-600 text-white rounded-br-sm shadow-sm'
                                : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                                }`}>
                                {msg.audioUrl ? (
                                    <audio controls src={msg.audioUrl} className="max-w-full outline-none h-10" />
                                ) : (
                                    <p className="text-sm">{msg.text}</p>
                                )}
                            </div>
                            <span className="text-[10px] font-medium text-gray-400 mt-1 mx-1">
                                {msg.time}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 sm:p-4 bg-white border-t border-gray-100">
                <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2 bg-gray-50/80 border border-gray-200/80 rounded-2xl p-2 transition-colors focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10"
                >
                    {!isRecording ? (
                        <>
                            <div className="flex items-center gap-1 sm:gap-2 pb-1 shrink-0 px-1">
                                <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center justify-center group" title="Attach file">
                                    <FiPaperclip className="w-5 h-5 group-active:scale-95 transition-transform" />
                                </button>
                                <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors sm:flex items-center justify-center group hidden" title="Send image">
                                    <FiImage className="w-5 h-5 group-active:scale-95 transition-transform" />
                                </button>
                                <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors sm:flex items-center justify-center group hidden" title="Send video">
                                    <FiVideo className="w-5 h-5 group-active:scale-95 transition-transform" />
                                </button>
                            </div>

                            <textarea
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="w-full bg-transparent border-none focus:outline-none resize-none px-2 py-2 max-h-32 min-h-[40px] text-sm text-gray-700"
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
