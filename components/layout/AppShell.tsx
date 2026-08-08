"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useSidebar } from "@/contexts/SidebarContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mobileOpen, close } = useSidebar();

  return (
    <div className="min-h-screen flex bg-app-bg">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-[240px] shrink-0 h-screen sticky top-0">
        <Sidebar />
      </div>

      {/* Mobile drawer sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={close} aria-hidden />
          <div className="absolute left-0 top-0 h-full w-[260px]">
            <Sidebar onNavigate={close} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
