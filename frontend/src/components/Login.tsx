'use client';

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { ShieldAlert, Lock, User as UserIcon } from 'lucide-react';

export function Login() {
  const { login, apiUrl } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        login(data.token, data.user);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error(err);
      setError('Connection refused. Is the PiControl backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Login panel */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-lg bg-blue-600/10 text-blue-500 mb-3 border border-blue-500/10">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <span className="p-1 rounded bg-blue-600 text-white font-black text-xs">PI</span>
            PiControl
          </h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-semibold tracking-wider">
            Lightweight Management Center
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-3 bg-red-950/30 border border-red-900 rounded text-xs text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <UserIcon className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 text-sm text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Footer warning */}
      <p className="text-[10px] text-zinc-600 mt-6 text-center max-w-xs">
        Default username is <span className="font-bold text-zinc-500">admin</span>. Change default credentials inside the Settings panel to prevent unauthorized access.
      </p>
    </div>
  );
}
