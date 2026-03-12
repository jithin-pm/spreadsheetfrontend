import React, { useState } from 'react';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';
import apiClient from '../api/apiClient';
const FloatingCharacters = () => {
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890+−×÷₹+−×÷₹';
    const [elements, setElements] = React.useState([]);

    React.useEffect(() => {
        const newItems = Array.from({ length: 60 }).map((_, i) => ({
            id: i,
            char: characters.charAt(Math.floor(Math.random() * characters.length)),
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${Math.floor(Math.random() * 24) + 16}px`, // 16px to 40px
            opacity: Math.random() * 0.15 + 0.05, // 0.05 to 0.20
            animationDuration: `${Math.floor(Math.random() * 15) + 15}s`, // 15s to 30s
            animationDelay: `-${Math.random() * 30}s`, // Start staggered
        }));
        setElements(newItems);
    }, []);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <style>{`
                @keyframes float-chars {
                    0% { transform: translateY(0px) rotate(0deg); opacity: 0; }
                    10% { opacity: var(--tw-op); }
                    90% { opacity: var(--tw-op); }
                    100% { transform: translateY(-300px) rotate(45deg); opacity: 0; }
                }
            `}</style>
            {elements.map((item) => (
                <div
                    key={item.id}
                    className="absolute font-bold text-teal-400 select-none"
                    style={{
                        left: item.left,
                        top: item.top,
                        fontSize: item.fontSize,
                        '--tw-op': item.opacity,
                        animation: `float-chars ${item.animationDuration} infinite linear ${item.animationDelay}`,
                    }}
                >
                    {item.char}
                </div>
            ))}
        </div>
    );
};

export default function Login({ setActivePath }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await apiClient.post('/user/login', { email, password });
            if (response.data?.data?.accessToken) {
                // Successful login
                localStorage.setItem('accessToken', response.data.data.accessToken);
                if (response.data.data.refreshToken) {
                    localStorage.setItem('refreshToken', response.data.data.refreshToken);
                }
                if (response.data.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.data.user));
                }
                setActivePath('/my-files');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white font-sans w-full">
            {/* Left Panel */}
            <div className="hidden lg:flex flex-col justify-center w-1/2 bg-[#0F172A] text-white p-16 relative overflow-hidden">
                <FloatingCharacters />

                <div className="relative z-10 max-w-xl mx-auto w-full">
                    <div className="flex items-center gap-4 mb-14">
                        <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
                            <svg width="24" height="24" fill="none" stroke="white" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="font-bold text-2xl tracking-tight">Datarithm</h1>
                            <p className="text-sm text-gray-400">Enterprise Desk</p>
                        </div>
                    </div>

                    <h2 className="text-5xl font-extrabold font-sans leading-tight mb-6">
                        Streamlined<br />Enterprise<br />Management
                    </h2>

                    <p className="text-gray-400 text-lg mb-12 max-w-md">
                        Manage your files, users, and documents efficiently with our integrated enterprise solution.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-center gap-5">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                            <p className="text-gray-200 font-medium">Secure file storage & seamless sharing</p>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                            <p className="text-gray-200 font-medium">Real-time team communication</p>
                        </div>
                        <div className="flex items-center gap-5">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                            <p className="text-gray-200 font-medium">Advanced document editing & tracking</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
                <div className="w-full max-w-md bg-[#F4F6FF] rounded-4xl p-10 shadow-sm border border-indigo-50/50 relative overflow-hidden">
                    {/* Subtle decoration in the box */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>

                    <div className="relative z-10">
                        <div className="text-center mb-8">
                            <h2 className="text-[28px] font-bold text-[#0F172A] mb-3">Welcome Back!</h2>
                            <p className="text-gray-500 text-sm">Log in to your workspace</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <FiMail className="text-gray-400" size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        className="block w-full pl-11 pr-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all shadow-sm text-gray-900 font-medium"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <FiLock className="text-gray-400" size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        className="block w-full pl-11 pr-4 py-3 border border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all shadow-sm text-gray-900 font-medium"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 group shadow-md shadow-indigo-600/20 mt-4"
                            >
                                {loading ? 'Logging in...' : 'Continue'}
                                <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
