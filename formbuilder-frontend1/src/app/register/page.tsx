'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Layout, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:8080/api/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                toast.success('Registration successful! Please sign in.');
                router.push('/login');
            } else {
                const error = await res.json();
                toast.error(error.error || 'Registration failed');
            }
        } catch (err) {
            toast.error('Network error. Is the backend running?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors relative overflow-hidden" style={{ background: 'var(--bg-muted)' }}>
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ background: 'var(--accent)' }}></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ background: 'var(--accent)' }}></div>
            </div>

            <div
                className="max-w-md w-full p-8 rounded-2xl border shadow-2xl relative z-10 backdrop-blur-sm"
                style={{
                    background: 'rgba(var(--card-bg-rgb), 0.8)',
                    borderColor: 'var(--border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                }}
            >
                <div className="flex flex-col items-center mb-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300" style={{ background: 'var(--accent)', color: '#fff' }}>
                        <Layout size={28} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>Join Us</h1>
                    <p className="text-sm mt-2 font-medium text-center" style={{ color: 'var(--text-muted)' }}>Create an account to start building custom forms</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold ml-1" style={{ color: 'var(--text-secondary)' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            style={{
                                background: 'var(--input-bg)',
                                borderColor: 'var(--input-border)',
                                color: 'var(--text-primary)'
                            }}
                            required
                            minLength={3}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold ml-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
                        <div className="relative group">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Create a strong password"
                                className="w-full px-4 py-3 pr-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                style={{
                                    background: 'var(--input-bg)',
                                    borderColor: 'var(--input-border)',
                                    color: 'var(--text-primary)'
                                }}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] mt-4"
                        style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Creating Account...</span>
                            </div>
                        ) : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-dashed text-center text-sm" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
                    <Link href="/login" className="font-bold hover:underline" style={{ color: 'var(--accent)' }}>
                        Sign in instead
                    </Link>
                </div>
            </div>
        </div>
    );
}
