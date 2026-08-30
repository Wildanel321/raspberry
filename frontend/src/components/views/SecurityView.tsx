'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { ShieldCheck, RefreshCw, AlertTriangle, Terminal, ShieldAlert } from 'lucide-react';

interface AuditLog {
  id: number;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export function SecurityView() {
  const { token, apiUrl } = useApp();
  const [security, setSecurity] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSecurityData = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const secRes = await fetch(`${apiUrl}/api/security`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const secData = await secRes.json();
      if (secData.success) setSecurity(secData.security);

      const auditRes = await fetch(`${apiUrl}/api/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const auditData = await auditRes.json();
      if (auditData.success) setAuditLogs(auditData.auditLogs);
    } catch (e) {
      console.error('Failed to load security statistics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [token, apiUrl]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Security Audits & Logs</h2>
            <p className="text-xs text-zinc-500">Inspect system vulnerabilities, firewall regulations, active sessions, and audit logs.</p>
          </div>
        </div>
        <button 
          onClick={fetchSecurityData}
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !security ? (
        <div className="py-12 text-center text-xs text-zinc-500 italic">
          Auditing firewall configurations...
        </div>
      ) : security ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Recommendations and Firewall status */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recommendations */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
                Vulnerability Recommendations
              </h3>
              <div className="space-y-3">
                {security.recommendations.map((rec: string, idx: number) => {
                  let alertColor = 'text-blue-500 border-blue-500/25 bg-blue-500/5';
                  if (rec.startsWith('WARNING:')) alertColor = 'text-red-500 border-red-500/20 bg-red-500/5';
                  else if (rec.startsWith('CAUTION:')) alertColor = 'text-orange-500 border-orange-500/20 bg-orange-500/5';
                  else if (rec.startsWith('IMPORTANT:')) alertColor = 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5';
                  return (
                    <div 
                      key={idx}
                      className={`p-3 border rounded-lg text-[10px] leading-relaxed font-semibold ${alertColor}`}
                    >
                      {rec}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Firewall & SSH details */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Access Regulations</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-150 dark:border-zinc-850">
                  <span className="text-zinc-500">SSH Service active</span>
                  <span className={`font-bold ${security.sshEnabled ? 'text-emerald-500' : 'text-zinc-500'}`}>
                    {security.sshEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-150 dark:border-zinc-850">
                  <span className="text-zinc-500">SSH Password Authentication</span>
                  <span className={`font-bold ${security.sshPasswordAuth ? 'text-red-500' : 'text-emerald-500'}`}>
                    {security.sshPasswordAuth ? 'Allowed' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-zinc-150 dark:border-zinc-850">
                  <span className="text-zinc-500">UFW/Iptables Firewall</span>
                  <span className={`font-bold ${security.firewallActive ? 'text-emerald-500' : 'text-orange-500'}`}>
                    {security.firewallActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-zinc-500">Failed SSH logins (Log)</span>
                  <span className={`font-bold ${security.failedLoginsCount > 0 ? 'text-red-500 font-black animate-pulse' : 'text-zinc-200'}`}>
                    {security.failedLoginsCount} Attempts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Open Ports list and Audit log records */}
          <div className="lg:col-span-2 space-y-6">
            {/* Open Ports */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Listening ports (ss / netstat)</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {security.openPorts.map((port: number) => (
                  <span 
                    key={port} 
                    className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 rounded font-mono font-bold"
                  >
                    :{port}
                  </span>
                ))}
              </div>
            </div>

            {/* Audit Logs table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="h-4.5 w-4.5 text-blue-500" />
                Administrative Audit Logs
              </h3>
              <div className="overflow-x-auto text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-150 dark:border-zinc-800 pb-2 uppercase font-bold text-zinc-400">
                      <th className="py-2.5">User</th>
                      <th className="py-2.5">Event</th>
                      <th className="py-2.5">Details</th>
                      <th className="py-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-500 italic">
                          No audit events recorded.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors">
                          <td className="py-2.5 font-bold text-zinc-800 dark:text-zinc-200">{log.username}</td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                              log.action.includes('REJECTED') ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono truncate max-w-[200px]" title={log.details}>{log.details}</td>
                          <td className="py-2.5 text-right text-zinc-500 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
export default SecurityView;
