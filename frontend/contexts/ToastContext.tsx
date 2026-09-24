"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++seq;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg text-sm bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2",
              t.kind === "success" && "border-green-200 dark:border-green-900",
              t.kind === "error" && "border-red-200 dark:border-red-900",
              t.kind === "info" && "border-border"
            )}
          >
            {t.kind === "success" && <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />}
            {t.kind === "error" && <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />}
            {t.kind === "info" && <Info size={16} className="text-primary shrink-0 mt-0.5" />}
            <span className="flex-1 text-slate-700 dark:text-slate-200">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
