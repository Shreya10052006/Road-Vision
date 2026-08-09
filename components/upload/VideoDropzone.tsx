"use client";

import { useRef, useState } from "react";
import { FileVideo, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoDropzone({
  file,
  onFileSelected,
  onRemove,
}: {
  file: File | null;
  onFileSelected: (f: File) => void;
  onRemove: () => void;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (file) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return (
      <div className="rounded-2xl border border-border p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FileVideo size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{file.name}</div>
          <div className="text-xs text-slate-400 mb-2">{sizeMb} MB</div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label="Remove file"
          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFileSelected(f);
      }}
      className={cn(
        "rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
        dragActive ? "border-primary bg-primary/5" : "border-border hover:border-slate-300 dark:hover:border-slate-600"
      )}
      onClick={() => inputRef.current?.click()}
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <UploadCloud size={26} />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Drop your road video here</p>
      <p className="text-xs text-slate-400 mb-4">or</p>
      <button
        type="button"
        className="text-sm font-medium text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-xl"
      >
        Choose Video
      </button>
      <p className="text-[11px] text-slate-400 mt-4">Supported: MP4, MOV, AVI</p>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
        }}
      />
    </div>
  );
}
