"use client";

import { DeviceHighlightProvider } from "@/components/DeviceHighlightContext";
import { DeviceInventoryProvider } from "@/components/DeviceInventoryContext";
import { DeviceModalProvider } from "@/components/DeviceModalContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DeviceInventoryProvider>
      <DeviceHighlightProvider>
        <DeviceModalProvider>{children}</DeviceModalProvider>
      </DeviceHighlightProvider>
    </DeviceInventoryProvider>
  );
}
