import { useState, useRef, useEffect } from "react";
import { FiSearch, FiSliders, FiMenu, FiMoreVertical, FiDownload, FiEye } from "react-icons/fi";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import apiClient from "../api/apiClient";

export default function SharedWithMe({ setMobileOpen, setActivePath, setCurrentDocName }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSharedItems();
    }, []);

    const fetchSharedItems = async () => {
        setLoading(true);
        try {
            // Import apiClient here if not already imported at the top
            // Since this component doesn't have it, we'll need to add the import as well
            const { default: apiClient } = await import("../api/apiClient.js");
            const response = await apiClient.get('/sheets/shared');
            
            // Map the API response to the format expected by the UI
            const formattedItems = response.data.data.map(sheet => ({
                id: sheet.id,
                type: "file", // Assuming all are files for now, or you could check folderId
                title: sheet.name,
                date: new Date(sheet.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                sharedBy: sheet.creator ? sheet.creator.name : "Unknown",
                fileType: "doc",
                role: sheet.permissionRole
            }));
            
            setItems(formattedItems);
        } catch (error) {
            console.error("Error fetching shared items:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sharedBy.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const folders = filteredItems.filter(item => item.type === "folder");
    const files = filteredItems.filter(item => item.type === "file");
    const isEmpty = !loading && folders.length === 0 && files.length === 0;

    return (
        <main className="flex-1 min-h-screen bg-white">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                        <button
                            className="lg:hidden p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
                            onClick={() => setMobileOpen(true)}
                        >
                            <FiMenu className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Shared with me</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search shared files..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                            />
                        </div>

                        {/* Sort Button */}
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                            <FiSliders className="w-4 h-4" />
                            Sort
                        </button>
                    </div>
                </div>

                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FiSearch className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No shared files found</h3>
                        <p className="text-gray-500 text-sm">Documents shared with you will appear here.</p>
                    </div>
                ) : (
                    <>
                        {/* Folders Section */}
                        {folders.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-bold text-gray-800">Folders</h2>
                                    <span className="text-xs text-gray-500">{folders.length} Folders</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {folders.map((folder) => (
                                        <SharedFolderCard key={folder.id} item={folder} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files Section */}
                        {files.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-bold text-gray-800">Files</h2>
                                    <span className="text-xs text-gray-500">{files.length} Files</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {files.map((file) => (
                                        <SharedFileCard
                                            key={file.id}
                                            item={file}
                                            onClick={() => {
                                                if (file.fileType === 'doc') {
                                                    // Pass the ID instead of the title to the DocumentEditor
                                                    setCurrentDocName(file.id);
                                                    setActivePath('/document-editor');
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}

function SharedFolderCard({ item }) {
    return (
        <div className="group relative flex flex-col p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow bg-white cursor-pointer">
            <div className="flex items-start justify-between mb-3">
                <div className="shrink-0 text-indigo-500">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                </div>
                <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiMoreVertical className="w-5 h-5" />
                </button>
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-800 truncate" title={item.title}>{item.title}</h3>
                <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">{item.date}</p>
                    <div className="flex items-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700" title={`Shared by ${item.sharedBy}`}>
                            {item.sharedBy.charAt(0)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SharedFileCard({ item, onClick }) {
    return (
        <div onClick={onClick} className="group relative flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow bg-white cursor-pointer">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="shrink-0 text-[#C1C9D6]">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 truncate" title={item.title}>{item.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                </div>
            </div>

            <div className="relative">
                <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                    <FiMoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
