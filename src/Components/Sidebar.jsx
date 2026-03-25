import { useState, useEffect } from "react";
import { FiFolder, FiUsers, FiShare2, FiChevronLeft, FiChevronRight, FiLogOut, FiActivity } from "react-icons/fi";
import { PiPaperPlaneTiltBold } from "react-icons/pi";
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

    const handleLogout = async () => {
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
                        <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                            <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                            <h1 className="font-bold text-lg whitespace-nowrap">Datarithm</h1>
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
        </>
    );
}
