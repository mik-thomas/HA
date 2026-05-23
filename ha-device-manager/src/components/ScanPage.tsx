"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useDeviceHighlight } from "@/components/DeviceHighlightContext";
import { useDeviceModal } from "@/components/DeviceModalContext";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import type { DeviceWithEntities } from "@/lib/ha/types";

function extractCode(text: string): string {
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const param = url.searchParams.get("c");
    if (param) return param;
  } catch {
    /* not a url */
  }
  const match = trimmed.match(/[?&]c=([A-Za-z0-9]+)/);
  if (match) return match[1];
  if (/^HA[-:]/i.test(trimmed)) return trimmed.split(/[-:]/)[1] ?? trimmed;
  return trimmed;
}

export function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { highlightDevice } = useDeviceHighlight();
  const { openDevice } = useDeviceModal();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState("Starting camera…");
  const [lastDevice, setLastDevice] = useState<DeviceWithEntities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handlingRef = useRef(false);

  const handleCode = useCallback(
    async (raw: string) => {
      if (handlingRef.current) return;
      const code = extractCode(raw).toUpperCase();
      if (!code) return;

      handlingRef.current = true;
      setError(null);
      setStatus(`Looking up ${code}…`);

      try {
        const res = await fetch(`/api/barcodes/lookup?c=${encodeURIComponent(code)}`);
        const json = (await res.json()) as {
          device?: DeviceWithEntities;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Unknown code");

        const device = json.device!;
        setLastDevice(device);
        highlightDevice(device.device.id, 15000);
        openDevice(device);
        setStatus(`Found: ${device.displayName}`);
        router.replace(`/scan?c=${encodeURIComponent(code)}`, { scroll: false });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lookup failed");
        setStatus("Scan a label code");
      } finally {
        setTimeout(() => {
          handlingRef.current = false;
        }, 1500);
      }
    },
    [highlightDevice, openDevice, router],
  );

  useEffect(() => {
    const param = searchParams.get("c");
    if (param) void handleCode(param);
  }, [searchParams, handleCode]);

  useEffect(() => {
    const regionId = "qr-reader";
    let mounted = true;

    void (async () => {
      try {
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded) => void handleCode(decoded),
          () => {},
        );
        if (mounted) setStatus("Point your camera at a device label");
      } catch (e) {
        if (mounted) {
          setError(
            e instanceof Error
              ? e.message
              : "Camera unavailable — allow camera access or enter code below",
          );
          setStatus("Camera not active");
        }
      }
    })();

    return () => {
      mounted = false;
      void scannerRef.current?.stop().then(() => scannerRef.current?.clear());
      scannerRef.current = null;
    };
  }, [handleCode]);

  return (
    <div className="animate-in mx-auto max-w-lg">
      <PageHeader
        eyebrow="Identify"
        title="Scan label"
        description="Scan a QR code on a device sticker. The matching device will blink in the app and open its details."
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Scan issue">
            {error}
          </Alert>
        </div>
      )}

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div id="qr-reader" className="min-h-[280px] w-full bg-black/40" />
        <p className="border-t border-border px-4 py-3 text-center text-sm text-muted">
          {status}
        </p>
      </div>

      {lastDevice && (
        <div className="mt-4 glass-panel rounded-2xl p-4">
          <p className="text-sm text-muted">Last match</p>
          <p className="mt-1 text-lg font-semibold">{lastDevice.displayName}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => openDevice(lastDevice)}>
              View device
            </Button>
            <Link href="/">
              <Button variant="secondary">Devices list</Button>
            </Link>
            <Link href="/organize">
              <Button variant="ghost">Organize view</Button>
            </Link>
          </div>
        </div>
      )}

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const manual = String(fd.get("code") ?? "");
          if (manual) void handleCode(manual);
        }}
      >
        <input
          name="code"
          placeholder="Or type code manually"
          className="h-10 flex-1 rounded-xl border border-border bg-background-elevated px-3 text-sm uppercase"
        />
        <Button type="submit" variant="secondary">
          Find
        </Button>
      </form>
    </div>
  );
}
