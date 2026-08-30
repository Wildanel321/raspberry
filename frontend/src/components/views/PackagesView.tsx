'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Package, RefreshCw, Download, Trash2, ArrowUpCircle } from 'lucide-react';

interface UpdateItem {
  packageName: string;
  installedVersion: string;
  candidateVersion: string;
}

export function PackagesView() {
  const { token, apiUrl } = useApp();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<{ installedCount: number; updatesAvailable: UpdateItem[] } | null>(null);
  const [packageNameInput, setPackageNameInput] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [runningAction, setRunningAction] = useState(false);

  const fetchPackagesInfo = async () => {
    if (!token || !apiUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages);
      }
    } catch (e) {
      console.error('Failed to query packages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagesInfo();
  }, [token, apiUrl]);

  const executePackageAction = async (action: 'update' | 'upgrade' | 'install' | 'remove', pkgName?: string) => {
    if (!token || !apiUrl) return;
    setRunningAction(true);
    setConsoleOutput(`Running package action "${action}"... Please wait.\n`);
    try {
      const res = await fetch(`${apiUrl}/api/packages/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action, packageName: pkgName })
      });
      const data = await res.json();
      if (data.success) {
        setConsoleOutput(data.output);
        fetchPackagesInfo();
      } else {
        setConsoleOutput(`Error executing package trigger: ${data.error}`);
      }
    } catch (e) {
      setConsoleOutput('Connection error. Failed to run APT manager.');
    } finally {
      setRunningAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">APT Package Manager</h2>
            <p className="text-xs text-zinc-500">Manage Linux packages: check upgrades, run updates, and install/remove software.</p>
          </div>
        </div>
        <button 
          onClick={fetchPackagesInfo}
          disabled={loading}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {packages && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Info stats & Installs */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">APT Cache Status</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-zinc-150 dark:border-zinc-800/50">
                  <span className="text-zinc-500">Installed Packages count</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{packages.installedCount}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-500 font-semibold">Available upgrades</span>
                  <span className={`font-black ${packages.updatesAvailable.length > 0 ? 'text-yellow-500 animate-pulse' : 'text-emerald-500'}`}>
                    {packages.updatesAvailable.length} Packages
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-col gap-2 font-bold text-xs uppercase tracking-wider">
                <button 
                  onClick={() => executePackageAction('update')}
                  disabled={runningAction}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> Check Updates (apt update)
                </button>
                {packages.updatesAvailable.length > 0 && (
                  <button 
                    onClick={() => executePackageAction('upgrade')}
                    disabled={runningAction}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowUpCircle className="h-4 w-4" /> Upgrade All (apt upgrade)
                  </button>
                )}
              </div>
            </div>

            {/* Install / Remove Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Manage Individual Package</h3>
              <div className="space-y-3 text-xs">
                <input 
                  type="text" 
                  value={packageNameInput}
                  onChange={(e) => setPackageNameInput(e.target.value)}
                  placeholder="e.g. htop, tmux, git"
                  className="w-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 outline-none font-semibold text-zinc-700 dark:text-zinc-200"
                />
                <div className="flex gap-2 font-bold text-[10px] uppercase tracking-wider">
                  <button 
                    onClick={() => executePackageAction('install', packageNameInput)}
                    disabled={runningAction || !packageNameInput}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Install
                  </button>
                  <button 
                    onClick={() => executePackageAction('remove', packageNameInput)}
                    disabled={runningAction || !packageNameInput}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Upgrades available & console logs output */}
          <div className="lg:col-span-2 space-y-6">
            {/* Console output log */}
            {consoleOutput && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Console Terminal Output</h3>
                <pre className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl text-[10px] text-zinc-300 font-mono overflow-x-auto max-h-56 whitespace-pre-wrap">
                  {consoleOutput}
                </pre>
              </div>
            )}

            {/* Upgrades available list */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Upgrades Available</h3>
              {packages.updatesAvailable.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic">
                  All packages are up to date!
                </div>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-150 dark:border-zinc-850 pb-2 text-[10px] uppercase font-bold text-zinc-400">
                        <th className="py-2">Package Name</th>
                        <th className="py-2">Installed Version</th>
                        <th className="py-2">Upgrade Version</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-medium text-zinc-700 dark:text-zinc-350">
                      {packages.updatesAvailable.map((pkg) => (
                        <tr key={pkg.packageName}>
                          <td className="py-2.5 font-bold text-zinc-800 dark:text-zinc-200">{pkg.packageName}</td>
                          <td className="py-2.5 font-mono text-[10px] text-zinc-400">{pkg.installedVersion}</td>
                          <td className="py-2.5 font-mono text-[10px] text-yellow-500 font-semibold">{pkg.candidateVersion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PackagesView;
