"use client";

import { DeviceHighlightProvider } from "@/components/DeviceHighlightContext";
import { DeviceModalProvider } from "@/components/DeviceModalContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <DeviceHighlightProvider>
      <DeviceModalProvider>{children}</DeviceModalProvider>
    </DeviceHighlightProvider>
  );
}
