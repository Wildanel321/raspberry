'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Activity, Search, RefreshCw, Trash2, X } from 'lucide-react';

interface ProcessDetails {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  user: string;
  status: string;
  started: string;
}

export function ProcessesView() {
  const { token, apiUrl } = useApp();
  const [processes, setProcesses] = useState<ProcessDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'cpu' | 'mem' | 'pid' | 'name'>('cpu');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  
  // Kill confirm modal
  const [confirmKillPid, setConfirmKillPid] = useState<number | null>(null);
  const [confirmKillName, setConfirmKillName] = useState('');
  const [killLoading, setKillLoading] = useState(false);

  const fetchProcesses = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/processes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProcesses(data.processes);
      }
    } catch (e) {
      console.error('Failed to query processes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    // Poll every 3 seconds for active task view
    const interval = setInterval(fetchProcesses, 3000);
    return () => clearInterval(interval);
  }, [token, apiUrl]);

  const handleSort = (field: 'cpu' | 'mem' | 'pid' | 'name') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const executeKill = async () => {
    if (confirmKillPid === null || !token || !apiUrl) return;
    setKillLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/processes/kill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pid: confirmKillPid })
      });
      const data = await res.json();
      if (data.success) {
        fetchProcesses();
      }
    } catch (e) {
      console.error('Failed to kill process:', e);
    } finally {
      setConfirmKillPid(null);
      setKillLoading(false);
    }
  };

  // Filter and Sort active lists
  const filtered = processes.filter((p) => {
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.user.toLowerCase().includes(query) || String(p.pid).includes(query);
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string).toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Active Processes</h2>
            <p className="text-xs text-zinc-500">Search, monitor resource loads, and safely terminate running tasks.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by PID, Name, User..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs pl-9 pr-4 py-2 w-56 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button 
            onClick={fetchProcesses}
            disabled={loading}
            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Process table wrapper */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort('pid')}>PID {sortField === 'pid' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort('name')}>Process name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort('cpu')}>CPU % {sortField === 'cpu' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="px-5 py-3 cursor-pointer select-none" onClick={() => handleSort('mem')}>Memory % {sortField === 'mem' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="px-5 py-3">Owner User</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Start Time</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-medium text-zinc-700 dark:text-zinc-350">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-zinc-500 italic">
                    No active processes match your filter queries.
                  </td>
                </tr>
              ) : (
                sorted.map((p) => (
                  <tr key={p.pid} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] font-bold text-zinc-400">{p.pid}</td>
                    <td className="px-5 py-3 font-bold text-zinc-900 dark:text-white truncate max-w-[150px]">{p.name}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-blue-500 font-bold">{p.cpu.toFixed(1)}%</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-purple-500 font-semibold">{p.mem.toFixed(1)}%</td>
                    <td className="px-5 py-3">{p.user}</td>
                    <td className="px-5 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        p.status.startsWith('R') 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px]">{p.started}</td>
                    <td className="px-5 py-3 text-right">
                      <button 
                        onClick={() => { setConfirmKillPid(p.pid); setConfirmKillName(p.name); }}
                        className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Kill Process"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmKillPid !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="h-4.5 w-4.5" />
                Terminate Process?
              </h3>
              <button onClick={() => setConfirmKillPid(null)} className="p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to send a <span className="font-mono text-red-500 font-bold">SIGKILL (kill -9)</span> signal to process <span className="font-bold text-zinc-800 dark:text-white">"{confirmKillName}"</span> (PID <span className="font-mono font-bold">{confirmKillPid}</span>)? This operation cannot be undone and may cause loss of unsaved state.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setConfirmKillPid(null)}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeKill}
                disabled={killLoading}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {killLoading ? 'Sending...' : 'Force Kill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ProcessesView;
