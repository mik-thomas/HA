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
import { useDeviceInventory } from "@/components/DeviceInventoryContext";
import type { DeviceWithEntities } from "@/lib/ha/types";

type DeviceModalContextValue = {
  openDevice: (device: DeviceWithEntities | string) => void;
  closeDevice: () => void;
};

const DeviceModalContext = createContext<DeviceModalContextValue | null>(null);

export function DeviceModalProvider({ children }: { children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const { getDevice } = useDeviceInventory();
  const device = deviceId ? getDevice(deviceId) ?? null : null;

  const openDevice = useCallback((target: DeviceWithEntities | string) => {
    const id = typeof target === "string" ? target : target.device.id;
    setDeviceId(id);
  }, []);

  const closeDevice = useCallback(() => setDeviceId(null), []);

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
