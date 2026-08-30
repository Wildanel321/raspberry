'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { FileText, Search, Download, RefreshCw } from 'lucide-react';

export function LogsView() {
  const { token, apiUrl } = useApp();
  const [logType, setLogType] = useState<'journal' | 'dmesg' | 'syslog'>('journal');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const [logsText, setLogsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLPreElement>(null);

  const fetchLogs = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/api/logs?type=${logType}&limit=${limit}&query=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setLogsText(data.logs);
      }
    } catch (e) {
      console.error('Failed to fetch system logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logType, limit, token, apiUrl]);

  // Keep scroll focused on tail logs
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logsText, autoScroll]);

  // Download log utility
  const downloadLogs = () => {
    const element = document.createElement('a');
    const file = new Blob([logsText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `picontrol_${logType}_log.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getLogLineColor = (line: string) => {
    const low = line.toLowerCase();
    if (low.includes('error') || low.includes('fail') || low.includes('crit') || low.includes('fatal')) {
      return 'text-red-400 font-semibold';
    }
    if (low.includes('warn') || low.includes('warning')) {
      return 'text-yellow-400';
    }
    if (low.includes('success') || low.includes('started') || low.includes('active')) {
      return 'text-emerald-400';
    }
    return 'text-zinc-300';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">System Logs</h2>
            <p className="text-xs text-zinc-500">Live inspect journalctl, boot logs dmesg, and traditional syslog messages.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={logType} 
            onChange={(e: any) => setLogType(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold py-1.5 px-3 outline-none"
          >
            <option value="journal">journalctl</option>
            <option value="dmesg">dmesg (Boot Log)</option>
            <option value="syslog">syslog</option>
          </select>
          <select 
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold py-1.5 px-3 outline-none"
          >
            <option value={50}>50 Lines</option>
            <option value={100}>100 Lines</option>
            <option value={200}>200 Lines</option>
            <option value={500}>500 Lines</option>
          </select>
          <button 
            onClick={downloadLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      </div>

      {/* Console panel controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search logs query text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="w-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-semibold text-zinc-600 dark:text-zinc-400 select-none cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-800 outline-none"
              />
              <span>Auto Scroll Tail</span>
            </label>
            <button 
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Real logs rendering container */}
        <pre 
          ref={consoleRef}
          className="p-5 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] leading-relaxed font-mono overflow-y-auto max-h-[480px] h-96 whitespace-pre-wrap select-text scroll-smooth"
        >
          {logsText ? (
            logsText.split('\n').map((line, idx) => (
              <div key={idx} className={getLogLineColor(line)}>
                {line}
              </div>
            ))
          ) : (
            <div className="text-zinc-600 italic text-center py-12">
              No logs returned. Check search filter matches.
            </div>
          )}
        </pre>
      </div>
    </div>
  );
}
export default LogsView;
