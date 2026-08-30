'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../AppContext';
import { 
  FolderOpen, Folder, File, ArrowLeft, Plus, 
  Upload, Download, Edit2, X, RefreshCw 
} from 'lucide-react';

interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  permissions: string;
}

export function FilesView() {
  const { token, apiUrl } = useApp();
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dialog Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [oldRenameName, setOldRenameName] = useState('');
  const [newRenameName, setNewRenameName] = useState('');

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (targetPath: string) => {
    if (!token || !apiUrl) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiUrl}/api/files?path=${encodeURIComponent(targetPath)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files);
        setCurrentPath(data.currentPath === '/' ? '' : data.currentPath);
      } else {
        setErrorMsg(data.error || 'Failed to list directory contents');
      }
    } catch (e) {
      setErrorMsg('Failed to connect to file system endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles('');
  }, [token, apiUrl]);

  const navigateTo = (name: string) => {
    const nextPath = currentPath ? `${currentPath}/${name}` : name;
    fetchFiles(nextPath);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    fetchFiles(parts.join('/'));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !token || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/files/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: currentPath, folderName: newFolderName })
      });
      const data = await res.json();
      if (data.success) {
        setShowFolderModal(false);
        setNewFolderName('');
        fetchFiles(currentPath);
      } else {
        setErrorMsg(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRenameName.trim() || !token || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/files/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: currentPath, oldName: oldRenameName, newName: newRenameName })
      });
      const data = await res.json();
      if (data.success) {
        setShowRenameModal(false);
        setNewRenameName('');
        fetchFiles(currentPath);
      } else {
        setErrorMsg(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !apiUrl) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Content = (reader.result as string).split(',')[1];
      try {
        const res = await fetch(`${apiUrl}/api/files/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            path: currentPath,
            filename: file.name,
            content: base64Content
          })
        });
        const data = await res.json();
        if (data.success) {
          fetchFiles(currentPath);
        } else {
          setErrorMsg(data.error || 'Upload failed');
        }
      } catch (err) {
        setErrorMsg('Failed to transmit file data');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerDownload = (name: string) => {
    const filePath = currentPath ? `${currentPath}/${name}` : name;
    window.open(`${apiUrl}/api/files/download?path=${encodeURIComponent(filePath)}&authorization=Bearer ${token}`, '_blank');
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Sandboxed File Explorer</h2>
            <p className="text-xs text-zinc-500">Browse configuration directory tree, upload assets, and edit names.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Action buttons */}
          <button 
            onClick={() => setShowFolderModal(true)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" /> New Folder
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg cursor-pointer transition-colors"
          >
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload File'}
          </button>

          <button 
            onClick={() => fetchFiles(currentPath)}
            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-955/20 border border-red-900 rounded text-xs text-red-400 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Directory Content Table Wrapper */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {/* Path Breadcrumbs */}
        <div className="bg-zinc-50 dark:bg-zinc-950 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 flex items-center gap-2">
          <span className="text-zinc-400">Sandbox ROOT: /home/pi</span>
          <span>/</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-mono font-bold">
            {currentPath || '(root)'}
          </span>
        </div>

        {/* Files list */}
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                <th className="px-5 py-2.5">Name</th>
                <th className="px-5 py-2.5">Size</th>
                <th className="px-5 py-2.5">Permissions</th>
                <th className="px-5 py-2.5">Last Modified</th>
                <th className="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 font-medium text-zinc-700 dark:text-zinc-350">
              {currentPath && (
                <tr 
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors cursor-pointer"
                  onClick={navigateUp}
                >
                  <td className="px-5 py-3 text-blue-500 font-bold flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" /> .. (parent directory)
                  </td>
                  <td className="px-5 py-3"></td>
                  <td className="px-5 py-3"></td>
                  <td className="px-5 py-3"></td>
                  <td className="px-5 py-3"></td>
                </tr>
              )}
              {files.map((file) => (
                <tr 
                  key={file.name}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {file.isDirectory ? (
                        <Folder className="h-4.5 w-4.5 text-yellow-500" />
                      ) : (
                        <File className="h-4.5 w-4.5 text-zinc-400" />
                      )}
                      {file.isDirectory ? (
                        <button 
                          onClick={() => navigateTo(file.name)}
                          className="font-bold text-zinc-900 dark:text-white hover:text-blue-500 hover:underline text-left cursor-pointer"
                        >
                          {file.name}/
                        </button>
                      ) : (
                        <span className="text-zinc-800 dark:text-zinc-200">{file.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[10px] text-zinc-500">
                    {file.isDirectory ? '-' : formatBytes(file.size)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[10px] text-zinc-500">
                    {file.permissions}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[10px] text-zinc-500">
                    {new Date(file.modified).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5">
                    {!file.isDirectory && (
                      <button 
                        onClick={() => triggerDownload(file.name)}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => { setOldRenameName(file.name); setNewRenameName(file.name); setShowRenameModal(true); }}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition-colors cursor-pointer"
                      title="Rename"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-850 dark:text-white uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Create New Folder
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4 text-xs">
              <input 
                type="text" 
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 rounded px-3 py-2 outline-none font-semibold text-zinc-800 dark:text-zinc-200 focus:border-blue-500 transition-colors"
                autoFocus
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-650 dark:text-zinc-350 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newFolderName}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-zinc-850 dark:text-white uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Rename Item
            </h3>
            <form onSubmit={handleRename} className="space-y-4 text-xs">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Rename "{oldRenameName}" to:</p>
              <input 
                type="text" 
                value={newRenameName}
                onChange={(e) => setNewRenameName(e.target.value)}
                placeholder="New name"
                className="w-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-850 rounded px-3 py-2 outline-none font-semibold text-zinc-800 dark:text-zinc-200 focus:border-blue-500 transition-colors"
                autoFocus
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-xs font-bold text-zinc-650 dark:text-zinc-350 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newRenameName || newRenameName === oldRenameName}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default FilesView;
