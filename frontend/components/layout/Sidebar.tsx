"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  FileText,
  History,
  LayoutDashboard,
  Map,
  Radio,
  Search,
  Settings,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { useCamera } from "@/contexts/CameraContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live Inspection Center", icon: Radio },
  { href: "/upload", label: "Upload Inspection", icon: Upload },
  { href: "/map", label: "Damage Map", icon: Map },
  { href: "/inspections", label: "Inspection History", icon: History },
  { href: "/detections", label: "Detection Explorer", icon: Search },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileOpen, closeMobile } = useSidebar();
  const { connected } = useCamera();

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={closeMobile} />}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-60 shrink-0 bg-sidebar text-white flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Map size={18} className="text-white" />
            </span>
            <span>
              <div className="text-sm font-bold tracking-wide">ROADVISION</div>
              <div className="text-[10px] text-slate-400 -mt-0.5">Smart Road Monitoring</div>
            </span>
          </Link>
          <button onClick={closeMobile} className="lg:hidden text-slate-400">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-primary text-white" : "text-slate-300 hover:bg-white/5"
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-3 rounded-2xl border border-white/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Inspection Source</div>
          <div className="flex items-center gap-2 mb-3">
            <span className={cn("w-2 h-2 rounded-full", connected ? "bg-green-400" : "bg-slate-500")} />
            <div>
              <div className="text-sm font-medium">Live Camera</div>
              <div className="text-[11px] text-slate-400">{connected ? "Connected" : "Not Connected"}</div>
            </div>
          </div>
          <div className="flex items-center justify-center h-14 rounded-xl bg-white/5 mb-3">
            <Video size={20} className="text-slate-500" />
          </div>
          <button
            onClick={() => router.push("/live")}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
          >
            <Video size={14} /> Connect Camera
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-5 py-4 border-t border-white/10">
          <span className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <User size={13} />
          </span>
          <div>
            <div className="text-xs font-medium">RoadVision v1.0</div>
            <div className="text-[10px] text-slate-500">© 2024 All rights reserved</div>
          </div>
        </div>
      </aside>
    </>
  );
}
