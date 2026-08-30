'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { HardDrive, RefreshCw, Folder, ShieldCheck } from 'lucide-react';

interface FileDetails {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  permissions: string;
}

export function StorageView() {
  const { metrics, token, apiUrl } = useApp();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileDetails[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFiles = async (targetPath: string) => {
    if (!token || !apiUrl) return;
    setLoadingFiles(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiUrl}/api/files?path=${encodeURIComponent(targetPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
        setCurrentPath(targetPath);
      } else {
        setErrorMsg(data.error || 'Failed to read directory');
      }
    } catch (e) {
      setErrorMsg('Failed to load directory items');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchFiles('');
  }, [token, apiUrl]);

  const navigateFolder = (dirName: string) => {
    const nextPath = currentPath ? `${currentPath}/${dirName}` : dirName;
    fetchFiles(nextPath);
  };

  const navigateBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    const nextPath = parts.join('/');
    fetchFiles(nextPath);
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
          <div className="p-2 bg-emerald-600/10 rounded-lg text-emerald-500">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Storage Manager</h2>
            <p className="text-xs text-zinc-500">Mounted disk partitions, filesystem status, and storage directory explorer.</p>
          </div>
        </div>
      </div>

      {/* Partitions Allocation Panels */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.storage.map((part) => (
            <div key={part.mountPoint} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/50 pb-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">{part.mountPoint} ({part.filesystem})</span>
                <span className="text-xs font-mono font-black text-emerald-500">{part.usePercent}% Used</span>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-zinc-200 dark:bg-zinc-850 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${part.usePercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <div>Capacity: <span className="font-bold text-zinc-200">{formatBytes(part.total)}</span></div>
                  <div>Used: <span className="font-bold text-zinc-200">{formatBytes(part.used)}</span></div>
                  <div>Free: <span className="font-bold text-zinc-200">{formatBytes(part.free)}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Directory Size Explorer panel */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Directory Size Explorer</h3>
          <span className="text-[10px] text-zinc-500 font-semibold truncate max-w-sm">Safe Sandbox: /home/pi/{currentPath}</span>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/20 border border-red-900 rounded text-xs text-red-400 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Directory Navigator pane */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden text-xs">
          <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 flex items-center justify-between">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">File Listings</span>
            {currentPath && (
              <button 
                onClick={navigateBack}
                className="text-[10px] bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold px-2 py-1 rounded transition-colors cursor-pointer"
              >
                ← Back
              </button>
            )}
          </div>
          
          {loadingFiles ? (
            <div className="py-8 text-center text-zinc-500 italic">
              Scanning directories...
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {files.length === 0 ? (
                <li className="px-4 py-6 text-center text-zinc-500 italic">
                  Folder is empty
                </li>
              ) : (
                files.map((file) => (
                  <li 
                    key={file.name}
                    className="px-4 py-3 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className={`h-4 w-4 ${file.isDirectory ? 'text-yellow-500' : 'text-zinc-500'}`} />
                      {file.isDirectory ? (
                        <button 
                          onClick={() => navigateFolder(file.name)}
                          className="font-semibold text-blue-500 hover:underline text-left cursor-pointer"
                        >
                          {file.name}/
                        </button>
                      ) : (
                        <span className="text-zinc-800 dark:text-zinc-200">{file.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-[11px] text-zinc-500 font-mono">
                      <span>{file.permissions}</span>
                      <span className="w-16 text-right font-semibold">{file.isDirectory ? 'Dir' : formatBytes(file.size)}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {/* SD Card Lifetime recommendations */}
      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold uppercase tracking-wider mb-0.5">SD Card Health recommendation</h4>
          <p className="opacity-90">To extend SD card life cycles, avoid frequent root writes. PiControl runs entirely in-memory for monitoring telemetry to shield the micro SD card filesystem.</p>
        </div>
      </div>
    </div>
  );
}
export default StorageView;
