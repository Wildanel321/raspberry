'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { Container, Play, Square, RotateCw, RefreshCw, FileText, X } from 'lucide-react';

interface ContainerDetails {
  id: string;
  name: string;
  status: string;
  image: string;
  cpu: number;
  memory: number;
  ports: string;
  uptime: string;
}

export function DockerView() {
  const { token, apiUrl } = useApp();
  const [dockerInstalled, setDockerInstalled] = useState(false);
  const [containers, setContainers] = useState<ContainerDetails[]>([]);
  const [loading, setLoading] = useState(false);

  // Container Action confirmation
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [selectedContainerName, setSelectedContainerName] = useState('');
  const [selectedAction, setSelectedAction] = useState<'start' | 'stop' | 'restart' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Container Logs modal
  const [logContainerId, setLogContainerId] = useState<string | null>(null);
  const [logContainerName, setLogContainerName] = useState('');
  const [logsText, setLogsText] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const logConsoleRef = useRef<HTMLPreElement>(null);

  const fetchDockerStatus = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/docker`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDockerInstalled(data.installed);
        setContainers(data.containers);
      }
    } catch (e) {
      console.error('Failed to query Docker daemon:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDockerStatus();
  }, [token, apiUrl]);

  const executeContainerAction = async () => {
    if (!selectedContainer || !selectedAction || !token || !apiUrl) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/docker/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id: selectedContainer, action: selectedAction })
      });
      const data = await res.json();
      if (data.success) {
        fetchDockerStatus();
      }
    } catch (e) {
      console.error('Docker action failed:', e);
    } finally {
      setSelectedContainer(null);
      setSelectedAction(null);
      setActionLoading(false);
    }
  };

  const fetchContainerLogs = async (id: string, name: string) => {
    if (!token || !apiUrl) return;
    setLogContainerId(id);
    setLogContainerName(name);
    setLoadingLogs(true);
    setLogsText('Fetching logs...');
    try {
      const res = await fetch(`${apiUrl}/api/docker/logs?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogsText(data.logs);
      } else {
        setLogsText(`Error querying logs: ${data.error}`);
      }
    } catch (e) {
      setLogsText('Failed to pull container logs. Connection error.');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Scroll to bottom on log loaded
  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [logsText]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Container className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Docker Workloads</h2>
            <p className="text-xs text-zinc-500">Monitor active docker daemon configurations, container usage, and inspect logs.</p>
          </div>
        </div>
        <button 
          onClick={fetchDockerStatus}
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!dockerInstalled && !loading ? (
        <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
          <Container className="h-10 w-10 mx-auto text-zinc-400 mb-3" />
          <h3 className="font-bold text-zinc-800 dark:text-white mb-1">Docker is not installed.</h3>
          <p className="text-xs max-w-xs mx-auto">This device does not contain a docker daemon installation on `/var/run/docker.sock`.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                  <th className="px-5 py-3">Container name</th>
                  <th className="px-5 py-3">Docker Image</th>
                  <th className="px-5 py-3">State</th>
                  <th className="px-5 py-3">CPU</th>
                  <th className="px-5 py-3">RAM</th>
                  <th className="px-5 py-3">Ports mapping</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-medium text-zinc-700 dark:text-zinc-350">
                {containers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-zinc-500 italic">
                      No containers configured.
                    </td>
                  </tr>
                ) : (
                  containers.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-zinc-900 dark:text-white">{c.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{c.id.substring(0, 12)}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[10px] truncate max-w-[120px]" title={c.image}>{c.image}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status.toLowerCase().includes('up') 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                        }`}>
                          {c.status.split(' ')[0]}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-blue-500 font-bold">{c.cpu.toFixed(1)}%</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-purple-500">{formatBytes(c.memory)}</td>
                      <td className="px-5 py-3.5 font-mono text-[10px] truncate max-w-[120px]">{c.ports}</td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <button 
                          onClick={() => fetchContainerLogs(c.id, c.name)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                          title="View Logs"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {c.status.toLowerCase().includes('up') ? (
                          <button 
                            onClick={() => { setSelectedContainer(c.id); setSelectedContainerName(c.name); setSelectedAction('stop'); }}
                            className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Stop Container"
                          >
                            <Square className="h-4 w-4" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setSelectedContainer(c.id); setSelectedContainerName(c.name); setSelectedAction('start'); }}
                            className="p-1.5 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-500 rounded transition-colors cursor-pointer"
                            title="Start Container"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedContainer(c.id); setSelectedContainerName(c.name); setSelectedAction('restart'); }}
                          className="p-1.5 hover:bg-amber-500/10 text-zinc-400 hover:text-amber-500 rounded transition-colors cursor-pointer"
                          title="Restart Container"
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Control Action Modal */}
      {selectedContainer && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Docker Action Confirm
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to execute container command <span className="font-bold text-blue-500 uppercase">"{selectedAction}"</span> on container <span className="font-bold text-zinc-800 dark:text-white">"{selectedContainerName}"</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => { setSelectedContainer(null); setSelectedAction(null); }}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={executeContainerAction}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {actionLoading ? 'Triggering...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logContainerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-blue-500" />
                Container Logs: {logContainerName}
              </h3>
              <button onClick={() => setLogContainerId(null)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <pre 
              ref={logConsoleRef}
              className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] text-zinc-300 font-mono overflow-y-auto h-72 whitespace-pre-wrap select-text scroll-smooth"
            >
              {logsText}
            </pre>

            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
              <button 
                onClick={() => fetchContainerLogs(logContainerId!, logContainerName)}
                disabled={loadingLogs}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Refresh Logs
              </button>
              <button 
                onClick={() => setLogContainerId(null)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DockerView;
