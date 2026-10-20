'use client';

import React, { useState } from 'react';
import { Menu, Bell, User, LayoutDashboard, Settings } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex font-sans">
      {/* Sidebar */}
      <aside className={`bg-muted text-foreground w-64 flex-shrink-0 transition-all duration-300 z-20 ${sidebarOpen ? 'ml-0' : '-ml-64'}`}>
        <div className="h-16 flex items-center justify-center border-b border-border bg-background font-bold text-xl tracking-wide">
          Proxima<span className="text-blue-500">SMS</span>
        </div>
        <div className="p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 mt-2">Navigation</div>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-blue-600/10 text-blue-400 border border-blue-600/20 font-medium">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-foreground hover:bg-slate-700 hover:text-white transition-colors font-medium">
              <Settings className="w-5 h-5" /> Settings
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-sm font-medium text-muted-foreground hidden sm:flex items-center gap-2">
              <span className="text-primary">Home</span>
              <span className="text-muted-foreground/40">/</span>
              <span>Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button className="text-muted-foreground hover:text-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full border border-background"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center cursor-pointer hover:bg-accent transition-colors">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 w-full mx-auto max-w-[1600px]">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-card border-t border-border p-4 text-center text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">Proxima Digital Innovation</span> © {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
