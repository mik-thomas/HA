"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingPanel } from "@/components/ui/Spinner";
import type { DeviceWithEntities } from "@/lib/ha/types";

type LabelItem = {
  device: DeviceWithEntities;
  code: string;
  qrDataUrl: string;
  scanUrl: string;
};

export function LabelsPage() {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devRes, bcRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/barcodes"),
      ]);
      const devJson = (await devRes.json()) as {
        devices: DeviceWithEntities[];
        error?: string;
      };
      const bcJson = (await bcRes.json()) as {
        barcodes: Record<string, string>;
        error?: string;
      };
      if (!devRes.ok) throw new Error(devJson.error);
      if (!bcRes.ok) throw new Error(bcJson.error);

      const origin = window.location.origin;
      const items: LabelItem[] = [];

      for (const device of devJson.devices) {
        const code = bcJson.barcodes[device.device.id];
        if (!code) continue;
        const scanUrl = `${origin}/scan?c=${encodeURIComponent(code)}`;
        const qrDataUrl = await QRCode.toDataURL(scanUrl, {
          margin: 1,
          width: 180,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        items.push({ device, code, qrDataUrl, scanUrl });
      }

      items.sort((a, b) => a.device.displayName.localeCompare(b.device.displayName));
      setLabels(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load labels");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function assignAllMissing() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/devices");
      const json = (await res.json()) as { devices: DeviceWithEntities[] };
      if (!res.ok) throw new Error("Failed to load devices");

      const bcRes = await fetch("/api/barcodes");
      const bcJson = (await bcRes.json()) as { barcodes: Record<string, string> };

      for (const device of json.devices) {
        if (bcJson.barcodes[device.device.id]) continue;
        await fetch("/api/barcodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: device.device.id }),
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate codes");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <LoadingPanel message="Preparing printable labels…" />;
  }

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Labels"
        title="Print device stickers"
        description="Assign a unique QR code to each device, print labels, and stick them on hardware. Scan with your phone to find the device in Home Assistant."
      />

      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <Button variant="primary" disabled={generating} onClick={() => void assignAllMissing()}>
          {generating ? "Generating…" : "Generate codes for all devices"}
        </Button>
        <Button variant="secondary" onClick={() => void load()}>
          Refresh
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          Print labels
        </Button>
      </div>

      {error && (
        <div className="mb-4 print:hidden">
          <Alert variant="error" title="Labels">{error}</Alert>
        </div>
      )}

      {labels.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center print:hidden">
          <p className="text-lg font-medium">No labels yet</p>
          <p className="mt-2 text-sm text-muted">
            Generate codes for all devices, or assign a code from a device&apos;s detail modal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-3">
          {labels.map(({ device, code, qrDataUrl }) => (
            <article
              key={device.device.id}
              className="flex flex-col items-center rounded-xl border border-border bg-white p-3 text-center text-slate-900 print:break-inside-avoid"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`QR ${code}`} width={140} height={140} className="h-[140px] w-[140px]" />
              <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight">
                {device.displayName}
              </p>
              <p className="mt-1 font-mono text-xs tracking-widest text-slate-600">{code}</p>
              {device.areaName && (
                <p className="mt-0.5 text-[10px] text-slate-500">{device.areaName}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
