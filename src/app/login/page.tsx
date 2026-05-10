'use client';

import { useState } from 'react';
import { Component, Lock, User, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  /* router removed */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 relative">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-md w-full space-y-10 p-10 bg-white/80 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-slate-200 relative z-10">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-200 border border-blue-400/20 active:scale-95 transition-transform duration-500">
              <Component className="h-10 w-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-none">
              Welcome Back
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Open Source Audit Management System
            </p>
          </div>
        </div>
        
        <form className="space-y-8" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-600 text-sm flex items-center space-x-3 animate-shake">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300">
                <User className="h-5 w-5 text-slate-400 group-focus-within/input:text-blue-600" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-slate-900 font-semibold placeholder:text-slate-400 outline-none shadow-inner"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300">
                <Lock className="h-5 w-5 text-slate-400 group-focus-within/input:text-blue-600" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-slate-900 font-semibold placeholder:text-slate-400 outline-none shadow-inner"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-6">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-70 active:scale-95 border border-blue-400/20 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="px-4 bg-white text-slate-400">Enterprise SSO</span>
              </div>
            </div>

            <a
              href="/api/auth/sso/login"
              className="w-full flex justify-center py-4 px-6 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm font-bold rounded-2xl text-slate-700 transition-all shadow-sm active:scale-95"
            >
              Identity Provider Sign In
            </a>
          </div>
          
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
              Authorized Personnel Access Only
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
