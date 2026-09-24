"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, ChevronDown, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { toggleMobile } = useSidebar();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-8 py-5 border-b border-border bg-app-bg sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={toggleMobile} className="lg:hidden text-slate-500 shrink-0">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
          <CalendarDays size={14} />
          {now
            ? now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", weekday: "short" })
            : "—"}
          <span className="font-mono">
            {now ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "—"}
          </span>
        </div>

        <button className="relative w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-slate-500">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            4
          </span>
        </button>

        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-slate-500"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="hidden sm:flex items-center gap-2 pl-1">
          <span className="w-8 h-8 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
            ME
          </span>
          <div className="text-xs">
            <div className="font-medium text-slate-800 dark:text-slate-100">Municipal Engineer</div>
            <div className="text-slate-400">Chennai Corporation</div>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}
