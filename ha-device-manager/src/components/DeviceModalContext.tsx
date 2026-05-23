"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DeviceDetailModal } from "@/components/DeviceDetailModal";
import type { DeviceWithEntities } from "@/lib/ha/types";

type DeviceModalContextValue = {
  openDevice: (device: DeviceWithEntities | string) => void;
  closeDevice: () => void;
};

const DeviceModalContext = createContext<DeviceModalContextValue | null>(null);

export function DeviceModalProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<DeviceWithEntities | null>(null);

  const openDevice = useCallback(async (target: DeviceWithEntities | string) => {
    if (typeof target === "object") {
      setDevice(target);
      return;
    }
    try {
      const res = await fetch("/api/devices");
      const json = (await res.json()) as {
        devices: DeviceWithEntities[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error);
      const found = json.devices.find((d) => d.device.id === target);
      if (found) setDevice(found);
    } catch {
      /* ignore */
    }
  }, []);

  const closeDevice = useCallback(() => setDevice(null), []);

  const value = useMemo(
    () => ({ openDevice, closeDevice }),
    [openDevice, closeDevice],
  );

  return (
    <DeviceModalContext.Provider value={value}>
      {children}
      <DeviceDetailModal device={device} onClose={closeDevice} />
    </DeviceModalContext.Provider>
  );
}

export function useDeviceModal() {
  const ctx = useContext(DeviceModalContext);
  if (!ctx) {
    throw new Error("useDeviceModal must be used within DeviceModalProvider");
  }
  return ctx;
}
