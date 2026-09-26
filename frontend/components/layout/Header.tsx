"use client";

import { Bell, Calendar, ChevronDown, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { getActiveAlerts, markAllAlertsRead, markAlertRead } from "@/lib/services/alertService";
import type { Alert } from "@/lib/types";
import { priorityConfig } from "@/lib/priorityConfig";
import { timeAgo, cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { open: openMobileSidebar } = useSidebar();
  const [now, setNow] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const data = await getActiveAlerts();
      if (active) setAlerts(data);
    }
    load();
    const poll = setInterval(load, 45000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unread = alerts.filter((a) => !a.isRead).length;

  return (
    <header className="sticky top-0 z-30 bg-app-bg/85 backdrop-blur border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={openMobileSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          <Calendar size={14} className="text-slate-400" />
          {now ? (
            <span>
              {now.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", weekday: "short" })}
              {"  "}
              <span className="text-slate-400">•</span>{" "}
              {now.toLocaleTimeString("en-US", { hour12: true })}
            </span>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>

        <div className="relative" ref={popRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={`Notifications, ${unread} unread`}
            className="relative w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Active Alerts</span>
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={async () => {
                    await markAllAlertsRead();
                    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.slice(0, 6).map((alert) => {
                  const c = priorityConfig[alert.priority];
                  return (
                    <button
                      key={alert.id}
                      onClick={async () => {
                        await markAlertRead(alert.id);
                        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, isRead: true } : a)));
                        setOpen(false);
                        router.push(`/inspections/${alert.inspectionId}`);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex gap-3",
                        !alert.isRead && "bg-slate-50/60 dark:bg-slate-800/30"
                      )}
                    >
                      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="min-w-0">
                        <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
                          {alert.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {alert.road}, {alert.area}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{timeAgo(alert.createdAt)}</div>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/inspections");
                }}
                className="w-full text-center py-2.5 text-xs font-medium text-primary hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                View all
              </button>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white"
        >
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>

        <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-card">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
            ME
          </div>
          <span className="hidden sm:block text-left leading-tight">
            <span className="block text-[13px] font-medium text-slate-800 dark:text-slate-100">
              Municipal Engineer
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">Chennai Corporation</span>
          </span>
          <ChevronDown size={14} className="hidden sm:block text-slate-400" />
        </button>
      </div>
    </header>
  );
}
