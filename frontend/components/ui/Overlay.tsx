"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClass?: string;
}

function useEscToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, widthClass = "max-w-lg" }: OverlayProps) {
  useEscToClose(open, onClose);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative bg-card border border-border rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-2",
          widthClass
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function Drawer({ open, onClose, title, children, widthClass = "max-w-md" }: OverlayProps) {
  useEscToClose(open, onClose);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative bg-card border-l border-border shadow-2xl h-full w-full overflow-y-auto animate-in fade-in",
          widthClass
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
