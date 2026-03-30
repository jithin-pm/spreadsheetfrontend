import { useState, useEffect } from "react";
import { FiFolder, FiUsers, FiShare2, FiChevronLeft, FiChevronRight, FiLogOut, FiActivity, FiAlertTriangle, FiX } from "react-icons/fi";
import { PiPaperPlaneTiltBold } from "react-icons/pi";
import { LuFileSpreadsheet } from "react-icons/lu";
import apiClient from "../api/apiClient";

const navItems = [
    { name: "My Files", icon: FiFolder, path: "/my-files" },
    { name: "Shared with me", icon: FiShare2, path: "/shared" },
    { name: "Users", icon: FiUsers, path: "/users" },
    { name: "Messages", icon: PiPaperPlaneTiltBold, path: "/messages" },
    { name: "Audit Logs", icon: FiActivity, path: "/audit" },
];

export default function Sidebar({ isCollapsed, toggleCollapse, mobileOpen, setMobileOpen, activePath, setActivePath }) {
    const [user, setUser] = useState(null);
    const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user from local storage");
            }
        }
    }, []);

    const handleLogout = () => {
        setShowLogoutPrompt(true);
    };

    const performLogout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await apiClient.post('/user/logout', { refreshToken });
            }
        } catch (_) { /* ignore — clear storage regardless */ }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setActivePath('/login');
        setShowLogoutPrompt(false);
    };

    const userName = user?.name || "Guest";
    const userRole = user?.role || "User";
    const userInitial = userName.charAt(0).toUpperCase();
    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-screen bg-[#0F172A] text-white transition-all duration-300 ease-in-out z-50
                    ${isCollapsed ? "w-20" : "w-64"}
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                <div className="flex flex-col h-full">

                    {/* Logo */}
                    <div className={`p-6 flex items-center ${isCollapsed ? "justify-center px-2" : "gap-4"}`}>
                        <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center shrink-0 text-white">
                            <LuFileSpreadsheet size={20} />
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                            <h1 className="font-bold text-lg whitespace-nowrap">Datsheets</h1>
                            <p className="text-xs text-gray-400 whitespace-nowrap">Enterprise Desk</p>
                        </div>
                    </div>

                    {/* User profile */}
                    <div className={`mx-4 mb-6 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center px-2" : "gap-3"}`}>
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 border-2 border-indigo-500 text-sm font-semibold uppercase text-white">
                            {userInitial}
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                            <h3 className="text-sm font-medium whitespace-nowrap text-white">{userName}</h3>
                            <p className="text-xs text-gray-400 whitespace-nowrap capitalize">{userRole}</p>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 px-4 space-y-2">
                        {navItems
                            .filter(item => {
                                if ((item.name === "Users" || item.name === "Audit Logs") && user?.role !== 'admin' && user?.role !== 'superadmin') {
                                    return false;
                                }
                                return true;
                            })
                            .map((item) => {
                            const isActive = activePath === item.path;
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => setActivePath(item.path)}
                                    title={isCollapsed ? item.name : ""}
                                    className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group
                                        ${isActive
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"}
                                        ${isCollapsed ? "justify-center px-2" : "gap-3"}
                                    `}
                                >
                                    <item.icon size={20} className={`shrink-0 ${isActive ? "text-white" : "group-hover:text-white"}`} />
                                    <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                                        {item.name}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 space-y-2">
                        <button
                            onClick={toggleCollapse}
                            className={`hidden lg:flex w-full items-center p-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all
                                ${isCollapsed ? "justify-center px-2" : "gap-3"}
                            `}
                        >
                            {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
                            <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                                Collapse
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all
                                ${isCollapsed ? "justify-center px-2" : "gap-3"}
                            `}
                        >
                            <FiLogOut size={20} />
                            <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                                Logout
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            <LogoutModal 
                isOpen={showLogoutPrompt} 
                onClose={() => setShowLogoutPrompt(false)} 
                onConfirm={performLogout} 
            />
        </>
    );
}

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <FiAlertTriangle className="w-8 h-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Logout</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Are you sure you want to log out? <br /> You'll need to sign in again to access your spreadsheets.
                        </p>
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg shadow-red-900/40 hover:from-red-500 hover:to-red-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FiLogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
