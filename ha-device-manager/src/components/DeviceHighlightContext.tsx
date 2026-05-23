"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DeviceHighlightContextValue = {
  highlightDeviceId: string | null;
  highlightDevice: (deviceId: string, durationMs?: number) => void;
  clearHighlight: () => void;
};

const DeviceHighlightContext = createContext<DeviceHighlightContextValue | null>(null);

export function DeviceHighlightProvider({ children }: { children: ReactNode }) {
  const [highlightDeviceId, setHighlightDeviceId] = useState<string | null>(null);

  const clearHighlight = useCallback(() => setHighlightDeviceId(null), []);

  const highlightDevice = useCallback((deviceId: string, durationMs = 12000) => {
    setHighlightDeviceId(deviceId);
    window.setTimeout(() => {
      setHighlightDeviceId((current) => (current === deviceId ? null : current));
    }, durationMs);
  }, []);

  useEffect(() => {
    if (!highlightDeviceId) return;
    const el = document.getElementById(`device-row-${highlightDeviceId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightDeviceId]);

  const value = useMemo(
    () => ({ highlightDeviceId, highlightDevice, clearHighlight }),
    [highlightDeviceId, highlightDevice, clearHighlight],
  );

  return (
    <DeviceHighlightContext.Provider value={value}>
      {children}
    </DeviceHighlightContext.Provider>
  );
}

export function useDeviceHighlight() {
  const ctx = useContext(DeviceHighlightContext);
  if (!ctx) {
    throw new Error("useDeviceHighlight must be used within DeviceHighlightProvider");
  }
  return ctx;
}

export function useIsDeviceHighlighted(deviceId: string): boolean {
  const { highlightDeviceId } = useDeviceHighlight();
  if (!deviceId) return false;
  return highlightDeviceId === deviceId;
}
