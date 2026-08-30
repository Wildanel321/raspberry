'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Terminal as TerminalIcon, AlertTriangle, ShieldCheck, Play } from 'lucide-react';

interface TerminalLine {
  type: 'input' | 'output' | 'error';
  text: string;
}

export function TerminalView() {
  const { token, apiUrl } = useApp();
  const [commandInput, setCommandInput] = useState('');
  const [consoleHistory, setConsoleHistory] = useState<TerminalLine[]>([
    { type: 'output', text: 'PiControl Shell Emulator v1.0' },
    { type: 'output', text: 'Type allowed commands from list and press Enter to execute.' }
  ]);
  const [executing, setExecuting] = useState(false);
  const consoleRef = useRef<HTMLPreElement>(null);

  const allowedCmds = [
    'uptime', 'uname', 'df', 'free', 'lsblk', 'ip', 'ss', 
    'systemctl status', 'journalctl', 'ping', 'host', 'traceroute', 'route'
  ];

  // Auto scroll console logs
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleHistory]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    setCommandInput('');
    setExecuting(true);

    // Append user input representation
    const nextHistory = [...consoleHistory, { type: 'input' as const, text: `$ ${cmd}` }];
    setConsoleHistory(nextHistory);

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
        setConsoleHistory([...nextHistory, { type: 'output' as const, text: data.output }]);
      } else {
        setConsoleHistory([...nextHistory, { type: 'error' as const, text: data.error }]);
      }
    } catch (err) {
      setConsoleHistory([...nextHistory, { type: 'error' as const, text: 'Connection refused. Check API server status.' }]);
    } finally {
      setExecuting(false);
    }
  };

  const clearConsole = () => {
    setConsoleHistory([
      { type: 'output', text: 'Console cleared. PiControl Shell Emulator.' }
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
            <TerminalIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Secure Shell Console</h2>
            <p className="text-xs text-zinc-500">Run safe allowlisted administration commands on Raspberry Pi OS.</p>
          </div>
        </div>
        <button 
          onClick={clearConsole}
          className="text-xs font-semibold px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-250 dark:hover:bg-zinc-750 rounded-lg transition-colors cursor-pointer"
        >
          Clear Screen
        </button>
      </div>

      {/* Allowed list and Warning Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Console output */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <pre 
            ref={consoleRef}
            className="p-5 bg-zinc-950 border border-zinc-850 rounded-xl text-[11px] leading-relaxed font-mono overflow-y-auto h-80 whitespace-pre-wrap select-text scroll-smooth"
          >
            {consoleHistory.map((line, idx) => {
              let color = 'text-zinc-300';
              if (line.type === 'input') color = 'text-blue-400 font-bold';
              else if (line.type === 'error') color = 'text-red-400 font-semibold';
              return (
                <div key={idx} className={color}>
                  {line.text}
                </div>
              );
            })}
          </pre>

          {/* Form Command input */}
          <form onSubmit={handleCommandSubmit} className="flex gap-2 text-xs">
            <input 
              type="text" 
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              disabled={executing}
              placeholder="Type command (e.g. free -h, uptime)..."
              className="flex-1 bg-zinc-100 dark:bg-zinc-855 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 outline-none font-mono text-zinc-800 dark:text-zinc-200 focus:border-blue-500 transition-colors"
            />
            <button 
              type="submit"
              disabled={executing || !commandInput}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 rounded-lg cursor-pointer flex items-center justify-center gap-1 uppercase tracking-wider text-[10px]"
            >
              <Play className="h-3 w-3" /> Exec
            </button>
          </form>
        </div>

        {/* Right column: allowed list & warnings */}
        <div className="space-y-6">
          {/* Allowlist */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-500" />
              Allowed commands list
            </h3>
            <ul className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500">
              {allowedCmds.map((c) => (
                <li key={c} className="p-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded text-zinc-700 dark:text-zinc-300 text-center font-bold">
                  {c}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-zinc-500 leading-relaxed pt-1">
              Commands parameters are validated against a character whitelist to prevent script piping or chaining injections.
            </p>
          </div>

          {/* Dangerous warning banner */}
          <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 text-yellow-500 rounded-xl text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold uppercase tracking-wider mb-0.5">Execution Guard Active</h4>
              <p className="opacity-90">Dangerous filesystem operations (`rm`, `mkfs`, `dd`, `fdisk`) and direct root shutdowns are blocked via terminal command allowlist.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default TerminalView;
