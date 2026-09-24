"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CameraSource } from "@/lib/types";

interface CameraContextValue {
  source: CameraSource;
  setSource: (s: CameraSource) => void;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<CameraSource>("webcam");
  const [connected, setConnected] = useState(false);

  return (
    <CameraContext.Provider
      value={{
        source,
        setSource,
        connected,
        connect: () => setConnected(true),
        disconnect: () => setConnected(false),
      }}
    >
      {children}
    </CameraContext.Provider>
  );
}

export function useCamera() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCamera must be used within CameraProvider");
  return ctx;
}
