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
  Settings as SettingsIcon,
  Upload,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCamera } from "@/contexts/CameraContext";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live Inspection Center", icon: Radio },
  { href: "/upload", label: "Upload Inspection", icon: Upload },
  { href: "/map", label: "Damage Map", icon: Map },
  { href: "/inspections", label: "Inspection History", icon: History },
  { href: "/detections", label: "Detection Explorer", icon: Search },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connected } = useCamera();

  return (
    <aside className="w-full h-full bg-sidebar text-slate-300 flex flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
            <RoadPinMark />
          </div>
          <div className="leading-tight">
            <div className="text-white font-bold text-[15px] tracking-tight">ROADVISION</div>
            <div className="text-[11px] text-slate-400">Smart Road Monitoring</div>
          </div>
        </Link>
        <button
          className="lg:hidden text-slate-400 hover:text-white"
          onClick={onNavigate}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors",
                active ? "bg-primary text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <Icon size={17} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Inspection Source widget */}
      <div className="mx-3 mb-4 mt-2 p-4 rounded-2xl bg-white/[0.04] border border-white/5">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
          Inspection Source
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              connected ? "bg-green-400" : "bg-slate-500"
            )}
          />
          <div className="text-sm text-slate-200">
            Live Camera
            <div className={cn("text-xs", connected ? "text-green-400" : "text-slate-500")}>
              {connected ? "Connected" : "Not Connected"}
            </div>
          </div>
        </div>
        <div className="flex justify-center py-3">
          <CameraIllustration connected={connected} />
        </div>
        <Button
          className="w-full"
          size="sm"
          onClick={() => {
            router.push("/live");
            onNavigate?.();
          }}
        >
          <Video size={14} />
          Connect Camera
        </Button>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 text-xs font-semibold">
          RV
        </div>
        <div className="leading-tight">
          <div className="text-xs text-slate-300">RoadVision v1.0</div>
          <div className="text-[10px] text-slate-500">© 2024 All rights reserved</div>
        </div>
      </div>
    </aside>
  );
}

function RoadPinMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C8 2 5 5.2 5 9.2C5 14.7 12 22 12 22C12 22 19 14.7 19 9.2C19 5.2 16 2 12 2Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path d="M8.5 12L10.5 9L12.2 11L14 8L15.5 12" stroke="#4448D4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIllustration({ connected }: { connected: boolean }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="27" stroke="#333A5C" strokeDasharray="3 4" />
      <rect x="16" y="22" width="24" height="16" rx="3" fill="#1E2340" stroke="#3A4066" />
      <circle cx="28" cy="30" r="5.5" fill={connected ? "#22c55e" : "#3A4066"} />
      <circle cx="28" cy="30" r="2.5" fill="#12172B" />
      <rect x="24" y="17" width="8" height="5" rx="1.5" fill="#1E2340" stroke="#3A4066" />
      <line x1="28" y1="38" x2="28" y2="46" stroke="#3A4066" strokeWidth="2" />
      <line x1="20" y1="46" x2="36" y2="46" stroke="#3A4066" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
