'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { MetricChart } from '../MetricChart';
import { Network, RefreshCw, Radio, Globe, Terminal, Play } from 'lucide-react';

export function NetworkView() {
  const { metrics, token, apiUrl } = useApp();
  const [range, setRange] = useState('1m');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Diagnostics states
  const [pingHost, setPingHost] = useState('8.8.8.8');
  const [dnsHost, setDnsHost] = useState('google.com');
  const [diagOutput, setDiagOutput] = useState('');
  const [diagRunning, setDiagRunning] = useState(false);

  const fetchHistory = async () => {
    if (!token || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/metrics/history?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error('Failed to fetch Network history:', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHistory().then(() => setLoading(false));

    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [range, token, apiUrl]);

  const runDiagCommand = async (cmd: string) => {
    if (!token || !apiUrl) return;
    setDiagRunning(true);
    setDiagOutput(`$ ${cmd}\nRunning diagnostics test...`);
    try {
      const res = await fetch(`${apiUrl}/api/terminal/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      if (data.success) {
        setDiagOutput(`$ ${cmd}\n\n${data.output}`);
      } else {
        setDiagOutput(`$ ${cmd}\n\nError: ${data.error}`);
      }
    } catch (e) {
      setDiagOutput(`$ ${cmd}\n\nConnection error. Diagnostic failed.`);
    } finally {
      setDiagRunning(false);
    }
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec > 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
    if (bytesPerSec > 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${bytesPerSec} B/s`;
  };

  const formatBytes = (bytes: number) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Network Traffic & Interfaces</h2>
            <p className="text-xs text-zinc-500">Traffic speeds, link signal strength, diagnostic check utilities.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold py-1.5 px-3 outline-none"
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="6h">6 Hours</option>
            <option value="24h">24 Hours</option>
          </select>
          <button 
            onClick={fetchHistory}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Traffic Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Download Speed ({range})</h3>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500 italic">
              Loading download charts...
            </div>
          ) : (
            <MetricChart data={history} dataKey="download" color="#3b82f6" unit="B/s" height={180} />
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Upload Speed ({range})</h3>
          {loading ? (
            <div className="h-44 flex items-center justify-center text-xs text-zinc-500 italic">
              Loading upload charts...
            </div>
          ) : (
            <MetricChart data={history} dataKey="upload" color="#a855f7" unit="B/s" height={180} />
          )}
        </div>
      </div>

      {/* Active Interface info & Network diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: List of interfaces */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Links</h3>
          {metrics && (
            <div className="space-y-4">
              {metrics.network.interfaces.map((intf) => (
                <div key={intf.name} className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800/50 pb-1.5">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-blue-500" />
                      {intf.name}
                    </span>
                    <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded font-semibold capitalize">
                      {intf.type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[10px] text-zinc-400">
                    <div>IP Address:</div>
                    <div className="text-right text-zinc-200 font-semibold">{intf.ip}</div>
                    <div>MAC Address:</div>
                    <div className="text-right text-zinc-200 font-mono truncate max-w-[100px]">{intf.mac}</div>
                    {intf.type === 'wifi' && intf.ssid && (
                      <>
                        <div>SSID:</div>
                        <div className="text-right text-zinc-200 font-semibold">{intf.ssid}</div>
                        <div>Signal strength:</div>
                        <div className="text-right text-zinc-200 font-semibold">{intf.signalStrength}%</div>
                      </>
                    )}
                    <div>Total Received:</div>
                    <div className="text-right text-zinc-200">{formatBytes(intf.rxBytes)}</div>
                    <div>Total Transmitted:</div>
                    <div className="text-right text-zinc-200">{formatBytes(intf.txBytes)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Network diagnostics */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Network Diagnostic Checks</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Ping Card */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-blue-500" />
                <span>ICMP Ping</span>
              </div>
              <input 
                type="text" 
                value={pingHost} 
                onChange={(e) => setPingHost(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 outline-none text-[11px]"
              />
              <button 
                onClick={() => runDiagCommand(`ping -c 4 ${pingHost}`)}
                disabled={diagRunning}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-1 rounded cursor-pointer flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider"
              >
                <Play className="h-3 w-3" /> Run Ping
              </button>
            </div>

            {/* DNS Card */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-purple-500" />
                <span>DNS Lookup</span>
              </div>
              <input 
                type="text" 
                value={dnsHost} 
                onChange={(e) => setDnsHost(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 outline-none text-[11px]"
              />
              <button 
                onClick={() => runDiagCommand(`host ${dnsHost}`)}
                disabled={diagRunning}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-1 rounded cursor-pointer flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider"
              >
                <Play className="h-3 w-3" /> Resolve Domain
              </button>
            </div>

            {/* Route Card */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2 flex flex-col justify-between">
              <div>
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Terminal className="h-4 w-4 text-emerald-500" />
                  <span>Route Table</span>
                </div>
                <p className="text-[10px] text-zinc-500">Query active routing entries from the kernel.</p>
              </div>
              <button 
                onClick={() => runDiagCommand('ip route')}
                disabled={diagRunning}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-1.5 rounded cursor-pointer flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider mt-2"
              >
                <Play className="h-3 w-3" /> Query Routes
              </button>
            </div>
          </div>

          {/* Diagnostic outputs console */}
          {diagOutput && (
            <pre className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] text-zinc-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
              {diagOutput}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
export default NetworkView;
