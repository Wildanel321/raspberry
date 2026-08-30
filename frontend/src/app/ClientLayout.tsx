'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/components/AppContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Login } from '@/components/Login';
import { Menu } from 'lucide-react';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { token } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Guard: Not logged in
  if (!token) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* Navigation sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Pane wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header stats */}
        <Header />

        {/* Mobile Header bar */}
        <div className="lg:hidden h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-xs text-zinc-500 uppercase tracking-widest">
            PiControl Center
          </span>
          <div className="w-5" /> {/* spacing */}
        </div>

        {/* Content body viewports */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <LayoutContent>{children}</LayoutContent>
    </AppProvider>
  );
}
