'use client';

import React, { useState } from 'react';
import { TopNavbar } from '../../components/layout/top-navbar';
import { Sidebar } from '../../components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="bg-canvas-pattern flex min-h-screen flex-col">
      {/* Sticky frosted glass top navigation bar */}
      <TopNavbar onToggleSidebar={() => setIsMobileSidebarOpen(true)} />

      {/* Main body area with sidebar + content viewport */}
      <div className="flex min-w-0 flex-1">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Slide-over Drawer */}
        <Sidebar
          isMobileDrawer
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Dynamic page viewport */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
