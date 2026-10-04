"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { CameraFacingMode, CameraSource } from "@/lib/types";

interface CameraContextValue {
  source: CameraSource;
  setSource: (s: CameraSource) => void;
  facingMode: CameraFacingMode;
  setFacingMode: (m: CameraFacingMode) => void;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  availableDevices: MediaDeviceInfo[];
  refreshDevices: () => Promise<MediaDeviceInfo[]>;
  flipCamera: () => void;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: ReactNode }) {
  const [source, setSourceState] = useState<CameraSource>("phone_back");
  const [facingMode, setFacingModeState] = useState<CameraFacingMode>("environment");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [connected, setConnected] = useState(false);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setAvailableDevices(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener("devicechange", refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", refreshDevices);
      };
    }
  }, [refreshDevices]);

  const setSource = useCallback((s: CameraSource) => {
    setSourceState(s);
    if (s === "phone_back") {
      setFacingModeState("environment");
      setSelectedDeviceId(null);
    } else if (s === "phone_front") {
      setFacingModeState("user");
      setSelectedDeviceId(null);
    }
  }, []);

  const setFacingMode = useCallback((m: CameraFacingMode) => {
    setFacingModeState(m);
    setSelectedDeviceId(null);
    setSourceState(m === "environment" ? "phone_back" : "phone_front");
  }, []);

  const flipCamera = useCallback(() => {
    const nextMode: CameraFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  }, [facingMode, setFacingMode]);

  return (
    <CameraContext.Provider
      value={{
        source,
        setSource,
        facingMode,
        setFacingMode,
        selectedDeviceId,
        setSelectedDeviceId,
        availableDevices,
        refreshDevices,
        flipCamera,
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
