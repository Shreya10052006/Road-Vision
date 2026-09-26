"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface SidebarContextValue {
  mobileOpen: boolean;
  open: () => void;
  close: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        open: () => setMobileOpen(true),
        close: () => setMobileOpen(false),
        openMobile: () => setMobileOpen(true),
        closeMobile: () => setMobileOpen(false),
        toggleMobile: () => setMobileOpen((v) => !v),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
