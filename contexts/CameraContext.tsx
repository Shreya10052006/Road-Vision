"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CameraSource } from "@/lib/types";

interface CameraContextValue {
  connected: boolean;
  source: CameraSource;
  setSource: (s: CameraSource) => void;
  connect: () => void;
  disconnect: () => void;
}

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<CameraSource>("webcam");

  return (
    <CameraContext.Provider
      value={{
        connected,
        source,
        setSource,
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
